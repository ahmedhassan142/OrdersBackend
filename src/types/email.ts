export interface EmailOptions {
  email: string;  // Note: Not nullable
  subject: string;
  text: string;
  html: string;
}

export interface ReviewProductInfo {
  productId: string;
  slug: string;
  name: string;
  image?: string|null;
  price: number;
  reviewLink: string;
}

export interface OrderDetails {
  _id: string;
  userId?: string;
  guestEmail?: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    product: {
      success: boolean;
      data: {
        _id: string;
        name: string;
        slug: string;
        price: number;
        imageUrl?: string | null;
      };
    };
    // Include any other item properties you need
    size?: string;
    color?: string;
  }>;
  // Include any other order properties you need
  sessionId?: string;
  // ... etc
}