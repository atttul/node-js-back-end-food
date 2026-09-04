import express from "express"
import * as controller from './controller.js'
import authenticateToken, { authorizeAdmin } from './utilities.js'
const router = express.Router();

router.post('/create/user', controller.addUser)
router.post('/fetch/user', controller.getUser)
router.get('/user/profile', authenticateToken, controller.getUserProfile)
router.post('/user/update-location', authenticateToken, controller.updateUserLocation)
router.get('/user/active-order', authenticateToken, controller.getActiveUserOrder)
router.get('/delete/all/user', controller.deleteUsers)
router.post('/login/user', controller.loginUser)
router.post('/verify/otp', controller.verifyOtp)
router.post('/forgot-password/request-otp', controller.forgotPasswordRequest)
router.post('/forgot-password/reset', controller.forgotPasswordReset)

// Admin Authentication, Users & Order Management
router.post('/login/admin', controller.loginAdmin)
router.get('/admin/orders', authenticateToken, authorizeAdmin, controller.getAdminOrders)
router.patch('/admin/orders/:orderId/accept', authenticateToken, authorizeAdmin, controller.acceptAdminOrder)
router.post('/admin/orders/accept', authenticateToken, authorizeAdmin, controller.acceptAdminOrder)
router.patch('/admin/orders/:orderId/reject', authenticateToken, authorizeAdmin, controller.rejectAdminOrder)
router.post('/admin/orders/reject', authenticateToken, authorizeAdmin, controller.rejectAdminOrder)
router.patch('/admin/orders/:orderId/status', authenticateToken, authorizeAdmin, controller.updateAdminOrderStatus)
router.post('/admin/orders/status', authenticateToken, authorizeAdmin, controller.updateAdminOrderStatus)

router.get('/admin/users', authenticateToken, authorizeAdmin, controller.getAdminUsers)
router.patch('/admin/users/:userId/role', authenticateToken, authorizeAdmin, controller.updateUserRoleAdmin)
router.post('/admin/users/role', authenticateToken, authorizeAdmin, controller.updateUserRoleAdmin)

router.get('/food/data', controller.getFoodData)
router.get('/food/categories', controller.getFoodCategories)
router.get('/food/home-data', controller.getHomeData)
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