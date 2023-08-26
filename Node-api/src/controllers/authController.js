//Importing Library
import bcrypt from 'bcrypt';
import db from '../db/database.js';
import jwt from 'jsonwebtoken';
import jwt_decode from "jwt-decode";
import { getUsername } from '../middlewares/jwt.js';

//Function To Create New UserAccount
//Remember To Change content-type to application/json
async function createAccount(req, res){
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
};

//Function Login Account
async function login(req,res){
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
};


async function forgotPassword(req,res){
    const { email } = req.body.email;
    console.log(email);
    //Check if a user exist with give email
    try{
        const [userdata] = await db.query("SELECT * FROM userData WHERE email=?",[email]);
        if(userdata.email === email){
            //Send Email Logic Later Implementation
            console.log(userdata)
            const playload = {
                email: userdata.email,
                userId: userdata.username
            }
            const secret = process.env.JWT_TOEKN_SECRET
            console.log("payload \n" + JSON.stringify(playload))
            const token = jwt.sign(playload,secret,{expiresIn: '5M'});

            res.status(200).json({message: "One Time Reset-Token",token});
        }
        else{
            res.status(404).json({message: "Email Account is not linked with any user"});
        }
    }catch(error){
        return res.status(500).json({message: "DataBase Error: "+ {error}});
    }
    //
};

async function resetPassword(req,res,next){
    const { token, newPassword} = req.body;
    console.log(token);
    try{
        console.log(getUsername(token));
    }catch(error){
        return res.status(500).json({message: "DataBase Error: "+ {error}});
    }
}


export const authController = {
    createAccount,
    login,
    forgotPassword,
    resetPassword
};