import { User } from "./user.js";
import { FoodItems } from "./food.js";
import { FoodCategories } from "./foodCategories.js"
import { Order } from "./order.js";
import { Cart } from "./cart.js";


export const createUser = async (name, password, email, location) => {
    const savedUser = await User.create({
        name,
        password,
        email,
        location
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

export const getUserLogin = async (userEmail, password) => {
    const loggedInUser = await User.findOne({
        email: userEmail,
        password: password
    })
    return loggedInUser;
}

export const findUsers = async () => {
    const user = await User.find();
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
