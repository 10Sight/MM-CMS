import mongoose from "mongoose";
import logger from "../logger/winston.logger.js";
import EVN from "../config/env.config.js";

// Configure mongoose for better performance
mongoose.set('strictQuery', false);

const connectDB = async () => {
    // Connection URIs in order of preference
    const connectionURIs = [
        EVN.MONGO_URI, // Primary from env
        'mongodb://localhost:27017/automobile_inspection', // Local fallback
        'mongodb://127.0.0.1:27017/automobile_inspection' // Alternative local
    ].filter(Boolean); // Remove any undefined values

    if (connectionURIs.length === 0) {
        logger.error('No MongoDB URI available. Please set MONGO_URI in environment variables.');
        // Do not exit; allow app to run without DB for limited functionality
        return false;
    }

    for (let i = 0; i < connectionURIs.length; i++) {
        const uri = connectionURIs[i];
        try {
            logger.info(`Attempting to connect to MongoDB (${i + 1}/${connectionURIs.length}): ${uri.replace(/\/\/.*@/, '//***@')}`);
            
            const conn = await mongoose.connect(uri, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                connectTimeoutMS: 5000,
                // Removed problematic buffer options for compatibility
            });
            
            logger.info(`✅ MongoDB Connected Successfully: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
            
            // Handle connection events
            mongoose.connection.on('error', (err) => {
                logger.error('MongoDB connection error:', err.message);
            });
            
            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected');
            });
            
            // Graceful shutdown
            process.on('SIGINT', async () => {
                await mongoose.connection.close();
                logger.info('MongoDB connection closed through app termination');
                process.exit(0);
            });
            
            return true; // Success
            
        } catch (error) {
            logger.warn(`❌ MongoDB connection ${i + 1} failed: ${error.message}`);
            
            if (i === connectionURIs.length - 1) {
                // This was the last attempt
                logger.error('🚨 All MongoDB connection attempts failed!');
                logger.error('Please ensure MongoDB is running locally or check your Atlas connection.');
                
                if (process.env.NODE_ENV === 'development') {
                    logger.info('💡 To install MongoDB locally: https://www.mongodb.com/docs/manual/installation/');
                    logger.info('💡 Or start with Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest');
                }
                
                // Do not exit; allow app to run without DB for limited functionality
                return false;
            }
            
            // Wait a bit before trying next connection
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return false;
};

export default connectDB;
