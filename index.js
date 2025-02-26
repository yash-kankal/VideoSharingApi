const express = require("express");
const app = express();
const port = 3000;
const mongoose= require("mongoose");
require("dotenv").config();
const userRoute = require("./API/routes/user");
const videoRoute = require ("./API/routes/video")
const commentRoute = require("./API/routes/comment")
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser")
const cloudinary = require("cloudinary").v2


cloudinary.config({
    
})

app.use(express.json());


const connectMongoDB = async () =>
{
   try{

        const res = await mongoose.connect(process.env.MONGO_CONNECT)

        console.log("Connected to the Database Successfully!")


      } 
    catch(err){

        console.log(err)

    }

}

connectMongoDB();

app.use(bodyParser.json());

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/temp/"

}))


app.use("/user",userRoute)

app.use("/video/",videoRoute)

app.use("/comment/",commentRoute)

app.listen(port,()=>
{
    console.log("the server is running on port:"+ port)
})

