import mongoose from 'mongoose';
import { PaymentStatus } from './constants.js';
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    user_id: { type: String, required: true },
    order_id: { type: String, required: true },
    amount: { type: String, required: true },
    payment: {
        type: String,
        required: true,
        enum: [PaymentStatus.PENDING, PaymentStatus.IN_REVIEW, PaymentStatus.VERIFIED, PaymentStatus.REJECTED],  // allowed values
        default: PaymentStatus.PENDING,                                                                          // optional: default to 'pending'
    },
},
    {
        timestamps: true                                                                                         // optional: adds createdAt & updatedAt
    }
);

export const Payment = mongoose.model("payment", paymentSchema);