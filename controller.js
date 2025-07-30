import * as services from './services.js'
import jwt from 'jsonwebtoken';
import * as razorpay from './razorpay.js'
import crypto from "crypto";
import { PaymentStatus } from "./constants.js"; // optional
import shortid from 'shortid';
import dotenv from 'dotenv';
dotenv.config();

export const addUser = async (req, res) => {
    try {
        const { name, password, email, location, phone } = req.body;
        const savedUser = await services.createUser(name, password, email, location, phone);

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
        // const userId = req.user?.userId;
        const userEmail = req.body.email;
        const password = req.body.password;
        const phone = req.body.phone;

        if (!phone) {
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }

        const loginDetails = await services.loginUserDetails(userEmail, password, phone);

        if (!loginDetails) {
            return res.json({
                success: false,
                message: `User invalid credential`
            })
        }

        const otpSent = await services.sendOtp(phone);
        if (!otpSent.success) {
            return res.json({
                success: false,
                message: otpSent.message
            })
        }
        return res.json({
            success: true,
            message: otpSent.message,
            data: loginDetails
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `User could not logged-in. ${error}`
        })
    }
}

export const verifyOtp = async (req, res) => {
    try {
        const userEmail = req.body.email;
        const otp = req.body.otp;

        const verifiedUser = await services.verifyOtpUser(userEmail, otp);

        return res.json({
            success: verifiedUser.success,
            message: verifiedUser.message,
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
        const body = req.body;
        const users = await services.fetchUser(body);
        return res.json({
            success: true,
            message: 'User detail fetched Successfully',
            data: users.access_token
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

export const createPaymentOrder = async (req, res) => {
    try {
        const amount = req.body.amount;

        const options = {
            amount: amount * 100, // amount in paise (₹1 = 100)
            currency: "INR",
            receipt: shortid.generate(),
        };

        const order = await razorpay.razorpayInstance.orders.create(options);

        const orderResponse = {
            orderId: order.id,
            currency: order.currency,
            amount: order.amount
        }

        res.json({
            success: true,
            message: 'Order Created Successfully',
            data: orderResponse,
        });
    } catch (error) {
        return res.json({
            success: false,
            message: `Failed to create order: ${error}`
        });
    }
}

export const verifyPaymentOrder = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const sha = crypto.createHmac("sha256", process.env.RAZORPAY_SECRET);
        sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const digest = sha.digest("hex");

        if (digest === razorpay_signature) {
            return res.json({
                success: true,
                message: "Payment verified"
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid signature"
            });
        }
    } catch (error) {
        return res.json({
            success: false,
            message: `Failed to verify order: ${error}`
        });
    }
}

export const handleWebhook = async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    if (signature === expectedSignature) {
        let paymentCreated = null;
        const event = req.body.event;
        const payload = req.body.payload;

        console.log("✅ Verified Razorpay Webhook:", event);

        // Optional: log or save based on event
        if (event === 'payment.captured') {
            const paymentEntity = payload.payment.entity;
            const userId = "from-frontend-or-webhook"
            const orderId = paymentEntity.order_id
            const amount = paymentEntity.amount.toString()
            const paymentStatus = PaymentStatus.VERIFIED
            
            paymentCreated = await services.createPayment(userId, orderId, amount, paymentStatus)
        }

        return res.status(200).json({
            success: true,
            message: "Webhook verified",
            data: paymentCreated
        });
    } else {
        console.log("❌ Invalid Razorpay webhook signature");
        return res.status(400).json({
            success: false,
            message: "Invalid webhook signature"
        });
    }
};
