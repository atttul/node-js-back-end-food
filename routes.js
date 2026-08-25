import express from "express"
import * as controller from './controller.js'
import authenticateToken from './utilities.js'
const router = express.Router();

router.post('/create/user', controller.addUser)
router.post('/fetch/user', controller.getUser)
router.get('/user/profile', authenticateToken, controller.getUserProfile)
router.get('/user/active-order', authenticateToken, controller.getActiveUserOrder)
router.get('/delete/all/user', controller.deleteUsers)
router.post('/login/user', controller.loginUser)
router.post('/verify/otp', controller.verifyOtp)
router.post('/forgot-password/request-otp', controller.forgotPasswordRequest)
router.post('/forgot-password/reset', controller.forgotPasswordReset)

router.get('/food/data', controller.getFoodData)
router.get('/food/categories', controller.getFoodCategories)
router.post('/order/create', authenticateToken, controller.createOrder)
router.get('/order/fetch', authenticateToken, controller.getAllOrders)
router.post('/add/cart/item', authenticateToken, controller.addCartItem)
router.get('/fetch/cart/items', authenticateToken, controller.getCartItems)
router.delete('/delete/cart/item', authenticateToken, controller.deleteCartItem)

router.post('/create/cashfree/order', controller.createCashfreeOrder);

router.get('/order/track/:orderId', controller.trackOrder);
router.get('/order/track', controller.trackOrder);
router.post('/order/update-status', controller.updateOrderStatus);

export default router;