// src/services/orderService.ts
import { Order } from "../models/order";

import { v4 as uuidv4 } from 'uuid';

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
}

export const createOrder = async (
  userId: string | null,
  sessionId: string,
  items: OrderItem[],
  shippingId: string,
  paymentId: string
) => {
  // Generate human-readable order ID (e.g., "ORD-ABC123")
  const orderId = `ORD-${uuidv4().substring(0, 6).toUpperCase()}`;
  
  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingCost = 5.99; // Could be fetched from shipping service
  const taxRate = 0.08;
  const total = subtotal + shippingCost + (subtotal * taxRate);

  // Create order record
  const order = new Order({
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

  await order.save();
  
  return {
    orderId: order._id,
    order
  };
};