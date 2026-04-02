import axios from "axios"
import Cookies from "js-cookie"

const api = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/v1`,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token from cookies
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== "undefined" ? Cookies.get("access_token") : null
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        Cookies.remove("access_token")
        Cookies.remove("refresh_token")
        window.location.href = "/auth/login"
      }
    }
    return Promise.reject(error)
  }
)

export default api
