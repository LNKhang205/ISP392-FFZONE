import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getMyBookings, cancelBooking, addServicesAtVenue } from '../../api/bookingApi'
import { createPaymentUrl, createAddonPaymentUrl } from '../../api/paymentApi'
import { getActiveServices } from '../../api/serviceApi'
import { getMyVouchers } from '../../api/voucherApi'
import { getRefundByBookingId } from '../../api/refundApi'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
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
  PENDING:   { text: 'Đang chờ hoàn tiền', icon: '', cls: 'refundPending' },
  COMPLETED: { text: 'Đã hoàn tiền',       icon: '', cls: 'refundDone'    },
  REJECTED:  { text: 'Từ chối hoàn tiền',  icon: '', cls: 'refundRejected'},
}

const FILTER_TABS = [
  { key: 'ALL',             label: 'Tất cả'         },
  { key: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { key: 'CONFIRMED',       label: 'Đã xác nhận'    },
  { key: 'IN_PROGRESS',     label: 'Đang diễn ra'   },
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
      .catch((err) => {
        if (err.response?.status === 404) {
          setRefund({ isNotPaid: true })
        } else {
          setRefund({ isError: true })
        }
      })
      .finally(() => setLoading(false))
  }, [bookingId, bookingStatus])

  if (bookingStatus !== 'CANCELLED' && bookingStatus !== 'REFUNDED') return null
  if (loading) return <div className={styles.refundBox}><span className={styles.refundLoading}>Đang kiểm tra hoàn tiền…</span></div>

  // Lỗi hệ thống hoặc phân quyền tải thông tin hoàn tiền
  if (refund?.isError) {
    return null
  }

  // Booking hủy trước khi thanh toán (PENDING_PAYMENT) → không có refund record
  if (!refund || refund.isNotPaid) {
    return null
  }

  const cfg = REFUND_STATUS_CONFIG[refund.status] ?? { text: refund.status, icon: '', cls: 'refundPending' }

  return (
    <div className={`${styles.refundBox} ${styles[cfg.cls]}`}>
      <div className={styles.refundHeader}>
        {cfg.icon && <span className={styles.refundIcon}>{cfg.icon}</span>}
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
            Hủy trong vòng 6 giờ trước giờ đá — không được hoàn tiền theo chính sách.
          </div>
        )}
        {refund.refundPercent === 100 && refund.status === 'PENDING' && (
          <div className={styles.refundPolicy}>
            Nhân viên sẽ liên hệ và chuyển khoản hoàn tiền trong thời gian sớm nhất.
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
            <strong>Lý do từ chối:</strong> {refund.note || 'Không có ghi chú'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MyBookingsPage() {
  const { user, updateUser } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('ALL')
  const [expandedId, setExpandedId] = useState(null)
  const [busy, setBusy]         = useState({})
  const [msg, setMsg]           = useState('')

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
      // Dùng createAddonPaymentUrl để chỉ charge tiền dịch vụ mới, KHÔNG bao gồm tiền sân đã thanh toán
      const payment = await createAddonPaymentUrl(result.bookingId, result.payAmount)
      setVenueModal(null)
      window.location.href = payment.paymentUrl
    } catch (err) {
      setVenueError(err.response?.data?.message || 'Không thể xử lý. Vui lòng thử lại.')
    } finally {
      setVenueSubmitting(false)
    }
  }

  const [cancelModal, setCancelModal] = useState(null) // { booking, hoursLeft }
  const [cancelReason, setCancelReason] = useState('')
  const [phoneInput, setPhoneInput] = useState('')
  const [cancelError, setCancelError] = useState('')

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
    setPhoneInput(user?.phone || '')
    setCancelError('')
    setCancelModal({ booking, hoursLeft })
  }

  const handleCancel = async () => {
    if (!cancelModal) return
    const booking = cancelModal.booking
    const isRefundable = booking.status === 'CONFIRMED' && (cancelModal.hoursLeft === null || cancelModal.hoursLeft >= 6)

    setBusy(b => ({ ...b, [booking.id]: true }))
    setCancelError('')
    try {
      if (isRefundable && !user?.phone) {
        const cleanPhone = phoneInput.trim()
        if (!cleanPhone) {
          throw new Error('Vui lòng nhập số điện thoại để tiếp tục.')
        }
        if (!/^(0|\+84)\d{9,10}$/.test(cleanPhone)) {
          throw new Error('Số điện thoại không hợp lệ. Vui lòng nhập lại.')
        }

        // 1. Cập nhật profile người dùng trước
        const { data } = await api.put('/accounts/me/profile', {
          fullName: user.fullName,
          phone: cleanPhone,
          gender: user.gender || null,
          dateOfBirth: user.dateOfBirth || null,
        })
        updateUser(data)
      }

      // 2. Gọi API hủy booking
      await cancelBooking(booking.id, cancelReason)
      setCancelModal(null)
      load()
    } catch (err) {
      setCancelError(err.response?.data?.message || err.message || 'Không thể hủy đơn này.')
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

  const canCancel = (s) => s === 'PENDING_PAYMENT' || s === 'CONFIRMED'
  const canPayAgain = (s) => s === 'PENDING_PAYMENT'
  const canAddVenueService = (s) => s === 'CONFIRMED' || s === 'IN_PROGRESS'

  return (
    <>
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
                  Bạn đang hủy trước giờ đá hơn 6 giờ — sẽ được <strong>hoàn tiền 100%</strong>.
                  Nhân viên sẽ liên hệ chuyển khoản hoàn tiền cho bạn.
                </div>
              )
            )}

            {/* Check số điện thoại nếu được hoàn tiền */}
            {cancelModal.booking.status === 'CONFIRMED' && (cancelModal.hoursLeft === null || cancelModal.hoursLeft >= 6) && (
              !user?.phone ? (
                <div className={styles.phonePromptBox}>
                  <label className={styles.modalLabel}>Số điện thoại liên hệ hoàn tiền (bắt buộc):</label>
                  <input
                    type="tel"
                    className={styles.modalInput}
                    placeholder="Nhập số điện thoại nhận tiền hoàn..."
                    value={phoneInput}
                    onChange={e => setPhoneInput(e.target.value)}
                  />
                  <p className={styles.phoneHint}>Vui lòng nhập số điện thoại để nhân viên liên hệ hoàn tiền.</p>
                </div>
              ) : (
                <div className={styles.infoBox}>
                  Nhân viên sẽ liên hệ theo số điện thoại: <strong>{user.phone}</strong> để hoàn tiền.
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

            {cancelError && <div className={styles.modalError}>Lỗi: {cancelError}</div>}

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
        <h1 className={styles.title}>Đơn đặt sân của tôi</h1>

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

        {msg && <div className={styles.errorBox}>Lỗi: {msg}</div>}

        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p>Đang tải...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
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
                      <span className={styles.fieldName}>{b.fieldName}</span>
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
                            Ngày: {s.slotDate} · Giờ: {fmt(s.startTime)}–{fmt(s.endTime)}
                          </span>
                        ))}
                      </div>

                      {/* Chi phí */}
                      <div className={styles.amountGrid}>
                        <div><span>Tiền sân</span><span>{Number(b.fieldAmount).toLocaleString('vi-VN')}₫</span></div>
                        {Number(b.serviceAmount) > 0 && (
                          <>
                            <div><span>Dịch vụ</span><span>{Number(b.serviceAmount).toLocaleString('vi-VN')}₫</span></div>
                            {b.services && b.services.length > 0 && (
                              <div className={styles.serviceDetailList}>
                                {b.services.map(item => (
                                  <div key={item.id} className={styles.serviceDetailRow}>
                                    <span>• {item.serviceName} <span className={styles.qtyText}>x{item.quantity}</span></span>
                                    <span>{Number(item.totalPrice).toLocaleString('vi-VN')}₫</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
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

                      {b.note && <p className={styles.note}>Ghi chú: {b.note}</p>}

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
                            Thanh toán ngay
                          </button>
                        )}
                        {canAddVenueService(b.status) && (
                          <button
                            className={styles.venueServiceBtn}
                            disabled={busy[b.id]}
                            onClick={() => openVenueModal(b.id)}
                          >
                            Đặt thêm dịch vụ
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

      {/* ── Modal đặt thêm dịch vụ tại sân ── */}
      {venueModal && (
        <div className={styles.modalOverlay} onClick={() => !venueSubmitting && setVenueModal(null)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Đặt thêm dịch vụ tại sân</h2>
              <button className={styles.modalClose} onClick={() => !venueSubmitting && setVenueModal(null)}>✕</button>
            </div>

            {venueError && <div className={styles.venueError}>Lỗi: {venueError}</div>}

            {venueLoading ? (
              <div className={styles.venueLoading}><div className={styles.spinner} /><p>Đang tải...</p></div>
            ) : (
              <>
                {/* Danh sách dịch vụ */}
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>Chọn dịch vụ</h3>
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
                  <h3 className={styles.modalSectionTitle}>Voucher (tùy chọn)</h3>
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
                  {venueSubmitting ? 'Đang xử lý...' : 'Xác nhận & Thanh toán VNPay'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
