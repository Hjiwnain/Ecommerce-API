//Importing Librarys
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

//Importing Routes
import authRoutes from "./routes/authRoutes.js"
import productRoutes from "./routes/productRoute.js"
import userRoutes from "./routes/userRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"

//Define Globals
const PORT = Number(process.env.PORT)||3000;

//Creating Express Object
const app = express();

// app.use(
//     cors({
//       origin: CLIENT_URL,
//     })
//   );

app.use(express.json());


//Route Mapping
app.use("/auth/",authRoutes);
app.use("/product/",productRoutes);
app.use("/users/",userRoutes);
app.use("/admin/",adminRoutes);


//Starting Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });