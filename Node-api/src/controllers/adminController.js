import { json } from 'express';
import db from '../db/database.js';
import { verifyToken,getUsername } from '../middlewares/jwt.js';

//Admin API
async function totalOrders(req, res){
    verifyToken(req,res);
    try {
        const [orders] = await db.query(`
            SELECT * 
            FROM Total_orders
            ORDER BY order_id DESC
        `);

        if (!orders.length) {
            return res.status(404).json({ message: 'No orders found' });
        }

        res.json(orders);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Database error', error });
    }
};


async function orderDetails(req, res){
    verifyToken(req,res);
    const username = getUsername(req.headers['authorization']);
    try {
        const [orders] = await db.query(`
            SELECT order_id 
            FROM Total_orders 
            WHERE username = ?
        `, [username]);

        if (!orders.length) {
            return res.status(404).json({ message: 'No orders found for this user' });
        }

        const orderIds = orders.map(order => order.order_id);

        const [orderDetails] = await db.query(`
            SELECT * 
            FROM Order_items 
            WHERE order_id IN (?)
        `, [orderIds]);

        res.json(orderDetails);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Database error', error });
    }
};


export const adminRoute = {
    totalOrders,
    orderDetails
}