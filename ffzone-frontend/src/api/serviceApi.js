import api from '../services/api'
 
// ── Service ───────────────────────────────────────────────────────────────────
 
export const getAllServices    = () => api.get('/services').then(r => r.data)
export const getActiveServices = () => api.get('/services/active').then(r => r.data)
export const getServiceById    = (id) => api.get(`/services/${id}`).then(r => r.data)
 
export const createService = (data) => api.post('/services', data).then(r => r.data)
export const updateService = (id, data) => api.put(`/services/${id}`, data).then(r => r.data)
export const toggleService = (id) => api.patch(`/services/${id}/toggle`).then(r => r.data)
export const deleteService = (id) => api.delete(`/services/${id}`)
 
export const uploadServiceImage = (id, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post(`/services/${id}/image`, formData).then(r => r.data)
}
 
// ── Cart ──────────────────────────────────────────────────────────────────────
 
export const getCart     = () => api.get('/cart').then(r => r.data)
export const addToCart   = (serviceId, quantity = 1) =>
  api.post('/cart/items', { serviceId, quantity }).then(r => r.data)
export const updateCartItem = (itemId, quantity) =>
  api.put(`/cart/items/${itemId}`, null, { params: { quantity } }).then(r => r.data)
export const removeCartItem  = (itemId) => api.delete(`/cart/items/${itemId}`).then(r => r.data)
export const clearCart       = () => api.delete('/cart')
 
// ── Booking Services ──────────────────────────────────────────────────────────
 
export const getBookingServices  = (bookingId) =>
  api.get(`/bookings/${bookingId}/services`).then(r => r.data)
export const checkoutCartToBooking = (bookingId) =>
  api.post(`/bookings/${bookingId}/services/checkout-cart`).then(r => r.data)
export const addServiceToBooking = (bookingId, serviceId, quantity = 1) =>
  api.post(`/bookings/${bookingId}/services`, { serviceId, quantity }).then(r => r.data)
export const removeServiceFromBooking = (bookingId, bookingServiceId) =>
  api.delete(`/bookings/${bookingId}/services/${bookingServiceId}`)
 