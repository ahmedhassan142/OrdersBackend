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
exports.getOrderConfirmationContent = void 0;
const axios_1 = __importDefault(require("axios"));
const userservice_1 = require("../services/userservice");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Product Service API configuration
const PRODUCT_SERVICE_BASE_URL = process.env.PRODUCT_SERVICE_URL;
const productService = axios_1.default.create({
    baseURL: PRODUCT_SERVICE_BASE_URL,
    timeout: 5000, // 5 seconds timeout
});
const getRecipientEmail = (order) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // First try guest email if available
        if (order.guestEmail)
            return order.guestEmail;
        // Then try to fetch user email from user service
        if (order.userId) {
            const email = yield (0, userservice_1.getUserEmail)(order.userId.toString());
            if (email)
                return email;
        }
        throw new Error('No email address available');
    }
    catch (error) {
        console.error('Error getting recipient email:', error);
        throw error;
    }
});
const getOrderConfirmationContent = (order) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch product details for all items in the order
        const itemsWithDetails = yield Promise.all(order.items.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                // Call Product Service API to get product details
                const response = yield productService.get(`/api/products/${item.productId}`);
                const product = response.data.data;
                return {
                    name: (product === null || product === void 0 ? void 0 : product.name) || "Product",
                    price: item.price, // Using the price from the order item (in case it changed)
                    quantity: item.quantity,
                    size: item.size,
                    color: item.color,
                    image: product === null || product === void 0 ? void 0 : product.imageUrl // Assuming products have images array
                };
            }
            catch (error) {
                console.error(`Error fetching product ${item.productId}:`, error);
                return {
                    name: "Product",
                    price: item.price,
                    quantity: item.quantity,
                    size: item.size,
                    color: item.color,
                    image: undefined
                };
            }
        })));
        // Get recipient email using the new function
        const recipientEmail = yield getRecipientEmail(order);
        const itemsHtml = itemsWithDetails.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" width="60" style="margin-right: 10px; vertical-align: middle;">` : ''}
          <div style="display: inline-block; vertical-align: middle;">
            <p style="margin: 0; font-weight: 500;">${item.name}</p>
            ${item.size ? `<p style="margin: 4px 0 0; font-size: 13px; color: #666;">Size: ${item.size}</p>` : ''}
            ${item.color ? `<p style="margin: 4px 0 0; font-size: 13px; color: #666;">Color: ${item.color}</p>` : ''}
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center; vertical-align: middle;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; vertical-align: middle;">$${item.price.toFixed(2)}</td>
      </tr>
    `).join('');
        return {
            email: recipientEmail,
            subject: `Your Order Confirmation #${order._id}`,
            text: `Thank you for your order #${order._id}. Total: $${order.total.toFixed(2)}`,
            html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background-color: #f8f8f8; padding: 20px; text-align: center; border-bottom: 1px solid #e0e0e0;">
            <h1 style="margin: 0; color: #2c3e50;">Order Confirmation</h1>
          </div>
          
          <div style="padding: 20px;">
            <p style="font-size: 16px;">Hi there,</p>
            <p style="font-size: 16px;">Thank you for your order! We've received it and it's being processed. Here are the details:</p>
            
            <h2 style="color: #2c3e50; margin-top: 25px; font-size: 18px;">Order #${order._id}</h2>
            <p style="margin-bottom: 5px;"><strong>Date:</strong> ${order.createdAt.toLocaleDateString()}</p>
            <p style="margin-bottom: 5px;"><strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</p>
            
            <h3 style="color: #2c3e50; margin-top: 25px; font-size: 16px;">Items Ordered</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0 25px;">
              <thead>
                <tr style="background-color: #f5f5f5;">
                  <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0;">Product</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 1px solid #e0e0e0;">Qty</th>
                  <th style="padding: 12px; text-align: right; border-bottom: 1px solid #e0e0e0;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 12px; text-align: right; border-top: 1px solid #e0e0e0;"><strong>Subtotal:</strong></td>
                  <td style="padding: 12px; text-align: right; border-top: 1px solid #e0e0e0;">$${order.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 12px; text-align: right;"><strong>Shipping:</strong></td>
                  <td style="padding: 12px; text-align: right;">$${order.shippingCost.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 12px; text-align: right;"><strong>Tax:</strong></td>
                  <td style="padding: 12px; text-align: right;">$${order.tax.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold;">Total:</td>
                  <td style="padding: 12px; text-align: right; font-weight: bold;">$${order.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            
            <div style="background-color: #f8f8f8; padding: 15px; border-radius: 4px; margin-top: 30px;">
              <p style="margin: 0; font-size: 15px;">We'll send you another email when your order ships. If you have any questions, reply to this email.</p>
            </div>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 14px; color: #666; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0;">© ${new Date().getFullYear()} Your Store Name. All rights reserved.</p>
          </div>
        </div>
      `
        };
    }
    catch (error) {
        console.error('Error generating order confirmation content:', error);
        throw error;
    }
});
exports.getOrderConfirmationContent = getOrderConfirmationContent;
