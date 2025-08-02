import mongoose from 'mongoose';
import { PaymentStatus } from './constants.js';
const Schema = mongoose.Schema;

const paymentSchema = new Schema(
    {
        user_id: { type: String, required: false },
        order_id: { type: String, required: true },
        gateway_payment_id: { type: String, required: false },
        order_amount: { type: String, required: true },
        customer_id: { type: String, required: true },
        customer_name: { type: String, required: true },
        customer_email: { type: String, required: true },
        customer_phone: { type: String, required: true },
        status: {
            type: String, required: true,
            enum: [PaymentStatus.PENDING, PaymentStatus.IN_REVIEW, PaymentStatus.VERIFIED, PaymentStatus.REJECTED],
            default: PaymentStatus.PENDING,
        },
    },
    {
        timestamps: true
    }
);

export const Payment = mongoose.model("payment", paymentSchema);