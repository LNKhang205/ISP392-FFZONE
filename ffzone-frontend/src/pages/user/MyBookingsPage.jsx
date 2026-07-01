import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings, cancelBooking } from '../../api/bookingApi'
import { createPaymentUrl } from '../../api/paymentApi'
import { getRefundByBookingId } from '../../api/refundApi'
import styles from './MyBookingsPage.module.css'

const STATUS_LABEL = {
  PENDING_PAYMENT: { text: 'Chờ thanh toán', cls: 'pending'   },
  CONFIRMED:       { text: 'Đã xác nhận',    cls: 'confirmed' },
  IN_PROGRESS:     { text: 'Đang diễn ra',   cls: 'progress'  },
  COMPLETED:       { text: 'Hoàn thành',     cls: 'completed' },
  CANCELLED:       { text: 'Đã hủy',         cls: 'cancelled' },
  REFUNDED:        { text: 'Đã hoàn tiền',   cls: 'refunded'  },
}

const REFUND_STATUS_CONFIG = {
  PENDING:   { text: 'Đang chờ hoàn tiền', icon: '⏳', cls: 'refundPending' },
  COMPLETED: { text: 'Đã hoàn tiền',       icon: '✅', cls: 'refundDone'    },
  REJECTED:  { text: 'Từ chối hoàn tiền',  icon: '❌', cls: 'refundRejected'},
}

const FILTER_TABS = [
  { key: 'ALL',             label: 'Tất cả'         },
  { key: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { key: 'CONFIRMED',       label: 'Đã xác nhận'    },
  { key: 'COMPLETED',       label: 'Hoàn thành'     },
  { key: 'CANCELLED',       label: 'Đã hủy'         },
  { key: 'REFUNDED',        label: 'Đã hoàn tiền'   },
]

function fmt(time) {
  if (!time) return ''
  return String(time).substring(0, 5)
}

function fmtDateTime(dt) {
  if (!dt) return ''
  // dt có dạng "2026-06-20T14:30:00" hoặc array từ Java
  const d = new Date(dt)
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Sub-component: hiển thị thông tin hoàn tiền ──────────────────────────────
function RefundInfo({ bookingId, bookingStatus }) {
  const [refund, setRefund]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (bookingStatus !== 'CANCELLED' && bookingStatus !== 'REFUNDED') { setLoading(false); return }

    getRefundByBookingId(bookingId)
      .then(setRefund)
      .catch(() => setRefund(null))    // booking bị hủy trước khi thanh toán → không có refund
      .finally(() => setLoading(false))
  }, [bookingId, bookingStatus])

  if (bookingStatus !== 'CANCELLED' && bookingStatus !== 'REFUNDED') return null
  if (loading) return <div className={styles.refundBox}><span className={styles.refundLoading}>Đang kiểm tra hoàn tiền…</span></div>

  // Booking hủy trước khi thanh toán (PENDING_PAYMENT) → không có refund record
  if (!refund) {
    return (
      <div className={`${styles.refundBox} ${styles.refundNone}`}>
        <span>💡</span>
        <span>Đơn bị hủy trước khi thanh toán — không phát sinh hoàn tiền.</span>
      </div>
    )
  }

  const cfg = REFUND_STATUS_CONFIG[refund.status] ?? { text: refund.status, icon: '❓', cls: 'refundPending' }

  return (
    <div className={`${styles.refundBox} ${styles[cfg.cls]}`}>
      <div className={styles.refundHeader}>
        <span className={styles.refundIcon}>{cfg.icon}</span>
        <span className={styles.refundTitle}>{cfg.text}</span>
      </div>

      <div className={styles.refundGrid}>
        {/* Tỷ lệ + số tiền */}
        <div className={styles.refundRow}>
          <span>Tỷ lệ hoàn</span>
          <span className={styles.refundPercent}>{refund.refundPercent}%</span>
        </div>
        <div className={styles.refundRow}>
          <span>Số tiền hoàn</span>
          <strong className={styles.refundAmount}>
            {Number(refund.refundAmount).toLocaleString('vi-VN')}₫
          </strong>
        </div>

        {/* Ghi chú chính sách */}
        {refund.refundPercent === 0 && (
          <div className={styles.refundPolicy}>
            ℹ️ Hủy trong vòng 6 giờ trước giờ đá — không được hoàn tiền theo chính sách.
          </div>
        )}
        {refund.refundPercent === 100 && refund.status === 'PENDING' && (
          <div className={styles.refundPolicy}>
            📋 Nhân viên sẽ liên hệ và chuyển khoản hoàn tiền trong thời gian sớm nhất.
          </div>
        )}

        {/* Thông tin xử lý (nếu đã có) */}
        {refund.status === 'COMPLETED' && (
          <>
            {refund.processedByName && (
              <div className={styles.refundRow}>
                <span>Xử lý bởi</span>
                <span>{refund.processedByName}</span>
              </div>
            )}
            {refund.processedAt && (
              <div className={styles.refundRow}>
                <span>Thời gian hoàn</span>
                <span>{fmtDateTime(refund.processedAt)}</span>
              </div>
            )}
          </>
        )}

        {refund.status === 'REJECTED' && (
          <div className={styles.refundPolicy}>
            📝 <strong>Lý do từ chối:</strong> {refund.note || 'Không có ghi chú'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('ALL')
  const [expandedId, setExpandedId] = useState(null)
  const [busy, setBusy]         = useState({})
  const [msg, setMsg]           = useState('')

  const [cancelModal, setCancelModal] = useState(null) // { booking, hoursLeft }
  const [cancelReason, setCancelReason] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    getMyBookings()
      .then(setBookings)
      .catch(() => setMsg('Không thể tải danh sách đơn đặt sân.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter)

  const openCancelModal = (booking) => {
    // Tính số giờ còn lại đến giờ đá gần nhất
    const slots = booking.slots || []
    let hoursLeft = null
    if (slots.length > 0 && booking.status === 'CONFIRMED') {
      const earliest = slots
        .map(s => new Date(`${s.slotDate}T${String(s.startTime).substring(0,5)}`))
        .sort((a,b) => a-b)[0]
      hoursLeft = Math.floor((earliest - Date.now()) / 3600000)
    }
    setCancelReason('')
    setCancelModal({ booking, hoursLeft })
  }

  const handleCancel = async () => {
    if (!cancelModal) return
    setBusy(b => ({ ...b, [cancelModal.booking.id]: true }))
    setMsg('')
    try {
      await cancelBooking(cancelModal.booking.id, cancelReason)
      setCancelModal(null)
      load()
    } catch (err) {
      setMsg(err.response?.data?.message || 'Không thể hủy đơn này.')
      setCancelModal(null)
    } finally {
      setBusy(b => ({ ...b, [cancelModal?.booking?.id]: false }))
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

  const canCancel   = (s) => s === 'PENDING_PAYMENT' || s === 'CONFIRMED'
  const canPayAgain = (s) => s === 'PENDING_PAYMENT'

  return (
    <div className={styles.page}>
      {/* ── Cancel Modal ── */}
      {cancelModal && (
        <div className={styles.modalOverlay} onClick={() => setCancelModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Xác nhận hủy đơn</h3>
            <p className={styles.modalBookingCode}>{cancelModal.booking.bookingCode}</p>

            {/* Cảnh báo hoàn tiền — vấn đề 4 */}
            {cancelModal.booking.status === 'CONFIRMED' && (
              cancelModal.hoursLeft !== null && cancelModal.hoursLeft < 6 ? (
                <div className={styles.warnBox}>
                  ⚠️ <strong>Lưu ý:</strong> Chỉ còn <strong>{cancelModal.hoursLeft} giờ</strong> trước giờ đá.
                  Theo chính sách, hủy trong vòng 6 giờ trước giờ đá sẽ <strong>không được hoàn tiền (0%)</strong>.
                </div>
              ) : (
                <div className={styles.infoBox}>
                  ✅ Bạn đang hủy trước giờ đá hơn 6 giờ — sẽ được <strong>hoàn tiền 100%</strong>.
                  Nhân viên sẽ liên hệ chuyển khoản trong thời gian sớm nhất.
                </div>
              )
            )}

            <label className={styles.modalLabel}>Lý do hủy (không bắt buộc):</label>
            <textarea
              className={styles.modalTextarea}
              placeholder="Vd: Có việc bận đột xuất..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              rows={3}
            />

            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setCancelModal(null)}>
                Quay lại
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handleCancel}
                disabled={busy[cancelModal.booking.id]}
              >
                {busy[cancelModal.booking.id] ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              const expanded   = expandedId === b.id
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
                      {/* Khung giờ */}
                      <div className={styles.slotGrid}>
                        {b.slots?.map(s => (
                          <span key={s.fieldSlotId} className={styles.slotTag}>
                            📅 {s.slotDate} · 🕐 {fmt(s.startTime)}–{fmt(s.endTime)}
                          </span>
                        ))}
                      </div>

                      {/* Chi phí */}
                      <div className={styles.amountGrid}>
                        <div><span>Tiền sân</span><span>{Number(b.fieldAmount).toLocaleString('vi-VN')}₫</span></div>
                        {Number(b.serviceAmount) > 0 && (
                          <div><span>Dịch vụ</span><span>{Number(b.serviceAmount).toLocaleString('vi-VN')}₫</span></div>
                        )}
                        {Number(b.discountAmount) > 0 && (
                          <div>
                            <span>Giảm giá {b.voucherCode ? `(${b.voucherCode})` : ''}</span>
                            <span>-{Number(b.discountAmount).toLocaleString('vi-VN')}₫</span>
                          </div>
                        )}
                        <div className={styles.totalLine}>
                          <span>Tổng cộng</span>
                          <span>{Number(b.totalAmount).toLocaleString('vi-VN')}₫</span>
                        </div>
                      </div>

                      {b.note && <p className={styles.note}>📝 {b.note}</p>}

                      {/* ── Thông tin hoàn tiền (chỉ hiển thị khi CANCELLED) ── */}
                      <RefundInfo bookingId={b.id} bookingStatus={b.status} />

                      {/* Actions */}
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
                            onClick={() => openCancelModal(b)}
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
