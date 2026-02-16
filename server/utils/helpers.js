import { v4 as uuidv4 } from "uuid";

import logger from "../logger/winston.logger.js";
import User from "../models/auth.model.js";
import { ApiError } from "./ApiError.js";

export const generateUniqueUsername = async () => {
    let username;
    let isUnique = false;

    while(!isUnique) {
        const uuid = uuidv4().replace(/-/g, "");
        const numericPart = parseInt(uuid.slice(0, 8), 16) % 100000;
        username = numericPart.toString().padStart(5, "0");

        const existingUser = await User.findOne({ username });
        if(!existingUser) {
            isUnique = true;
        }
    }
    return username;
};

export const makeSlug = (str) =>
    String(str || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");