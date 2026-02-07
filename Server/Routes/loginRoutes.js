import express from "express";
import Users from "../Models/signupModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

const loginRouter = express.Router();

loginRouter.post("/",async(req,res)=>{
    try{
        const{email,password}=req.body;
        const user=await Users.findOne({email});
        if(!user){
            return res.status(404).json({message:"User not found"});
        }
        if(password!=user.password){
            return res.status(401).json({message:"Invalid credentials"});
        }
        const token=jwt.sign({email:user.email,userId:user._id},process.env.JWT_SECRET,{expiresIn:"1d"});
        res.status(200).json({token,ID:user._id});// Send token to client
    }
    catch(err){
        console.error("Login error:",err);
        res.status(500).json({message:"Server error"});
    }
})

loginRouter.get("/:useId",async(req,res)=>{
    const {useId}=req.params;
    const user=await Users.findById(useId);
    if(!user){
        res.status(401).send("user not found");
    }
    res.json({name:user.name})
})

export default loginRouter;
