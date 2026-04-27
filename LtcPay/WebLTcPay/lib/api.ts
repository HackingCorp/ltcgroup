import axios from "axios"
import Cookies from "js-cookie"

function getApiBaseUrl(): string {
  // Runtime detection: derive API URL from browser hostname
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return `${window.location.protocol}//pay.ltcgroup.site/api/v1`
  }
  // Fallback for local development and SSR
  return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/api/v1`
}

const api = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to set baseURL dynamically and add auth token
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl()
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
        const role = Cookies.get("user_role")
        Cookies.remove("access_token")
        Cookies.remove("refresh_token")
        Cookies.remove("user_role")
        window.location.href = role === "merchant" ? "/merchant/login" : "/auth/login"
      }
    }
    return Promise.reject(error)
  }
)

export default api
