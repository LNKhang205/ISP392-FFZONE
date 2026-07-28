import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { getPendingRefunds, getAllRefunds, completeRefund, rejectRefund } from '../../api/refundApi'
import styles from './StaffDashboard.module.css'
import { getLocalDateString } from '../../utils/date'

/* ── Sidebar ── */
function Sidebar({ onLogout }) {
  const navItems = [
    { to: '/staff/bookings', label: 'Quản lý booking' },
    { to: '/staff/checkin',  label: 'Check-in'         },
    { to: '/staff/refunds',  label: 'Hoàn tiền'        },
  ]
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        <strong>FF</strong>Zone
        <div className={styles.sidebarRole}>Nhân viên</div>
      </div>
      <nav className={styles.sidebarNav}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navActive : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        <button onClick={onLogout} className={styles.logoutBtn}>Đăng xuất</button>
      </div>
    </aside>
  )
}

/* ── Trang: Lịch hôm nay ── */
function TodaySchedule() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(
    getLocalDateString()
  )

  useEffect(() => {
    setLoading(true)
    api.get(`/field-slots?date=${selectedDate}`)
      .then(r => setSlots(r.data))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false))
  }, [selectedDate])

  // Group theo field
  const byField = slots.reduce((acc, slot) => {
    const key = slot.fieldName || `Sân ${slot.fieldId}`
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})

  const statusColor = {
    AVAILABLE: '#d1fae5',
    BOOKED:    '#fee2e2',
    CLOSED:    '#f3f4f6',
  }
  const statusLabel = {
    AVAILABLE: 'Trống',
    BOOKED:    'Đã đặt',
    CLOSED:    'Đóng',
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Lịch sân hôm nay</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className={styles.datePicker}
        />
      </div>

      {loading ? (
        <p className={styles.loading}>Đang tải...</p>
      ) : Object.keys(byField).length === 0 ? (
        <p className={styles.empty}>Không có slot nào trong ngày này.</p>
      ) : (
        Object.entries(byField).map(([fieldName, fieldSlots]) => (
          <div key={fieldName} className={styles.fieldBlock}>
            <h2 className={styles.fieldName}>{fieldName}</h2>
            <div className={styles.slotGrid}>
              {fieldSlots
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map(slot => (
                  <div
                    key={slot.id}
                    className={styles.slotCard}
                    style={{ background: statusColor[slot.status] || '#f9fafb' }}
                  >
                    <div className={styles.slotTime}>
                      {slot.startTime} – {slot.endTime}
                    </div>
                    <div className={styles.slotStatus}>
                      {statusLabel[slot.status] || slot.status}
                    </div>
                    {slot.bookerName && (
                      <div className={styles.slotBooker}>Khách: {slot.bookerName}</div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

/* ── Trang: Quản lý Booking ── */
function BookingManagement() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')

  useEffect(() => {
    api.get('/bookings')
      .then(r => setBookings(r.data))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL'
    ? bookings
    : bookings.filter(b => b.status === filter)

  const statusColor = {
    PENDING_PAYMENT: { bg: '#fef9c3', text: '#854d0e' },
    CONFIRMED:       { bg: '#dcfce7', text: '#166534' },
    IN_PROGRESS:     { bg: '#ede9fe', text: '#6d28d9' },
    COMPLETED:       { bg: '#dbeafe', text: '#1d4ed8' },
    CANCELLED:       { bg: '#fee2e2', text: '#991b1b' },
    REFUND_PENDING:  { bg: '#fef9c3', text: '#854d0e' },
    REFUNDED:        { bg: '#f3f4f6', text: '#6b7280' },
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Quản lý Booking</h1>
        <div className={styles.filterTabs}>
          {['ALL','PENDING_PAYMENT','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`${styles.filterTab} ${filter === s ? styles.filterTabActive : ''}`}
            >
              {s === 'ALL' ? 'Tất cả' : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>Đang tải...</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>Không có booking nào.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã booking</th>
                <th>Khách hàng</th>
                <th>Sân</th>
                <th>Giờ đặt</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const c = statusColor[b.status] || { bg: '#f9fafb', text: '#111' }
                const firstSlot = b.slots?.[0]
                return (
                  <tr key={b.id}>
                    <td className={styles.monoId}>{b.bookingCode}</td>
                    <td>{b.accountName || '—'}</td>
                    <td>{b.fieldName || '—'}</td>
                    <td>{firstSlot ? `${firstSlot.slotDate} ${String(firstSlot.startTime).substring(0,5)}` : '—'}</td>
                    <td>{Number(b.totalAmount || 0).toLocaleString('vi-VN')}₫</td>
                    <td>
                      <span
                        className={styles.statusBadge}
                        style={{ background: c.bg, color: c.text }}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Trang: Dịch vụ tại sân ── */
function ServiceManagement() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', price: '', serviceType: 'FOOD', description: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/services')
      .then(r => setServices(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleAdd = async () => {
    if (!form.name || !form.price) return
    setSaving(true); setMsg('')
    try {
      await api.post('/services', { ...form, price: Number(form.price) })
      setMsg('✅ Đã thêm dịch vụ')
      setForm({ name: '', price: '', serviceType: 'FOOD', description: '' })
      load()
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || 'Lỗi'))
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa dịch vụ này?')) return
    try {
      await api.delete(`/services/${id}`)
      load()
    } catch (e) {
      alert('Không thể xóa: ' + (e.response?.data?.message || 'Lỗi'))
    }
  }

  return (
    <div className={styles.page}>
      <h1>Dịch vụ tại sân</h1>

      {/* Form thêm */}
      <div className={styles.card}>
        <h2>Thêm dịch vụ mới</h2>
        <div className={styles.formRow}>
          <input
            placeholder="Tên dịch vụ"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className={styles.input}
          />
          <input
            type="number"
            placeholder="Giá (VNĐ)"
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            className={styles.input}
            style={{ width: 150 }}
          />
          <select
            value={form.serviceType}
            onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}
            className={styles.select}
          >
            <option value="FOOD">Đồ ăn</option>
            <option value="DRINK">Đồ uống</option>
            <option value="EQUIPMENT">Thiết bị</option>
            <option value="OTHER">Khác</option>
          </select>
          <button onClick={handleAdd} disabled={saving} className={styles.btnPrimary}>
            {saving ? 'Đang lưu...' : '+ Thêm'}
          </button>
        </div>
        {msg && <p className={styles.msg}>{msg}</p>}
      </div>

      {/* Danh sách */}
      {loading ? (
        <p className={styles.loading}>Đang tải...</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tên dịch vụ</th>
                <th>Loại</th>
                <th>Giá</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.serviceType}</td>
                  <td>{s.price?.toLocaleString('vi-VN')}₫</td>
                  <td>
                    <span className={styles.statusBadge}
                      style={s.isActive ? { background:'#dcfce7', color:'#166534' } : { background:'#f3f4f6', color:'#6b7280' }}>
                      {s.isActive ? 'Hoạt động' : 'Ẩn'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => handleDelete(s.id)} className={styles.btnDanger}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Trang: Check-in / Check-out ── */
const BOOKING_STATUS_LABEL = {
  PENDING_PAYMENT: { text: 'Chờ thanh toán', bg: '#fef9c3', color: '#854d0e' },
  CONFIRMED:       { text: 'Đã xác nhận',    bg: '#dbeafe', color: '#1d4ed8' },
  IN_PROGRESS:     { text: 'Đang diễn ra',   bg: '#ede9fe', color: '#6d28d9' },
  COMPLETED:       { text: 'Hoàn thành',     bg: '#dcfce7', color: '#166534' },
  CANCELLED:       { text: 'Đã hủy',         bg: '#fee2e2', color: '#991b1b' },
  REFUNDED:        { text: 'Đã hoàn tiền',   bg: '#f0fdf4', color: '#15803d' },
}

function CheckIn() {
  const [query, setQuery]           = useState('')
  const [todayBookings, setTodayBookings] = useState([])
  const [loadingToday, setLoadingToday]   = useState(true)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [searching, setSearching]   = useState(false)
  const [busy, setBusy]             = useState(false)
  const [searchErr, setSearchErr]   = useState('')
  const [actionMsg, setActionMsg]   = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [bookingServices, setBookingServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)

  const filteredToday = todayBookings.filter(b => {
    if (statusFilter === 'ALL') return true
    if (statusFilter === 'CONFIRMED') return b.status === 'CONFIRMED'
    if (statusFilter === 'IN_PROGRESS') return b.status === 'IN_PROGRESS'
    if (statusFilter === 'COMPLETED') return b.status === 'COMPLETED' || b.status === 'CANCELLED'
    return true
  })

  // Load dịch vụ của booking khi chọn
  useEffect(() => {
    if (!selectedBooking) {
      setBookingServices([])
      return
    }
    if (selectedBooking.services && selectedBooking.services.length > 0) {
      setBookingServices(selectedBooking.services)
      setServicesLoading(false)
    } else {
      setServicesLoading(true)
      api.get(`/bookings/${selectedBooking.id}/services`)
        .then(r => setBookingServices(r.data))
        .catch(() => setBookingServices([]))
        .finally(() => setServicesLoading(false))
    }
  }, [selectedBooking])

  // Load lịch hôm nay khi vào trang — vấn đề 3
  useEffect(() => {
    setLoadingToday(true)
    api.get('/bookings/by-date')
      .then(r => setTodayBookings(r.data))
      .catch(() => setTodayBookings([]))
      .finally(() => setLoadingToday(false))
  }, [])

  const handleSearch = async () => {
    const q = query.trim().toUpperCase()
    if (!q) return
    setSearching(true); setSelectedBooking(null); setSearchErr(''); setActionMsg(null)
    try {
      const r = await api.get(`/bookings/code/${q}`)
      setSelectedBooking(r.data)
    } catch (e) {
      setSearchErr(e.response?.data?.message || 'Không tìm thấy booking với mã này.')
    } finally { setSearching(false) }
  }

  const handleCheckin = async (booking) => {
    if (!window.confirm(`Xác nhận CHECK-IN cho booking ${booking.bookingCode}?`)) return
    setBusy(true); setActionMsg(null)
    try {
      const r = await api.post(`/bookings/${booking.id}/checkin`)
      // Cập nhật cả card trong danh sách lẫn card chi tiết
      setTodayBookings(prev => prev.map(b => b.id === r.data.id ? r.data : b))
      setSelectedBooking(r.data)
      setActionMsg({ ok: true, text: `Check-in thành công lúc ${fmtTime(r.data.checkinAt)}` })
    } catch (e) {
      setActionMsg({ ok: false, text: e.response?.data?.message || 'Không thể check-in' })
    } finally { setBusy(false) }
  }

  const handleCheckout = async (booking) => {
    if (!window.confirm(`Xác nhận CHECK-OUT cho booking ${booking.bookingCode}?`)) return
    setBusy(true); setActionMsg(null)
    try {
      const r = await api.post(`/bookings/${booking.id}/checkout`)
      setTodayBookings(prev => prev.map(b => b.id === r.data.id ? r.data : b))
      setSelectedBooking(r.data)
      setActionMsg({ ok: true, text: `Check-out thành công lúc ${fmtTime(r.data.checkoutAt)}` })
    } catch (e) {
      setActionMsg({ ok: false, text: e.response?.data?.message || 'Không thể check-out' })
    } finally { setBusy(false) }
  }

  const fmtTime = (dt) => {
    if (!dt) return ''
    return new Date(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  const fmtSlot = (s) =>
    `${String(s.startTime).substring(0,5)} – ${String(s.endTime).substring(0,5)}`

  // ── Booking detail panel ──
  const BookingPanel = ({ booking }) => {
    if (!booking) return null
    const cfg = BOOKING_STATUS_LABEL[booking.status] || { text: booking.status, bg: '#f3f4f6', color: '#374151' }
    return (
      <div className={styles.card} style={{ borderTop: `3px solid ${cfg.color}` }}>
        <div className={styles.checkinHeader}>
          <div>
            <span className={styles.checkinCode}>{booking.bookingCode}</span>
            <span className={styles.checkinField}>{booking.fieldName} ({booking.fieldCode})</span>
          </div>
          <span className={styles.statusBadge} style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.text}
          </span>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoRow}><span>Khách hàng</span><strong>{booking.accountName}</strong></div>
          <div className={styles.infoRow}>
            <span>Khung giờ</span>
            <div className={styles.slotList}>
              {booking.slots?.map(s => (
                <span key={s.fieldSlotId} className={styles.slotTag}>
                  Ngày: {s.slotDate} · Giờ: {fmtSlot(s)}
                </span>
              ))}
            </div>
          </div>

          {/* Dịch vụ đã đặt */}
          <div className={styles.infoRow} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <span style={{ fontWeight: 600, color: '#475569', marginBottom: 6 }}>Dịch vụ kèm theo</span>
            {servicesLoading ? (
              <span className={styles.cardHint} style={{ fontStyle: 'italic', margin: 0 }}>Đang tải danh sách dịch vụ...</span>
            ) : bookingServices.length === 0 ? (
              <span className={styles.cardHint} style={{ fontStyle: 'italic', margin: 0, color: '#94a3b8' }}>Không có dịch vụ đi kèm</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', marginTop: 4 }}>
                {bookingServices.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span>
                      🥤 <strong>{item.serviceName}</strong> <span style={{ color: '#64748b' }}>x{item.quantity}</span>
                    </span>
                    <span style={{ fontWeight: 600 }}>{Number(item.totalPrice).toLocaleString('vi-VN')}₫</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.infoRow}>
            <span>Tổng tiền</span>
            <strong>{Number(booking.totalAmount).toLocaleString('vi-VN')}₫</strong>
          </div>
          {booking.checkinAt && (
            <div className={styles.infoRow}>
              <span>Check-in lúc</span>
              <span className={styles.tsGreen}>{fmtTime(booking.checkinAt)}</span>
            </div>
          )}
          {booking.checkoutAt && (
            <div className={styles.infoRow}>
              <span>Check-out lúc</span>
              <span className={styles.tsBlue}>{fmtTime(booking.checkoutAt)}</span>
            </div>
          )}
        </div>

        {actionMsg && (
          <p className={actionMsg.ok ? styles.successText : styles.errText}>{actionMsg.text}</p>
        )}

        <div className={styles.checkinActions}>
          {booking.status === 'CONFIRMED' && (
            <button className={styles.btnCheckin} onClick={() => handleCheckin(booking)} disabled={busy}>
              {busy ? 'Đang xử lý...' : 'Xác nhận Check-in'}
            </button>
          )}
          {booking.status === 'IN_PROGRESS' && (
            <button className={styles.btnCheckout} onClick={() => handleCheckout(booking)} disabled={busy}>
              {busy ? 'Đang xử lý...' : 'Xác nhận Check-out'}
            </button>
          )}
          {booking.status === 'COMPLETED' && <p className={styles.doneText}>Booking đã hoàn thành.</p>}
          {booking.status === 'CANCELLED' && <p className={styles.errText}>Booking này đã bị hủy.</p>}
          {booking.status === 'PENDING_PAYMENT' && <p className={styles.errText}>Chưa thanh toán, chưa thể check-in.</p>}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1>Check-in / Check-out</h1>

      <div className={styles.checkinLayout}>
        {/* Left Side: Booking List & Filters */}
        <div className={styles.checkinLeft}>
          {/* ── Tìm kiếm nhanh ── */}
          <div className={styles.card} style={{ marginBottom: 0 }}>
            <p className={styles.cardHint}>Tìm nhanh theo mã đặt sân hoặc scan QR:</p>
            <div className={styles.formRow}>
              <input
                placeholder="Mã đặt sân (VD: FFZ-20260701-1234)..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className={styles.input}
              />
              <button onClick={handleSearch} disabled={searching} className={styles.btnPrimary}>
                {searching ? '...' : '🔍 Tìm'}
              </button>
            </div>
            {searchErr && <p className={styles.errText}>❌ {searchErr}</p>}
          </div>

          {/* ── Danh sách hôm nay ── */}
          <div className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                📅 Danh sách đặt hôm nay ({new Date().toLocaleDateString('vi-VN')})
              </h2>
            </div>

            {/* Bộ lọc trạng thái */}
            <div className={styles.statusFilterTabs}>
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'CONFIRMED', label: 'Chờ Check-in' },
                { key: 'IN_PROGRESS', label: 'Đang đá' },
                { key: 'COMPLETED', label: 'Đã xong / Hủy' }
              ].map(tab => (
                <button
                  key={tab.key}
                  className={`${styles.statusFilterTab} ${statusFilter === tab.key ? styles.statusFilterTabActive : ''}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loadingToday ? (
              <p className={styles.cardHint}>Đang tải...</p>
            ) : filteredToday.length === 0 ? (
              <p className={styles.cardHint} style={{ fontStyle: 'italic', margin: '20px 0' }}>Không có đơn đặt sân nào phù hợp.</p>
            ) : (
              <div className={styles.todayList}>
                {filteredToday.map(b => {
                  const cfg = BOOKING_STATUS_LABEL[b.status] || { text: b.status, bg: '#f3f4f6', color: '#374151' }
                  const active = selectedBooking?.id === b.id
                  return (
                    <div
                      key={b.id}
                      className={`${styles.todayRow} ${active ? styles.todayRowActive : ''}`}
                      onClick={() => { setSelectedBooking(b); setActionMsg(null); setSearchErr('') }}
                    >
                      <div className={styles.todayRowLeft}>
                        <span className={styles.todayCode}>{b.bookingCode}</span>
                        <div className={styles.todayMeta}>
                          <span>⚽ {b.fieldName}</span>
                          <span>👤 {b.accountName}</span>
                          <span>🕐 {b.slots?.map(fmtSlot).join(', ')}</span>
                        </div>
                      </div>
                      <span className={styles.statusBadge} style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Booking Panel Detail / Placeholder */}
        <div className={styles.checkinRight}>
          {selectedBooking ? (
            <BookingPanel booking={selectedBooking} />
          ) : (
            <div className={styles.placeholderCard}>
              <span className={styles.placeholderIcon}>📋</span>
              <h3>Chi tiết đặt sân</h3>
              <p>Chọn một đơn từ danh sách bên trái hoặc nhập mã tìm kiếm để hiển thị chi tiết check-in / check-out.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



/* ── Trang: Hoàn tiền ── */
function RefundManagement() {
  const [refunds, setRefunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [busy, setBusy] = useState({})

  const load = () => {
    setLoading(true)
    const fetcher = filter === 'PENDING' ? getPendingRefunds() : getAllRefunds()
    fetcher
      .then(setRefunds)
      .catch(() => setRefunds([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const filtered = filter === 'ALL' || filter === 'PENDING'
    ? refunds
    : refunds.filter(r => r.status === filter)

  const statusColor = {
    PENDING:   { bg: '#fef9c3', text: '#854d0e' },
    COMPLETED: { bg: '#dcfce7', text: '#166534' },
    REJECTED:  { bg: '#fee2e2', text: '#991b1b' },
  }

  const handleComplete = async (refund) => {
    if (!window.confirm(`Xác nhận đã chuyển khoản ${Number(refund.refundAmount).toLocaleString('vi-VN')}₫ cho khách hàng ${refund.accountName}?`)) return
    setBusy(b => ({ ...b, [refund.id]: true }))
    try {
      await completeRefund(refund.id, 'Đã chuyển khoản thủ công')
      load()
    } catch (e) {
      alert('❌ ' + (e.response?.data?.message || 'Lỗi'))
    } finally {
      setBusy(b => ({ ...b, [refund.id]: false }))
    }
  }

  const handleReject = async (refund) => {
    const note = window.prompt('Lý do từ chối hoàn tiền:')
    if (!note) return
    setBusy(b => ({ ...b, [refund.id]: true }))
    try {
      await rejectRefund(refund.id, note)
      load()
    } catch (e) {
      alert('❌ ' + (e.response?.data?.message || 'Lỗi'))
    } finally {
      setBusy(b => ({ ...b, [refund.id]: false }))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Quản lý hoàn tiền</h1>
        <div className={styles.filterTabs}>
          {['PENDING', 'COMPLETED', 'REJECTED', 'ALL'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`${styles.filterTab} ${filter === s ? styles.filterTabActive : ''}`}
            >
              {s === 'ALL' ? 'Tất cả' : s === 'PENDING' ? 'Chờ xử lý' : s === 'COMPLETED' ? 'Đã hoàn tiền' : 'Đã từ chối'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>Đang tải...</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>Không có yêu cầu hoàn tiền nào.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã booking</th>
                <th>Khách hàng</th>
                <th>SĐT</th>
                <th>% hoàn</th>
                <th>Số tiền hoàn</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const c = statusColor[r.status] || { bg: '#f9fafb', text: '#111' }
                return (
                  <tr key={r.id}>
                    <td className={styles.monoId}>{r.bookingCode}</td>
                    <td>{r.accountName}</td>
                    <td>{r.accountPhone || '—'}</td>
                    <td>{r.refundPercent}%</td>
                    <td><strong>{Number(r.refundAmount).toLocaleString('vi-VN')}₫</strong></td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: c.bg, color: c.text }}>
                        {r.status === 'PENDING' ? 'Chờ xử lý' : r.status === 'COMPLETED' ? 'Đã hoàn tiền' : 'Đã từ chối'}
                      </span>
                    </td>
                    <td>
                      {r.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className={styles.btnPrimary}
                            disabled={busy[r.id]}
                            onClick={() => handleComplete(r)}
                          >
                            ✅ Đã chuyển khoản
                          </button>
                          <button
                            className={styles.btnDanger}
                            disabled={busy[r.id]}
                            onClick={() => handleReject(r)}
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Main StaffDashboard ── */
export default function StaffDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className={styles.layout}>
      <Sidebar onLogout={handleLogout} />
      <div className={styles.main}>
        <div className={styles.topbar}>
          <span className={styles.welcome}>Xin chào, <strong>{user?.fullName}</strong></span>
          <button onClick={() => navigate('/')} className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}>
            🏠 Về trang chủ
          </button>
        </div>
        <div className={styles.content}>
          <Routes>
            <Route index        element={<Navigate to="bookings" replace />} />
            <Route path="bookings" element={<BookingManagement />} />
            <Route path="services" element={<ServiceManagement />} />
            <Route path="checkin"  element={<CheckIn />} />
            <Route path="refunds"  element={<RefundManagement />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
