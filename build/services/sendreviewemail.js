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
exports.scheduleReviewEmail = exports.sendReviewEmail = void 0;
const order_1 = require("../models/order");
const product_1 = require("./product");
const reviewtemplate_1 = require("../utils/reviewtemplate");
const sendEmail_1 = require("../utils/sendEmail");
const sendReviewEmail = (orderId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Get the order as a plain object
        const order = yield order_1.Order.findById(orderId).lean();
        if (!order)
            return false;
        const products = yield (0, product_1.fetchMultipleProducts)(order.items.map((item) => item.productId));
        // Create properly typed OrderDetails object
        const orderWithProducts = {
            _id: order._id.toString(),
            userId: (_a = order.userId) === null || _a === void 0 ? void 0 : _a.toString(),
            guestEmail: order.guestEmail,
            items: order.items.map((item, index) => {
                const product = products[index];
                const productId = item.productId.toString();
                return {
                    productId: productId,
                    quantity: item.quantity,
                    price: item.price,
                    product: {
                        success: !!product,
                        data: {
                            _id: productId,
                            // @ts-ignore
                            name: (product === null || product === void 0 ? void 0 : product.name) || 'Product',
                            // @ts-ignore
                            slug: (product === null || product === void 0 ? void 0 : product.slug) || 'product',
                            // @ts-ignore
                            price: (product === null || product === void 0 ? void 0 : product.price) || item.price,
                            // @ts-ignore
                            imageUrl: (product === null || product === void 0 ? void 0 : product.imageUrl) || null
                        }
                    }
                };
            })
        };
        // @ts-ignore
        const emailContent = yield (0, reviewtemplate_1.getReviewRequestContent)(orderWithProducts);
        yield (0, sendEmail_1.sendEmail)(emailContent);
        yield order_1.Order.findByIdAndUpdate(orderId, {
            reviewEmailSent: true,
            reviewEmailSentAt: new Date()
        });
        return true;
    }
    catch (error) {
        console.error(`Failed to send review email for order ${orderId}:`, error);
        return false;
    }
});
exports.sendReviewEmail = sendReviewEmail;
const scheduleReviewEmail = (orderId, delayMs = 6000) => {
    setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log(`Attempting to send review email for order ${orderId}`);
            const result = yield (0, exports.sendReviewEmail)(orderId);
            if (!result) {
                console.warn(`Failed to send review email for order ${orderId}`);
            }
        }
        catch (error) {
            console.error(`Error in scheduled review email for order ${orderId}:`, error);
        }
    }), delayMs);
};
exports.scheduleReviewEmail = scheduleReviewEmail;
