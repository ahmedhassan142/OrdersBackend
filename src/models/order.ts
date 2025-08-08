import mongoose, { Document, Schema, Model, Types } from "mongoose";







// Update IOrderItem to use BaseProductData
export interface IOrderItem {
  productId: Types.ObjectId;
  quantity: number;
  imageUrl:string;
  price: number;
  size?: string;
  color?: string;
  product?: {
    success: boolean;
    data: BaseProductData;
  };
}

export interface IOrder extends Document {
  _id: Types.ObjectId;
  userId?: string;
  guestEmail?: string;
  sessionId?: string;
  shippingId: Types.ObjectId;
  paymentId: Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  status: string;
  confirmationSent: boolean;
  reviewEmailSent: boolean;
   cancellationReason: String,
  cancelledAt: Date
  reviewEmailSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// types/order.ts
export interface BaseOrderDetails {
  _id: string | Types.ObjectId;
  userId?: string;
  guestEmail?: string;
  sessionId?: string;
  // Include all other common order properties
}

export interface BaseProductData {
  _id: string | Types.ObjectId;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string | null;
}

export interface OrderItemDetails {
  productId: string | Types.ObjectId;
  quantity: number;
  price: number;
  imageUrl:string;
  size?: string;
  color?: string;
  product: {
    success: boolean;
    data: BaseProductData;
  };
}

// Main unified interface
export interface OrderDetails extends BaseOrderDetails {
  items: OrderItemDetails[];
}

const orderItemSchema = new Schema<IOrderItem>({
  productId: { 
    type: Schema.Types.ObjectId, 
    // ref: 'Product', 
    required: true 
  },
  
  quantity: { 
    type: Number, 
    required: true,
    min: 1
  },
  imageUrl:{type:String,required:true},
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  size: { type: String },
  color: { type: String }
});

const orderSchema = new Schema<IOrder>({
  
  userId: { 
    type: String, 
    ref: 'User' 
  },
  guestEmail: {
    type: String,
    validate: {
      validator: (email: string) => {
        if (!email) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  sessionId: { 
    type: String, 
  
  },
  shippingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Shipping', 
    required: true 
  },
  paymentId: { 
    type: mongoose.Schema.Types.ObjectId, 
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
  cancellationReason: {type:String},
  cancelledAt: {type:Date},
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
orderSchema.pre<IOrder>(['save', 'updateOne'], function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to check if review email was sent
orderSchema.statics.hasReviewEmailBeenSent = async function(orderId: Types.ObjectId) {
  const order = await this.findById(orderId).select('reviewEmailSent');
  return order?.reviewEmailSent || false;
};

// Type for Order model with static methods
interface IOrderModel extends Model<IOrder> {
  hasReviewEmailBeenSent(orderId: mongoose.Schema.Types.ObjectId): Promise<boolean>;
}

export const Order: IOrderModel = 
  (mongoose.models.Order as IOrderModel) || 
  mongoose.model<IOrder, IOrderModel>('Order', orderSchema);