import api from '../services/api'

// ── Payment (VNPay) ───────────────────────────────────────────────────────────

/** Trả về { paymentUrl, bookingCode, vnpTxnRef } — FE redirect window.location sang paymentUrl. */
export const createPaymentUrl = (bookingId) =>
  api.post(`/payments/${bookingId}/create-url`).then(r => r.data)
