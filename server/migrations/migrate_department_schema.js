import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Employee from '../models/auth.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const migrate = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME,
        });
        console.log('Connected.');

        const employees = await Employee.find({ role: 'employee' });
        console.log(`Found ${employees.length} employees.`);

        let updatedCount = 0;

        for (const emp of employees) {
            // Check if department is already an array (in case script ran before or schema defaults handled it)
            // Note: Mongoose might return an array if schema is already changed, but we need to check the raw doc structure or just ensure it's an array.
            // Since we just changed the schema, Mongoose might cast the existing single ID to a 1-element array, or it might be weird.
            // Let's rely on Mongoose's casting but explicitly save it.

            const currentDept = emp.department;

            // If it's already an array, check if it needs cleanup
            if (Array.isArray(currentDept)) {
                // It's already an array, likely fine.
                console.log(`Employee ${emp.employeeId} already has array department.`);
                continue;
            }

            // If it is a single ID (which it shouldn't be effectively accessed as if schema says array, but let's be safe)
            // Actually, after schema change, Mongoose 'find' might try to cast the stored single ObjectId to the array.
            // However, the data in Mongo is still a single ObjectId field string.
            // MongoDB allows a field to be different types.
            // We want to force it to be an array.

            // To do this robustly without relying on Mongoose schema casting magic which might be confusing:
            // We should use updateOne with raw mongo operators or just save.

            // Let's use bulkWrite for safety or just loop save.
            // If schema interprets 'department' as array, 'emp.department' might come back as [ObjectId] even if DB has ObjectId.

            if (emp.department && emp.department.length > 0) {
                // Just saving might be enough if Mongoose casted it.
                // But let's check if it was a single value before.
                // It's safer to use updateOne.

                // We will read the raw value using lean() to see what's actually there if we weren't using the model with new schema.
                // But since we imported the new model...

                // Let's blindly wrap it in array if it exists.
                // Actually, since we updated the schema code, we need to be careful.
                // Let's just run an updateMany.
            }
        }

        // Direct MongoDB update is safer for type conversion
        const result = await Employee.collection.updateMany(
            { department: { $type: "objectId" } },
            [
                { $set: { department: ["$department"] } }
            ]
        );
        // Also handle strings if any
        const resultString = await Employee.collection.updateMany(
            { department: { $type: "string" } },
            [
                { $set: { department: ["$department"] } }
            ]
        );


        console.log(`Migration matched/modified: ${result.modifiedCount} (ObjectIds), ${resultString.modifiedCount} (Strings)`);

        console.log('Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

migrate();
