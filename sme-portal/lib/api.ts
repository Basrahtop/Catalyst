import axios from 'axios';

// 1. Define the base URL of our backend API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

// 2. This is the "magic"
// We use an 'interceptor' to automatically add the auth token to every request.
api.interceptors.request.use(
  (config) => {
    // 3. We get the token from browser's "localStorage"
    // (We will write the code to put it there in our AuthContext)
    const token = localStorage.getItem('catalyst_token');
    
    if (token) {
      // 4. If the token exists, add it to the 'Authorization' header
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;