import * as services from './services.js'
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const addUser = async (req, res) => {
    try {
        const { name, password, email, location } = req.body;
        const savedUser = await services.createUser(name, password, email, location);

        const accessToken = jwt.sign(
            {
                userId: savedUser._id
            },
            process.env.SECRET_KEY || '',
            // {
            //     expiresIn: "72h" // for never expire token I have commented this line
            // }
        );
        const updated = await services.updateUser(savedUser._id, accessToken);

        savedUser.access_token = accessToken
        return res.json({
            success: true,
            message: 'User created successfully',
            accessToken,
            data: savedUser,
            updated: updated,
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `User did not create successfully. ${error}`
        })
    }
}

export const loginUser = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const userEmail = req.body.email;
        const password = req.body.password;

        const loginDetails = await services.loginUserDetails(userEmail, password);

        if (!loginDetails) {
            return res.json({
                success: false,
                message: `User invalid credential`
            })
        }

        return res.json({
            success: true,
            message: `User logged-in Successfully`,
            data: loginDetails
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `User could not logged-in. ${error}`
        })
    }
}

export const getUser = async (req, res) => {
    try {
        const id = req.user?.userId;
        const users = await services.fetchUsers();
        return res.json({
            success: true,
            message: 'Users detail fetched Successfully',
            data: users
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `Users detail could not found. ${error}`
        })
    }
}

export const deleteUsers = async (req, res) => {
    try {
        const users = await services.deleteUsers();
        return res.json({
            success: true,
            message: 'Users detail fetched Successfully',
            data: users
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `Users detail could not found. ${error}`
        })
    }
}

export const getFoodData = async (req, res) => {
    try {
        // const id = req.user.userId;
        const food = await services.fetchFoodData();
        return res.json({
            success: true,
            message: 'Food detail fetched Successfully',
            data: food
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `Food detail could not found. ${error}`
        })
    }
}

export const getFoodCategories = async (req, res) => {
    try {
        const foodCategories = await services.fetchFoodCategories();
        return res.json({
            success: true,
            message: 'FoodCategories detail fetched Successfully',
            data: foodCategories
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `FoodCategories detail could not found. ${error}`
        })
    }
}

export const createOrder = async (req, res) => {
    try {
        const userId = req.user?.userId
        const createdOrders = await services.createOrder(userId, req.body);
        return res.json({
            success: true,
            message: 'Order Created Successfully',
            data: createdOrders
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `Order Creation Failed. ${error}`
        })
    }
}

export const getAllOrders = async (req, res) => {
    try {
        const userId = req.user?.userId
        const allOrders = await services.getAllOrders(userId, req.body);
        return res.json({
            success: true,
            message: 'Order Fetched Successfully',
            data: allOrders
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `Order Fetched Failed. ${error}`
        })
    }
}

export const addCartItem = async (req, res) => {
    try {
        const userId = req.user?.userId
        const cartItemAdded = await services.addCartItem(userId, req.body);
        return res.json({
            success: true,
            message: 'Cart Item Added Successfully',
            data: cartItemAdded
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `Cart Item Addition Failed. ${error}`
        })
    }
}
export const getCartItems = async (req, res) => {
    try {
        const userId = req.user?.userId
        const cartItems = await services.getCartItems(userId);
        return res.json({
            success: true,
            message: 'Fetched Cart Items Successfully',
            data: cartItems
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `Cart Items Fetching Failed. ${error}`
        })
    }
}


export const deleteCartItem = async (req, res) => {
    try {
        const userId = req.user?.userId
        const cartItemDeleted = await services.deleteCartItem(userId, req.body);
        return res.json({
            success: true,
            message: 'Cart Item Deleted Successfully',
            data: cartItemDeleted
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `Cart Item Deletion Failed. ${error}`
        })
    }
}
