import mongoose from 'mongoose';
import orderroute from './routes/orderroute';
const express = require('express');
import dotenv from 'dotenv';
import cors from 'cors';


dotenv.config();
const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL ,
    credentials: true,
}));
app.use(express.json());

const mongooseuri = process.env.MONGODB_URI || "";
mongoose.connect(mongooseuri)
    .then(() => console.log("Server connected to database"))
    .catch((error) => console.log("failed to connect server"));



app.use('/api/order', orderroute);

// Removed startVerificationConsumer()

app.listen(3019, () => {
    console.log("Order Service running on port 3019");
});
