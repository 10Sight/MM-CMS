import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the same directory as this script (server/)
dotenv.config({ path: path.join(__dirname, '.env') });

const repair = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            console.error("MONGO_URI not found in .env");
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri, { dbName: process.env.DB_NAME });
        console.log('Connected.');

        // Access native driver collection
        const collection = mongoose.connection.db.collection('employees');

        // 1. Find all documents where 'department' exists and is NOT an array
        // $type: 7 is ObjectId, $type: "array" is array.
        // We want department that is NOT type array.
        const filter = {
            department: { $exists: true, $not: { $type: "array" } }
        };

        const count = await collection.countDocuments(filter);
        console.log(`Found ${count} documents with invalid 'department' field (single value instead of array).`);

        if (count === 0) {
            console.log("No repair needed.");
            process.exit(0);
        }

        console.log("Starting raw update...");
        // Use pipeline update to wrap single value in array
        // MongoDB 4.2+ supports update with aggregation pipeline
        const result = await collection.updateMany(
            filter,
            [
                {
                    $set: {
                        department: {
                            $cond: {
                                if: { $isArray: "$department" },
                                then: "$department",
                                else: ["$department"]
                            }
                        }
                    }
                }
            ]
        );

        console.log(`Matched ${result.matchedCount}, Modified ${result.modifiedCount}`);

        // Also handle nulls/missing if strict schema requires array
        // We can set them to []
        const nullFilter = { department: null };
        const nullResult = await collection.updateMany(nullFilter, { $set: { department: [] } });
        console.log(`Fixed ${nullResult.modifiedCount} null departments to []`);

        console.log("Repair complete.");
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
};

repair();
