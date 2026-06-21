import api from '../services/api'

// ── Refund ────────────────────────────────────────────────────────────────────

export const getPendingRefunds = () =>
  api.get('/refunds/pending').then(r => r.data)

export const getAllRefunds = () =>
  api.get('/refunds').then(r => r.data)

export const getRefundByBookingId = (bookingId) =>
  api.get(`/refunds/booking/${bookingId}`).then(r => r.data)

export const completeRefund = (id, note) =>
  api.post(`/refunds/${id}/complete`, note ? { note } : {}).then(r => r.data)

export const rejectRefund = (id, note) =>
  api.post(`/refunds/${id}/reject`, { note }).then(r => r.data)
