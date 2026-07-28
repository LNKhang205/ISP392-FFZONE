import api from '../services/api'

// ── Payment (VNPay) ───────────────────────────────────────────────────────────

/** Trả về { paymentUrl, bookingCode, vnpTxnRef } — FE redirect window.location sang paymentUrl. */
export const createPaymentUrl = (bookingId) =>
  api.post(`/payments/${bookingId}/create-url`).then(r => r.data)

/**
 * Tạo VNPay URL cho dịch vụ bổ sung tại sân.
 * payAmount = số tiền CHỈ của dịch vụ mới (đã tính discount), KHÔNG gồm tiền sân.
 */
export const createAddonPaymentUrl = (bookingId, payAmount) =>
  api.post(`/payments/${bookingId}/create-addon-url`, { payAmount }).then(r => r.data)
