const express = require("express");

const Router = express.Router();

const userAuth = require("../userAuth/userAuth");

const Video = require("../models/Video");

const mongoose = require("mongoose");

const Comment = require("../models/Comment");


// POST /comment/new-comment/:videoId — add a comment
Router.post("/new-comment/:videoId", userAuth, async (req, res) => {
    try {
        if (!req.body.comment || !req.body.comment.trim()) {
            return res.status(400).json({ error: "Comment text is required" });
        }

        const videoInfo = await Video.findById(req.params.videoId);
        if (!videoInfo) {
            return res.status(404).json({ error: "Video not found" });
        }

        const userComment = new Comment({
            _id: new mongoose.Types.ObjectId(),
            comment: req.body.comment.trim(),
            commentedBy: req.user._id,
            videoId: videoInfo._id,
        });

        await userComment.save();

        // Return the saved comment with author info
        const populated = await userComment.populate("commentedBy", "channelName logoUrl");

        res.status(201).json({ comment: populated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /comment/getcomments/:videoId — paginated comment list
Router.get("/getcomments/:videoId", async (req, res) => {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip  = (page - 1) * limit;

        const [comments, total] = await Promise.all([
            Comment.find({ videoId: req.params.videoId })
                .populate("commentedBy", "channelName logoUrl")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Comment.countDocuments({ videoId: req.params.videoId }),
        ]);

        res.status(200).json({
            commentList: comments,
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// PUT /comment/editcomment/:commentId — edit own comment
Router.put("/editcomment/:commentId", userAuth, async (req, res) => {
    try {
        if (!req.body.comment || !req.body.comment.trim()) {
            return res.status(400).json({ error: "Comment text is required" });
        }

        const commentInfo = await Comment.findById(req.params.commentId);
        if (!commentInfo) {
            return res.status(404).json({ error: "Comment not found" });
        }
        if (req.user._id.toString() !== commentInfo.commentedBy.toString()) {
            return res.status(403).json({ error: "You are not authorized to edit this comment" });
        }

        const updatedComment = await Comment.findByIdAndUpdate(
            req.params.commentId,
            { comment: req.body.comment.trim() },
            { new: true }
        ).populate("commentedBy", "channelName logoUrl");

        res.status(200).json({ updatedComment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// DELETE /comment/deletecomment/:commentId — delete own comment
Router.delete("/deletecomment/:commentId", userAuth, async (req, res) => {
    try {
        const commentInfo = await Comment.findById(req.params.commentId);
        if (!commentInfo) {
            return res.status(404).json({ error: "Comment not found" });
        }
        if (req.user._id.toString() !== commentInfo.commentedBy.toString()) {
            return res.status(403).json({ error: "You are not authorized to delete this comment" });
        }

        await Comment.findByIdAndDelete(req.params.commentId);

        res.status(200).json({ msg: "Comment deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = Router;
