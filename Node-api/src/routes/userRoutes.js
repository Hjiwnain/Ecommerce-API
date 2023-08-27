//Import Librarys and Packages
import { Router } from 'express';
import { userFunction } from '../controllers/userController.js';
import { verifyToken } from '../middlewares/jwt.js';

//Creating Object
const router = Router();

//Defining Routes
router.post('/addToCart',verifyToken,userFunction.addToCart);
router.post('/removeFromCart',verifyToken,userFunction.removeFromCart);
router.post('/decrementFromCart',userFunction.decrementItemQuantity);
router.post('/clearCart',userFunction.clearCart);
router.get('/showCarts',verifyToken,userFunction.showCart);
router.get('/getBill',verifyToken,userFunction.getBill);
router.post('/checkout',userFunction.checkout);

export default router;