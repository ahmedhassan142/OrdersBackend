"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const orderroute_1 = __importDefault(require("./routes/orderroute"));
const express = require('express');
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = express();
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
app.use(express.json());
const mongooseuri = process.env.MONGODB_URI || "";
mongoose_1.default.connect(mongooseuri)
    .then(() => console.log("Server connected to database"))
    .catch((error) => console.log("failed to connect server"));
app.use('/api/order', orderroute_1.default);
// Removed startVerificationConsumer()
app.listen(3019, () => {
    console.log("Order Service running on port 3019");
});
