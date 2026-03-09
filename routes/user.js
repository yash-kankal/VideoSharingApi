const express = require("express");

const Router = express.Router();

const bcrypt = require("bcrypt");

const mongoose = require("mongoose");

const User = require("../models/User");

const jwt = require("jsonwebtoken");

const cloudinary = require("cloudinary").v2;

const userAuth = require("../userAuth/userAuth");

require("dotenv").config();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB


Router.post("/signup", async (req, res) => {
    try {
        const userEmail = await User.findOne({ email: req.body.email });

        if (userEmail) {
            return res.status(400).json({
                msg: "User is already registered, please try again with a different email address",
            });
        }

        if (!req.files || !req.files.logoUrl) {
            return res.status(400).json({ msg: "Channel logo is required" });
        }

        const logoFile = req.files.logoUrl;

        if (!ALLOWED_IMAGE_TYPES.includes(logoFile.mimetype)) {
            return res.status(400).json({ msg: "Invalid logo format. Allowed: jpg, png, webp, gif" });
        }
        if (logoFile.size > MAX_IMAGE_SIZE) {
            return res.status(400).json({ msg: "Logo too large. Maximum size is 5MB" });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        const uploadedImage = await cloudinary.uploader.upload(logoFile.tempFilePath);

        const newUser = new User({
            _id: new mongoose.Types.ObjectId(),
            channelName: req.body.channelName,
            email: req.body.email,
            phone: req.body.phone,
            password: hashedPassword,
            logoUrl: uploadedImage.secure_url,
            logoId: uploadedImage.public_id,
        });

        await newUser.save();

        res.status(200).json({ msg: "User Created!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


Router.post("/login", async (req, res) => {
    try {
        const findUser = await User.findOne({ email: req.body.email });

        if (!findUser) {
            return res.status(404).json({
                msg: "The user is not registered, please sign up!",
            });
        }

        const isValid = await bcrypt.compare(req.body.password, findUser.password);

        if (!isValid) {
            return res.status(401).json({
                msg: "Password doesn't match, please try again",
            });
        }

        const token = jwt.sign(
            {
                _id: findUser._id,
                channelName: findUser.channelName,
                email: findUser.email,
                phone: findUser.phone,
                subscribers: findUser.subscribers,
                logoId: findUser.logoId,
            },
            process.env.TOKEN_SECRET_KEY,
            { expiresIn: "5h" }
        );

        return res.status(200).json({
            msg: "User Login is Successful!",
            token: token,
            user: findUser,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


Router.put("/subscribe/:userId", userAuth, async (req, res) => {
    try {
        const userA = req.user;

        const userB = await User.findById(req.params.userId);
        if (!userB) {
            return res.status(404).json({ msg: "Channel not found" });
        }

        if (userB.subscribedBy.includes(userA._id)) {
            return res.status(400).json({ msg: "You have already subscribed to this channel" });
        }

        userB.subscribedBy.push(userA._id);
        userB.subscribers += 1;
        await userB.save();

        const userAinfo = await User.findById(userA._id);
        userAinfo.subscribedChannenls.push(userB._id);
        await userAinfo.save();

        res.status(200).json({ msg: "Channel is now subscribed" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


Router.put("/unsubscribe/:userId", userAuth, async (req, res) => {
    try {
        const userA = req.user;

        const userB = await User.findById(req.params.userId);
        if (!userB) {
            return res.status(404).json({ msg: "Channel not found" });
        }

        const userAinfo = await User.findById(userA._id);

        if (!userAinfo.subscribedChannenls.includes(userB._id)) {
            return res.status(400).json({ msg: "You have not subscribed to this channel" });
        }

        userAinfo.subscribedChannenls = userAinfo.subscribedChannenls.filter(
            (id) => id.toString() !== userB.id.toString()
        );
        userB.subscribers -= 1;
        userB.subscribedBy = userB.subscribedBy.filter(
            (id) => id.toString() !== userAinfo.id.toString()
        );

        await userB.save();
        await userAinfo.save();

        res.status(200).json({ msg: "You have successfully unsubscribed from the channel" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = Router;
