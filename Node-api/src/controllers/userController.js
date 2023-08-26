import { json } from 'express';
import db from '../db/database.js';
import { verifyToken,getUsername } from '../middlewares/jwt.js';


//Add To Cart
async function addToCart(req, res) {
    await verifyToken(req, res);
    const { itemName, quantity } = req.body;
    const username = getUsername(req.headers['authorization']);
    try {
        let [cart] = await db.query('SELECT * FROM Carts WHERE username = ?', [username]);
        
        if (cart.length === 0) {
            await db.query('INSERT INTO Carts (username) VALUES (?)', [username]);
            [cart] = await db.query('SELECT * FROM Carts WHERE username = ?', [username]);
        }
        // Check the available stock for the item
        const [stock] = await db.query('SELECT quantity FROM items WHERE name = ?', [itemName]);
        if (stock.length === 0) {
            return res.status(400).json({ message: 'Item not found in stock.' });
        }
        let availableQuantity = stock[0].quantity;
        if (availableQuantity < quantity) {
            await db.query(`
                INSERT INTO CartItems (cart_id, item_name, quantity) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE quantity = quantity + ?
            `, [cart[0].cart_id, itemName, availableQuantity, availableQuantity]);
            return res.status(200).json({
                message: 'We don’t have the sufficient quantity you requested. But we added the maximum available quantity to your cart.'
            });
        } else {
            await db.query(`
                INSERT INTO CartItems (cart_id, item_name, quantity) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE quantity = quantity + ?
            `, [cart[0].cart_id, itemName, quantity, quantity]);
            return res.status(200).json({ message: 'Item added to cart successfully!' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Database error', error });
    }
}

//Delete Item Completely API
async function removeFromCart(req,res){
    await verifyToken(req,res);
    const {itemName} = req.body;
    const username = getUsername(req.headers['authorization']);

    try{
        const [cart] = await db.query('SELECT * FROM Carts WHERE username = ?', [username]);

        if(cart.length === 0){
            return res.status(404).json({message: "User Does Not Have Anything in the cart"});
        }

        //Delete Item from cartItems table
        const [result] = await db.query(
            "DELETE FROM CartItems WHERE cart_id = ? AND item_name = ?", [cart[0].cart_id, itemName]);

            if(result.affectedRows === 0){
                return res.status(404).json({message: "Items not found int the cart"});
            }
            res.json({message: "Item removed from cart Succesfully"});
    }catch(error){
        res.status(500).json({message: "Dataabase error",error});
    }
};

//Delete Item by quantity API
async function decrementItemQuantity(req, res){
    await verifyToken(req,res);
    const { itemName, quantity } = req.body;
    const username = getUsername(req.headers['authorization']);

    if (!username || !itemName || typeof quantity !== 'number' || quantity <= 0) {
        return res.status(400).json({ message: 'Missing or invalid fields' });
    }

    try {
        // Get the user's cart
        const [cart] = await db.query('SELECT * FROM Carts WHERE username = ?', [username]);

        if (cart.length === 0) {
            return res.status(404).json({ message: 'Cart not found for this user' });
        }

        // Decrement the item quantity
        const [result] = await db.query(`
            UPDATE CartItems
            SET quantity = GREATEST(0, quantity - ?)
            WHERE cart_id = ? AND item_name = ?
        `, [quantity, cart[0].cart_id, itemName]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Item not found in the cart' });
        }

        // If the item quantity is 0, consider removing it from the cart entirely
        await db.query(`
            DELETE FROM CartItems
            WHERE cart_id = ? AND item_name = ? AND quantity = 0
        `, [cart[0].cart_id, itemName]);

        res.json({ message: 'Item quantity updated successfully!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Database error', error });
    }
};

//Function to clear all the content of a cart
async function clearCart(req,res){
    await verifyToken(req,res);
    const username = getUsername(req.headers['authorization']);

    // Get the user's cart
    const [cart] = await db.query('SELECT * FROM Carts WHERE username = ?', [username]);

    if (cart.length === 0) {
        return res.status(404).json({ message: 'Cart not found for this user' });
    }

    try{
        await db.query('DELETE FROM CartItems WHERE cart_id = ?',[cart[0].cart_id]);

        await db.query(`
            DELETE FROM Carts
            WHERE cart_id = ? AND username = ?
        `, [cart[0].cart_id, username]);

        res.json({ message: 'The Cart is Now Empty!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Database error', error });
    }
};

//Query To See Current Cart Items
async function showCart(req,res){
    await verifyToken(req,res);
    const username = getUsername(req.headers['authorization']);
    // Get the user's cart
    try{
        const [cart] = await db.query('SELECT * FROM Carts WHERE username = ?', [username]);
        if (cart.length === 0) {
            return res.status(404).json({ message: 'Cart not found for this user' });
        }

        const [items] = await db.query('SELECT item_name,quantity FROM CartItems WHERE cart_id = ? ',[cart[0].cart_id]);

        return res.json({cartItems: items});
    }
    catch(error){
        res.status(500).json({message: 'DataBase Error', error});
    }
};

//Proceed To CheckOuts
/*
Expected Output JSON
{
    Total_items: 20,
    Amount: 2999,
    Service Tax: 2131,
    Product Tax: 231,
    Total_Amount: 50023,
    Items: {
                {
                    Item_name: "Cool Snikers",
                    quantity: 2,
                    cost: 80,
                    serice_tax: 21,
                    product_tax: 0,
                    total_cost: 101
                },
                {
                    Item_name: "Cool Snikers",
                    quantity: 2,
                    cost: 80,
                    serice_tax: 21,
                    product_tax: 0,
                    total_cost: 101
                },
                {
                    Item_name: "Cool Snikers",
                    quantity: 2,
                    cost: 80,
                    serice_tax: 21,
                    product_tax: 0,
                    total_cost: 101
                }
           }
}
*/
async function getBill (req,res) {
    await verifyToken(req,res);
    const username = getUsername(req.headers['authorization']);
    try{
        const [cartItems] = await db.query('SELECT CartItems.quantity, items.name, items.price, items.category FROM CartItems JOIN Carts ON CartItems.cart_id = Carts.cart_id JOIN items ON CartItems.item_name = items.name WHERE Carts.username = ?',[username]);
        // console.log(cartItems)
        let total_items = 0;
        let Amount = 0;
        let ServiceTax = 0;
        let ProductTax = 0;
        let items = [];
        for(let item of cartItems){
            // console.log(item.quantity);
            total_items += item.quantity;
            let serice_tax = 0;
            let product_tax = 0;

            if(item.category == 'product'){
                //Tax PA
                if(item.price > 1000 && item.price<=5000){
                    product_tax = 0.12 * item_price;
                }
                //Tax PB
                else if(item.price > 5000){
                    product_tax = 0.18 * item_price;
                }
                product_tax += 200; //Tax PC
            }
            else if(item.category == 'service'){
                //Tax PA
                if(item.price > 1000 && item.price<=8000){
                    serice_tax = 0.10 * item_price;
                }
                //Tax PB
                else if(item.price > 8000){
                    serice_tax = 0.15 * item_price;
                }
                serice_tax += 100; //Tax PC
            }
            Amount += item.price * item.quantity;
            ServiceTax += serice_tax * item.quantity;
            ProductTax += product_tax * item.quantity;

            items.push({
                item_name: item.name,
                quantity_name: item.quantity,
                cost: item.price,
                serice_tax: serice_tax,
                product_tax: product_tax,
                total_amount: (item.price +  serice_tax + product_tax) * item.quantity
            });
        }
        const Total_Amount = Amount + ServiceTax + ProductTax;
        return res.status(200).json({
            total_items,
            Amount,
            ServiceTax,
            ProductTax,
            Total_Amount,
            items
        });
    }
    catch(error){
        res.status(500).json({message: 'DataBase Error', error});
    }
};

async function checkout(req, res) {
    const username = getUsername(req.headers['authorization']);
    try {
        const [cartItems] = await db.query('SELECT * FROM CartItems JOIN Carts ON CartItems.cart_id = Carts.cart_id JOIN items ON CartItems.item_name = items.name WHERE Carts.username = ?', [username]);

        let total_items = 0;
        let Amount = 0;
        let ServiceTax = 0;
        let ProductTax = 0;
        let items = [];

        for (let item of cartItems) {
            total_items += item.quantity;

            let service_tax = 0;
            let product_tax = 0;

            if (item.category === 'product') {
                if (item.price > 1000 && item.price <= 5000) {
                    product_tax = 0.12 * item.price;
                } else if (item.price > 5000) {
                    product_tax = 0.18 * item.price;
                }
                product_tax += 200;
            } else if (item.category === 'service') {
                if (item.price > 1000 && item.price <= 8000) {
                    service_tax = 0.10 * item.price;
                } else if (item.price > 8000) {
                    service_tax = 0.15 * item.price;
                }
                service_tax += 100;
            }

            Amount += item.price * item.quantity;
            ServiceTax += service_tax * item.quantity;
            ProductTax += product_tax * item.quantity;

            items.push({
                item_name: item.name,
                quantity: item.quantity,
                cost: item.price,
                service_tax: service_tax,
                product_tax: product_tax,
                total_amount: (item.price + service_tax + product_tax) * item.quantity
            });

            // Reduce stock quantity for the item
            await db.query('UPDATE items SET quantity = quantity - ? WHERE name = ?', [item.quantity, item.item_name]);
        }

        const Total_Amount = Amount + ServiceTax + ProductTax;

        await db.query('INSERT INTO Total_orders (username, total_items, amount, service_tax, product_tax, total_amount) VALUES (?, ?, ?, ?, ?, ?)', [username, total_items, Amount, ServiceTax, ProductTax, Total_Amount]);

        let [results] = await db.query("SELECT LAST_INSERT_ID() AS order_id");
        let orderId = results[0].order_id;

        for (let item of items) {
            await db.query('INSERT INTO Order_items (order_id, item_name, quantity) VALUES (?, ?, ?)', [orderId, item.item_name, item.quantity]);
        }

        const [cart] = await db.query('SELECT * FROM Carts WHERE username = ?', [username]);

        if (cart.length === 0) {
            return res.status(404).json({ message: 'Cart not found for this user' });
        }

        await db.query('DELETE FROM CartItems WHERE cart_id = ?', [cart[0].cart_id]);

        await db.query('DELETE FROM Carts WHERE cart_id = ? AND username = ?', [cart[0].cart_id, username]);

        return res.status(200).json({
            total_items,
            Amount,
            ServiceTax,
            ProductTax,
            Total_Amount,
            items,
            order_id: orderId,
            message: 'Order successfully placed, stock updated, and cart cleared!'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'DataBase Error', error });
    }
};

export const userFunction = {
    addToCart,
    removeFromCart,
    decrementItemQuantity,
    clearCart,
    showCart,
    getBill,
    checkout
}