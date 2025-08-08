// services/userService.ts
import { IOrder } from "../models/order";
import axios from "axios";
import dotenv from 'dotenv'
dotenv.config();


const SERVICE_SECRET = process.env.SERVICE_SECRET 

interface IUserEmailResponse {
  email?: string;
}

export const getUserEmail = async (userId: string): Promise<string | null> => {
  try {
    const response = await axios.get<IUserEmailResponse>(
      `${process.env.AUTH_SERVICE_URL}/api/auth/internal/${userId}`,
      { 
        headers: { 
          'service-secret': SERVICE_SECRET
        },
        timeout: 5000
      }
    );
    return response.data.email || null;
  } catch (error: any) {
    console.error(`Failed to fetch email for user ${userId}:`, error.response?.data || error.message);
    return null;
  }
};

export const getRecipientEmail = async (order: IOrder): Promise<string | null> => {
  if (!order.userId) return order.guestEmail || null;
  return await getUserEmail(order.userId.toString()) || order.guestEmail || null;
};