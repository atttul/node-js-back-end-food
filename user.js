
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    location: { type: String, required: true },
    access_token: { type: String, default: null, required: false },
    phone_number: { type: Number, default: null, required: true, unique: true },
    login_otp: { type: Number, default: null, required: false },
    otp_expires_at: { type: Date, default: null, required: false },
    session_id: { type: String, default: null, required: false },
})

export const User = mongoose.model("user", userSchema);
