const  express = require('express');
const bcrypt = require('bcrypt');
const db = require("./database");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const port = 3001;


const app = express();

app.use(express.json());


//getUserName
function getuserName(authHeader) {
    const token = authHeader.split(" ")[1];
    const decodedToken = atob(token.split(".")[1]);
    const parsedToken = JSON.parse(decodedToken);
    return parsedToken['userId'];
}


//The Base API To Query The DataBase
app.get('/fetch_data', async (req,res) => {
    try{
        const [rows,fields] = await db.query("SELECT * FROM userData");
        res.json(rows);
    }catch(err){
        res.status(500).json({message: 'DataBase Error',error: err});
    }
});

//API To Create New UserAccount
//Remember To Change content-type to application/json
app.post('/create_account', async (req, res) => {
    const { username, email, password } = req.body;  // Fetch data from the request body

    if(!username){
        return res.status(400).json({ message : 'Please Enter The Required Username'});
    }
    if(!email){
        return res.status(400).json({ message : 'Please Enter The Required Field. Email'});
    }
    if(!password){
        return res.status(400).json({ message : 'Please Enter The Required Feild. Password'});
    }

    try {
        // Check if username or email already exists
        const [users] = await db.query('SELECT * FROM userData WHERE username = ? OR email = ?', [username, email]);

        if (users.some(user => user.username === username || user.email === email)) {
            let message = '';

            if (users.some(user => user.username === username)) {
                message += 'User Already Exsists. ';
                return res.status(400).json({ message });
            }

            if (users.some(user => user.email === email)) {
                message += 'Email already exists.';
                return res.status(400).json({ message });
            }
        }
        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        if(hashedPassword.length < 2){
            return res.status(528).json({message : "The Servers are Temporiraly Unavialable Please login in latter"});
        }
        // If everything is okay, insert the user into the database
        await db.query('INSERT INTO userData (username, email, hashed_password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

        // Return only the username for security reasons, avoid sending back the password (even if it's hashed)
        return res.json({username,email,message: "Account Created Succesfully" });
    } catch (error) {
        return res.status(500).json({ message: 'Database error', error });
    }
});


//Login Account API
app.post('/Login', async (req,res) => {
    const { username, password } = req.body;
    if(!username){
        return res.status(400).json({ message : 'Please Enter The Required Username'});
    }
    if(!password){
        return res.status(400).json({ message : 'Please Enter The Required Feild. Password'});
    }

    try{
        const [users] = await db.query('SELECT * FROM userData WHERE username = ?', [username]);

        if(!users.length){
            return res.status(401).json({message : "The Username does not exist or is incorrect please check username again. Or Please Singup using /create_account route."});
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(password,user.hashed_password);
        //Generating  JWT Auth token
        const playload = {
            userId: username,
            role: 'user'
        }
        const secret = process.env.JWT_TOEKN_SECRET
        const token = jwt.sign(playload,secret,{expiresIn: '1h'});

        if(!isMatch){
            return res.status(401).json({message : "The Password you have entered is not attached with this account. Please check the password and retry"});
        }
        else{
            return res.status(200).json({message : "Logged In Succesfully",status: true,Secret_token: token});
        }
    }
    catch(err){
        return res.status(402).json({message : "The Error in Loging In " + err});
    }
});

//MiddleWare to verify the JWT Token
function verifyToken(req,res,next){
    const bearHead = req.headers['authorization'];

    if(!bearHead){
        return res.status(404).json({message : "No JWT Token Provided"});
    }
    const token = bearHead.split(" ")[1];
    const secret = process.env.JWT_TOEKN_SECRET
    jwt.verify(token, secret,(err,authData) => {
        if(err){
            if(err.name == 'TokenExpiredError'){
                return res.status(401).json({message: 'Token Has Expired.'});
            }else{
                return res.status(403).json({message: 'Token is not valid.'});
            }
        }
        req.authData = authData;
        next();
    });
}

app.post('/Show_Products', async (req,res) => {
    try{
        const [rows,fields] = await db.query("SELECT id,name,description,price,image_url FROM items");
        res.json(rows);
    }catch(err){
        res.status(500).json({message: 'DataBase Error',error: err});
    }
});


//AddToCartAPI
app.post('/AddToCart', verifyToken, async (req, res) => {
    const { itemName, quantity } = req.body;
    username = getuserName(req.headers['authorization']);
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

        res.json({ message: 'Item added to cart successfully!' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Database error', error });
    }
});

//Delete Item Completely API
app.post('/remove_from_cart', async (req,res) => {
    const {itemName} = req.body;
    let username = getuserName(req.headers['authorization']);

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
});

//Delete Item by quantity API
app.post('/decrement-item-quantity', async (req, res) => {
    const { itemName, quantity } = req.body;
    username = getuserName(req.headers['authorization']);

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
});

//Final Bill API
app.post('/ClearCart', async (req,res) => {
    username = getuserName(req.headers['authorization']);

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
});

//Query To See Current Cart Items
app.get('/ShowCart', async (req,res) => {
    username = getuserName(req.headers['authorization']);
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
});

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
app.get('/getbill', async (req,res) => {
    username = getuserName(req.headers['authorization']);
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
});

app.post('/Checkout', async (req, res) => {
    const username = getuserName(req.headers['authorization']);
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
            message: 'Order successfully placed and cart cleared!'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'DataBase Error', error });
    }
});

//Admin API
app.get('/getAllOrders', async (req, res) => {
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
});

app.get('/getAllOrders/details', async (req, res) => {
    const username = getuserName(req.headers['authorization']);
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
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });