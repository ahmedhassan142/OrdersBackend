// src/services/paymentService.ts
import axios from 'axios';
import dotenv from 'dotenv'

dotenv.config()

export interface PaymentDetails {
CardName: string,
CardNumber: string,
CVV: string,
Expirydate: Date,
status:string,
}

export const createPayment = async (details: PaymentDetails) => {
  const response = await axios.post(`${process.env.PAYMENT_SERVICE_URL}/api/payment/post`, details);
  return response.data;
};

export const fetchPaymentDetails = async (paymentId: string) => {
  try {
    const response = await axios.get(`${process.env.PAYMENT_SERVICE_URL}/api/payment/id/${paymentId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching payment details:", error);
    return null;
  }
};