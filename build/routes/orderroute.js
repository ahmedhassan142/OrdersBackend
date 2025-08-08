"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const order_1 = require("../models/order");
const shipping_1 = require("../services/shipping");
const payment_1 = require("../services/payment");
const product_1 = require("../services/product");
const sendreviewemail_1 = require("../services/sendreviewemail");
const axios_1 = __importDefault(require("axios"));
const emailtemplates_1 = require("../utils/emailtemplates");
const dotenv_1 = __importDefault(require("dotenv"));
const sendEmail_1 = require("../utils/sendEmail");
const mongoose_1 = __importDefault(require("mongoose"));
const mongoose_2 = require("mongoose");
dotenv_1.default.config();
// import {  FlattenMaps } from 'mongoose';
// import type { LeanDocument } from 'mongoose';
const router = express.Router();
// Create new order
router.post("/add", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { userId, guestEmail, sessionId, items, shippingId, paymentId } = req.body;
        // Validate required fields
        if (!(items === null || items === void 0 ? void 0 : items.length) || !shippingId || !paymentId) {
            yield session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Missing required fields: items, shippingId, paymentId, or sessionId"
            });
        }
        // Validate user or guest email
        if (!userId && !guestEmail) {
            yield session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Either userId or guestEmail is required"
            });
        }
        // Verify shipping exists
        const shipping = yield (0, shipping_1.fetchShippingDetails)(shippingId);
        if (!shipping) {
            yield session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Invalid shipping information"
            });
        }
        // Verify payment exists
        const payment = yield (0, payment_1.fetchPaymentDetails)(paymentId);
        if (!payment) {
            yield session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Invalid payment information"
            });
        }
        // Calculate order totals
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingCost = shipping.cost || 0;
        const tax = subtotal * 0.1; // Example 10% tax
        const total = subtotal + tax + shippingCost;
        // Create order
        const order = new order_1.Order({
            userId: userId || undefined,
            guestEmail: guestEmail || undefined,
            sessionId,
            shippingId,
            paymentId,
            items,
            subtotal,
            tax,
            shippingCost,
            total,
            status: 'done'
        });
        yield order.save({ session });
        const productIds = [...new Set(items.map((item) => item.productId))];
        try {
            yield axios_1.default.post(`${process.env.PRODUCT_SERVICE_URL}/api/products/update-purchases`, {
                productIds,
                increment: 1 // You could increment by quantity if needed
            });
        }
        catch (error) {
            console.error('Failed to update product purchases:', error);
            // Consider whether to abort transaction here or continue
            // For now, we'll just log the error but commit the order
        }
        yield session.commitTransaction();
        return res.status(201).json({
            success: true,
            orderId: order._id,
            order
        });
    }
    catch (error) {
        yield session.abortTransaction();
        console.error("Order creation error:", {
            message: error.message,
            stack: error.stack,
            requestBody: req.body
        });
        return res.status(500).json({
            success: false,
            message: "Failed to create order",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
    finally {
        session.endSession();
    }
}));
// Get order by ID
// Cancel order
router.post("/:orderId/cancel", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { reason } = req.body;
        const order = yield order_1.Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }
        if (order.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Order already cancelled"
            });
        }
        // Update order status
        order.status = "cancelled";
        order.cancellationReason = reason;
        order.cancelledAt = new Date();
        yield order.save();
        res.status(200).json({
            success: true,
            message: "Order cancelled successfully"
        });
    }
    catch (error) {
        console.error("Order cancellation error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel order",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));
router.get("/:orderId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { orderId } = req.params;
    if (!(0, mongoose_2.isValidObjectId)(orderId)) {
        return res.status(400).json({ success: false, message: "Invalid order ID" });
    }
    try {
        // 1. Fetch the base order
        const order = yield order_1.Order.findById(orderId).lean();
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }
        (0, emailtemplates_1.getOrderConfirmationContent)(order)
            .then(emailContent => (0, sendEmail_1.sendEmail)(emailContent))
            .catch(emailError => console.error("Email failed:", emailError));
        // 2. Send order confirmation email (if not already sent)
        if (!order.confirmationSent) {
            try {
                const emailContent = yield (0, emailtemplates_1.getOrderConfirmationContent)(order);
                yield (0, sendEmail_1.sendEmail)(emailContent);
                yield order_1.Order.findByIdAndUpdate(orderId, { confirmationSent: true });
            }
            catch (emailError) {
                console.error("Order confirmation email failed:", emailError);
            }
        }
        // 3. Schedule review email (1 minute for testing, 4 days in production)
        if (!order.reviewEmailSent) {
            const delay = process.env.NODE_ENV === 'production'
                ? 4 * 24 * 60 * 60 * 1000 // 4 days
                : 6000; // 1 minute for testing
            (0, sendreviewemail_1.scheduleReviewEmail)(order._id.toString(), delay);
        }
        // 4. Fetch all related data in parallel
        const [products, shipping, payment] = yield Promise.all([
            (0, product_1.fetchMultipleProducts)(order.items.map(item => item.productId.toString())),
            (0, shipping_1.fetchShippingDetails)(order.shippingId.toString()),
            (0, payment_1.fetchPaymentDetails)(order.paymentId.toString())
        ]);
        // 5. Build the response
        const responseData = Object.assign(Object.assign({}, order), { _id: order._id.toString(), userId: (_a = order.userId) === null || _a === void 0 ? void 0 : _a.toString(), items: order.items.map((item, index) => (Object.assign(Object.assign({}, item), { productId: item.productId.toString(), product: products[index] || undefined }))), shipping: shipping || undefined, payment: payment || undefined, emailStatus: {
                confirmationSent: order.confirmationSent,
                reviewEmailScheduled: !order.reviewEmailSent
            } });
        return res.status(200).json({
            success: true,
            order: responseData
        });
    }
    catch (error) {
        console.error('Error in order endpoint:', error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch order",
            error: process.env.NODE_ENV === 'development'
                ? error instanceof Error ? error.message : 'Unknown error'
                : undefined
        });
    }
}));
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { category, search } = req.query;
        const query = {};
        if (category)
            query.category = category;
        if (search)
            query.$text = { $search: search };
        const orders = yield order_1.Order.find(query);
        return res.json({
            success: true,
            data: orders
        });
    }
    catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch products'
        });
    }
}));
// routes/orderRoutes.js
router.get('/user/:userId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        // 1. Get user's orders from database
        const userOrders = yield order_1.Order.find({ userId }).lean();
        if (!userOrders.length) {
            return res.status(404).json({
                success: false,
                message: 'No orders found for this user'
            });
        }
        // 2. Extract all unique payment and shipping IDs
        const paymentIds = [...new Set(userOrders.map(order => order.paymentId).filter(Boolean))];
        const shippingIds = [...new Set(userOrders.map(order => order.shippingId).filter(Boolean))];
        // 3. Fetch details using your existing functions
        const [paymentDetails, shippingDetails] = yield Promise.all([
            Promise.all(paymentIds.map((id) => (0, payment_1.fetchPaymentDetails)(id))),
            Promise.all(shippingIds.map((id) => (0, shipping_1.fetchShippingDetails)(id)))
        ]);
        // Filter out null results
        const validPaymentDetails = paymentDetails.filter(Boolean);
        const validShippingDetails = shippingDetails.filter(Boolean);
        // 4. Combine all data
        const enrichedOrders = userOrders.map(order => (Object.assign(Object.assign({}, order), { paymentDetails: validPaymentDetails.find((sd) => sd._id === order.shippingId), shippingDetails: validShippingDetails.find((sd) => sd._id === order.shippingId) })));
        res.json({
            success: true,
            orders: enrichedOrders,
            paymentDetails: validPaymentDetails, // All unique payments
            shippingDetails: validShippingDetails // All unique addresses
        });
    }
    catch (error) {
        console.error('Order service error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch orders'
        });
    }
}));
exports.default = router;
