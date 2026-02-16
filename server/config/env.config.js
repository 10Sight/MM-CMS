import { config } from "dotenv";

config();

const EVN = {
    PORT: process.env.PORT || 5000,
    MONGO_URI: process.env.MONGO_URI,

    NODE_ENV: process.env.NODE_ENV || "development",
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_EXPIRY: process.env.JWT_ACCESS_EXPIRES_IN || "1d",
    
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
    REDIS_HOST: process.env.REDIS_HOST || "localhost",
    REDIS_PORT: process.env.REDIS_PORT || 6379,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD || "",
    SESSION_SECRET: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

    SMTP_USERNAME: process.env.SMTP_USERNAME,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,

    TWILIO_SID: process.env.TWILIO_SID,
    TWILIO_AUTH: process.env.TWILIO_AUTH,
    TWILIO_NUMBER: process.env.TWILIO_NUMBER,

    // Public client base URL for assets/links in emails (e.g. https://app.example.com)
    CLIENT_URL: process.env.CLIENT_URL,
}

export default EVN;
