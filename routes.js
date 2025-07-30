import express from "express"
import * as controller from './controller.js'
import authenticateToken from './utilities.js'
const router = express.Router();

router.post('/create/user', controller.addUser)
router.post('/fetch/user', controller.getUser)
router.get('/delete/all/user', controller.deleteUsers)
router.post('/login/user', controller.loginUser)
router.post('/verify/otp', controller.verifyOtp)
router.get('/food/data', controller.getFoodData)
router.get('/food/categories', controller.getFoodCategories)
router.post('/order/create', authenticateToken, controller.createOrder)
router.get('/order/fetch', authenticateToken, controller.getAllOrders)
router.post('/add/cart/item', authenticateToken, controller.addCartItem)
router.get('/fetch/cart/items', authenticateToken, controller.getCartItems)
router.delete('/delete/cart/item', authenticateToken, controller.deleteCartItem)
router.post('/create/payment/order', controller.createPaymentOrder)
router.post('/verify/payment/order', controller.verifyPaymentOrder)
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), controller.handleWebhook)
// router.post('/payment/webhook', controller.handleWebhook); // ✅ webhook route

export default router;