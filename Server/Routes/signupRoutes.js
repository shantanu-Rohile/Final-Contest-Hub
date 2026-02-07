import express from "express";
import Users from "../Models/signupModel.js";
import dotenv from "dotenv";
dotenv.config();

const signupRouter = express.Router();

signupRouter.post("/", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exist = await Users.findOne({ email });
    if (exist) {
      return res.status(400).json({ message: "User already exists" });
    }

    await Users.create({ name, email, password });

    return res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Signup error:", err);
  }
});


export default signupRouter;
