"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const util_1 = require("./util");
const httpClient = axios_1.default.create({
    baseURL: util_1.defaultBaseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});
httpClient.interceptors.response.use(response => response, error => {
    console.error('HTTP Client error:', error);
    return Promise.reject(error);
});
exports.default = httpClient;
//# sourceMappingURL=httpClient.js.map