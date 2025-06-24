import { access } from 'fs';
import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    location: { type: String, required: true },
    access_token: { type: String, default: null, required: false }
})

export const User = mongoose.model("user", userSchema);