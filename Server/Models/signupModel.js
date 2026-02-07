import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const signupSchema = new mongoose.Schema({
   name: {
      type: String,
      required: true
   },
   email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
   },
   password: {
      type: String,
      required: true
   }
}, { timestamps: true });


const signupModel = mongoose.model("User", signupSchema);

export default signupModel;
