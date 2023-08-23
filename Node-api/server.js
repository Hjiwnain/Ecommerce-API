const  express = require('express');
// const bodyParse = require('body-parse');
const bcrypt = require('bcrypt');
const db = require("./database")
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
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        // Check if username or email already exists
        const [users] = await db.query('SELECT * FROM userData WHERE username = ? OR email = ?', [username, email]);

        if (users.some(user => user.username === username || user.email === email)) {
            let message = '';

            if (users.some(user => user.username === username)) {
                message += 'Username already exists. ';
            }

            if (users.some(user => user.email === email)) {
                message += 'Email already exists.';
            }

            return res.status(400).json({ message });
        }
        // Hash the password
        const saltRounds = 10;
        try{
            const hashedPassword = await bcrypt.hash(password, saltRounds);
        }
        catch(err){
            return res.status(528).json({message : "The Servers are Temporiraly Unavialable Please login in latter"});
        }

        // If everything is okay, insert the user into the database
        await db.query('INSERT INTO userData (username, email, hashed_password) VALUES (?, ?, ?)', [username, email, hashedPassword]);

        // Return only the username for security reasons, avoid sending back the password (even if it's hashed)
        return res.json({ username,email });
    } catch (error) {
        return res.status(500).json({ message: 'Database error', error });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });