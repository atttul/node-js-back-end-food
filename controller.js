import * as services from './services.js'
import jwt from 'jsonwebtoken';
import axios from 'axios';
import * as cashfreePg from 'cashfree-pg';
const { Cashfree, CFEnvironment } = cashfreePg;
import dotenv from 'dotenv';
dotenv.config();

const validateEmail = (email) => {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const validatePhone = (phone) => {
    const clean = String(phone || '').replace(/\D/g, '');
    return clean.length === 10;
};

export const addUser = async (req, res) => {
    try {
        const { name, password, email, location, phone } = req.body;

        // Realistic Backend Input Validations
        const errors = [];
        if (!name || typeof name !== 'string' || name.trim().length < 2) {
            errors.push('Full Name must be at least 2 characters long.');
        }
        if (!email || !validateEmail(email)) {
            errors.push('Please provide a valid Email Address (e.g. name@domain.com).');
        }
        if (!phone || !validatePhone(phone)) {
            errors.push('Please provide a valid 10-digit Mobile Phone Number.');
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
            errors.push('Password must be at least 6 characters long.');
        }
        if (location && typeof location === 'string' && location.trim().length > 0 && location.trim().length < 3) {
            errors.push('Delivery Location / Address must be at least 3 characters long if provided.');
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: errors.join(' '),
                errors
            });
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = String(phone).replace(/\D/g, '');
        const cleanName = name.trim();
        const cleanLocation = (location && typeof location === 'string') ? location.trim() : '';

        const savedUser = await services.createUser(cleanName, password, cleanEmail, cleanLocation, cleanPhone);

        if (savedUser && savedUser.alreadyExists) {
            return res.json({
                success: false,
                alreadyExists: true,
                message: savedUser.message
            });
        }

        const accessToken = jwt.sign(
            {
                userId: savedUser._id
            },
            process.env.SECRET_KEY || ''
        );
        const updated = await services.updateUser(savedUser._id, accessToken);

        savedUser.access_token = accessToken;
        return res.json({
            success: true,
            message: 'User created successfully',
            accessToken,
            data: savedUser,
            updated: updated,
        });
    } catch (error) {
        const isDuplicate = String(error).includes('E11000') || String(error).includes('duplicate');
        return res.json({
            success: false,
            alreadyExists: isDuplicate,
            message: isDuplicate 
                ? 'An account with this Email Address or Mobile Number already exists. Please sign in or reset your password.' 
                : `User creation failed: ${error.message || error}`
        });
    }
};


export const loginUser = async (req, res) => {
    try {
        const userEmail = req.body.email;
        const password = req.body.password;
        const phone = req.body.phone;
        const loginType = req.body.loginType || (phone && !password ? 'otp' : 'password');

        // Mode 1: Mobile Number & OTP Login
        if (loginType === 'otp' || (phone && !password && !userEmail)) {
            if (!phone || !validatePhone(phone)) {
                return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number." });
            }
            const cleanPhone = String(phone).replace(/\D/g, '');
            const existingUser = await services.findUserByPhone(cleanPhone);
            if (!existingUser) {
                return res.json({
                    success: false,
                    message: "No account registered with this Phone Number. Please create an account first."
                });
            }
            const otpSent = await services.sendOtp(cleanPhone);
            return res.json({
                success: true,
                message: 'OTP code sent to your registered phone number',
                data: existingUser
            });
        }

        // Mode 2: Email & Password Login
        if (!userEmail || !validateEmail(userEmail)) {
            return res.status(400).json({ success: false, message: "Please enter a valid Email Address." });
        }
        if (!password || typeof password !== 'string' || password.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Please enter your Password." });
        }

        const cleanEmail = userEmail.trim().toLowerCase();
        const loginDetails = await services.fetchUser({ email: cleanEmail, password: password });

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
        const phone = req.body.phone;
        const otp = req.body.otp;

        const verifiedUser = await services.verifyOtpUser(userEmail, otp, phone);

        return res.json({
            success: verifiedUser.success,
            message: verifiedUser.message,
            data: verifiedUser.data
        });
    } catch (error) {
        return res.json({
            success: false,
            message: `OTP verification failed. ${error.message || error}`
        });
    }
};


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
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
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
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
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

export const getHomeData = async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
        const homeData = await services.fetchHomeData();
        return res.json({
            success: true,
            message: 'Home data fetched successfully',
            data: homeData
        });
    } catch (error) {
        return res.json({
            success: false,
            message: `Failed to fetch home data: ${error}`
        });
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

export const clearCart = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: User authentication required.'
            });
        }
        const cartCleared = await services.clearCart(userId);
        return res.json({
            success: true,
            message: 'Cart Cleared Successfully',
            data: cartCleared
        });
    } catch (error) {
        return res.json({
            success: false,
            message: `Cart Clearing Failed. ${error.message || error}`
        });
    }
};

export const createCashfreeOrder = async (req, res) => {
    try {
        const { userId, orderAmount, customerName, customerId, customerEmail, customerPhone, orderAddress, returnUrl } = req.body;
        const effectiveUserId = req.user?.userId || userId;

        const frontendUrl = returnUrl || req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
        const cleanFrontendUrl = frontendUrl.replace(/\/$/, '');

        const orderId = "order_" + Date.now();
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
                return_url: `${cleanFrontendUrl}/payment-success?order_id=${orderId}`,
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
            await services.createPaymentOrder(effectiveUserId, payload, orderAddress);
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

export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized token" });
        }
        const user = await services.getUserProfile(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }
        return res.json({
            success: true,
            message: 'User profile fetched successfully',
            data: user
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Profile retrieval failed: ${error.message}`
        });
    }
};

export const updateUserLocation = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { location } = req.body;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized token" });
        }
        if (!location || typeof location !== 'string' || location.trim().length < 3) {
            return res.status(400).json({ success: false, message: "Please provide a valid delivery address (at least 3 characters)." });
        }
        const cleanLocation = location.trim();
        await services.updateUserLocation(userId, cleanLocation);
        return res.json({
            success: true,
            message: "Delivery location updated successfully!",
            location: cleanLocation
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Failed to update delivery address: ${error.message}`
        });
    }
};

export const getActiveUserOrder = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) return res.json({ success: false, data: null });
        const activeOrder = await services.getActiveUserOrder(userId);
        return res.json({
            success: true,
            data: activeOrder
        });
    } catch (error) {
        return res.json({ success: false, data: null });
    }
};

export const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !validateEmail(email)) {
            return res.status(400).json({ success: false, message: "Please provide a valid Admin Email Address." });
        }
        if (!password || typeof password !== 'string' || password.trim().length === 0) {
            return res.status(400).json({ success: false, message: "Please enter your Admin Password." });
        }

        const cleanEmail = email.trim().toLowerCase();
        const user = await services.fetchUser({ email: cleanEmail, password: password });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid Email Address or Password."
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: "Access Denied: This account does not have Admin privileges."
            });
        }

        const accessToken = jwt.sign(
            { userId: user._id, role: 'admin' },
            process.env.SECRET_KEY || ''
        );

        user.access_token = accessToken;
        await services.updateUser(user._id, accessToken);

        return res.json({
            success: true,
            message: "Admin authentication successful",
            accessToken,
            data: user
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Admin login failed: ${error.message}`
        });
    }
};

export const getAdminOrders = async (req, res) => {
    try {
        const result = await services.getAllAdminOrders();
        return res.json({
            success: true,
            message: "Admin orders fetched successfully",
            data: result.orders,
            metrics: result.metrics
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Failed to fetch admin orders: ${error.message}`
        });
    }
};

export const acceptAdminOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId || req.body.orderId;
        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required." });
        }
        const result = await services.acceptOrderAdmin(orderId);
        return res.json(result);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Accept order failed: ${error.message}`
        });
    }
};

export const rejectAdminOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId || req.body.orderId;
        const reason = req.body.reason || req.body.rejection_reason || '';
        if (!orderId) {
            return res.status(400).json({ success: false, message: "Order ID is required." });
        }
        const result = await services.rejectOrderAdmin(orderId, reason);
        return res.json(result);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Reject order failed: ${error.message}`
        });
    }
};

export const updateAdminOrderStatus = async (req, res) => {
    try {
        const orderId = req.params.orderId || req.body.orderId;
        const status = req.body.status || req.body.order_status;
        if (!orderId || !status) {
            return res.status(400).json({ success: false, message: "Order ID and status are required." });
        }
        const result = await services.updateAdminOrderStatus(orderId, status);
        return res.json(result);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Status update failed: ${error.message}`
        });
    }
};

export const getAdminUsers = async (req, res) => {
    try {
        const users = await services.getAllUsersAdmin();
        return res.json({
            success: true,
            message: "Admin users fetched successfully",
            data: users
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Failed to fetch users: ${error.message}`
        });
    }
};

export const updateUserRoleAdmin = async (req, res) => {
    try {
        const adminUserId = req.user?.userId;
        const targetUserId = req.params.userId || req.body.userId;
        const role = req.body.role;

        if (!targetUserId || !role) {
            return res.status(400).json({ success: false, message: "Target user ID and role are required." });
        }

        const result = await services.updateUserRoleAdmin(adminUserId, targetUserId, role);
        if (!result.success) {
            return res.status(400).json(result);
        }
        return res.json(result);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Role update failed: ${error.message}`
        });
    }
};

