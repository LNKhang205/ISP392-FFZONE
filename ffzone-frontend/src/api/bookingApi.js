import api from '../services/api'

// ── Booking ───────────────────────────────────────────────────────────────────

export const createBooking = (payload) =>
  api.post('/bookings', payload).then(r => r.data)

export const getMyBookings = () =>
  api.get('/bookings/me').then(r => r.data)

export const getAllBookings = () =>
  api.get('/bookings').then(r => r.data)

export const getBookingById = (id) =>
  api.get(`/bookings/${id}`).then(r => r.data)

export const getBookingByCode = (code) =>
  api.get(`/bookings/code/${code}`).then(r => r.data)

export const cancelBooking = (id, reason) =>
  api.post(`/bookings/${id}/cancel`, reason ? { reason } : {}).then(r => r.data)
