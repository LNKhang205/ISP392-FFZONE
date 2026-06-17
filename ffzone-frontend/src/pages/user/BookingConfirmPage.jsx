import { useParams, useLocation, useNavigate, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../../services/api'
import styles from './BookingConfirmPage.module.css'

const STATUS_LABEL = {
  PENDING_PAYMENT: '⏳ Chờ thanh toán',
  CONFIRMED:       '✅ Đã xác nhận',
  IN_PROGRESS:     '🏃 Đang diễn ra',
  COMPLETED:       '🏆 Hoàn thành',
  CANCELLED:       '❌ Đã huỷ',
  REFUND_PENDING:  '💰 Đang hoàn tiền',
  REFUNDED:        '💚 Đã hoàn tiền',
}

export default function BookingConfirmPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const [booking, setBooking] = useState(location.state?.booking || null)
  const [loading, setLoading] = useState(!booking)

  useEffect(() => {
    if (!booking) {
      api.get(`/bookings/my/${id}`)
        .then(r => setBooking(r.data))
        .catch(() => navigate('/my-bookings'))
        .finally(() => setLoading(false))
    }
  }, [id])

  if (loading || !booking)
    return <div className={styles.loading}>Đang tải...</div>

  const deadline = booking.paymentDeadline
    ? new Date(booking.paymentDeadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        <div className={styles.iconWrap}>
          {booking.status === 'PENDING_PAYMENT' ? (
            <div className={styles.iconPending}>⏳</div>
          ) : (
            <div className={styles.iconOk}>✅</div>
          )}
        </div>

        <h1 className={styles.title}>
          {booking.status === 'PENDING_PAYMENT' ? 'Đặt sân thành công!' : STATUS_LABEL[booking.status]}
        </h1>

        {booking.status === 'PENDING_PAYMENT' && deadline && (
          <p className={styles.deadline}>
            ⚠️ Vui lòng hoàn tất thanh toán trước <strong>{deadline}</strong> để giữ slot
          </p>
        )}

        <div className={styles.codeBox}>
          <span>Mã booking</span>
          <strong>{booking.bookingCode}</strong>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoRow}>
            <span>Sân</span>
            <strong>{booking.fieldName}</strong>
          </div>
          <div className={styles.infoRow}>
            <span>Trạng thái</span>
            <span className={styles.statusBadge}>{STATUS_LABEL[booking.status] || booking.status}</span>
          </div>

          {booking.slots?.length > 0 && (
            <div className={styles.infoRow}>
              <span>Slot đặt</span>
              <div>
                {booking.slots
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(s => (
                    <div key={s.slotId} className={styles.slotTag}>
                      📅 {s.slotDate} &nbsp; 🕐 {s.startTime.slice(0,5)}–{s.endTime.slice(0,5)}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {booking.services?.length > 0 && (
            <div className={styles.infoRow}>
              <span>Dịch vụ</span>
              <div>
                {booking.services.map(s => (
                  <div key={s.bookingServiceId} className={styles.svcTag}>
                    {s.serviceName} × {s.quantity} = {s.totalPrice?.toLocaleString('vi-VN')}₫
                  </div>
                ))}
              </div>
            </div>
          )}

          {booking.voucherCode && (
            <div className={styles.infoRow}>
              <span>Voucher</span>
              <span className={styles.voucherTag}>🎟 {booking.voucherCode}</span>
            </div>
          )}

          {booking.discountAmount > 0 && (
            <div className={styles.infoRow}>
              <span>Giảm giá</span>
              <span style={{ color: '#16a34a' }}>−{booking.discountAmount?.toLocaleString('vi-VN')}₫</span>
            </div>
          )}

          <div className={`${styles.infoRow} ${styles.totalRow}`}>
            <span>Tổng thanh toán</span>
            <strong className={styles.totalAmount}>{booking.totalAmount?.toLocaleString('vi-VN')}₫</strong>
          </div>
        </div>

        <div className={styles.actions}>
          {booking.status === 'PENDING_PAYMENT' && (
            <button className="btn btn-primary" onClick={() => alert('VNPay integration coming soon')}>
              💳 Thanh toán VNPay
            </button>
          )}
          <Link to="/my-bookings" className="btn btn-outline">📋 Xem lịch đặt sân</Link>
          <Link to="/booking" className="btn btn-outline">⚽ Đặt sân khác</Link>
        </div>

      </div>
    </div>
  )
}
