//Import Librarys and Packages
import { Router } from 'express';
import { showPro } from '../controllers/productController.js';

//Creating Object
const router = Router();

//Defining Routes
router.post('/showProducts',showPro.showProduct);

export default router;