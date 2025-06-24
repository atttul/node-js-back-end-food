import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUrl = process.env.MONGO_URI || '';
const mongoDb = async () => {
    try {
        await mongoose.connect(mongoUrl);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ MongoDB connection failed: ', error);
    }
};

export default mongoDb;