import jwt from "jsonwebtoken";
import User from "../models/auth.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import EVN from "../config/env.config.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req?.cookies?.accessToken ||
                req?.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "You are not logged in!");
  }

  try {
    const decodedToken = jwt.verify(token, EVN.JWT_ACCESS_SECRET);
    const user = await User.findById(decodedToken?.id).select("-refreshToken");

    if (!user) {
      throw new ApiError(401, "Invalid Access Token!");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid Access Token!");
  }
});

const authorizeRoles = (...roles) => {
  return (req, _res, next) => {
    // Superadmin has access to all routes
    if (req.user?.role === "superadmin") return next();

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }
    next();
  };
};

export { verifyJWT, authorizeRoles };
