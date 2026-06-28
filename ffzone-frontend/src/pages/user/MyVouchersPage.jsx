import { useState, useEffect } from 'react'
import { getMyVouchers } from '../../api/voucherApi'

export default function MyVouchersPage() {
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getMyVouchers()
      .then(setVouchers)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const now = new Date()

  return (
    <div style={{ padding: '48px 0 64px', minHeight: '60vh' }}>
      <div className="container">
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>🎫 Voucher của tôi</h1>
        <p style={{ color: '#6b7280', marginBottom: 32 }}>Danh sách voucher bạn đã nhận</p>

        {loading ? (
          <p style={{ color: '#9ca3af' }}>Đang tải...</p>
        ) : vouchers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
            <div style={{ fontSize: 64 }}>🎫</div>
            <p style={{ marginTop: 16 }}>Bạn chưa có voucher nào</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {vouchers.map(v => {
              const expired = new Date(v.endDate) < now
              const used    = v.isUsed

              const statusColor = used ? '#9ca3af' : expired ? '#9ca3af' : '#16a34a'
              const statusBg    = used ? '#f3f4f6' : expired ? '#f3f4f6' : '#f0fdf4'
              const statusText  = used ? '✅ Đã sử dụng' : expired ? '⏰ Hết hạn' : '🟢 Còn hiệu lực'
              const cardBorder  = used || expired ? '#e5e7eb' : '#22c55e'
              const cardOpacity = used || expired ? 0.6 : 1

              return (
                <div key={v.id} style={{
                  border: `2px solid ${cardBorder}`,
                  borderRadius: 14,
                  padding: 24,
                  background: '#fff',
                  opacity: cardOpacity,
                  position: 'relative',
                  filter: used || expired ? 'grayscale(40%)' : 'none',
                }}>
                  {/* Status badge */}
                  <span style={{
                    position: 'absolute', top: 14, right: 14,
                    padding: '3px 10px', borderRadius: 999, fontSize: 11,
                    fontWeight: 700, background: statusBg, color: statusColor
                  }}>
                    {statusText}
                  </span>

                  {/* Type badge */}
                  <span style={{
                    display: 'inline-block', padding: '2px 10px', borderRadius: 999,
                    fontSize: 11, fontWeight: 700, marginBottom: 10,
                    background: v.voucherType === 'PERCENT' ? '#dcfce7' : '#dbeafe',
                    color:      v.voucherType === 'PERCENT' ? '#16a34a' : '#2563eb',
                  }}>
                    {v.voucherType === 'PERCENT' ? '% Phần trăm' : '₫ Cố định'}
                  </span>

                  {/* Code */}
                  <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2, color: used || expired ? '#9ca3af' : '#16a34a' }}>
                    {v.code}
                  </div>

                  {/* Discount */}
                  <div style={{ fontSize: 28, fontWeight: 900, color: used || expired ? '#9ca3af' : '#dc2626', margin: '6px 0' }}>
                    {v.voucherType === 'PERCENT'
                      ? `Giảm ${v.discountValue}%`
                      : `Giảm ${Number(v.discountValue).toLocaleString('vi-VN')}₫`}
                  </div>

                  {/* Info */}
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span>📅 Hết hạn: <b>{new Date(v.endDate).toLocaleDateString('vi-VN')}</b></span>
                    <span>🎁 Nhận lúc: {v.claimedAt ? new Date(v.claimedAt).toLocaleDateString('vi-VN') : '—'}</span>
                  </div>

                  {/* Usage hint */}
                  {!used && !expired && (
                    <div style={{ marginTop: 14, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                      💡 Dùng mã <b>{v.code}</b> khi đặt sân để được giảm giá
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}