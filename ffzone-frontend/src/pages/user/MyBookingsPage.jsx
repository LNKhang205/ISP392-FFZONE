import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings, cancelBooking } from '../../api/bookingApi'
import { createPaymentUrl } from '../../api/paymentApi'
import styles from './MyBookingsPage.module.css'

const STATUS_LABEL = {
  PENDING_PAYMENT: { text: 'Chờ thanh toán', cls: 'pending' },
  CONFIRMED:       { text: 'Đã xác nhận',   cls: 'confirmed' },
  IN_PROGRESS:     { text: 'Đang diễn ra',  cls: 'progress' },
  COMPLETED:       { text: 'Hoàn thành',    cls: 'completed' },
  CANCELLED:       { text: 'Đã hủy',        cls: 'cancelled' },
  REFUND_PENDING:  { text: 'Chờ hoàn tiền', cls: 'pending' },
  REFUNDED:        { text: 'Đã hoàn tiền',  cls: 'cancelled' },
}

const FILTER_TABS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { key: 'CONFIRMED', label: 'Đã xác nhận' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'CANCELLED', label: 'Đã hủy' },
]

function fmt(time) {
  if (!time) return ''
  return String(time).substring(0, 5)
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [expandedId, setExpandedId] = useState(null)
  const [busy, setBusy] = useState({})
  const [msg, setMsg] = useState('')

  const load = () => {
    setLoading(true)
    getMyBookings()
      .then(setBookings)
      .catch(() => setMsg('Không thể tải danh sách đơn đặt sân.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter)

  const handleCancel = async (booking) => {
    const reason = window.prompt('Lý do hủy đơn (không bắt buộc):', '')
    if (reason === null) return // user bấm Cancel trên prompt
    setBusy(b => ({ ...b, [booking.id]: true }))
    setMsg('')
    try {
      await cancelBooking(booking.id, reason)
      load()
    } catch (err) {
      setMsg(err.response?.data?.message || 'Không thể hủy đơn này.')
    } finally {
      setBusy(b => ({ ...b, [booking.id]: false }))
    }
  }

  const handlePayAgain = async (booking) => {
    setBusy(b => ({ ...b, [booking.id]: true }))
    setMsg('')
    try {
      const payment = await createPaymentUrl(booking.id)
      window.location.href = payment.paymentUrl
    } catch (err) {
      setMsg(err.response?.data?.message || 'Không thể tạo lại link thanh toán.')
      setBusy(b => ({ ...b, [booking.id]: false }))
    }
  }

  const canCancel = (status) => status === 'PENDING_PAYMENT' || status === 'CONFIRMED'
  const canPayAgain = (status) => status === 'PENDING_PAYMENT'

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>📋 Đơn đặt sân của tôi</h1>

        <div className={styles.tabs}>
          {FILTER_TABS.map(t => (
            <button
              key={t.key}
              className={`${styles.tab} ${filter === t.key ? styles.tabActive : ''}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg && <div className={styles.errorBox}>⚠️ {msg}</div>}

        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p>Đang tải...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <span>📅</span>
            <p>Chưa có đơn đặt sân nào</p>
            <Link to="/booking" className="btn btn-primary">Đặt sân ngay</Link>
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map(b => {
              const statusInfo = STATUS_LABEL[b.status] || { text: b.status, cls: 'pending' }
              const expanded = expandedId === b.id
              return (
                <div key={b.id} className={styles.bookingCard}>
                  <div className={styles.cardTop} onClick={() => setExpandedId(expanded ? null : b.id)}>
                    <div className={styles.cardTopLeft}>
                      <span className={styles.bookingCode}>{b.bookingCode}</span>
                      <span className={styles.fieldName}>⚽ {b.fieldName}</span>
                    </div>
                    <div className={styles.cardTopRight}>
                      <span className={`${styles.statusBadge} ${styles[statusInfo.cls]}`}>
                        {statusInfo.text}
                      </span>
                      <span className={styles.chevron}>{expanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {expanded && (
                    <div className={styles.cardBody}>
                      <div className={styles.slotGrid}>
                        {b.slots?.map(s => (
                          <span key={s.fieldSlotId} className={styles.slotTag}>
                            📅 {s.slotDate} · 🕐 {fmt(s.startTime)}–{fmt(s.endTime)}
                          </span>
                        ))}
                      </div>

                      <div className={styles.amountGrid}>
                        <div><span>Tiền sân</span><span>{Number(b.fieldAmount).toLocaleString('vi-VN')}₫</span></div>
                        {Number(b.serviceAmount) > 0 && (
                          <div><span>Dịch vụ</span><span>{Number(b.serviceAmount).toLocaleString('vi-VN')}₫</span></div>
                        )}
                        {Number(b.discountAmount) > 0 && (
                          <div><span>Giảm giá {b.voucherCode ? `(${b.voucherCode})` : ''}</span><span>-{Number(b.discountAmount).toLocaleString('vi-VN')}₫</span></div>
                        )}
                        <div className={styles.totalLine}><span>Tổng cộng</span><span>{Number(b.totalAmount).toLocaleString('vi-VN')}₫</span></div>
                      </div>

                      {b.note && <p className={styles.note}>📝 {b.note}</p>}

                      <div className={styles.actions}>
                        {canPayAgain(b.status) && (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={busy[b.id]}
                            onClick={() => handlePayAgain(b)}
                          >
                            💳 Thanh toán ngay
                          </button>
                        )}
                        {canCancel(b.status) && (
                          <button
                            className={styles.cancelBtn}
                            disabled={busy[b.id]}
                            onClick={() => handleCancel(b)}
                          >
                            Hủy đơn
                          </button>
                        )}
                      </div>
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
