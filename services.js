import * as dao from './dao.js';
import bcrypt from 'bcrypt';

export const createUser = async(name, password, email, location ) => {
    // const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await dao.createUser(name, password, email, location );
    return createdUser;
}

export const updateUser = async(id, accessToken) => {
    const updatedUser = await dao.updateUser(id, accessToken);
    return updatedUser;
}

export const loginUserDetails = async (userEmail, password) => {
    return await dao.getUserLogin(userEmail, password);
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
