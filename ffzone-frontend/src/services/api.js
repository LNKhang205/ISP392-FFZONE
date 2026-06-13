import axios from 'axios'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
const api = axios.create({ baseURL: apiUrl })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(res => res, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
  return Promise.reject(err)
})

export default api
