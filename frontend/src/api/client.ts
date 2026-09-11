import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000/api",
  withCredentials: true, // session cookie
  headers: { "Content-Type": "application/json" },
});

// Attach CSRF token from cookie to mutating requests
api.interceptors.request.use((config) => {
  if (["post", "put", "patch", "delete"].includes(config.method ?? "")) {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    if (match) config.headers["X-CSRFToken"] = match[1];
  }
  return config;
});

export default api;
