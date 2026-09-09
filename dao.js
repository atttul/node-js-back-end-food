import mongoose from 'mongoose';
import { User } from "./user.js";
import { FoodItems } from "./food.js";
import { FoodCategories } from "./foodCategories.js"
import { Order } from "./order.js";
import { Cart } from "./cart.js";
import { Payment } from "./payments.js";
import { PaymentStatus } from "./constants.js";


export const createUser = async (name, password, email, location, phone) => {
    const savedUser = await User.create({
        name,
        password,
        email,
        location,
        phone_number: phone,
        role: 'user'
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

export const getUserByPhone = async (phone) => {
    return await User.findOne({ phone_number: phone });
};

export const getUserById = async (id) => {
    return await User.findById(id).select('-password -login_otp');
};

export const updateUserLocation = async (userId, location) => {
    return await User.updateOne(
        { _id: userId },
        { $set: { location: location } }
    );
};

export const getActiveOrderForUser = async (userId) => {
    await autoAcceptOverdueOrders();
    await reconcileVerifiedPayments(userId);
    return await Order.findOne({
        user_id: userId,
        order_status: { $in: ['PLACED', 'PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'] }
    }).sort({ created_at: -1 });
};

export const getUserByEmailOtp = async (email) => {
    return await User.findOne({
        email: email,
    });
};

export const getUserByEmailOrPhoneOtp = async (email, phone) => {
    if (email) {
        const userByEmail = await User.findOne({ email });
        if (userByEmail) return userByEmail;
    }
    if (phone) {
        const userByPhone = await User.findOne({ phone_number: phone });
        if (userByPhone) return userByPhone;
    }
    return null;
};



export const updateUserOtp = async (phone, otp, expiresAt, sessionId) => {
    const updatedUserOtp = await User.updateOne(
        {
            phone_number: phone
        },
        {
            $set: {
                login_otp: otp,
                otp_expires_at: expiresAt,
                session_id: sessionId
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

export const findUserByEmailAndPhone = async (email, phone) => {
    return await User.findOne({
        email: email,
        phone_number: phone
    });
};

export const updateUserPassword = async (email, newPassword) => {
    const updated = await User.updateOne(
        { email: email },
        { $set: { password: newPassword } }
    );
    return updated;
};

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

let foodCache = { data: null, timestamp: 0 };
let categoryCache = { data: null, timestamp: 0 };
let homeDataCache = { data: null, timestamp: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minutes in-memory cache

export const invalidateFoodCache = () => {
    foodCache = { data: null, timestamp: 0 };
    categoryCache = { data: null, timestamp: 0 };
    homeDataCache = { data: null, timestamp: 0 };
};

export const fetchFoodData = async () => {
    const now = Date.now();
    if (foodCache.data && (now - foodCache.timestamp < CACHE_TTL_MS)) {
        return foodCache.data;
    }
    const food = await FoodItems.find().lean();
    foodCache = { data: food, timestamp: now };
    return food;
}

export const fetchFoodCategories = async () => {
    const now = Date.now();
    if (categoryCache.data && (now - categoryCache.timestamp < CACHE_TTL_MS)) {
        return categoryCache.data;
    }
    const foodCategories = await FoodCategories.find().lean();
    categoryCache = { data: foodCategories, timestamp: now };
    return foodCategories;
}

export const fetchHomeData = async () => {
    const now = Date.now();
    if (homeDataCache.data && (now - homeDataCache.timestamp < CACHE_TTL_MS)) {
        return homeDataCache.data;
    }
    const [foodItems, foodCategories] = await Promise.all([
        fetchFoodData(),
        fetchFoodCategories()
    ]);
    const homeData = { foodItems, foodCategories };
    homeDataCache = { data: homeData, timestamp: now };
    return homeData;
}

export const fetchFoodItemsByName = async (name) => {
    if (!name) return null;
    const trimmed = String(name).trim();
    let foodItemsByName = await FoodItems.findOne({
        name: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }).lean();
    if (!foodItemsByName) {
        foodItemsByName = await FoodItems.findOne({ name: trimmed }).lean();
    }
    return foodItemsByName;
}

export const autoAcceptOverdueOrders = async () => {
    try {
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
        const overdueOrders = await Order.find({
            order_status: 'PENDING',
            created_at: { $lte: threeMinutesAgo }
        });

        for (const order of overdueOrders) {
            const acceptedAt = new Date();
            const deliveryDeadline = new Date(acceptedAt.getTime() + 30 * 60 * 1000);
            await Order.findByIdAndUpdate(order._id, {
                $set: {
                    order_status: 'ACCEPTED',
                    accepted_at: acceptedAt,
                    delivery_deadline: deliveryDeadline
                }
            });
        }
    } catch (err) {
        console.error("Error auto-accepting overdue orders:", err);
    }
};

export const reconcileVerifiedPayments = async (userId) => {
    try {
        if (!userId) return;
        const verifiedPayments = await Payment.find({
            user_id: userId,
            status: PaymentStatus.VERIFIED
        }).sort({ createdAt: -1 });

        for (const payment of verifiedPayments) {
            const existingOrder = await Order.findOne({ order_id: payment.order_id });
            if (existingOrder) continue;

            const pTime = payment.createdAt ? payment.createdAt.getTime() : Date.now();
            let cartItems = await Cart.find({
                user_id: userId,
                createdAt: {
                    $gte: new Date(pTime - 15 * 60 * 1000),
                    $lte: new Date(pTime + 15 * 60 * 1000)
                }
            });

            const targetAmount = Number(payment.order_amount) || 0;
            let matchedItems = [];
            let currentSum = 0;

            if (cartItems && cartItems.length > 0) {
                for (const item of cartItems) {
                    if (currentSum + (item.total_amount || 0) <= targetAmount) {
                        matchedItems.push(item);
                        currentSum += (item.total_amount || 0);
                    }
                }
            }

            if (matchedItems.length === 0) {
                const fallbackCart = await Cart.find({ user_id: userId }).sort({ _id: -1 }).limit(10);
                for (const item of fallbackCart) {
                    if (currentSum + (item.total_amount || 0) <= targetAmount) {
                        matchedItems.push(item);
                        currentSum += (item.total_amount || 0);
                    }
                }
            }

            const acceptedAt = payment.createdAt || new Date();
            const deliveryDeadline = new Date(acceptedAt.getTime() + 30 * 60 * 1000);

            if (matchedItems.length > 0) {
                for (const item of matchedItems) {
                    await Order.create({
                        order_id: payment.order_id,
                        user_id: userId,
                        email: payment.customer_email || 'customer@go-food.com',
                        product_name: item.product_name,
                        quantity: item.quantity || 1,
                        size: item.size || 'regular',
                        total_amount: item.total_amount,
                        created_at: acceptedAt,
                        estimated_delivery_minutes: 30,
                        order_status: 'ACCEPTED',
                        accepted_at: acceptedAt,
                        delivery_deadline: deliveryDeadline
                    });
                }
            } else {
                await Order.create({
                    order_id: payment.order_id,
                    user_id: userId,
                    email: payment.customer_email || 'customer@go-food.com',
                    product_name: `Delicious Food Order (${payment.order_id})`,
                    quantity: 1,
                    size: 'Standard',
                    total_amount: targetAmount,
                    created_at: acceptedAt,
                    estimated_delivery_minutes: 30,
                    order_status: 'ACCEPTED',
                    accepted_at: acceptedAt,
                    delivery_deadline: deliveryDeadline
                });
            }
        }
    } catch (err) {
        console.error("Auto reconcile payments error:", err);
    }
};

export const createOrder = async (userId, body, totalPrice) => {
    let email = body.email;
    if (!email) {
        try {
            const user = await User.findById(userId).lean();
            email = user?.email || `${user?.phone_number || 'customer'}@go-food.com`;
        } catch (e) {
            email = 'customer@go-food.com';
        }
    }

    const orderCreated = await Order.create({
        order_id: body.order_id || body.orderId || ('order_' + Date.now()),
        user_id: userId,
        email: email,
        product_name: body.name,
        quantity: Number(body.qty) || 1,
        size: body.size || 'regular',
        total_amount: totalPrice,
        created_at: new Date(),
        estimated_delivery_minutes: 30,
        order_status: 'PENDING'
    });

    // Per-Order Dynamic Timer: Automatically accept order after 3 minutes (180,000 ms) if still PENDING
    setTimeout(async () => {
        try {
            const currentOrder = await Order.findById(orderCreated._id);
            if (currentOrder && currentOrder.order_status === 'PENDING') {
                const acceptedAt = new Date();
                const deliveryDeadline = new Date(acceptedAt.getTime() + 30 * 60 * 1000);
                await Order.findByIdAndUpdate(orderCreated._id, {
                    $set: {
                        order_status: 'ACCEPTED',
                        accepted_at: acceptedAt,
                        delivery_deadline: deliveryDeadline
                    }
                });
                console.log(`[Auto-Accept] Order ${orderCreated._id} auto-accepted after 3 minutes in PENDING state.`);
            }
        } catch (err) {
            console.error(`[Auto-Accept Timer Error] Order ${orderCreated._id}:`, err);
        }
    }, 3 * 60 * 1000);

    return orderCreated;
};

export const getOrderById = async (orderId) => {
    if (!orderId) return null;
    let order = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
        order = await Order.findById(orderId);
    }
    if (!order) {
        order = await Order.findOne({ order_id: orderId });
    }
    if (!order) {
        const payment = await Payment.findOne({ order_id: orderId });
        if (payment && payment.user_id) {
            await reconcileVerifiedPayments(payment.user_id);
            order = await Order.findOne({ order_id: orderId });
            if (!order) {
                order = await Order.findOne({ user_id: payment.user_id }).sort({ created_at: -1 });
            }
        }
    }
    return order;
};

export const updateOrderStatus = async (orderId, status) => {
    const updated = await Order.updateOne(
        { _id: orderId },
        { $set: { order_status: status } }
    );
    return updated;
};

export const getAllOrders = async (userId) => {
    await autoAcceptOverdueOrders();
    await reconcileVerifiedPayments(userId);
    const allOrders = await Order.find({
        user_id: userId
    }).sort({ created_at: -1 });
    return allOrders;
};

export const getAllAdminOrders = async () => {
    await autoAcceptOverdueOrders();
    const allOrders = await Order.find({}).sort({ created_at: -1 });
    return allOrders;
};

export const acceptOrderAdmin = async (orderId) => {
    const acceptedAt = new Date();
    const deliveryDeadline = new Date(acceptedAt.getTime() + 30 * 60 * 1000);
    const updated = await Order.findByIdAndUpdate(
        orderId,
        {
            $set: {
                order_status: 'ACCEPTED',
                accepted_at: acceptedAt,
                delivery_deadline: deliveryDeadline
            }
        },
        { new: true }
    );
    return updated;
}

export const rejectOrderAdmin = async (orderId, reason = '') => {
    const rejectedAt = new Date();
    const updated = await Order.findByIdAndUpdate(
        orderId,
        {
            $set: {
                order_status: 'REJECTED',
                rejected_at: rejectedAt,
                rejection_reason: reason
            }
        },
        { new: true }
    );
    return updated;
}

export const clearCart = async (userId) => {
    const result = await Cart.updateMany(
        {
            user_id: userId,
            status: 1
        },
        {
            $set: {
                status: 0
            }
        }
    );
    return result;
};


export const addCartItem = async (userId, body, totalPrice) => {
    const name = String(body.name || '').trim();
    // Check if item already exists in user's active cart
    const existing = await Cart.findOne({
        user_id: userId,
        status: 1,
        product_name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });

    if (existing) {
        existing.quantity = Number(body.qty) || 1;
        existing.size = body.size || existing.size;
        existing.total_amount = totalPrice;
        await existing.save();
        return existing;
    }

    const addedCartItem = await Cart.create({
        user_id: userId,
        product_name: name,
        quantity: Number(body.qty) || 1,
        size: body.size,
        total_amount: totalPrice,
        status: 1
    });
    return addedCartItem;
};

export const getCartItems = async (userId) => {
    const CartItems = await Cart.find({
        user_id: userId,
        status: 1
    });
    return CartItems;
};


export const deleteCartItem = async (userId, body) => {
    const name = String(body.name || '').trim();
    const deletedCartItem = await Cart.updateMany(
        {
            user_id: userId,
            status: 1,
            product_name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        },
        {
            $set: {
                status: 0
            }
        }
    );

    return deletedCartItem;
};


export const createPaymentOrder = async (userId, orderId, amount, paymetStatus) => {
    const paymentCreated = await Payment.create({
        user_id: userId,
        order_id: orderId,
        amount: amount,
        payment: paymetStatus
    })
    return paymentCreated;
}

export const createPaymentPendingOrder = async (userId, payload, orderAddress) => {
    const paymentCreated = await Payment.create({
        user_id: userId,
        order_id: payload.order_id,
        order_amount: payload.order_amount,
        customer_id: payload.customer_details.customer_id,
        customer_name: payload.customer_details.customer_name,
        customer_email: payload.customer_details.customer_email,
        customer_phone: payload.customer_details.customer_phone,
        order_address: orderAddress,
        status: PaymentStatus.PENDING,
    });
    return paymentCreated;
}

export const updatePaymentPendingOrder = async (orderId, paymentStatus, paymentId) => {
    const paymentCreated = await Payment.updateOne(
        {
            order_id: orderId,
        },
        {
            $set: {
                payment_id: paymentId,
                status: paymentStatus,
            }
        }
    );
    return paymentCreated;
}

export const getPaymentOrderByOrderId = async (orderId) => {
    return await Payment.findOne({ order_id: orderId });
};

export const getAllUsersAdmin = async () => {
    return await User.find().select('-password -login_otp');
};

export const updateUserRoleAdmin = async (userId, role) => {
    return await User.findByIdAndUpdate(userId, { $set: { role } }, { new: true }).select('-password -login_otp');
};