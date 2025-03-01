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


Router.get("/my-videos", userAuth, async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];

        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }

        const user = jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        const videos = await Video.find({ user_id: user._id }); // Corrected query

        res.status(200).json({ videos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

Router.post("/uploadvideo", userAuth, async (req,res)=>
{
    try
    {   

        mongoose.connect(process.env.MONGO_CONNECT);

        const token = req.headers.authorization.split(" ")[1]
            
        const user = jwt.verify(token, process.env.TOKEN_SECRET_KEY);

         const uploadedVideo = await cloudinary.uploader.upload(req.files.video.tempFilePath,{
            resource_type: "video"
         });

         const uploadedThumbnail = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath);

         const newVideo = await new Video(
            {
                _id: new mongoose.Types.ObjectId,
                title: req.body.title,
                description: req.body.description,
                user_id: user._id, 
                videoUrl: uploadedVideo.secure_url,
                videoId: uploadedVideo.public_id,
                thumbnailUrl: uploadedThumbnail.secure_url,
                thumbnailId: uploadedThumbnail.public_id,
                category: req.body.category,
                tags: req.body.tags.split(',')
            }

         )

         await newVideo.save();

         res.status(200).json({
            msg : "Video has been uploaded",
            "Uploaded Video Link" : newVideo.videoUrl
         })

    }

    catch(err)
    {
        return res.status(500).json(
            {
                error : err
            }
        )
    }
})



Router.put("/:videoId", userAuth, async (req,res)=>
{

    try
    {
       const token = req.headers.authorization.split(" ")[1];

        const user = jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        const videoInfo = await Video.findById(req.params.videoId)
        
        if( user._id == videoInfo.user_id )
        {
            if(req.files)
            {
                await cloudinary.uploader.destroy(videoInfo.thumbnailId)

                const updatedThumbnail = await cloudinary.uploader.upload(req.files.thumbnail.tempFilePath)

               const updateToMake = {

                    title: req.body.title,
                    description: req.body.description,
                    category: req.body.category,
                    tags: req.body.tags.split(','),
                    thumbnailUrl: updatedThumbnail.secure_url,
                    thumbnailId: updatedThumbnail.public_id

                }

              const updatedVideoDetails = await Video.findByIdAndUpdate(req.params.videoId, updateToMake, {new:true});

              res.status(200).json({
                updatedVideoDetails : updatedVideoDetails
              })
                

            }
            else
            {
               const updateToMake = {

                    title: req.body.title,
                    description: req.body.description,
                    category: req.body.category,
                    tags: req.body.tags.split(','),

                }

              const updatedVideoDetails = await Video.findByIdAndUpdate(req.params.videoId, updateToMake, {new:true});

                res.status(200).json({
                updatedVideoDetails : updatedVideoDetails
              })

            }
        }
        else{

           return res.status(500).json({

                error : "you are not authorized to update this video"

            })

        }

    }
    catch(err)
    {

        console.log(err)

        res.status(500).json({

            error : err 
        })
    }
   




})

Router.delete("/:videoId", userAuth, async (req,res)=>
{
    try
    {

        const token = req.headers.authorization.split(" ")[1];

        const user = await jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        const videoInfo = await Video.findById(req.params.videoId);

        console.log(user)

        console.log(videoInfo)

        if(user._id == videoInfo.user_id)
        {

            await cloudinary.uploader.destroy(videoInfo.videoId, {resource_type: "video"});

            await cloudinary.uploader.destroy(videoInfo.thumbnailId);

            const deletedResponse = await Video.findByIdAndDelete(req.params.videoId);

            res.status(200).json({
                msg: deletedResponse
            })

        }
        else{

            res.status(500).json({
                msg: "you dont have the permission"
            })
        }


    }
    catch(err)
    {

        res.status(500).json({

            msg: "video cannot be deleted"
        })

    }



})

Router.put("/like/:videoId", userAuth, async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const user = await jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        const videoInfo = await Video.findById(req.params.videoId);

        if (videoInfo.likedBy.includes(user._id)) {
            return res.status(400).json({
                msg: "You have already liked this video."
            });
        }

        if (videoInfo.dislikedBy.includes(user._id)) {
            videoInfo.dislikedBy = videoInfo.dislikedBy.filter(id => id.toString() !== user._id.toString());
            videoInfo.dislikes -= 1;
        }

        videoInfo.likes += 1;
        videoInfo.likedBy.push(user._id);

        await videoInfo.save();

        res.status(200).json({
            msg: "Video liked successfully."
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});


Router.put("/dislike/:videoId", userAuth, async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const user = await jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        const videoInfo = await Video.findById(req.params.videoId);

        if (videoInfo.dislikedBy.includes(user._id)) {
            return res.status(400).json({
                msg: "You have already disliked this video."
            });
        }

        if (videoInfo.likedBy.includes(user._id)) {
            videoInfo.likedBy = videoInfo.likedBy.filter(id => id.toString() !== user._id.toString());
            videoInfo.likes -= 1;
        }

        videoInfo.dislikes += 1;
        videoInfo.dislikedBy.push(user._id);

        await videoInfo.save();

        res.status(200).json({
            msg: "Video disliked successfully."
        });
    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});


Router.put("/view/:videoId", async (req, res) => {

    try {
        

        const videoInfo = await Video.findById(req.params.videoId);

        videoInfo.views += 1;

        await videoInfo.save();
        
        }

    catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});





module.exports = Router;


