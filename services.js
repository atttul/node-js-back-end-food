import * as dao from './dao.js';
import bcrypt from 'bcrypt';
import { twilioClient, twilioSender } from './twilio.js';
import { PaymentStatus } from './constants.js';
import axios from 'axios';

export const createUser = async (name, password, email, location, phone) => {
    if (email) {
        const existingEmail = await dao.getUserByEmail(email);
        if (existingEmail) {
            return {
                alreadyExists: true,
                message: 'An account with this Email Address already exists. If you forgot your password, please reset it using Forgot Password.'
            };
        }
    }
    if (phone) {
        const existingPhone = await dao.getUserByPhone(phone);
        if (existingPhone) {
            return {
                alreadyExists: true,
                message: 'An account with this Mobile Number already exists. If you forgot your password, please reset it using Forgot Password.'
            };
        }
    }

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

export const getUserProfile = async (userId) => {
    return await dao.getUserById(userId);
}

export const updateUserLocation = async (userId, location) => {
    return await dao.updateUserLocation(userId, location);
}

export const getActiveUserOrder = async (userId) => {
    return await dao.getActiveOrderForUser(userId);
}

export const fetchFoodData = async () => {
    return await dao.fetchFoodData();
}

export const fetchFoodCategories = async () => {
    return await dao.fetchFoodCategories();
}

export const fetchHomeData = async () => {
    return await dao.fetchHomeData();
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

    let remainingSeconds = 1800;
    let progressPercentage = 0;
    let computedStatus = order?.order_status || 'PENDING';
    let isPendingAcceptance = false;
    let autoAcceptRemainingSeconds = 0;

    const restaurantCoords = order?.restaurant_coords || { lat: 28.6315, lng: 77.2167, name: 'Mern Dine Central Kitchen' };
    const userCoords = order?.user_coords || { lat: 28.6139, lng: 77.2090 };

    if (computedStatus === 'REJECTED') {
        remainingSeconds = 0;
        progressPercentage = 0;
    } else if (computedStatus === 'PENDING' || computedStatus === 'PLACED') {
        // Order is waiting for restaurant acceptance (auto-accepts in 3 mins)
        // Delivery 30-min timer has NOT started yet!
        remainingSeconds = (order?.estimated_delivery_minutes || 30) * 60;
        progressPercentage = 0;
        isPendingAcceptance = true;
        
        const createdTime = order?.created_at ? new Date(order.created_at).getTime() : Date.now();
        const elapsedSinceCreated = Math.floor((Date.now() - createdTime) / 1000);
        autoAcceptRemainingSeconds = Math.max(0, 180 - elapsedSinceCreated);
    } else if (order?.accepted_at && order?.delivery_deadline) {
        // Order was accepted by admin or auto-accepted! 30-min timer is running!
        const acceptedTime = new Date(order.accepted_at).getTime();
        const deadlineTime = new Date(order.delivery_deadline).getTime();
        const now = Date.now();
        const totalDurationSeconds = Math.max(1, Math.floor((deadlineTime - acceptedTime) / 1000));
        const elapsedSeconds = Math.max(0, Math.floor((now - acceptedTime) / 1000));

        remainingSeconds = Math.max(0, Math.floor((deadlineTime - now) / 1000));
        progressPercentage = Math.min(100, Math.floor((elapsedSeconds / totalDurationSeconds) * 100));
    } else {
        // Fallback for accepted orders without explicit timestamps
        const acceptedTime = order?.created_at ? new Date(order.created_at).getTime() : Date.now();
        const estimatedMinutes = order?.estimated_delivery_minutes || 30;
        const totalDurationSeconds = estimatedMinutes * 60;
        const elapsedSeconds = Math.floor((Date.now() - acceptedTime) / 1000);
        remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);
        progressPercentage = Math.min(100, Math.floor((elapsedSeconds / totalDurationSeconds) * 100));
    }

    const fraction = progressPercentage / 100;
    const currentRiderLat = restaurantCoords.lat + (userCoords.lat - restaurantCoords.lat) * fraction;
    const currentRiderLng = restaurantCoords.lng + (userCoords.lng - restaurantCoords.lng) * fraction;

    return {
        orderId: order?._id || orderId || 'demo_order_123',
        product_name: order?.product_name || 'Food Order',
        total_amount: order?.total_amount || 0,
        size: order?.size || '',
        quantity: order?.quantity || 1,
        created_at: order?.created_at || new Date(),
        accepted_at: order?.accepted_at || null,
        delivery_deadline: order?.delivery_deadline || null,
        estimated_delivery_minutes: order?.estimated_delivery_minutes || 30,
        remaining_seconds: remainingSeconds,
        progress_percentage: progressPercentage,
        is_pending_acceptance: isPendingAcceptance,
        auto_accept_remaining_seconds: autoAcceptRemainingSeconds,
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

export const getAllAdminOrders = async () => {
    const orders = await dao.getAllAdminOrders();
    const metrics = {
        total: orders.length,
        pending: orders.filter(o => o.order_status === 'PENDING' || o.order_status === 'PLACED').length,
        accepted: orders.filter(o => o.order_status === 'ACCEPTED' || o.order_status === 'PREPARING' || o.order_status === 'OUT_FOR_DELIVERY').length,
        delivered: orders.filter(o => o.order_status === 'DELIVERED').length,
        rejected: orders.filter(o => o.order_status === 'REJECTED').length
    };
    return { orders, metrics };
};

export const acceptOrderAdmin = async (orderId) => {
    const order = await dao.getOrderById(orderId);
    if (!order) {
        return { success: false, message: 'Order not found.' };
    }
    if (order.order_status === 'REJECTED') {
        return { success: false, message: 'Cannot accept an order that has already been rejected.' };
    }
    if (['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.order_status)) {
        return { success: false, message: `Order has already been accepted (current status: ${order.order_status}).` };
    }

    const updated = await dao.acceptOrderAdmin(orderId);
    return {
        success: true,
        message: 'Order accepted successfully! 30-minute delivery clock started.',
        data: updated
    };
};

export const rejectOrderAdmin = async (orderId, reason = '') => {
    const order = await dao.getOrderById(orderId);
    if (!order) {
        return { success: false, message: 'Order not found.' };
    }
    if (['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.order_status)) {
        return { success: false, message: 'Cannot reject an order that has already been accepted.' };
    }
    if (order.order_status === 'REJECTED') {
        return { success: false, message: 'Order is already rejected.' };
    }

    const updated = await dao.rejectOrderAdmin(orderId, reason);
    return {
        success: true,
        message: 'Order rejected successfully.',
        data: updated
    };
};

export const updateAdminOrderStatus = async (orderId, status) => {
    const order = await dao.getOrderById(orderId);
    if (!order) {
        return { success: false, message: 'Order not found.' };
    }
    if (order.order_status === 'REJECTED') {
        return { success: false, message: 'Cannot update status of a rejected order.' };
    }

    const validStatuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
        return { success: false, message: `Invalid status '${status}'.` };
    }

    await dao.updateOrderStatus(orderId, status);
    const updated = await dao.getOrderById(orderId);
    return {
        success: true,
        message: `Order status updated to '${status}'.`,
        data: updated
    };
};

export const getAllUsersAdmin = async () => {
    const users = await dao.getAllUsersAdmin();
    return users.map(u => ({
        ...u.toObject(),
        role: u.role || 'user'
    }));
};

export const updateUserRoleAdmin = async (adminUserId, targetUserId, newRole) => {
    if (!['user', 'admin'].includes(newRole)) {
        return { success: false, message: `Invalid role '${newRole}'. Allowed roles: 'user', 'admin'.` };
    }

    if (String(adminUserId) === String(targetUserId)) {
        return { success: false, message: 'Security Policy Violation: You cannot modify your own administrative role.' };
    }

    const targetUser = await dao.getUserById(targetUserId);
    if (!targetUser) {
        return { success: false, message: 'Target user not found.' };
    }

    const updatedUser = await dao.updateUserRoleAdmin(targetUserId, newRole);
    return {
        success: true,
        message: `User '${updatedUser.name || updatedUser.email}' role updated to '${newRole}'.`,
        data: updatedUser
    };
};


