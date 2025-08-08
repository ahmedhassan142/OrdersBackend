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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createShipping = exports.fetchShippingDetails = void 0;
// src/services/shippingService.ts
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const fetchShippingDetails = (shippingId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get(`${process.env.SHIPPING_SERVICE_URL}/api/shipping/find/${shippingId}`);
        return response.data;
    }
    catch (error) {
        console.error("Error fetching shipping details:", error);
        return null;
    }
});
exports.fetchShippingDetails = fetchShippingDetails;
const createShipping = (details) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.post(`${process.env.SHIPPING_SERVICE_URL}/api/shipping/post`, details);
    return response.data;
});
exports.createShipping = createShipping;
