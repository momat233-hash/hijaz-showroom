import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

export const fetchProducts = () => api.get('/products');
export const createInvoice = (data: unknown) => api.post('/invoices', data);
