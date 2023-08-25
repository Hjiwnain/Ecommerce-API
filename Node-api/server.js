const  express = require('express');
// const bodyParse = require('body-parse');
const bcrypt = require('bcrypt');
const db = require("./database");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const port = 3001;


const app = express();

app.use(express.json())

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
        console.log("I am here")
        console.log("me");
        console.log("Me" + hashedPassword);
        // If everything is okay, insert the user into the database
        await db.query('INSERT INTO userData (username, email, hashed_password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
        // console.log("Added into DB");

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
        // console.log(user);

        const isMatch = await bcrypt.compare(password,user.hashed_password);
        //Generating  JWT Auth token
        const playload = {
            userId: username,
            role: 'admin'
        }
        // console.log("Done this");
        const secret = process.env.JWT_TOEKN_SECRET
        const token = jwt.sign(playload,secret,{expiresIn: '1h'});

        if(!isMatch){
            return res.status(401).json({message : "The Password you have entered is not attached with this account. Please check the password and retry"});
        }
        else{
            return res.status(401).json({message : "Logged In Succesfully",status: true,Secret_token: token});
        }
    }
    catch(err){
        return res.status(402).json({message : "The Error in Loging In " + err});
    }
});

//MiddleWare to verify the JWT Token
function verifyToken(req,res,next){
    const bearHead = req.headers['authorization'];
    console.log(bearHead);
    if(!bearHead){
        return res.status(404).json({message : "No JWT Token Provided"});
    }
    const token = bearHead.split(" ")[1];
    const secret = process.env.JWT_TOEKN_SECRET
    // console.log(secret);
    jwt.verify(token, secret,(err,authData) => {
        if(err){
            console.log("#-------------------------#");
            console.log(err);
            console.log("#-------------------------#");
            if(err.name == 'TokenExpiredError'){
                return res.status(401).json({message: 'Token Has Expired.'});
            }else{
                console.log(err);
                return res.status(403).json({message: 'Token is not valid.'});
            }
        }
        req.authData = authData;
        next();
    });
    console.log("don");
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
    var autht = req.headers['authorization'];
    let username = autht.split(" ")[1];
    username = atob(username.split(".")[1]);
    username = JSON.parse(username);
    console.log("@@@@@@@");
    console.log(username['userId']);
    console.log("@@@@@@@");
    username = username['userId'];
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

//Delete Item API
app.post('/remove_from_cart', async (req,res) => {
    const {itemName} = req.body;
    console.log("@@@@@@@@@@@@@@@@@");
    console.log(itemName);
    console.log("@@@@@@@@@@@@@@@@@");
    var autht = req.headers['authorization'];
    let username = autht.split(" ")[1];
    username = atob(username.split(".")[1]);
    username = JSON.parse(username);
    username = username['userId'];

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
        console.log(error);
        res.status(500).json({message: "Dataabase error",error});
    }
});

app.post('/decrement-item-quantity', async (req, res) => {
    const { itemName, quantity } = req.body;
    var autht = req.headers['authorization'];
    let username = autht.split(" ")[1];
    username = atob(username.split(".")[1]);
    username = JSON.parse(username);
    username = username['userId'];

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



//delete
//final bill
//emp

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });