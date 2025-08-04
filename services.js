import * as dao from './dao.js';
import bcrypt from 'bcrypt';
import { twilioClient, twilioSender } from './twilio.js';
import { PaymentStatus } from './constants.js';
import axios from 'axios';

export const createUser = async (name, password, email, location, phone) => {
    // const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await dao.createUser(name, password, email, location, phone);
    return createdUser;
}

export const updateUser = async (id, accessToken) => {
    const updatedUser = await dao.updateUser(id, accessToken);
    return updatedUser;
}

export const verifyOtpUser = async (userEmail, otp) => {
    const otpRecord = await dao.getUserByEmailOtp(userEmail);

    if (!otpRecord) {
        return { 
            success: false,
            message: 'Invalid OTP or user email not found' 
        };
    }

    // 1. Check if OTP is expired
    const isExpired = otpRecord.otp_expires_at < new Date();
    if (isExpired) {
        return { 
            success: false,
            message: 'OTP has expired' 
        };
    }
    // 2. Verify via 2Factor API
    const verifyResponse = await axios.get(`https://2factor.in/API/V1/${process.env.TWO_FACTOR_API_KEY}/SMS/VERIFY/${otpRecord.session_id}/${otp}`);
    
    // 3. Check verification status
    if (verifyResponse.data.Status !== "Success") {
        return { 
            success: false, 
            message: "Invalid OTP",
            data: otpRecord
        };
    }

    return {
        success: true,
        message: 'User OTP verified & logged-in Successfully',
        data: otpRecord
    }
};

export const sendOtp = async (phone) => {
    const otp = Math.floor(1000 + Math.random() * 9000);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // valid for 5 minutes
    
    const response = await axios.post(`https://2factor.in/API/V1/${process.env.TWO_FACTOR_API_KEY}/SMS/${phone}/${otp}/MernDine`)

    // Save to DB
    const userOtpUpdatedCount = await dao.updateUserOtp(phone, otp, expiresAt, response.data.Details);
    if (userOtpUpdatedCount === 0) {
        return { success: false, message: 'Failed to update OTP in db' };
    }


    // const response = await client.messages.create({
    //     body: `Your OTP is: ${otp}`,
    //     from: `whatsapp:${process.env.TWILIO_WHATSAPP_PHONE_NUMBER}`,
    //     to: `whatsapp:+91${phone}`
    // });
    return response;
};

export const loginUserDetails = async (userEmail, password, phone) => {
    return await dao.getUserLogin(userEmail, password, phone);
}

export const fetchUser = async (body) => {
    return await dao.findUser(body);
}

export const fetchFoodData = async () => {
    return await dao.fetchFoodData();
}

export const fetchFoodCategories = async () => {
    return await dao.fetchFoodCategories();
}

export const deleteUsers = async () => {
    return await dao.deleteAllUsers();
}

export const createOrder = async (userId, bodies) => {
    let orders = []
    for (const body of bodies) {
        const foodItems = await dao.fetchFoodItemsByName(body.name);
        let sizePrice = +foodItems.options[0][body.size];
        const totalPrice = body.qty * sizePrice;
        const order = await dao.createOrder(userId, body, totalPrice)
        if (order) {
            await dao.clearCart(userId)
        }
        orders.push(order)
    }
    return orders;
}

export const getAllOrders = async (userId) => {
    let orders = await dao.getAllOrders(userId)
    return orders;
}

export const addCartItem = async (userId, body) => {
    const foodItems = await dao.fetchFoodItemsByName(body.name);
    let sizePrice = +foodItems.options[0][body.size];
    const totalPrice = body.qty * sizePrice;
    const cartItemAdded = await dao.addCartItem(userId, body, totalPrice);
    return cartItemAdded;
}

export const getCartItems = async (userId) => {
    // const foodItems = await dao.fetchFoodItemsByName(body.name);
    // let sizePrice = +foodItems.options[0][body.size];
    // const totalPrice = body.qty * sizePrice;
    const cartItems = await dao.getCartItems(userId);
    return cartItems;
}


export const deleteCartItem = async (userId, body) => {
    const cartItemDeleted = await dao.deleteCartItem(userId, body);
    return cartItemDeleted;
}

export const createPayment = async (userId, orderId, amount, paymetStatus) => {
    const paymentCreated = await dao.createPaymentOrder(userId, orderId, amount, paymetStatus);
    return paymentCreated;
}

export const createPaymentOrder = async (userId, payload, orderAddress) => {
    const paymentVerified = await dao.createPaymentPendingOrder(userId, payload, orderAddress);
    return paymentVerified;
}

export const handleCashfreeWebhook = async (payload, signature) => {
    // const secret = process.env.CASHFREE_CLIENT_SECRET;

    if (payload.type === "PAYMENT_SUCCESS_WEBHOOK") {
        await dao.updatePaymentPendingOrder(payload.data.order?.order_id, PaymentStatus.VERIFIED, payload.data.payment_gateway_details?.gateway_payment_id);
    }

    else if (payload.type === "PAYMENT_FAILED_WEBHOOK") {
        await dao.updatePaymentPendingOrder(payload.data.order?.order_id, PaymentStatus.REJECTED, payload.data.payment_gateway_details?.gateway_payment_id);
    }

    else if (payload.type === "PAYMENT_USER_DROPPED_WEBHOOK") {
        await dao.updatePaymentPendingOrder(payload.data.order?.order_id, PaymentStatus.USER_DROPPED, payload.data.payment_gateway_details?.gateway_payment_id);
    }

    return true
};

