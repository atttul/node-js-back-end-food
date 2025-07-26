import express from "express"
import * as controller from './controller.js'
import authenticateToken from './utilities.js'
const router = express.Router();

router.post('/create/user', controller.addUser) // user created with phone number added
router.post('/fetch/user', controller.getUser)
router.get('/delete/all/user', controller.deleteUsers)
router.post('/login/user', controller.loginUser) // login with phone number added
router.post('/verify/otp', controller.verifyOtp) // phone number verification 
router.get('/food/data', controller.getFoodData)
router.get('/food/categories', controller.getFoodCategories)
router.post('/order/create', authenticateToken, controller.createOrder)
router.get('/order/fetch', authenticateToken, controller.getAllOrders)
router.post('/add/cart/item', authenticateToken, controller.addCartItem)
router.get('/fetch/cart/items', authenticateToken, controller.getCartItems)
router.delete('/delete/cart/item', authenticateToken, controller.deleteCartItem)

export default router;
// initial commit