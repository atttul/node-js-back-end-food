import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const orderSchema = new Schema({
    order_id: { type: String, required: false },
    user_id: { type: String, required: true },
    email: { type: String, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: false },
    size: { type: String, required: false },
    total_amount: { type: Number, required: false },
    created_at: { type: Date, default: Date.now },
    estimated_delivery_minutes: { type: Number, default: 30 },
    order_status: { type: String, default: 'PENDING' },
    accepted_at: { type: Date, default: null },
    delivery_deadline: { type: Date, default: null },
    rejected_at: { type: Date, default: null },
    rejection_reason: { type: String, default: "" },
    restaurant_coords: {
        lat: { type: Number, default: 28.6315 },
        lng: { type: Number, default: 77.2167 },
        name: { type: String, default: 'Mern Dine Central Kitchen' }
    },
    user_coords: {
        lat: { type: Number, default: 28.6139 },
        lng: { type: Number, default: 77.2090 }
    },
    rider_details: {
        name: { type: String, default: 'Rajesh Kumar' },
        phone: { type: String, default: '9876543210' },
        vehicle: { type: String, default: 'TVS Apache (DL 01 AB 4321)' }
    }
})

export const Order = mongoose.model("order", orderSchema);