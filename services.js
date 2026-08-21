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

export const verifyOtpUser = async (userEmail, otp, phone) => {
    const otpRecord = await dao.getUserByEmailOrPhoneOtp(userEmail, phone);

    if (!otpRecord) {
        return { 
            success: false,
            message: 'No account found matching this user detail for OTP verification.' 
        };
    }

    const inputOtp = String(otp || '').trim();
    const storedOtp = String(otpRecord.login_otp || '').trim();

    // 1. Accept test OTP 1234 or matching stored OTP
    if (inputOtp === '1234' || (storedOtp && inputOtp === storedOtp)) {
        return {
            success: true,
            message: 'User OTP verified & logged-in Successfully',
            data: otpRecord
        };
    }

    // 2. Check 2Factor API if configured
    if (process.env.TWO_FACTOR_API_KEY && otpRecord.session_id) {
        try {
            const verifyResponse = await axios.get(`https://2factor.in/API/V1/${process.env.TWO_FACTOR_API_KEY}/SMS/VERIFY/${otpRecord.session_id}/${otp}`);
            if (verifyResponse.data?.Status === "Success") {
                return {
                    success: true,
                    message: 'User OTP verified & logged-in Successfully',
                    data: otpRecord
                };
            }
        } catch (e) {
            console.warn("2Factor verification warning:", e.message);
        }
    }

    return {
        success: false,
        message: 'Invalid OTP code. Please enter valid 4-digit OTP code (or 1234 for testing).',
        data: otpRecord
    };
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

export const findUserByPhone = async (phone) => {
    return await dao.getUserByPhone(phone);
}


export const requestForgotPasswordOtp = async (email, phone) => {
    const user = await dao.findUserByEmailAndPhone(email, phone);
    if (!user) {
        return {
            success: false,
            message: 'No account found matching this Email Address and Phone Number.'
        };
    }
    const otpResponse = await sendOtp(phone);
    if (!otpResponse.status && otpResponse.data?.Status !== "Success") {
        return {
            success: false,
            message: 'Failed to send OTP to your registered phone number.'
        };
    }
    return {
        success: true,
        message: 'Password reset OTP code sent successfully to your phone.'
    };
};

export const resetPasswordWithOtp = async (email, otp, newPassword) => {
    const verification = await verifyOtpUser(email, otp);
    if (!verification.success) {
        return verification;
    }
    const updateResult = await dao.updateUserPassword(email, newPassword);
    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
        return {
            success: false,
            message: 'User account not found for password update.'
        };
    }
    return {
        success: true,
        message: 'Password has been reset successfully! You can now log in with your new password.'
    };
};


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

export const getOrderTrackingDetails = async (orderId) => {
    let order = null;
    if (orderId && orderId !== 'undefined' && orderId !== 'null') {
        try {
            order = await dao.getOrderById(orderId);
        } catch (e) {
            console.error("Order lookup error:", e);
        }
    }

    const createdTime = order?.created_at ? new Date(order.created_at).getTime() : Date.now();
    const elapsedSeconds = Math.floor((Date.now() - createdTime) / 1000);
    const estimatedMinutes = order?.estimated_delivery_minutes || 30;
    const totalDurationSeconds = estimatedMinutes * 60;
    const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);
    const progressPercentage = Math.min(100, Math.floor((elapsedSeconds / totalDurationSeconds) * 100));

    const restaurantCoords = order?.restaurant_coords || { lat: 28.6315, lng: 77.2167, name: 'Mern Dine Central Kitchen' };
    const userCoords = order?.user_coords || { lat: 28.6139, lng: 77.2090 };

    const fraction = progressPercentage / 100;
    const currentRiderLat = restaurantCoords.lat + (userCoords.lat - restaurantCoords.lat) * fraction;
    const currentRiderLng = restaurantCoords.lng + (userCoords.lng - restaurantCoords.lng) * fraction;

    let computedStatus = order?.order_status || 'PLACED';
    if (progressPercentage >= 100) {
        computedStatus = 'DELIVERED';
    } else if (progressPercentage >= 40) {
        computedStatus = 'OUT_FOR_DELIVERY';
    } else if (progressPercentage >= 15) {
        computedStatus = 'PREPARING';
    }

    return {
        orderId: order?._id || orderId || 'demo_order_123',
        product_name: order?.product_name || 'Food Order',
        total_amount: order?.total_amount || 0,
        size: order?.size || '',
        quantity: order?.quantity || 1,
        created_at: order?.created_at || new Date(),
        estimated_delivery_minutes: estimatedMinutes,
        remaining_seconds: remainingSeconds,
        progress_percentage: progressPercentage,
        status: computedStatus,
        restaurant_coords: restaurantCoords,
        user_coords: userCoords,
        rider_current_coords: {
            lat: Number(currentRiderLat.toFixed(6)),
            lng: Number(currentRiderLng.toFixed(6))
        },
        rider_details: order?.rider_details || {
            name: 'Rajesh Kumar',
            phone: '9876543210',
            vehicle: 'TVS Apache (DL 01 AB 4321)'
        }
    };
};

export const updateOrderStatus = async (orderId, status) => {
    return await dao.updateOrderStatus(orderId, status);
};


