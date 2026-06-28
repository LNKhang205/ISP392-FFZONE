import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings, cancelBooking, addServicesAtVenue } from '../../api/bookingApi'
import { createPaymentUrl } from '../../api/paymentApi'
import { getActiveServices } from '../../api/serviceApi'
import { getMyVouchers } from '../../api/voucherApi'
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
  { key: 'IN_PROGRESS', label: 'Đang diễn ra' },
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

  // ── Modal đặt dịch vụ tại sân ──
  const [venueModal, setVenueModal] = useState(null) // bookingId | null
  const [allServices, setAllServices] = useState([])
  const [myVouchers, setMyVouchers] = useState([])
  const [venueQty, setVenueQty] = useState({}) // { serviceId: qty }
  const [venueVoucher, setVenueVoucher] = useState(null) // selected UserVoucherResponse
  const [venueLoading, setVenueLoading] = useState(false)
  const [venueSubmitting, setVenueSubmitting] = useState(false)
  const [venueError, setVenueError] = useState('')

  const openVenueModal = async (bookingId) => {
    setVenueModal(bookingId)
    setVenueQty({})
    setVenueVoucher(null)
    setVenueError('')
    setVenueLoading(true)
    try {
      const [svcs, vouchers] = await Promise.all([
        getActiveServices(),
        getMyVouchers(),
      ])
      setAllServices(svcs)
      const now = new Date()
      setMyVouchers(vouchers.filter(v => !v.isUsed && new Date(v.endDate) > now))
    } catch {
      setVenueError('Không thể tải dữ liệu. Vui lòng thử lại.')
    } finally {
      setVenueLoading(false)
    }
  }

  const venueItems = useMemo(() =>
    Object.entries(venueQty)
      .filter(([, q]) => q > 0)
      .map(([serviceId, quantity]) => ({ serviceId, quantity })),
    [venueQty]
  )

  const venueSubtotal = useMemo(() => {
    return Object.entries(venueQty).reduce((sum, [serviceId, qty]) => {
      const svc = allServices.find(s => s.id === serviceId)
      return sum + (svc ? Number(svc.price) * qty : 0)
    }, 0)
  }, [venueQty, allServices])

  const venueDiscount = useMemo(() => {
    if (!venueVoucher) return 0
    if (venueVoucher.voucherType === 'PERCENT')
      return Math.round(venueSubtotal * Number(venueVoucher.discountValue) / 100)
    return Math.min(Number(venueVoucher.discountValue), venueSubtotal)
  }, [venueVoucher, venueSubtotal])

  const handleVenueSubmit = async () => {
    if (venueItems.length === 0) { setVenueError('Vui lòng chọn ít nhất 1 dịch vụ.'); return }
    setVenueSubmitting(true)
    setVenueError('')
    try {
      const result = await addServicesAtVenue(venueModal, venueItems, venueVoucher?.code ?? null)
      // Tạo payment URL cho phần tiền dịch vụ mới
      const payment = await createPaymentUrl(result.bookingId)
      setVenueModal(null)
      window.location.href = payment.paymentUrl
    } catch (err) {
      setVenueError(err.response?.data?.message || 'Không thể xử lý. Vui lòng thử lại.')
    } finally {
      setVenueSubmitting(false)
    }
  }

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
  const canAddVenueService = (status) => status === 'CONFIRMED' || status === 'IN_PROGRESS'

  return (
    <>
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
                        {canAddVenueService(b.status) && (
                          <button
                            className={styles.venueServiceBtn}
                            disabled={busy[b.id]}
                            onClick={() => openVenueModal(b.id)}
                          >
                            ➕ Đặt thêm dịch vụ
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

      {/* ── Modal đặt thêm dịch vụ tại sân ── */}
      {venueModal && (
        <div className={styles.modalOverlay} onClick={() => !venueSubmitting && setVenueModal(null)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>➕ Đặt thêm dịch vụ tại sân</h2>
              <button className={styles.modalClose} onClick={() => !venueSubmitting && setVenueModal(null)}>✕</button>
            </div>

            {venueError && <div className={styles.venueError}>⚠️ {venueError}</div>}

            {venueLoading ? (
              <div className={styles.venueLoading}><div className={styles.spinner} /><p>Đang tải...</p></div>
            ) : (
              <>
                {/* Danh sách dịch vụ */}
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>🛒 Chọn dịch vụ</h3>
                  <div className={styles.venueServiceList}>
                    {allServices.map(svc => {
                      const qty = venueQty[svc.id] || 0
                      return (
                        <div key={svc.id} className={styles.venueServiceRow}>
                          <div className={styles.venueServiceInfo}>
                            <span className={styles.venueServiceName}>{svc.name}</span>
                            <span className={styles.venueServicePrice}>{Number(svc.price).toLocaleString('vi-VN')}₫</span>
                          </div>
                          <div className={styles.qtyControl}>
                            <button onClick={() => setVenueQty(q => ({ ...q, [svc.id]: Math.max(0, (q[svc.id] || 0) - 1) }))}>−</button>
                            <span>{qty}</span>
                            <button onClick={() => setVenueQty(q => ({ ...q, [svc.id]: (q[svc.id] || 0) + 1 }))}>+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Chọn voucher */}
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>🎟️ Voucher (tùy chọn)</h3>
                  {myVouchers.length === 0 ? (
                    <p className={styles.venueHint}>Bạn không có voucher nào còn hiệu lực.</p>
                  ) : (
                    <div className={styles.venueVoucherList}>
                      {myVouchers.map(v => {
                        const selected = venueVoucher?.id === v.id
                        return (
                          <div
                            key={v.id}
                            className={`${styles.venueVoucherItem} ${selected ? styles.venueVoucherSelected : ''}`}
                            onClick={() => setVenueVoucher(selected ? null : v)}
                          >
                            <div>
                              <span className={styles.venueVoucherCode}>{v.code}</span>
                              <span className={styles.venueVoucherDiscount}>
                                {v.voucherType === 'PERCENT' ? ` — Giảm ${v.discountValue}%` : ` — Giảm ${Number(v.discountValue).toLocaleString('vi-VN')}₫`}
                              </span>
                            </div>
                            {selected && <span className={styles.voucherCheck}>✓</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Tóm tắt */}
                <div className={styles.venueSummary}>
                  <div className={styles.venueSummaryRow}>
                    <span>Tạm tính dịch vụ</span>
                    <span>{venueSubtotal.toLocaleString('vi-VN')}₫</span>
                  </div>
                  {venueDiscount > 0 && (
                    <div className={styles.venueSummaryRow} style={{ color: '#16a34a' }}>
                      <span>Giảm giá ({venueVoucher.code})</span>
                      <span>- {venueDiscount.toLocaleString('vi-VN')}₫</span>
                    </div>
                  )}
                  <div className={`${styles.venueSummaryRow} ${styles.venueSummaryTotal}`}>
                    <span>Thanh toán</span>
                    <span>{Math.max(0, venueSubtotal - venueDiscount).toLocaleString('vi-VN')}₫</span>
                  </div>
                </div>

                <button
                  className={`btn btn-primary ${styles.venueSubmitBtn}`}
                  disabled={venueSubmitting || venueItems.length === 0}
                  onClick={handleVenueSubmit}
                >
                  {venueSubmitting ? 'Đang xử lý...' : '💳 Xác nhận & Thanh toán VNPay'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
