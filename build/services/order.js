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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = void 0;
// src/services/orderService.ts
const order_1 = require("../models/order");
const uuid_1 = require("uuid");
const createOrder = (userId, sessionId, items, shippingId, paymentId) => __awaiter(void 0, void 0, void 0, function* () {
    // Generate human-readable order ID (e.g., "ORD-ABC123")
    const orderId = `ORD-${(0, uuid_1.v4)().substring(0, 6).toUpperCase()}`;
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shippingCost = 5.99; // Could be fetched from shipping service
    const taxRate = 0.08;
    const total = subtotal + shippingCost + (subtotal * taxRate);
    // Create order record
    const order = new order_1.Order({
        orderId,
        userId,
        sessionId,
        items,
        shippingId,
        paymentId,
        subtotal,
        shipping: shippingCost,
        tax: subtotal * taxRate,
        total,
        status: "processing",
        createdAt: new Date()
    });
    yield order.save();
    return {
        orderId: order._id,
        order
    };
});
exports.createOrder = createOrder;
