import axios from 'axios';
import mongoose from 'mongoose';

export interface IProduct {
  _id:mongoose.Schema.Types.ObjectId
  name: string;
  slug: string;
  description?: string;
  price: number;
  category: mongoose.Schema.Types.ObjectId; 
  sizes: string[];
  colors: string[];
  fit: string;
  material: string;
  imageUrl: string;
}
export interface ProductApiResponse {
  success: boolean;
  data: IProduct;
}

export const fetchProductDetails = async (productId: string): Promise<ProductApiResponse | null> => {
  try {
  const response = await axios.get<ProductApiResponse>(`${process.env.PRODUCT_SERVICE_URL}/api/products/find/${productId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error);
    return null;
  }
};

export const fetchMultipleProducts = async (productIds: string[]): Promise<(ProductApiResponse | null)[]> => {
  return Promise.all(productIds.map(id => fetchProductDetails(id)));
};