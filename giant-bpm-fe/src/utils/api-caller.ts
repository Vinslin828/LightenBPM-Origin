import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { authEvents } from "./auth-events";

const API_BASE_URL = import.meta.env.DEV
  ? "/api"
  : import.meta.env.VITE_API_BASE_URL || "https://bpm-api.dev.giantcycling.com";

// Create an Axios instance
const apiCaller: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor: Add authorization token if available
apiCaller.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Example: Get token from localStorage or a global state management (e.g., Jotai)
    const token = localStorage.getItem("authToken"); // Or from Jotai atom
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor: Handle global errors (e.g., 401 Unauthorized)
apiCaller.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("API Error:", error.response.status, error.response.data);

      if (error.response.status === 401) {
        authEvents.emitUnauthorized();
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    }
    return Promise.reject(error);
  },
);

export default apiCaller;
