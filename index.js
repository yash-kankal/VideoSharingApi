const express = require("express");
const app = express();
const port = 3000;
const mongoose = require("mongoose");
require("dotenv").config();
const userRoute = require("./routes/user");
const videoRoute = require("./routes/video");
const commentRoute = require("./routes/comment");
const fileUpload = require("express-fileupload");
const cloudinary = require("cloudinary").v2;
const cors = require("cors");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

app.use(express.json());
app.use(cors());
app.use(fileUpload({ useTempFiles: true, tempFileDir: "/tmp/" }));

const connectMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_CONNECT);
        console.log("Connected to the Database Successfully!");
    } catch (err) {
        console.error("Database connection failed:", err);
        process.exit(1);
    }
};

connectMongoDB();

app.use("/user", userRoute);
app.use("/video/", videoRoute);
app.use("/comment/", commentRoute);

app.listen(port, () => {
    console.log("the server is running on port:" + port);
});
