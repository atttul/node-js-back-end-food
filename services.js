import * as dao from './dao.js';
import bcrypt from 'bcrypt';
import { twilioClient, twilioSender } from './twilio.js';

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
    const otpRecord = await dao.getUserByEmailOtp(userEmail, otp);

    if (!otpRecord) {
        return { success: false, message: 'Invalid OTP or user email not found' };
    }

    const isExpired = otpRecord.otp_expires_at < new Date();
    const isOtpMatched = otpRecord.login_otp === otp;

    const userLoggedIn = !isExpired && isOtpMatched;
    const userLoggedInMessage = userLoggedIn ? "User OTP verified & logged-in Successfully" : "OTP expired or does not match";
    return {
        success: userLoggedIn,
        message: userLoggedInMessage
    }
};

export const sendOtp = async (phone) => {
    const otp = Math.floor(100000 + Math.random() * 900000);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // valid for 5 minutes

    // Save to DB
    const userOtpUpdatedCount = await dao.updateUserOtp(phone, otp, expiresAt);
    if (userOtpUpdatedCount === 0) {
        return { success: false, message: 'Failed to update OTP in db' };
    }

    // Send via SMS
    const message = await twilioClient.messages.create({
        body: `Your login OTP is ${otp}. It will expire in 5 minutes.`,
        from: twilioSender,
        to: `+91${phone}`  // or format according to international rules
    });

    return {
        success: true,
        message: 'OTP sent via SMS',
        sid: message.sid,
        twilio_message: message
    };
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
