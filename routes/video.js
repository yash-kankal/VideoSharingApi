const express = require("express");

const Router = express.Router();

const userAuth = require("../userAuth/userAuth");

const cloudinary = require("cloudinary").v2;

const Video = require("../models/Video");

const mongoose = require("mongoose");

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm", "video/mpeg"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5 MB


Router.get("/all-videos", userAuth, async (req, res) => {
    try {
        const videos = await Video.find()
            .populate("user_id", "channelName logoUrl")
            .sort({ createdAt: -1 });
        res.status(200).json({ videos });
    } catch (error) {
        console.error("Error in /all-videos:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


Router.get("/my-videos", userAuth, async (req, res) => {
    try {
        const videos = await Video.find({ user_id: req.user._id })
            .populate("user_id", "channelName logoUrl");
        res.status(200).json({ videos });
    } catch (error) {
        console.error("Error in /my-videos:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


Router.post("/uploadvideo", userAuth, async (req, res) => {
    let uploadedVideoId = null;

    try {
        if (!req.files || !req.files.video || !req.files.thumbnail) {
            return res.status(400).json({ error: "Video and thumbnail files are required" });
        }

        const videoFile = req.files.video;
        const thumbnailFile = req.files.thumbnail;

        // Validate file types
        if (!ALLOWED_VIDEO_TYPES.includes(videoFile.mimetype)) {
            return res.status(400).json({
                error: "Invalid video format. Allowed: mp4, mov, avi, webm, mpeg",
            });
        }
        if (!ALLOWED_IMAGE_TYPES.includes(thumbnailFile.mimetype)) {
            return res.status(400).json({
                error: "Invalid thumbnail format. Allowed: jpg, png, webp, gif",
            });
        }

        // Validate file sizes
        if (videoFile.size > MAX_VIDEO_SIZE) {
            return res.status(400).json({ error: "Video too large. Maximum size is 500MB" });
        }
        if (thumbnailFile.size > MAX_IMAGE_SIZE) {
            return res.status(400).json({ error: "Thumbnail too large. Maximum size is 5MB" });
        }

        if (!req.body.title || !req.body.description) {
            return res.status(400).json({ error: "Title and description are required" });
        }

        // Upload video — store its public_id so we can roll back if thumbnail fails
        const uploadedVideo = await cloudinary.uploader.upload(videoFile.tempFilePath, {
            resource_type: "video",
            chunk_size: 6_000_000, // 6 MB chunks for large files
        });
        uploadedVideoId = uploadedVideo.public_id;

        // Upload thumbnail — on failure, roll back video
        let uploadedThumbnail;
        try {
            uploadedThumbnail = await cloudinary.uploader.upload(thumbnailFile.tempFilePath);
        } catch (thumbErr) {
            await cloudinary.uploader.destroy(uploadedVideoId, { resource_type: "video" });
            return res.status(500).json({ error: "Thumbnail upload failed. Video upload rolled back." });
        }

        const tags = req.body.tags
            ? req.body.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [];

        const newVideo = new Video({
            _id: new mongoose.Types.ObjectId(),
            title: req.body.title,
            description: req.body.description,
            user_id: req.user._id,
            videoUrl: uploadedVideo.secure_url,
            videoId: uploadedVideo.public_id,
            thumbnailUrl: uploadedThumbnail.secure_url,
            thumbnailId: uploadedThumbnail.public_id,
            category: req.body.category || "",
            tags,
        });

        await newVideo.save();

        res.status(201).json({
            msg: "Video uploaded successfully",
            videoUrl: newVideo.videoUrl,
            videoId: newVideo._id,
        });
    } catch (err) {
        // If the video was uploaded but DB save failed, clean up Cloudinary
        if (uploadedVideoId) {
            await cloudinary.uploader.destroy(uploadedVideoId, { resource_type: "video" }).catch(() => {});
        }
        console.error("Error in /uploadvideo:", err);
        res.status(500).json({ error: err.message });
    }
});


Router.put("/:videoId", userAuth, async (req, res) => {
    try {
        const videoInfo = await Video.findById(req.params.videoId);

        if (!videoInfo) {
            return res.status(404).json({ error: "Video not found" });
        }
        if (req.user._id.toString() !== videoInfo.user_id.toString()) {
            return res.status(403).json({ error: "You are not authorized to update this video" });
        }

        const updateToMake = {
            title: req.body.title || videoInfo.title,
            description: req.body.description || videoInfo.description,
            category: req.body.category !== undefined ? req.body.category : videoInfo.category,
            tags: req.body.tags
                ? req.body.tags.split(",").map((t) => t.trim()).filter(Boolean)
                : videoInfo.tags,
        };

        if (req.files && req.files.thumbnail) {
            const thumbnailFile = req.files.thumbnail;
            if (!ALLOWED_IMAGE_TYPES.includes(thumbnailFile.mimetype)) {
                return res.status(400).json({ error: "Invalid thumbnail format. Allowed: jpg, png, webp, gif" });
            }
            if (thumbnailFile.size > MAX_IMAGE_SIZE) {
                return res.status(400).json({ error: "Thumbnail too large. Maximum size is 5MB" });
            }
            await cloudinary.uploader.destroy(videoInfo.thumbnailId);
            const updatedThumbnail = await cloudinary.uploader.upload(thumbnailFile.tempFilePath);
            updateToMake.thumbnailUrl = updatedThumbnail.secure_url;
            updateToMake.thumbnailId = updatedThumbnail.public_id;
        }

        const updatedVideoDetails = await Video.findByIdAndUpdate(req.params.videoId, updateToMake, {
            new: true,
        });

        res.status(200).json({ updatedVideoDetails });
    } catch (err) {
        console.error("Error in PUT /:videoId:", err);
        res.status(500).json({ error: err.message });
    }
});


Router.delete("/:videoId", userAuth, async (req, res) => {
    try {
        const videoInfo = await Video.findById(req.params.videoId);

        if (!videoInfo) {
            return res.status(404).json({ error: "Video not found" });
        }
        if (req.user._id.toString() !== videoInfo.user_id.toString()) {
            return res.status(403).json({ error: "You don't have permission to delete this video" });
        }

        await Promise.all([
            cloudinary.uploader.destroy(videoInfo.videoId, { resource_type: "video" }),
            cloudinary.uploader.destroy(videoInfo.thumbnailId),
        ]);

        await Video.findByIdAndDelete(req.params.videoId);

        res.status(200).json({ msg: "Video deleted successfully" });
    } catch (err) {
        console.error("Error in DELETE /:videoId:", err);
        res.status(500).json({ error: err.message });
    }
});


// Toggle like — like if not liked, unlike if already liked
Router.put("/like/:videoId", userAuth, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const videoInfo = await Video.findById(req.params.videoId);

        if (!videoInfo) {
            return res.status(404).json({ error: "Video not found" });
        }

        const alreadyLiked = videoInfo.likedBy.some((id) => id.toString() === userId);

        if (alreadyLiked) {
            // Unlike
            videoInfo.likedBy = videoInfo.likedBy.filter((id) => id.toString() !== userId);
            videoInfo.likes = Math.max(0, videoInfo.likes - 1);
            await videoInfo.save();
            return res.status(200).json({ msg: "Like removed", liked: false, likes: videoInfo.likes });
        }

        // Remove dislike if present
        const hadDisliked = videoInfo.dislikedBy.some((id) => id.toString() === userId);
        if (hadDisliked) {
            videoInfo.dislikedBy = videoInfo.dislikedBy.filter((id) => id.toString() !== userId);
            videoInfo.dislikes = Math.max(0, videoInfo.dislikes - 1);
        }

        videoInfo.likes += 1;
        videoInfo.likedBy.push(req.user._id);
        await videoInfo.save();

        res.status(200).json({ msg: "Video liked", liked: true, likes: videoInfo.likes });
    } catch (err) {
        console.error("Error in /like/:videoId:", err);
        res.status(500).json({ error: err.message });
    }
});


// Toggle dislike — dislike if not disliked, undislike if already disliked
Router.put("/dislike/:videoId", userAuth, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const videoInfo = await Video.findById(req.params.videoId);

        if (!videoInfo) {
            return res.status(404).json({ error: "Video not found" });
        }

        const alreadyDisliked = videoInfo.dislikedBy.some((id) => id.toString() === userId);

        if (alreadyDisliked) {
            // Undislike
            videoInfo.dislikedBy = videoInfo.dislikedBy.filter((id) => id.toString() !== userId);
            videoInfo.dislikes = Math.max(0, videoInfo.dislikes - 1);
            await videoInfo.save();
            return res.status(200).json({ msg: "Dislike removed", disliked: false, dislikes: videoInfo.dislikes });
        }

        // Remove like if present
        const hadLiked = videoInfo.likedBy.some((id) => id.toString() === userId);
        if (hadLiked) {
            videoInfo.likedBy = videoInfo.likedBy.filter((id) => id.toString() !== userId);
            videoInfo.likes = Math.max(0, videoInfo.likes - 1);
        }

        videoInfo.dislikes += 1;
        videoInfo.dislikedBy.push(req.user._id);
        await videoInfo.save();

        res.status(200).json({ msg: "Video disliked", disliked: true, dislikes: videoInfo.dislikes });
    } catch (err) {
        console.error("Error in /dislike/:videoId:", err);
        res.status(500).json({ error: err.message });
    }
});


Router.put("/view/:videoId", async (req, res) => {
    try {
        const videoInfo = await Video.findById(req.params.videoId);
        if (!videoInfo) {
            return res.status(404).json({ error: "Video not found" });
        }
        videoInfo.views += 1;
        await videoInfo.save();
        res.status(200).json({ msg: "View count updated", views: videoInfo.views });
    } catch (err) {
        console.error("Error in /view/:videoId:", err);
        res.status(500).json({ error: err.message });
    }
});


Router.get("/:videoId", userAuth, async (req, res) => {
    try {
        const video = await Video.findById(req.params.videoId)
            .populate("user_id", "channelName logoUrl subscribers");
        if (!video) {
            return res.status(404).json({ error: "Video not found" });
        }
        res.status(200).json({ video });
    } catch (err) {
        console.error("Error in /:videoId:", err);
        res.status(500).json({ error: err.message });
    }
});


module.exports = Router;
