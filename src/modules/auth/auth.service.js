import User from "./user.model.js";
import { AppError } from "../../utils/AppError.js";
import expressAsyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import { config } from "../../config/env.js";

// Helper function to create and send token
const createSendToken = (user, statusCode, res) => {
  const token = jwt.sign({ id: user._id }, config.jwt_secret, {
    expiresIn: config.jwt_expires_in,
  });

  const cookieOptions = {
    expires: new Date(
      Date.now() + config.jwt_cookie_expires_in * 24 * 60 * 60 * 1000
    ), // Convert days to milliseconds
    httpOnly: true,
  };

  // In production, use secure cookies (HTTPS only)
  if (config.node_env === "production") {
    cookieOptions.secure = true;
  }

  // Set cookie
  res.cookie("jwt", token, cookieOptions);

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

export const register = expressAsyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw new AppError("All fields are required", 400);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("User with this email already exists", 400);
  }

  const user = await User.create({ name, email, password });
  createSendToken(user, 201, res);
});

export const login = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError("Please provide email and password", 400);
  }

  // Find user and include password field
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError("Incorrect email or password", 401);
  }

  // Check if user is active
  if (!user.active) {
    throw new AppError("Your account has been deactivated", 403);
  }

  createSendToken(user, 200, res);
});

export const logout = expressAsyncHandler(async (req, res) => {
  res.cookie("jwt", "loggedout", {
    httpOnly: true,
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
});

// Get current user (optional helper function)
export const getMe = expressAsyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});
