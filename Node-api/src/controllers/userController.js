import { json } from 'express';
import db from '../db/database.js';
import { verifyToken,getUsername } from '../middlewares/jwt.js';

//AddToCartAPI
async function addToCart(req, res){
    try{
        let curr = await verifyToken(req,res);
        // console.log(type(curr));
        console.log(typeof(curr));
         console.log(curr);

    }
    catch(error){
        console.log(error);
        return verifyToken(req,res);
    }
    console.log("Done");
    const { itemName, quantity } = req.body;
    const username = getUsername(req.headers['authorization']);
    try {
        let [cart] = await db.query('SELECT * FROM Carts WHERE username = ?', [username]);
        if (cart.length === 0) {
            await db.query('INSERT INTO Carts (username) VALUES (?)', [username]);
            [cart] = await db.query('SELECT * FROM Carts WHERE username = ?', [username]);
        }

        await db.query(`
            INSERT INTO CartItems (cart_id, item_name, quantity) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE quantity = quantity + ?
        `, [cart[0].cart_id, itemName, quantity, quantity]);

        // res.json({ message: 'Item added to cart successfully!' });

    } catch (error) {
        console.error(error);
        // res.status(500).json({ message: 'Database error', error });
    }
};

export const userFunction = {
    addToCart
}