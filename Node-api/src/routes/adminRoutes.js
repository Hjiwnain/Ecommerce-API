//Import Librarys and Packages
import { Router } from 'express';
import { adminRoute } from '../controllers/adminController.js';

//Creating Object
const router = Router();

//Defining Routes
router.post('/totalOders',adminRoute.totalOrders);
router.post('/orderDetails',adminRoute.orderDetails);

export default router;