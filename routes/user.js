const express = require("express")

const Router = express.Router();

const bcrypt = require("bcrypt");

const cloudinary = require("cloudinary").v2

require("dotenv").config();

const mongoose = require("mongoose");

const User = require("./Models/User");

const jwt = require("jsonwebtoken")

const app = express();

const cors = require("cors");
const userAuth = require("./userAuth/userAuth");


app.use(cors());

cloudinary.config({
    
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET ,
})



Router.post("/signup", async (req,res)=>
{

    try
    {

        const userEmail = await User.findOne({ email: req.body.email });

        if (userEmail) {
          return res.status(400).json({
            msg: "User is already registered, please try again with a different email address"
          });
        }
        
        const hashedPassword =  await  bcrypt.hash(req.body.password, 10)

        const uploadedImage = await cloudinary.uploader.upload(req.files.logoUrl.tempFilePath);
     
     
        const newUser = await new User({
     
         _id: new mongoose.Types.ObjectId(),
         channelName: req.body.channelName,
         email : req.body.email,
         phone: req.body.phone,
         password: hashedPassword,
         logoUrl: uploadedImage.secure_url,
         logoId: uploadedImage.public_id,
        })
     
        const users = await newUser.save();
     
        res.status(200).json({
         msg: "User Created!"
        })

    }
    catch (err)
    {
        res.status(500).json({
            Error: err
            
        })
    }


   
})


Router.post("/login", async(req,res)=>{

    try
    {
        console.log(req.body)
        
        const findUser = await User.findOne({email: req.body.email})

        console.log(findUser)

        if(!findUser)
        {
          return res.status(404).json({
                msg: "The user is not registered, please sign up!"
            })
        }
        
        const isValid = await bcrypt.compare(req.body.password, findUser.password) 

             if(!isValid)
            {
                return res.status(401).json({
                    msg: "Password doesn't match, please try again"
                })
            }
            
            const token =  jwt.sign({
                _id: findUser._id,
                channelName:findUser.channelName,
                email: findUser.email,
                phone: findUser.phone,
                subscribers: findUser.subscribers,
                logoId: findUser.logoId,
                
            }, process.env.TOKEN_SECRET_KEY,{expiresIn: "5h"})

            

            return res.status(200).json({
                msg: "User Login is Successful!",
                token: token

            })
      
    }
    catch(err)
    {
        res.status(500).json({
            Error: err
        })
    }

})



Router.put("/subscribe/:userId",userAuth,async(req,res)=>
{

    try
    {
        const token = req.headers.authorization.split(" ")[1];

        const userA = await jwt.verify(token, process.env.TOKEN_SECRET_KEY)

        const userB = await User.findById(req.params.userId);

        if(userB.subscribedBy.includes(userA._id))
        {
            return res.status(400).json(
                {
                    msg: "you have already subscribed to this channel"
                }
            )

        }


        userB.subscribedBy.push(userA._id)

        userB.subscribers += 1;

       await userB.save();

       const userAinfo = await User.findById(userA._id);

       userAinfo.subscribedChannenls.push(userB._id);

       await userAinfo.save();

       res.status(200).json({

           msg : "channel is now subscribed"
       })

        
    }

    catch(err)
    {

        res.status(400).json({
            err
        })
    }
  


})

Router.put("/unsubscribe/:userId",userAuth,async(req,res)=>
    {
    
        try
        {
            const token = req.headers.authorization.split(" ")[1];
    
            const userA = await jwt.verify(token, process.env.TOKEN_SECRET_KEY)
    
            const userB = await User.findById(req.params.userId);

            const userAinfo = await User.findById(userA._id);

            if(userAinfo.subscribedChannenls.includes(userB._id))
            {

                userAinfo.subscribedChannenls = userAinfo.subscribedChannenls.filter(id => id.toString() !== userB.id.toString())

                userB.subscribers -= 1;

                userB.subscribedBy = userB.subscribedBy.filter(id => id.toString() !== userAinfo.id.toString() );

                await userB.save();

                await userAinfo.save();

                res.status(200).json(
                    {
                        msg: "you have successfully unsubscribed to the channel"
                    }
                )
            }

            else
            {
                res.status(400).json(
                    {
                        msg: "you have not subscribed to this channel"
                    }
                )

            }

    
        }
    
        catch(err)
        {
    
            res.status(400).json({
                err
            })
        }
      
    
    
    })

module.exports = Router
