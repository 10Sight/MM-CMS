import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "../models/auth.model.js";
import EVN from "../config/env.config.js";

dotenv.config({ path: "./.env" });

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    const uri = EVN.MONGO_URI || process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is not defined in environment variables");
    }
    await mongoose.connect(uri);
    console.log("Connected to MongoDB...");

    const userData = {
      fullName: "Rahul Patil",
      emailId: "rahul.patil@motherson.com",
      employeeId: "Motherson",
      password: "LPA@2026",
      role: "superadmin",
      designation: "none",
      isAdminPower: true
    };

    // Check if user already exists
    const existingUser = await Employee.findOne({
      $or: [
        { employeeId: userData.employeeId },
        { emailId: userData.emailId }
      ]
    });

    if (existingUser) {
      console.log("Superadmin user already exists with this Employee ID or Email.");
      process.exit(0);
    }

    const newUser = await Employee.create(userData);
    console.log("Superadmin user created successfully!");
    console.log("Details:", {
      Name: newUser.fullName,
      "Employee ID": newUser.employeeId,
      Role: newUser.role
    });

    process.exit(0);
  } catch (error) {
    console.error("Error creating superadmin:", error.message);
    process.exit(1);
  }
};

createSuperAdmin();
