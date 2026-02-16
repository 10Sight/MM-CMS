import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Employee from './models/auth.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from parent directory (since script is in server/)
dotenv.config({ path: path.join(__dirname, '../.env') });

const repair = async () => {
    try {
        console.log('Connecting to DB...');
        // Fallback URI if env not loaded (unlikely if path is correct)
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error('MONGO_URI is undefined. Check .env path.');
        }

        await mongoose.connect(uri, {
            dbName: process.env.DB_NAME || 'Audit_Management_System', // Fallback or strict
        });
        console.log('Connected.');

        console.log('Scanning all employees for legacy department fields...');

        // Fetch all employees. We use lean() to get POJOs to inspect raw structure easily, 
        // but we need HydratedDocuments to save(), so let's just find().
        const employees = await Employee.find({});

        let fixed = 0;
        for (const emp of employees) {
            // Access raw property if possible, or just check standard property.
            // Mongoose might cast single ID to [ID] if schema rules say so, 
            // BUT if it was stored as ObjectId, accessing emp.department might return [ObjectId].
            // However, we want to force a write to the DB.

            // If we just .save() every employee, Mongoose should enforce the schema and convert ObjectId -> [ObjectId].
            // But to be sure, we check.

            let shouldSave = false;

            // Check internal property if possible or just rely on re-saving
            // Let's modify it to trigger save.

            if (!Array.isArray(emp.department)) {
                console.log(`Found non-array for ${emp.employeeId}`);
                emp.department = emp.department ? [emp.department] : [];
                shouldSave = true;
            } else {
                // Even if it looks like an array in Mongoose (due to casting), 
                // the DB might have ObjectId.
                // We force markModified to ensure update.
                emp.markModified('department');
                shouldSave = true;
            }

            if (shouldSave) {
                await emp.save();
                fixed++;
            }
        }

        console.log(`Repair finished. Reprocessed ${fixed} documents.`);
        process.exit(0);
    } catch (error) {
        console.error('Repair failed:', error);
        process.exit(1);
    }
};

repair();
