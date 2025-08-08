import { Order } from '../models/order';
import { fetchMultipleProducts } from './product';
import { getReviewRequestContent } from '../utils/reviewtemplate';
import { sendEmail } from '../utils/sendEmail';
import { OrderDetails } from '../types/email';

export const sendReviewEmail = async (orderId: string): Promise<boolean> => {
  try {
    // Get the order as a plain object
    const order = await Order.findById(orderId).lean();
    if (!order) return false;

    const products = await fetchMultipleProducts(
      order.items.map((item: any) => item.productId)
    );

    // Create properly typed OrderDetails object
    const orderWithProducts: OrderDetails = {
      _id: order._id.toString(),
      userId: order.userId?.toString(),
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
              name: product?.name || 'Product',
              // @ts-ignore
              slug: product?.slug || 'product',
              // @ts-ignore
              price: product?.price || item.price,
              // @ts-ignore
              imageUrl: product?.imageUrl || null
            }
          }
        };
      })
    };
// @ts-ignore
    const emailContent = await getReviewRequestContent(orderWithProducts);
    await sendEmail(emailContent);

    await Order.findByIdAndUpdate(orderId, {
      reviewEmailSent: true,
      reviewEmailSentAt: new Date()
    });

    return true;
  } catch (error) {
    console.error(`Failed to send review email for order ${orderId}:`, error);
    return false;
  }
};

export const scheduleReviewEmail = (orderId: string, delayMs: number = 6000): void => {
  setTimeout(async () => {
    try {
      console.log(`Attempting to send review email for order ${orderId}`);
      const result = await sendReviewEmail(orderId);
      if (!result) {
        console.warn(`Failed to send review email for order ${orderId}`);
      }
    } catch (error) {
      console.error(`Error in scheduled review email for order ${orderId}:`, error);
    }
  }, delayMs);
};