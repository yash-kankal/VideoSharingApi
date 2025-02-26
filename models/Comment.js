const mongoose = require("mongoose");


const commentSchema = mongoose.Schema({

    _id: mongoose.Schema.Types.ObjectId,

    comment: {type:String, required:true},

    commentedBy: {type: mongoose.Schema.ObjectId, ref: "User"},

    videoId : {type: mongoose.Schema.ObjectId, ref: "Video"}
    
},{timestamps:true})

const Comment = mongoose.model("Comments", commentSchema)

module.exports = Comment;