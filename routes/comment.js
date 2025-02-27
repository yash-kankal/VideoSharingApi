
const express = require("express");

const Router = express.Router();

const userAuth = require("./userAuth/userAuth");

const jwt = require("jsonwebtoken");

const cloudinary = require("cloudinary").v2

const Video = require("./models/Video");

const mongoose = require("mongoose");

const Comment = require("./models/Comment");

cloudinary.config({
    
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET ,
})

Router.put("/new-comment/:videoId", userAuth, async (req, res) => {

    
    const token = req.headers.authorization.split(" ")[1];
    const user = await jwt.verify(token, process.env.TOKEN_SECRET_KEY);
    
    const videoInfo = await Video.findById(req.params.videoId);
    
    const userComment = new Comment({
      _id: new mongoose.Types.ObjectId(),
      comment: req.body.comment,
      commentedBy: user._id,
      videoId: videoInfo._id,
    });
  
    await userComment.save();
  
    res.status(200).json({
      msg: userComment.comment,
    });
  });


  Router.put("/new-comment/:videoId", userAuth, async (req, res) => {

    try{

      const token = req.headers.authorization.split(" ")[1];
    const user = await jwt.verify(token, process.env.TOKEN_SECRET_KEY);
    
    const videoInfo = await Video.findById(req.params.videoId);
    
    const userComment = new Comment({
      _id: new mongoose.Types.ObjectId(),
      comment: req.body.comment,
      commentedBy: user._id,
      videoId: videoInfo._id,
    });
  
    await userComment.save();
  
    res.status(200).json({
      msg: userComment.comment,
    });

    }
    
    catch (err)
    {
      res.status(500).json({
        Error: err
      })
    }
  })


  Router.get("/getcomments/:videoId", async (req, res) => {


    try{

      const allcomments = await Comment.find({videoId: req.params.videoId}).populate('commentedBy');

      res.status(200).json({
  
        commentList: allcomments
      })
  

    }

    catch(err)
    {

      res.status(500).json({

        Error: err
      })
    }

  });

  Router.put("/editcomment/:commentId",userAuth, async (req, res) => {


    try{

      token = req.headers.authorization.split(" ")[1];

      const user = await jwt.verify(token, process.env.TOKEN_SECRET_KEY);

      console.log(user)

      const commentInfo = await Comment.findById(req.params.commentId);

      console.log(commentInfo)

      if(user._id.toString() === commentInfo.commentedBy.toString())
      {
         const updateToMake = {

          comment : req.body.comment
         }

         const updatedComment = await Comment.findByIdAndUpdate(req.params.commentId, updateToMake, {new:true})

         res.status(200).json({
          updatedComment : updatedComment
         })

      }

      else{

        res.status(500).json({
          error : "there is some issue you might wanna consider correcting"
        })
      }


    }

    catch(err)
    {

      res.status(500).json({

        Error: err
      })
    }
  });


  Router.delete("/deletecomment/:commentId",userAuth, async (req, res) => {


    try{

      token = req.headers.authorization.split(" ")[1];

      const user = await jwt.verify(token, process.env.TOKEN_SECRET_KEY);

      console.log(user)

      const commentInfo = await Comment.findById(req.params.commentId);

      console.log(commentInfo)

      if(user._id.toString() === commentInfo.commentedBy.toString())
      {

         await Comment.findByIdAndDelete(req.params.commentId)

         res.status(200).json({
          msg : "Comment has been deleted"
         })

      }

      else{

        res.status(500).json({
          error : "there is some issue you might wanna consider correcting"
        })
      }


    }

    catch(err)
    {

      res.status(500).json({

        Error: err
      })
    }
  });


  module.exports = Router;

