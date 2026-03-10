const express = require("express");

const Router = express.Router();

const userAuth = require("../userAuth/userAuth");

const jwt = require("jsonwebtoken");

const cloudinary = require("cloudinary").v2

const Video = require("../models/Video");

const mongoose = require("mongoose");

const Comment = require("../models/Comment");

cloudinary.config({
    
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET ,
})




Router.get("/all-videos", userAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    jwt.verify(token, process.env.TOKEN_SECRET_KEY); // Token already verified by userAuth
    const videos = await Video.find()
      .populate("user_id", "channelName")
      .sort({ createdAt: -1 });
    res.status(200).json({ videos });
  } catch (error) {
    console.error("Error in /all-videos:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /my-videos - Get user's videos
Router.get("/my-videos", userAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    const user = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
    const videos = await Video.find({ user_id: user._id }).populate("user_id", "channelName");
    res.status(200).json({ videos });
  } catch (error) {
    console.error("Error in /my-videos:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /uploadvideo - Upload a new video
Router.post("/uploadvideo", userAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    const user = jwt.verify(token, process.env.TOKEN_SECRET_KEY);

    const uploadedVideo = await cloudinary.uploader.upload(req.files.video.tempFilePath, {
      resource_type: "video",
    });
    const uploadedThumbnail = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath);

    const newVideo = new Video({
      _id: new mongoose.Types.ObjectId(),
      title: req.body.title,
      description: req.body.description,
      user_id: user._id,
      videoUrl: uploadedVideo.secure_url,
      videoId: uploadedVideo.public_id,
      thumbnailUrl: uploadedThumbnail.secure_url,
      thumbnailId: uploadedThumbnail.public_id,
      category: req.body.category,
      tags: req.body.tags.split(","),
    });

    await newVideo.save();

    res.status(200).json({
      msg: "Video has been uploaded",
      "Uploaded Video Link": newVideo.videoUrl,
    });
  } catch (err) {
    console.error("Error in /uploadvideo:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /:videoId - Update video details
Router.put("/:videoId", userAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    const user = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
    const videoInfo = await Video.findById(req.params.videoId);

    if (user._id.toString() !== videoInfo.user_id.toString()) {
      return res.status(403).json({ error: "You are not authorized to update this video" });
    }

    const updateToMake = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      tags: req.body.tags.split(","),
    };

    if (req.files) {
      await cloudinary.uploader.destroy(videoInfo.thumbnailId);
      const updatedThumbnail = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath);
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

// DELETE /:videoId - Delete a video
Router.delete("/:videoId", userAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    const user = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
    const videoInfo = await Video.findById(req.params.videoId);

    if (user._id.toString() !== videoInfo.user_id.toString()) {
      return res.status(403).json({ msg: "You don’t have permission" });
    }

    await cloudinary.uploader.destroy(videoInfo.videoId, { resource_type: "video" });
    await cloudinary.uploader.destroy(videoInfo.thumbnailId);
    const deletedResponse = await Video.findByIdAndDelete(req.params.videoId);

    res.status(200).json({ msg: "Video deleted successfully", deletedResponse });
  } catch (err) {
    console.error("Error in DELETE /:videoId:", err);
    res.status(500).json({ msg: "Video cannot be deleted", error: err.message });
  }
});

// PUT /like/:videoId - Like a video
Router.put("/like/:videoId", userAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    const user = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
    const videoInfo = await Video.findById(req.params.videoId);

    if (videoInfo.likedBy.includes(user._id)) {
      return res.status(400).json({ msg: "You have already liked this video" });
    }

    if (videoInfo.dislikedBy.includes(user._id)) {
      videoInfo.dislikedBy = videoInfo.dislikedBy.filter(
        (id) => id.toString() !== user._id.toString()
      );
      videoInfo.dislikes -= 1;
    }

    videoInfo.likes += 1;
    videoInfo.likedBy.push(user._id);
    await videoInfo.save();

    res.status(200).json({ msg: "Video liked successfully" });
  } catch (err) {
    console.error("Error in /like/:videoId:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /dislike/:videoId - Dislike a video
Router.put("/dislike/:videoId", userAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    const user = jwt.verify(token, process.env.TOKEN_SECRET_KEY);
    const videoInfo = await Video.findById(req.params.videoId);

    if (videoInfo.dislikedBy.includes(user._id)) {
      return res.status(400).json({ msg: "You have already disliked this video" });
    }

    if (videoInfo.likedBy.includes(user._id)) {
      videoInfo.likedBy = videoInfo.likedBy.filter(
        (id) => id.toString() !== user._id.toString()
      );
      videoInfo.likes -= 1;
    }

    videoInfo.dislikes += 1;
    videoInfo.dislikedBy.push(user._id);
    await videoInfo.save();

    res.status(200).json({ msg: "Video disliked successfully" });
  } catch (err) {
    console.error("Error in /dislike/:videoId:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /view/:videoId - Increment view count
Router.put("/view/:videoId", async (req, res) => {
  try {
    const videoInfo = await Video.findById(req.params.videoId);
    if (!videoInfo) {
      return res.status(404).json({ error: "Video not found" });
    }
    videoInfo.views += 1;
    await videoInfo.save();
    res.status(200).json({ msg: "View count updated" });
  } catch (err) {
    console.error("Error in /view/:videoId:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /:videoId - Get single video (Moved after /all-videos)
Router.get("/:videoId", userAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    jwt.verify(token, process.env.TOKEN_SECRET_KEY); // Token already verified by userAuth
    const video = await Video.findById(req.params.videoId).populate("user_id", "channelName");
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

