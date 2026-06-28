import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import api from '../../services/api'
import { createBooking } from '../../api/bookingApi'
import { createPaymentUrl } from '../../api/paymentApi'
import { checkoutCartToBooking, getActiveServices } from '../../api/serviceApi'
import { getMyVouchers } from '../../api/voucherApi'
import { useCart } from '../../context/CartContext'
import styles from './BookingConfirmPage.module.css'

const SERVICE_FILTERS = [
  { key: 'ALL',       label: 'Tất cả' },
  { key: 'DRINK',     label: '🥤 Đồ uống' },
  { key: 'EQUIPMENT', label: '⚽ Dụng cụ' },
  { key: 'FACILITY',  label: '🏟️ Tiện ích' },
]

function fmt(time) {
  if (!time) return ''
  return String(time).substring(0, 5)
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function BookingConfirmPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { cart, add: addToCart, update: updateCartItem, remove: removeCartItem } = useCart()

  const slotIds = useMemo(
    () => (searchParams.get('slots') || '').split(',').filter(Boolean),
    [searchParams]
  )

  // Lưu lại URL confirm đang dở dang — để nếu user rời trang (vd: vào /cart
  // thêm dịch vụ), nút "Đặt sân kèm dịch vụ" biết đường quay về đúng chỗ
  // thay vì bắt chọn lại slot từ đầu. Xem thêm: CartPage.jsx đọc key này.
  useEffect(() => {
    if (slotIds.length > 0) {
      sessionStorage.setItem('ffzone_pending_booking_slots', slotIds.join(','))
    }
  }, [slotIds])

  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [voucherCode, setVoucherCode] = useState('')
  const [selectedVoucherId, setSelectedVoucherId] = useState(null)
  const [myVouchers, setMyVouchers] = useState([])
  const [vouchersLoading, setVouchersLoading] = useState(true)
  const [includeCart, setIncludeCart] = useState(true)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Modal chọn dịch vụ ──
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [allServices, setAllServices] = useState([])
  const [serviceLoading, setServiceLoading] = useState(false)
  const [serviceFilter, setServiceFilter] = useState('ALL')
  const [busyServiceId, setBusyServiceId] = useState(null)

  const openServiceModal = () => {
    setShowServiceModal(true)
    if (allServices.length === 0) {
      setServiceLoading(true)
      getActiveServices()
        .then(setAllServices)
        .catch(() => setAllServices([]))
        .finally(() => setServiceLoading(false))
    }
  }

  const filteredServices = serviceFilter === 'ALL'
    ? allServices
    : allServices.filter(s => s.category === serviceFilter)

  const cartQtyByServiceId = useMemo(() => {
    const map = {}
    for (const item of cart?.items ?? []) map[item.serviceId] = item
    return map
  }, [cart])

  const handleAddService = async (svc) => {
    setBusyServiceId(svc.id)
    try {
      await addToCart(svc.id, 1)
    } catch {
      alert('Không thể thêm dịch vụ. Vui lòng thử lại.')
    } finally {
      setBusyServiceId(null)
    }
  }

  const handleChangeQty = async (cartItem, newQty) => {
    setBusyServiceId(cartItem.serviceId)
    try {
      if (newQty <= 0) await removeCartItem(cartItem.id)
      else await updateCartItem(cartItem.id, newQty)
    } catch {
      alert('Không thể cập nhật số lượng.')
    } finally {
      setBusyServiceId(null)
    }
  }

  // Load voucher của user từ DB
  useEffect(() => {
    getMyVouchers()
      .then(data => {
        const now = new Date()
        // Chỉ hiện voucher còn hiệu lực và chưa dùng
        const valid = data.filter(v => !v.isUsed && new Date(v.endDate) > now)
        setMyVouchers(valid)
      })
      .catch(() => setMyVouchers([]))
      .finally(() => setVouchersLoading(false))
  }, [])

  const handleSelectVoucher = (v) => {
    if (selectedVoucherId === v.id) {
      // Bỏ chọn nếu click lại voucher đang chọn
      setSelectedVoucherId(null)
      setVoucherCode('')
    } else {
      setSelectedVoucherId(v.id)
      setVoucherCode(v.code)
    }
  }

  // Load chi tiết các slot đã chọn từ BookingPage
  useEffect(() => {
    if (slotIds.length === 0) { setLoading(false); return }
    setLoading(true)
    Promise.all(slotIds.map(id => api.get(`/field-slots/${id}`).then(r => r.data)))
      .then(results => {
        // Vẫn còn AVAILABLE? Nếu người khác đã đặt mất trong lúc chờ, báo lỗi sớm.
        const taken = results.filter(s => s.status !== 'AVAILABLE')
        if (taken.length > 0) {
          setError(`Một số khung giờ vừa được người khác đặt mất: ${taken.map(s => fmt(s.startTime)).join(', ')}. Vui lòng quay lại chọn lại.`)
        }
        setSlots(results.sort((a, b) => fmt(a.startTime).localeCompare(fmt(b.startTime))))
      })
      .catch(err => {
        console.error('[BookingConfirmPage] Lỗi tải field-slots:', err.response?.status, err.response?.data || err.message)
        setError(`Không thể tải thông tin khung giờ đã chọn. (${err.response?.status || 'Lỗi kết nối'})`)
      })
      .finally(() => setLoading(false))
  }, [slotIds])

  const fieldAmount = slots.reduce((sum, s) => sum + Number(s.price || 0), 0)
  const cartItems = cart?.items ?? []
  const cartTotal = includeCart ? Number(cart?.total ?? 0) : 0

  // Tính giảm giá ước tính dựa trên voucher đã chọn (frontend estimate, số thật do backend tính)
  const selectedVoucher = myVouchers.find(v => v.id === selectedVoucherId) ?? null
  const discountAmount = selectedVoucher
    ? selectedVoucher.voucherType === 'PERCENT'
      ? Math.round((fieldAmount + cartTotal) * Number(selectedVoucher.discountValue) / 100)
      : Math.min(Number(selectedVoucher.discountValue), fieldAmount + cartTotal)
    : 0
  const estimatedTotal = fieldAmount + cartTotal - discountAmount

  const handleConfirm = async () => {
    if (slots.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      // 1. Tạo booking (slot + voucher)
      const booking = await createBooking({
        fieldId: slots[0].fieldId,
        fieldSlotIds: slots.map(s => s.id),
        voucherCode: voucherCode.trim() || null,
        note: note.trim() || null,
      })

      // 2. Checkout giỏ hàng vào booking (nếu có và user chọn gộp)
      if (includeCart && cartItems.length > 0) {
        try {
          await checkoutCartToBooking(booking.id)
        } catch {
          // Không chặn luồng thanh toán nếu checkout dịch vụ lỗi — booking vẫn hợp lệ,
          // user vẫn có thể thêm dịch vụ sau từ trang chi tiết booking.
          setError('Đã tạo đơn đặt sân, nhưng không thể thêm dịch vụ từ giỏ hàng. Bạn có thể thêm lại sau khi thanh toán.')
        }
      }

      // 3. Tạo URL thanh toán VNPay và chuyển hướng
      const payment = await createPaymentUrl(booking.id)
      // Đã tạo booking xong — không còn "dở dang" nữa, dọn key này đi
      sessionStorage.removeItem('ffzone_pending_booking_slots')
      window.location.href = payment.paymentUrl
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tạo đơn đặt sân. Vui lòng thử lại.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p>Đang tải thông tin đặt sân...</p>
          </div>
        </div>
      </div>
    )
  }

  // Trường hợp 1: URL không hề có slot id nào (user vào thẳng /booking/confirm)
  if (slotIds.length === 0) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.empty}>
            <span>📅</span>
            <h3>Chưa có khung giờ nào được chọn</h3>
            <p>Vui lòng quay lại trang đặt sân để chọn khung giờ.</p>
            <Link to="/booking" className="btn btn-primary">← Quay lại đặt sân</Link>
          </div>
        </div>
      </div>
    )
  }

  // Trường hợp 2: có slot id trong URL nhưng API lỗi (401, 404, mất kết nối...)
  // — hiển thị lỗi thật thay vì giả vờ "chưa chọn gì", để dễ debug.
  if (slots.length === 0) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.empty}>
            <span>⚠️</span>
            <h3>Không thể tải thông tin khung giờ</h3>
            <p>{error || 'Đã có lỗi xảy ra khi tải dữ liệu.'}</p>
            <Link to="/booking" className="btn btn-primary">← Quay lại đặt sân</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className="container">
          <h1 className={styles.title}>✅ Xác nhận đặt sân</h1>
          <p className={styles.sub}>Kiểm tra lại thông tin trước khi thanh toán</p>
        </div>
      </div>

      <div className="container">
        {error && <div className={styles.errorBox}>⚠️ {error}</div>}

        <div className={styles.layout}>
          {/* ── Bên trái: chi tiết ─────────────────────────── */}
          <div className={styles.main}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>⚽ {slots[0].fieldName}</h2>
              <p className={styles.cardSub}>{slots[0].slotDate}</p>
              <div className={styles.slotList}>
                {slots.map(s => (
                  <div key={s.id} className={styles.slotRow}>
                    <span>🕐 {fmt(s.startTime)}–{addMinutes(fmt(s.startTime), 60)}</span>
                    <span>{Number(s.price).toLocaleString('vi-VN')}₫</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeaderRow}>
                <h2 className={styles.cardTitle}>🛒 Dịch vụ kèm theo</h2>
                {cartItems.length > 0 && (
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={includeCart}
                      onChange={e => setIncludeCart(e.target.checked)}
                    />
                    Gộp vào đơn này
                  </label>
                )}
              </div>

              {cartItems.length === 0 ? (
                <p className={styles.hint}>Chưa có dịch vụ nào. Bạn có thể thêm nước uống, dụng cụ, hoặc tiện ích cho buổi đá.</p>
              ) : includeCart ? (
                <div className={styles.slotList}>
                  {cartItems.map(item => (
                    <div key={item.id} className={styles.slotRow}>
                      <span>{item.serviceName} × {item.quantity}</span>
                      <span>{Number(item.subtotal).toLocaleString('vi-VN')}₫</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.hint}>Giỏ hàng sẽ giữ nguyên, bạn có thể thêm dịch vụ sau khi đặt sân.</p>
              )}

              <button type="button" className={styles.addServiceBtn} onClick={openServiceModal}>
                ➕ Chọn dịch vụ
              </button>
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>🎟️ Voucher của bạn</h2>
              {vouchersLoading ? (
                <p className={styles.hint}>Đang tải voucher...</p>
              ) : myVouchers.length === 0 ? (
                <p className={styles.hint}>
                  Bạn không có voucher nào còn hiệu lực.{' '}
                  <Link to="/vouchers" style={{ color: '#16a34a', fontWeight: 600 }}>Nhận voucher ngay →</Link>
                </p>
              ) : (
                <div className={styles.voucherList}>
                  {myVouchers.map(v => {
                    const selected = selectedVoucherId === v.id
                    return (
                      <div
                        key={v.id}
                        className={`${styles.voucherItem} ${selected ? styles.voucherSelected : ''}`}
                        onClick={() => handleSelectVoucher(v)}
                      >
                        <div className={styles.voucherLeft}>
                          <span className={styles.voucherCode}>{v.code}</span>
                          <span className={styles.voucherDiscount}>
                            {v.voucherType === 'PERCENT'
                              ? `Giảm ${v.discountValue}%`
                              : `Giảm ${Number(v.discountValue).toLocaleString('vi-VN')}₫`}
                          </span>
                          <span className={styles.voucherExpiry}>
                            HSD: {new Date(v.endDate).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className={styles.voucherRight}>
                          {selected
                            ? <span className={styles.voucherCheck}>✓ Đã chọn</span>
                            : <span className={styles.voucherUse}>Dùng</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {selectedVoucherId && (
                <p className={styles.hint} style={{ marginTop: 8, color: '#16a34a' }}>
                  ✅ Đã áp mã <strong>{voucherCode}</strong>. Giảm giá sẽ được tính khi thanh toán.
                </p>
              )}
            </div>

            <div className={styles.card}>
              <h2 className={styles.cardTitle}>📝 Ghi chú</h2>
              <textarea
                className={styles.textarea}
                placeholder="Ghi chú thêm cho sân (không bắt buộc)"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* ── Bên phải: tóm tắt + thanh toán ─────────────── */}
          <div className={styles.summary}>
            <h2 className={styles.summaryTitle}>Tóm tắt đơn</h2>
            <div className={styles.summaryRow}>
              <span>Tiền sân ({slots.length} slot)</span>
              <span>{fieldAmount.toLocaleString('vi-VN')}₫</span>
            </div>
            {includeCart && cartTotal > 0 && (
              <div className={styles.summaryRow}>
                <span>Dịch vụ</span>
                <span>{cartTotal.toLocaleString('vi-VN')}₫</span>
              </div>
            )}
            {selectedVoucher && (
              <div className={styles.summaryRow} style={{ color: '#16a34a' }}>
                <span>🎟️ {selectedVoucher.code}</span>
                <span>- {discountAmount.toLocaleString('vi-VN')}₫</span>
              </div>
            )}
            <div className={styles.divider} />
            <div className={`${styles.summaryRow} ${styles.totalRow}`}>
              <span>Tạm tính{selectedVoucher ? ' (ước tính)' : ''}</span>
              <span style={selectedVoucher ? { color: '#dc2626' } : {}}>{estimatedTotal.toLocaleString('vi-VN')}₫</span>
            </div>
            {selectedVoucher && (
              <p className={styles.hint} style={{ color: '#16a34a', marginTop: 4 }}>
                ✅ Đã áp voucher giảm{' '}
                {selectedVoucher.voucherType === 'PERCENT'
                  ? `${selectedVoucher.discountValue}%`
                  : `${Number(selectedVoucher.discountValue).toLocaleString('vi-VN')}₫`}.
                {' '}Số tiền chính xác sẽ được xác nhận khi thanh toán.
              </p>
            )}
            {!selectedVoucher && (
              <p className={styles.hint}>
                💡 Số tiền cuối cùng (sau giảm giá nếu có) sẽ hiển thị trên trang thanh toán VNPay.
              </p>
            )}
            <div className={styles.deadlineBox}>
              ⏱️ Bạn có <strong>10 phút</strong> để hoàn tất thanh toán sau khi xác nhận.
            </div>
            <button
              className={`btn btn-primary ${styles.payBtn}`}
              disabled={submitting || error.includes('vừa được người khác đặt')}
              onClick={handleConfirm}
            >
              {submitting ? 'Đang xử lý...' : '💳 Xác nhận & Thanh toán VNPay'}
            </button>
            <Link to="/booking" className={styles.backLink}>← Chọn lại khung giờ</Link>
          </div>
        </div>
      </div>

      {showServiceModal && (
        <div className={styles.modalOverlay} onClick={() => setShowServiceModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Chọn dịch vụ</h2>
              <button className={styles.modalClose} onClick={() => setShowServiceModal(false)}>✕</button>
            </div>

            <div className={styles.modalFilters}>
              {SERVICE_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`${styles.modalFilterBtn} ${serviceFilter === f.key ? styles.modalFilterActive : ''}`}
                  onClick={() => setServiceFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className={styles.modalList}>
              {serviceLoading ? (
                <p className={styles.hint}>Đang tải dịch vụ...</p>
              ) : filteredServices.length === 0 ? (
                <p className={styles.hint}>Không có dịch vụ nào trong mục này.</p>
              ) : (
                filteredServices.map(svc => {
                  const inCart = cartQtyByServiceId[svc.id]
                  const busy = busyServiceId === svc.id
                  return (
                    <div key={svc.id} className={styles.modalServiceRow}>
                      <div className={styles.modalServiceInfo}>
                        <span className={styles.modalServiceName}>{svc.name}</span>
                        <span className={styles.modalServicePrice}>{Number(svc.price).toLocaleString('vi-VN')}₫</span>
                      </div>
                      {inCart ? (
                        <div className={styles.qtyControl}>
                          <button disabled={busy} onClick={() => handleChangeQty(inCart, inCart.quantity - 1)}>−</button>
                          <span>{inCart.quantity}</span>
                          <button disabled={busy} onClick={() => handleChangeQty(inCart, inCart.quantity + 1)}>+</button>
                        </div>
                      ) : (
                        <button
                          className={styles.modalAddBtn}
                          disabled={busy}
                          onClick={() => handleAddService(svc)}
                        >
                          {busy ? '...' : '+ Thêm'}
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <button className={`btn btn-primary ${styles.modalDoneBtn}`} onClick={() => setShowServiceModal(false)}>
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
