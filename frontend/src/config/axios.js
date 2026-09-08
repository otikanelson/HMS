import axios from 'axios';

// Configure axios baseURL based on environment
const baseURL = process.env.REACT_APP_API_URL || '';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
