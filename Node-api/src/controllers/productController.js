//Importing Important Library
import db from '../db/database.js';


//Creating Function To Fetch DB
async function showProduct(req,res){
    try{
        const [rows,fields] = await db.query("SELECT id,name,description,price,image_url,quantity FROM items");
        res.json(rows);
    }catch(err){
        res.status(500).json({message: 'DataBase Error',error: err});
    }
};

export const showPro = {showProduct};