import mongoose from "mongoose";

const profileSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    bio:{
        type:String,
        default:""
    },
    contestParticipated:{
        type:Number,
        default:0   
    },
    ConstestCreated:{
        type:Number,
        default:0
    },
    ContestScores:[]
})

const ProfileModel=mongoose.model("Profile",profileSchema);

export default ProfileModel;