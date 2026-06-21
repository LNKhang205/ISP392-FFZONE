import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { getPendingRefunds, getAllRefunds, completeRefund, rejectRefund } from '../../api/refundApi'
import styles from './StaffDashboard.module.css'

/* ── Sidebar ── */
function Sidebar({ onLogout }) {
  const navItems = [
    { to: '/staff',          label: '📋 Lịch hôm nay',   end: true },
    { to: '/staff/bookings', label: '📅 Quản lý booking' },
    { to: '/staff/services', label: '🛒 Dịch vụ tại sân' },
    { to: '/staff/checkin',  label: '✅ Check-in'         },
    { to: '/staff/refunds',  label: '💰 Hoàn tiền'        },
  ]
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        <span>⚽</span> <strong>FF</strong>Zone
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
        <button onClick={onLogout} className={styles.logoutBtn}>🚪 Đăng xuất</button>
      </div>
    </aside>
  )
}

/* ── Trang: Lịch hôm nay ── */
function TodaySchedule() {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
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
                      <div className={styles.slotBooker}>👤 {slot.bookerName}</div>
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

/* ── Trang: Check-in ── */
// LƯU Ý: endpoint check-in/check-out (POST /api/bookings/{id}/checkin) CHƯA
// được code ở backend — đây là phần UC18/UC19 còn thiếu (xem phần "Còn lại"
// trong các trao đổi trước). Khi backend có endpoint thật, bỏ disabled bên dưới.
function CheckIn() {
  const [bookingCode, setBookingCode] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!bookingCode.trim()) return
    setLoading(true); setResult(null)
    try {
      const r = await api.get(`/bookings/code/${bookingCode.trim().toUpperCase()}`)
      setResult({ ok: true, data: r.data })
    } catch (e) {
      setResult({ ok: false, msg: e.response?.data?.message || 'Không tìm thấy booking' })
    } finally { setLoading(false) }
  }

  const handleCheckin = async () => {
    if (!result?.data?.id) return
    try {
      await api.post(`/bookings/${result.data.id}/checkin`)
      setResult(r => ({ ...r, data: { ...r.data, status: 'IN_PROGRESS' } }))
      alert('✅ Check-in thành công!')
    } catch (e) {
      alert('❌ ' + (e.response?.data?.message || 'Chức năng check-in chưa khả dụng'))
    }
  }

  return (
    <div className={styles.page}>
      <h1>Check-in khách hàng</h1>
      <div className={styles.card}>
        <p style={{ color: '#6b7280', marginBottom: 12 }}>Nhập mã đặt sân (VD: FFZ-20260620-1234) để tìm kiếm và check-in:</p>
        <div className={styles.formRow}>
          <input
            placeholder="Nhập mã đặt sân"
            value={bookingCode}
            onChange={e => setBookingCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className={styles.input}
          />
          <button onClick={handleSearch} disabled={loading} className={styles.btnPrimary}>
            {loading ? '...' : '🔍 Tìm'}
          </button>
        </div>

        {result && (
          <div className={styles.checkinResult}>
            {result.ok ? (
              <>
                <div className={styles.infoRow}><span>Mã đặt sân:</span> <strong>{result.data.bookingCode}</strong></div>
                <div className={styles.infoRow}><span>Khách hàng:</span> <strong>{result.data.accountName}</strong></div>
                <div className={styles.infoRow}><span>Sân:</span> <strong>{result.data.fieldName}</strong></div>
                <div className={styles.infoRow}>
                  <span>Khung giờ:</span>
                  <strong>
                    {result.data.slots?.map(s => `${s.slotDate} ${String(s.startTime).substring(0,5)}`).join(', ') || '—'}
                  </strong>
                </div>
                <div className={styles.infoRow}><span>Trạng thái:</span>
                  <span className={styles.statusBadge} style={{ background:'#dcfce7', color:'#166534' }}>
                    {result.data.status}
                  </span>
                </div>
                {result.data.status === 'CONFIRMED' && (
                  <>
                    <button onClick={handleCheckin} className={styles.btnPrimary} style={{ marginTop: 16 }} disabled>
                      ✅ Xác nhận Check-in
                    </button>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
                      Chức năng check-in đang được hoàn thiện ở backend.
                    </p>
                  </>
                )}
              </>
            ) : (
              <p style={{ color: '#dc2626' }}>❌ {result.msg}</p>
            )}
          </div>
        )}
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
            <Route index        element={<TodaySchedule />} />
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
