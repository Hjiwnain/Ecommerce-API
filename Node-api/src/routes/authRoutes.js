//Import Librarys and Packages
import { Router } from 'express';
import { authController } from '../controllers/authController.js';

//Creating Object
const router = Router();

//Defining Routes
router.post('/createAccount',authController.createAccount);
router.post('/login',authController.login);
router.post('/forgotPassword',authController.forgotPassword);
router.post('/resetPassword', authController.resetPassword);

export default router;