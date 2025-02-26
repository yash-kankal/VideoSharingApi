
const mongoose = require("mongoose")


const videoSchema = mongoose.Schema({

    _id: mongoose.Schema.Types.ObjectId,

    title:{
        type: String,
        required: true
    },

    description:{
        type: String,
        required: true
    },

    user_id:{
        type:String,
        required:true
    },

    videoUrl:{
        type:String,
        required: true
    },

    videoId:{
        type:String,
        required:true
    },

    thumbnailUrl:{
        type:String,
        required:true
    },

    thumbnailId:{
        type:String,
        default: 0
    },

    category:{
        type:String,
        default: 0
    },

    tags:[
        {
            type:String,
        }
    ],

    likes:{
        type:Number,
        default: 0
    },

    dislikes:{
        type:Number,
        default: 0
    },

    views: {
        type:Number,
        default: 0
    },


    likedBy:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],

    dislikedBy:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],

    viewedBy: [{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],

},{timestamps: true})

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;


