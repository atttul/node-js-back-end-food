import * as services from './services.js'
import jwt from 'jsonwebtoken';
import axios from 'axios';
import * as cashfreePg from 'cashfree-pg';
const { Cashfree, CFEnvironment } = cashfreePg;
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
        const userEmail = req.body.email;
        const password = req.body.password;
        const phone = req.body.phone;
        const loginType = req.body.loginType || (phone && !password ? 'otp' : 'password');

        // Mode 1: Mobile Number & OTP Login
        if (loginType === 'otp' || (phone && !password && !userEmail)) {
            if (!phone) {
                return res.json({ success: false, message: "Please enter your 10-digit mobile number." });
            }
            const existingUser = await services.findUserByPhone(phone);
            if (!existingUser) {
                return res.json({
                    success: false,
                    message: "No account registered with this Phone Number. Please create an account first."
                });
            }
            const otpSent = await services.sendOtp(phone);
            return res.json({
                success: true,
                message: 'OTP code sent to your registered phone number',
                data: existingUser
            });
        }

        // Mode 2: Email & Password Login
        if (!userEmail || !password) {
            return res.json({ success: false, message: "Please enter both Email Address and Password." });
        }

        const loginDetails = await services.fetchUser({ email: userEmail, password: password });

        if (!loginDetails) {
            return res.json({
                success: false,
                message: "Invalid Email Address or Password. Please check your credentials and try again."
            });
        }

        const targetPhone = phone || loginDetails.phone_number;
        if (targetPhone) {
            await services.sendOtp(targetPhone);
        }

        return res.json({
            success: true,
            message: 'Credentials verified! OTP sent to your phone for login.',
            data: loginDetails
        });
    } catch (error) {
        return res.json({
            success: false,
            message: `Login process failed. Please check your details and try again.`
        });
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
            data: verifiedUser.data
        })
    } catch (error) {
        return res.json({
            success: false,
            message: `User could not logged-in. ${error}`
        })
    }
}

export const forgotPasswordRequest = async (req, res) => {
    try {
        const { email, phone } = req.body;
        if (!email || !phone) {
            return res.json({
                success: false,
                message: "Please provide both Email Address and Phone Number."
            });
        }
        const result = await services.requestForgotPasswordOtp(email, phone);
        return res.json(result);
    } catch (error) {
        return res.json({
            success: false,
            message: `Forgot password request failed: ${error.message || error}`
        });
    }
};

export const forgotPasswordReset = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.json({
                success: false,
                message: "Please provide Email Address, OTP code, and New Password."
            });
        }
        const result = await services.resetPasswordWithOtp(email, otp, newPassword);
        return res.json(result);
    } catch (error) {
        return res.json({
            success: false,
            message: `Password reset failed: ${error.message || error}`
        });
    }
};


export const getUser = async (req, res) => {
    try {
        const body = req.body;
        const users = await services.fetchUser(body);
        if (!users) {
            return res.json({
                success: false,
                message: "Invalid Email Address or Password. Please check your credentials and try again."
            });
        }
        return res.json({
            success: true,
            message: 'User details fetched successfully',
            data: users.access_token,
            user: users
        });
    } catch (error) {
        return res.json({
            success: false,
            message: 'User details could not be found. Please check your credentials.'
        });
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

export const createCashfreeOrder = async (req, res) => {
    try {
        const { userId, orderAmount, customerName, customerId, customerEmail, customerPhone, orderAddress } = req.body;

        const orderId = "order_" + Date.now()
        const payload = {
            order_id: orderId,
            order_amount: orderAmount,
            order_currency: "INR",
            customer_details: {
                customer_id: customerId,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
            },
            order_meta: {
                return_url: `${process.env.FRONTEND_URL}/payment-success?order_id=${orderId}`,
                notify_url: `${process.env.BACKEND_URL}/api/webhook/cashfree`,
                payment_methods: "cc,dc,nb,upi",
            },
        };

        const response = await axios.post('https://sandbox.cashfree.com/pg/orders',
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-version': '2025-01-01',
                    'x-client-id': process.env.CASHFREE_CLIENT_ID,
                    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
                }
            }
        );

        if (response.data) {
            await services.createPaymentOrder(userId, payload, orderAddress);
        }

        return res.json({
            success: true,
            message: 'Cashfree Order Created Successfully',
            orderId: orderId,
            sessionId: response.data.payment_session_id,
            data: response.data
        });

    } catch (error) {
        return res.json({
            success: false,
            message: `Cashfree order failed : ${error?.response?.data?.message || error.message}`
        });
    }
};

export const cashfreeWebhookHandler = async (req, res) => {
    try {
        const rawBody = req.body.toString('utf8');
        const payload = JSON.parse(rawBody);
        const signature = req.headers['x-cf-signature'];

        // Verify webhook signature
        const isValid = await services.handleCashfreeWebhook(payload, signature);

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid signature'
            });
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const trackOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId || req.query.orderId;
        const trackingDetails = await services.getOrderTrackingDetails(orderId);
        return res.json({
            success: true,
            message: 'Order tracking details fetched successfully',
            data: trackingDetails
        });
    } catch (error) {
        return res.json({
            success: false,
            message: `Order tracking failed: ${error.message}`
        });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;
        const result = await services.updateOrderStatus(orderId, status);
        return res.json({
            success: true,
            message: 'Order status updated successfully',
            data: result
        });
    } catch (error) {
        return res.json({
            success: false,
            message: `Order status update failed: ${error.message}`
        });
    }
};

