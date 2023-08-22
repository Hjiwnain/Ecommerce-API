//This will establish a conenction with db
require('dotenv').config();
const mysql = require('mysql2')

// console.log(console.log(process.env.DB_HOST));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

module.exports = pool.promise();