import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const cartSchema = new Schema({
    user_id: { type: String, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: false },
    size: { type: String, required: false },
    total_amount: { type: Number, required: false },
    status: { type: Number, required: true, default: 1 }
})

export const Cart = mongoose.model("cart", cartSchema);
// 11th webhook commit check
