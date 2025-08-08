// src/services/shippingService.ts
import axios from 'axios';
import dotenv from 'dotenv'

dotenv.config()


export interface ShippingDetails {
  fullname: string;
  country: string;
  streetAddress: string;
  postalCode: string;
  state: string;
  city: string;
  phoneNumber: string;
}



export const fetchShippingDetails = async (shippingId: string) => {
  try {
    const response = await axios.get(`${process.env.SHIPPING_SERVICE_URL}/api/shipping/find/${shippingId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching shipping details:", error);
    return null;
  }
};
export const createShipping = async (details: ShippingDetails) => {
  const response = await axios.post(`${process.env.SHIPPING_SERVICE_URL}/api/shipping/post`, details);
  return response.data;
};