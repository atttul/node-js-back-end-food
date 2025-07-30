import { User } from "./user.js";
import { FoodItems } from "./food.js";
import { FoodCategories } from "./foodCategories.js"
import { Order } from "./order.js";
import { Cart } from "./cart.js";
import { Payment } from "./payments.js";


export const createUser = async (name, password, email, location, phone) => {
    const savedUser = await User.create({
        name,
        password,
        email,
        location,
        phone_number: phone
    })
    return savedUser;
}

export const updateUser = async (id, accessToken) => {
    const updatedUser = await User.updateOne(
        {
            _id: id
        },
        {
            $set: {
                access_token: accessToken
            }
        });
    return updatedUser;
}

export const getUserByEmail = async (email) => {
    return await User.findOne({ email });
};

export const getUserByEmailOtp = async (email, otp) => {
    return await User.findOne({
        email: email,
        login_otp: otp
    });
};

export const updateUserOtp = async (phone, otp, expiresAt) => {
    const updatedUserOtp = await User.updateOne(
        {
            phone_number: phone
        },
        {
            $set: {
                login_otp: otp,
                otp_expires_at: expiresAt
            }
        });
    return updatedUserOtp?.matchedCount;
}

export const getUserLogin = async (userEmail, password, phone) => {
    const loggedInUser = await User.findOne({
        email: userEmail,
        password: password,
        phone_number: phone
    })
    return loggedInUser;
}

export const findUser = async (body) => {
    const user = await User.findOne({
        email: body.email,
        password: body.password
    });
    return user;
}


export const deleteAllUsers = async () => {
    const user = await User.deleteMany({})
    return user;
}

export const fetchFoodData = async () => {
    const food = await FoodItems.find();
    return food;
}

export const fetchFoodCategories = async () => {
    const foodCategories = await FoodCategories.find();
    return foodCategories;
}

export const fetchFoodItemsByName = async (name) => {
    const foodItemsByName = await FoodItems.findOne({
        name: name
    })
    return foodItemsByName;
}

export const createOrder = async (userId, body, totalPrice) => {
    const orderCreated = await Order.create({
        user_id: userId,
        email: body.email,
        product_name: body.name,
        quantity: body.qty,
        size: body.size,
        total_amount: totalPrice,
    })
    return orderCreated;
}

export const getAllOrders = async (userId) => {
    const allOrders = await Order.find({
        user_id: userId
    })
    return allOrders;
}

export const clearCart = async (userId) => {
    await Cart.updateOne(
        {
            user_id: userId,
            status: 1
        },
        {
            $set: {
                status: 0
            }
        }
    )
}


export const addCartItem = async (userId, body, totalPrice) => {
    const addedCartItem = await Cart.create({
        user_id: userId,
        product_name: body.name,
        quantity: body.qty,
        size: body.size,
        total_amount: totalPrice
    })
    return addedCartItem;
}

export const getCartItems = async (userId) => {
    const CartItems = await Cart.find({
        user_id: userId,
        status: 1
    })
    return CartItems;
}


export const deleteCartItem = async (userId, body) => {
    const deletedCartItem = await Cart.updateOne(
        {
            user_id: userId,
            product_name: body.name,
            status: 1
        },
        {
            $set: {
                status: 0
            }
        }
    )

    return deletedCartItem;
}


export const createPaymentOrder = async (userId, orderId, amount, paymetStatus) => {
    const paymentCreated = await Payment.create({
        user_id: userId,
        order_id: orderId,
        amount: amount,
        payment: paymetStatus
    })
    return paymentCreated;
}