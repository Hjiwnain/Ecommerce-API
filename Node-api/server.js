const  express = require('express');
// const bodyParse = require('body-parse');
const db = require("./database")
const port = 3001;


const app = express();

app.use(express.json())

app.get('/users', async (req,res) => {
    try{
        const [rows,fields] = await db.query("SELECT * FROM userData");
        res.json(rows);
    }catch(err){
        res.status(500).json({message: 'DataBase Error',error: err});
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });