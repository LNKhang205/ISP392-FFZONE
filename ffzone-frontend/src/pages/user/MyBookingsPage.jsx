import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import styles from './MyBookingsPage.module.css'

const TABS = [
  { key: 'ALL',             label: 'Tất cả' },
  { key: 'PENDING_PAYMENT', label: 'Chờ TT' },
  { key: 'CONFIRMED',       label: 'Đã xác nhận' },
  { key: 'IN_PROGRESS',     label: 'Đang đá' },
  { key: 'COMPLETED',       label: 'Hoàn thành' },
  { key: 'CANCELLED',       label: 'Đã huỷ' },
]

const STATUS_STYLE = {
  PENDING_PAYMENT: { bg: '#fef9c3', text: '#92400e', label: '⏳ Chờ thanh toán' },
  CONFIRMED:       { bg: '#dcfce7', text: '#166534', label: '✅ Đã xác nhận' },
  IN_PROGRESS:     { bg: '#dbeafe', text: '#1e40af', label: '🏃 Đang diễn ra' },
  COMPLETED:       { bg: '#f0fdf4', text: '#15803d', label: '🏆 Hoàn thành' },
  CANCELLED:       { bg: '#fee2e2', text: '#991b1b', label: '❌ Đã huỷ' },
  REFUND_PENDING:  { bg: '#fef3c7', text: '#78350f', label: '💰 Đang hoàn tiền' },
  REFUNDED:        { bg: '#d1fae5', text: '#065f46', label: '💚 Đã hoàn' },
}

export default function MyBookingsPage() {
  const [bookings, setBookings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('ALL')
  const [cancelling, setCancelling] = useState(null)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    api.get('/bookings/my')
      .then(r => setBookings(r.data))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = activeTab === 'ALL'
    ? bookings
    : bookings.filter(b => b.status === activeTab)

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Bạn có chắc muốn huỷ booking này?')) return
    setCancelling(bookingId)
    try {
      await api.post(`/bookings/${bookingId}/cancel`)
      load()
    } catch (e) {
      alert('❌ ' + (e.response?.data?.message || 'Không thể huỷ'))
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className="container">

        <div className={styles.header}>
          <h1>📋 Lịch đặt sân của tôi</h1>
          <Link to="/booking" className="btn btn-primary btn-sm">+ Đặt sân mới</Link>
        </div>

        <div className={styles.tabs}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
              {t.key !== 'ALL' && (
                <span className={styles.tabCount}>
                  {bookings.filter(b => b.status === t.key).length || ''}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loadingWrap}>
            {[1,2,3].map(i => <div key={i} className={styles.skeleton} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <span>📭</span>
            <p>Không có booking nào{activeTab !== 'ALL' ? ' ở trạng thái này' : ''}</p>
            <Link to="/booking" className="btn btn-primary btn-sm">Đặt sân ngay</Link>
          </div>
        ) : (
          <div className={styles.list}>
            {filtered.map(b => {
              const st = STATUS_STYLE[b.status] || { bg: '#f9fafb', text: '#111', label: b.status }
              const firstSlot = b.slots?.[0]
              return (
                <div key={b.id} className={styles.bookingCard}>

                  <div className={styles.cardTop}>
                    <div>
                      <div className={styles.bookingCode}>{b.bookingCode}</div>
                      <div className={styles.fieldName}>{b.fieldName}</div>
                    </div>
                    <span
                      className={styles.statusBadge}
                      style={{ background: st.bg, color: st.text }}
                    >
                      {st.label}
                    </span>
                  </div>

                  {firstSlot && (
                    <div className={styles.slotInfo}>
                      📅 {firstSlot.slotDate} &nbsp;
                      🕐 {firstSlot.startTime?.slice(0,5)}–{b.slots?.[b.slots.length-1]?.endTime?.slice(0,5)}
                      {b.slots?.length > 1 && <span className={styles.slotCount}> ({b.slots.length} slot)</span>}
                    </div>
                  )}

                  {b.services?.length > 0 && (
                    <div className={styles.services}>
                      {b.services.map(s => (
                        <span key={s.bookingServiceId} className={styles.svcChip}>
                          {s.serviceName} ×{s.quantity}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className={styles.cardBottom}>
                    <div className={styles.amounts}>
                      {b.discountAmount > 0 && (
                        <span className={styles.discount}>−{b.discountAmount?.toLocaleString('vi-VN')}₫</span>
                      )}
                      <span className={styles.total}>{b.totalAmount?.toLocaleString('vi-VN')}₫</span>
                    </div>

                    <div className={styles.cardActions}>
                      {b.status === 'PENDING_PAYMENT' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/booking-confirm/${b.id}`)}
                        >
                          💳 Thanh toán
                        </button>
                      )}
                      {(b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT') && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: '#dc2626', borderColor: '#dc2626' }}
                          disabled={cancelling === b.id}
                          onClick={() => handleCancel(b.id)}
                        >
                          {cancelling === b.id ? '...' : 'Huỷ'}
                        </button>
                      )}
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/booking-confirm/${b.id}`)}
                      >
                        Chi tiết
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
