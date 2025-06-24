import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    user_id: { type: String, required: true },
    email: { type: String, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: false },
    size: { type: String, required: false },
    total_amount: { type: Number, required: false }
})

export const Order = mongoose.model("order", orderSchema);