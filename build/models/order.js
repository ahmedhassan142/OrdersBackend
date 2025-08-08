"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.Order = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const orderItemSchema = new mongoose_1.Schema({
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        // ref: 'Product', 
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    imageUrl: { type: String, required: true },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    size: { type: String },
    color: { type: String }
});
const orderSchema = new mongoose_1.Schema({
    userId: {
        type: String,
        ref: 'User'
    },
    guestEmail: {
        type: String,
        validate: {
            validator: (email) => {
                if (!email)
                    return true;
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            },
            message: 'Invalid email format'
        }
    },
    sessionId: {
        type: String,
    },
    shippingId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Shipping',
        required: true
    },
    paymentId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Payment',
        required: true
    },
    items: [orderItemSchema],
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    tax: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    shippingCost: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ["pending", "done", "shipped", "delivered", "cancelled"],
        default: "pending"
    },
    cancellationReason: { type: String },
    cancelledAt: { type: Date },
    confirmationSent: {
        type: Boolean,
        default: false
    },
    reviewEmailSent: {
        type: Boolean,
        default: false
    },
    reviewEmailSentAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // This automatically handles createdAt and updatedAt
});
// Indexes for better query performance
orderSchema.index({ userId: 1 });
orderSchema.index({ sessionId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'items.productId': 1 });
// Middleware to update updatedAt on save
orderSchema.pre(['save', 'updateOne'], function (next) {
    this.updatedAt = new Date();
    next();
});
// Static method to check if review email was sent
orderSchema.statics.hasReviewEmailBeenSent = function (orderId) {
    return __awaiter(this, void 0, void 0, function* () {
        const order = yield this.findById(orderId).select('reviewEmailSent');
        return (order === null || order === void 0 ? void 0 : order.reviewEmailSent) || false;
    });
};
exports.Order = mongoose_1.default.models.Order ||
    mongoose_1.default.model('Order', orderSchema);
