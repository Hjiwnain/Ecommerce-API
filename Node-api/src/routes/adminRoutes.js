//Import Librarys and Packages
import { Router } from 'express';
import { adminRoute } from '../controllers/adminController.js';

//Creating Object
const router = Router();

//Defining Routes
router.post('/totalOders',adminRoute.totalOrders);
router.post('/orderDetails',adminRoute.orderDetails);
router.post('/stock/add',adminRoute.addStock);
router.post('/stock/remove',adminRoute.removeStock);
router.post('/stock/updateStock',adminRoute.updateStock);
router.post('/stock/quantity',adminRoute.stockQuantity);

export default router;