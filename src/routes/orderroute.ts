const express=require("express")
import { Request, Response } from 'express';
import { Order } from '../models/order';
import { fetchShippingDetails } from '../services/shipping';
import { fetchPaymentDetails } from '../services/payment';
import { fetchMultipleProducts } from '../services/product';
import { scheduleReviewEmail } from '../services/sendreviewemail';
import { PaymentDetails } from '../services/payment';
import axios from 'axios';
import { ShippingDetails } from '../services/shipping';


import { getOrderConfirmationContent } from '../utils/emailtemplates';
import dotenv from 'dotenv'

import { sendEmail } from '../utils/sendEmail';

import mongoose from 'mongoose';
import { isValidObjectId } from 'mongoose';
dotenv.config()

// import {  FlattenMaps } from 'mongoose';
// import type { LeanDocument } from 'mongoose';


const router = express.Router();


// Create new order
router.post("/add", async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { userId, guestEmail, sessionId, items, shippingId, paymentId } = req.body;

    // Validate required fields
    if (!items?.length || !shippingId || !paymentId) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields: items, shippingId, paymentId, or sessionId" 
      });
    }

    // Validate user or guest email
    if (!userId && !guestEmail) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false,
        message: "Either userId or guestEmail is required" 
      });
    }

    // Verify shipping exists
    const shipping = await fetchShippingDetails(shippingId);
    if (!shipping) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid shipping information"
      });
    }

    // Verify payment exists
    const payment = await fetchPaymentDetails(paymentId);
    if (!payment) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid payment information"
      });
    }
    

    // Calculate order totals
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const shippingCost = shipping.cost || 0;
    const tax = subtotal * 0.1; // Example 10% tax
    const total = subtotal + tax + shippingCost;

    // Create order
    const order = new Order({
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

    await order.save({ session });
     const productIds = [...new Set(items.map((item: any) => item.productId))];

    try {
      await axios.post(`${process.env.PRODUCT_SERVICE_URL}/api/products/update-purchases`, {
        productIds,
        increment: 1 // You could increment by quantity if needed
      });
    } catch (error) {
      console.error('Failed to update product purchases:', error);
      // Consider whether to abort transaction here or continue
      // For now, we'll just log the error but commit the order
    }

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      orderId: order._id,
      order
    });

  } catch (error: any) {
    await session.abortTransaction();
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
  } finally {
    session.endSession();
  }
});

// Get order by ID


// Cancel order
router.post("/:orderId/cancel", async (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.orderId);
    
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
    await order.save();

    res.status(200).json({ 
      success: true,
      message: "Order cancelled successfully" 
    });
  } catch (error: any) {
    console.error("Order cancellation error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to cancel order",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});














router.get("/:orderId", async (req: Request, res: Response) => {
  const { orderId } = req.params;

  if (!isValidObjectId(orderId)) {
    return res.status(400).json({ success: false, message: "Invalid order ID" });
  }

  try {
    // 1. Fetch the base order
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
     getOrderConfirmationContent(order)
      .then(emailContent => sendEmail(emailContent))
      .catch(emailError => console.error("Email failed:", emailError));

    // 2. Send order confirmation email (if not already sent)
    if (!order.confirmationSent) {
      try {
        const emailContent = await getOrderConfirmationContent(order);
        await sendEmail(emailContent);
        await Order.findByIdAndUpdate(orderId, { confirmationSent: true });
      } catch (emailError) {
        console.error("Order confirmation email failed:", emailError);
      }
    }

    // 3. Schedule review email (1 minute for testing, 4 days in production)
    if (!order.reviewEmailSent) {
      const delay = process.env.NODE_ENV === 'production' 
        ? 4 * 24 * 60 * 60 * 1000 // 4 days
        : 6000; // 1 minute for testing
      scheduleReviewEmail(order._id.toString(), delay);
    }

    // 4. Fetch all related data in parallel
    const [products, shipping, payment] = await Promise.all([
      fetchMultipleProducts(order.items.map(item => item.productId.toString())),
      fetchShippingDetails(order.shippingId.toString()),
      fetchPaymentDetails(order.paymentId.toString())
    ]);

    // 5. Build the response
    const responseData = {
      ...order,
      _id: order._id.toString(),
      userId: order.userId?.toString(),
      items: order.items.map((item, index) => ({
        ...item,
        productId: item.productId.toString(),
        product: products[index] || undefined
      })),
      shipping: shipping || undefined,
      payment: payment || undefined,
      emailStatus: {
        confirmationSent: order.confirmationSent,
        reviewEmailScheduled: !order.reviewEmailSent
      }
    };

    return res.status(200).json({
      success: true,
      order: responseData
    });

  } catch (error) {
    console.error('Error in order endpoint:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : 'Unknown error'
        : undefined
    });
  }
});
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, search } = req.query;

    const query: any = {};
    
    if (category) query.category = category;
    if (search) query.$text = { $search: search as string };

    const orders = await Order.find(query);

    return res.json({
      success: true,
      data: orders
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});
// routes/orderRoutes.js

router.get('/user/:userId', async (req:Request, res:Response) => {
  try {
    const { userId } = req.params;
    
    // 1. Get user's orders from database
    const userOrders = await Order.find({ userId }).lean();
    if (!userOrders.length) {
      return res.status(404).json({ 
        success: false,
        message: 'No orders found for this user'
      });
    }

    // 2. Extract all unique payment and shipping IDs
    const paymentIds = [...new Set(
     userOrders.map(order => order.paymentId).filter(Boolean)
       
    )];
    
    const shippingIds = [...new Set(
      userOrders.map(order => order.shippingId).filter(Boolean)
    )];

    // 3. Fetch details using your existing functions
    const [paymentDetails, shippingDetails] = await Promise.all([
      Promise.all(paymentIds.map((id:any)=> fetchPaymentDetails(id))),
      Promise.all(shippingIds.map((id:any) => fetchShippingDetails(id)))
    ]);

    // Filter out null results
    const validPaymentDetails = paymentDetails.filter(Boolean) as PaymentDetails[];
    const validShippingDetails = shippingDetails.filter(Boolean) as ShippingDetails[];

    // 4. Combine all data
    const enrichedOrders = userOrders.map(order => ({
      ...order,
     paymentDetails: validPaymentDetails.find((sd:any) => sd._id === order.shippingId)
      ,
      shippingDetails: validShippingDetails.find((sd:any) => sd._id === order.shippingId)
    }));

    res.json({
      success: true,
      orders: enrichedOrders,
      paymentDetails: validPaymentDetails, // All unique payments
      shippingDetails: validShippingDetails // All unique addresses
    });

  } catch (error: any) {
    console.error('Order service error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders'
    });
  }
});

export default router