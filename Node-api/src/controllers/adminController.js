import { json } from 'express';
import db from '../db/database.js';
import { verifyToken,getUsername } from '../middlewares/jwt.js';
import { escape } from 'mysql2';

//Admin API
async function totalOrders(req, res){
    // verifyToken(req,res);
    const username = getUsername(req.headers['authorization']);
    if(username === "AdminPlot"){
        console.log(username);
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
    }
    else{
        res.status(403).json({message:"You are not authorized to access this resource"})
    }
};

// Function To Check For OrderDetails
async function orderDetails(req, res) {
    const username = getUsername(req.headers['authorization']);
    if (username === "AdminPlot") {
        // const orderId = req.query.order_id || req.body.order_id;
        const orderId = req.body.order_id;
        // Validation
        if (!orderId) {
            return res.status(400).json({ message: 'order_id is required' });
        }

        try {
            const [orders] = await db.query(`
                SELECT order_id 
                FROM Total_orders 
                WHERE order_id = ?
            `, [orderId]);

            if (!orders.length) {
                return res.status(404).json({ message: 'No orders found for this order_id' });
            }

            const [orderDetails] = await db.query(`
                SELECT * 
                FROM Order_items 
                WHERE order_id = ?
            `, [orderId]);

            res.status(200).json(orderDetails);

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Database error', error });
        }
    } else {
        res.status(403).json({ message: "You are not authorized to access this resource" });
    }
};

/*
    Now Stock Manuplation will have 4 routes in it
        1. Addition
        2. Removing
        3. Update All Details
        4. Stock Quantity Manegemnt
*/

//// 1. Add a new stock item 'stock/add'
async function addStock(req, res){
    
    const { name, description, price, category, quantity, image_url } = req.body;
    const username = getUsername(req.headers['authorization']);
    if(username === "AdminPlot"){
        try {
            try {
                await db.query('INSERT INTO items (name, description, price, category, quantity, image_url) VALUES (?, ?, ?, ?, ?, ?)', 
                    [name, description, price, category, quantity, image_url]);
                res.json({ message: 'Item added to stock successfully!' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Database error', error });
            }
        }catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Database error', error });
        }
    }
    else{
        res.status(403).json({message:"You are not authorized to access this resource"});
    }
};

// 2. Remove an existing stock item '/stock/remove'
async function removeStock(req, res){
    const { name } = req.body;
    console.log(req.headers['authorization']);
    const username = getUsername(req.headers['authorization']);
    if(username === "AdminPlot"){
        try {
            try {
                await db.query('DELETE FROM items WHERE name = ?', [name]);
                res.json({ message: 'Item removed from stock successfully!' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Database error', error });
            }
        }catch(error){
            res.status(500).json({ message: 'Database error', error });
        }
    }
    else{
        res.status(403).json({message:"You are not authorized to access this resource"});
    }
};

// 3. Update the details of a stock item (This API will update all provided details of an item)
async function updateStock(req, res){
    const username = getUsername(req.headers['authorization']);
    if(username === "AdminPlot"){
        try {
            const { name, description, price, category, quantity, image_url } = req.body;
            try {
                await db.query('UPDATE items SET description = ?, price = ?, category = ?, quantity = ?, image_url = ? WHERE name = ?', 
                    [description, price, category, quantity, image_url, name]);
                res.json({ message: 'Item details updated successfully!' });
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'Database error', error });
            }
        }catch(error){
            res.status(500).json({ message: 'Database error', error });
        }
    }
    else{
        res.status(403).json({message:"You are not authorized to access this resource"});
    }
};

// 4. Increment or decrement the quantity of a stock item '/stock/quantity'
async function stockQuantity(req, res) {
    const username = getUsername(req.headers['authorization']);
    if (username === "AdminPlot") {
        let { name, change } = req.body; // change can be positive (increment) or negative (decrement)

        // change = Number(change);
        console.log(name +" " + change);
        if (typeof change !== 'number') {
            return res.status(400).json({ message: 'Invalid change value. It should be a number.' });
        }

        try {
            const [result] = await db.query('UPDATE items SET quantity = quantity + ? WHERE name = ?', [change, name]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Item not found or no change in quantity.' });
            }

            console.log(`${result.affectedRows} row(s) updated.`);
            res.json({ message: 'Stock quantity updated successfully!' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Database error', error });
        }

    } else {
        res.status(403).json({ message: "You are not authorized to access this resource" });
    }
};


export const adminRoute = {
    totalOrders,
    orderDetails,
    addStock,
    removeStock,
    updateStock,
    stockQuantity
}