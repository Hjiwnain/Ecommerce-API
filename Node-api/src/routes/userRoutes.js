//Import Librarys and Packages
import { Router } from 'express';
import { userFunction } from '../controllers/userController.js';
import { verifyToken } from '../middlewares/jwt.js';

//Creating Object
const router = Router();

//Defining Routes
router.post('/addToCart',userFunction.addToCart);
router.post('/removeFromCart',userFunction.removeFromCart);
router.post('/decrementFromCart',userFunction.decrementItemQuantity);
router.post('/clearCart',userFunction.clearCart);
router.get('/showCarts',userFunction.showCart);
router.get('/getBill',userFunction.getBill);
router.post('/checkout',userFunction.checkout);

export default router;