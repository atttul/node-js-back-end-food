import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern_dine';

let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const mongoDb = async () => {
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        };
        cached.promise = mongoose.connect(mongoUrl, opts).then((mongooseInstance) => {
            console.log('✅ Connected to MongoDB (Cached Connection)');
            return mongooseInstance;
        });
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error('❌ MongoDB connection failed: ', e);
        throw e;
    }
    return cached.conn;
};

export default mongoDb;