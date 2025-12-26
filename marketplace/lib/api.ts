import axios from 'axios';

// Point to your existing backend
const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

export default api;