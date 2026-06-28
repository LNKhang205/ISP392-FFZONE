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


// Đặt thêm dịch vụ tại sân (booking đang CONFIRMED / IN_PROGRESS)
// items: [{ serviceId, quantity }], voucherCode: string | null
// Trả về { bookingId, bookingCode, payAmount }
export const addServicesAtVenue = (bookingId, items, voucherCode = null) =>
  api.post(`/bookings/${bookingId}/add-services-at-venue`, {
    items,
    voucherCode: voucherCode || null,
  }).then(r => r.data)