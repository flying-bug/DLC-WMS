import axios from 'axios';

// Create a separate axios instance without interceptors that inject Authorization tokens
const publicApiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json'
    }
});

export const getPublicQuote = async (token) => {
    return await publicApiClient.get(`/api/v1/public/sales-orders/${token}/quote`);
};

export const getPublicRepairQuote = async (token) => {
    return await publicApiClient.get(`/api/v1/public/repairs/${token}/quote`);
};
