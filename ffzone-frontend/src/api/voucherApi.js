import api from '../services/api'

export const getAllVouchers       = () => api.get('/vouchers').then(r => r.data)
export const getAvailableVouchers = () => api.get('/vouchers/available').then(r => r.data)
export const createVoucher        = (data) => api.post('/vouchers', data).then(r => r.data)
export const deactivateVoucher    = (id) => api.delete('/vouchers/' + id).then(r => r.data)

export const claimVoucher         = (voucherId) => api.post('/user-vouchers/claim/' + voucherId).then(r => r.data)
export const getMyVouchers        = () => api.get('/user-vouchers/my').then(r => r.data)
