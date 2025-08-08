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
exports.getRecipientEmail = exports.getUserEmail = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SERVICE_SECRET = process.env.SERVICE_SECRET;
const getUserEmail = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const response = yield axios_1.default.get(`${process.env.AUTH_SERVICE_URL}/api/auth/internal/${userId}`, {
            headers: {
                'service-secret': SERVICE_SECRET
            },
            timeout: 5000
        });
        return response.data.email || null;
    }
    catch (error) {
        console.error(`Failed to fetch email for user ${userId}:`, ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
        return null;
    }
});
exports.getUserEmail = getUserEmail;
const getRecipientEmail = (order) => __awaiter(void 0, void 0, void 0, function* () {
    if (!order.userId)
        return order.guestEmail || null;
    return (yield (0, exports.getUserEmail)(order.userId.toString())) || order.guestEmail || null;
});
exports.getRecipientEmail = getRecipientEmail;
