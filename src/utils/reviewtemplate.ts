import { OrderDetails, BaseProductData } from "../models/order";
import { EmailOptions, ReviewProductInfo } from "../types/email";
import { getRecipientEmail } from '../services/userservice';
import { fetchProductDetails } from "../services/product";


export const getReviewRequestContent = async (order: OrderDetails): Promise<EmailOptions> => {
  try {
    // Normalize order data (convert ObjectIds to strings)
    const normalizedOrder = {
      ...order,
      _id: typeof order._id === 'object' ? order._id.toString() : order._id,
      items: order.items.map(item => ({
        ...item,
        productId: typeof item.productId === 'object' ? item.productId.toString() : item.productId,
        product: {
          ...item.product,
          data: {
            ...item.product.data,
            _id: typeof item.product.data._id === 'object' 
              ? item.product.data._id.toString() 
              : item.product.data._id
          }
        }
      }))
    };

    // Prepare products for review
    const productsForReview =  await prepareProductsForReview(normalizedOrder);
    
    // Get recipient email
    // @ts-ignore
    const recipientEmail = await getRecipientEmail(normalizedOrder);
    if (!recipientEmail) {
      throw new Error("No email address available for order");
    }

    return {
      email: recipientEmail,
      subject: `Review your order #${normalizedOrder._id.toString().substring(0, 8)}`,
      text: generateTextContent(normalizedOrder, productsForReview),
      html: generateHtmlContent(normalizedOrder, productsForReview)
    };
  } catch (error) {
    console.error('Error generating review email:', error);
    throw new Error('Failed to create review email');
  }
};

// Helper functions
async function prepareProductsForReview(order: OrderDetails): Promise<ReviewProductInfo[]> {
  const baseUrl = process.env.FRONTEND_URL 
  
  const itemsWithDetails = await Promise.all(
    order.items.map(async (item) => {
      const productId = typeof item.productId === 'object' 
        ? item.productId.toString() 
        : item.productId;
      const orderId = typeof order._id === 'object' 
        ? order._id.toString() 
        : order._id;

      try {
        // Fetch product details from your API
        const response = await fetchProductDetails(productId);
        
        if (!response || !response.success) {
          throw new Error('Product not found or API error');
        }

        // Extract product data from the API response structure
        const productData = response.data;
        const productSlug = productData.slug || 'product'; // Now correctly accessing the slug
        
        // Generate frontend URL (note: using /Product/ as you specified for frontend)
       const reviewLink = `${baseUrl}/Product/${encodeURIComponent(productSlug)}?order=${orderId}&item=${productId}`;

        return {
          productId: productId,
          slug: productSlug,
          name: productData.name || 'Item',
          image: productData.imageUrl || undefined,
          price: productData.price || item.price,
          reviewLink: reviewLink
        };
      } catch (error) {
        console.error(`Error processing product ${productId}:`, error);
        return {
          productId: productId,
          slug: 'product',
          name: 'Item',
          image: undefined,
          price: item.price,
          reviewLink: `${baseUrl}/Product/product?order=${orderId}&item=${productId}`
        };
      }
    })
  );

  return itemsWithDetails;
}
function generateTextContent(order: OrderDetails, products: ReviewProductInfo[]): string {
  const orderIdShort = order._id.toString().substring(0, 8);
  let text = `Hi there,\n\nThank you for your order #${orderIdShort}!\n\n`;
  text += `Please review your ${products.length > 1 ? 'items' : 'item'}:\n\n`;

  products.forEach(product => {
    text += `- ${product.name} ($${product.price.toFixed(2)}): ${product.reviewLink}\n`;
  });

  text += `\nWe appreciate your feedback!\n\n`;
  text += `Best regards,\n${process.env.BRAND_NAME || 'Our Team'}`;

  return text;
}

function generateHtmlContent(order: OrderDetails, products: ReviewProductInfo[]): string {
  const orderIdShort = order._id.toString().substring(0, 8);
  const brandName = process.env.BRAND_NAME || 'Our Store';
  
  const productsHtml = products.map(product => `
    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
      <div style="display: flex; gap: 15px; align-items: center;">
        ${product.image ? `
          <img src="${product.image}" alt="${product.name}" 
               width="80" height="80" 
               style="object-fit: cover; border-radius: 4px; border: 1px solid #eee;">
        ` : ''}
        <div>
          <h3 style="margin: 0 0 5px 0; font-size: 16px; color: #333;">
            ${product.name} - $${product.price.toFixed(2)}
          </h3>
          <a href="${product.reviewLink}"
             style="display: inline-block;
                    background-color: #2563eb;
                    color: white;
                    padding: 8px 16px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-size: 14px;
                    margin-top: 8px;">
            Write Review
          </a>
        </div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Review Your Order</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 0 15px; }
    .header { background-color: #f8fafc; padding: 25px 0; text-align: center; }
    .content { padding: 25px 0; }
    .footer { background-color: #f8fafc; padding: 20px 0; text-align: center; font-size: 14px; color: #64748b; }
    .product-card { margin-bottom: 25px; }
    .btn-review { 
      display: inline-block; 
      background-color: #3b82f6; 
      color: white; 
      padding: 10px 20px; 
      text-decoration: none; 
      border-radius: 6px; 
      font-weight: 500;
    }
    .benefits-box {
      background-color: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; color: #1e293b;">How was your experience?</h1>
      <p style="margin: 10px 0 0; color: #64748b;">Order #${orderIdShort}</p>
    </div>
    
    <div class="content">
      <p>Hi there,</p>
      <p>Thank you for shopping with ${brandName}! We'd love to hear your feedback about your recent purchase.</p>
      
      <h2 style="margin-top: 30px; margin-bottom: 20px; color: #1e293b;">Your ${products.length > 1 ? 'Items' : 'Item'}</h2>
      ${productsHtml}
      
      <div class="benefits-box">
        <h3 style="margin-top: 0; color: #1e293b;">Why your review matters:</h3>
        <ul style="padding-left: 20px; margin-bottom: 0;">
          <li>Helps us improve our products and services</li>
          <li>Guides other customers with their purchases</li>
          <li>You'll get early access to new products</li>
        </ul>
      </div>
      
      <p style="margin-top: 30px;">We appreciate your time and feedback!</p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
      <p style="margin: 5px 0 0;">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
           style="color: #3b82f6; text-decoration: none;">Visit our store</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}