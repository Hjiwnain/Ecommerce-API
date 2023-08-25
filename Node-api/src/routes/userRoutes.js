//Import Librarys and Packages
import { Router } from 'express';
import { userFunction } from '../controllers/userController.js';

//Creating Object
const router = Router();

//Defining Routes
router.post('/addToCart',userFunction.addToCart);

export default router;