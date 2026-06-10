import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import styles from './StaffDashboard.module.css'

/* ── Sidebar ── */
function Sidebar({ onLogout }) {
  const navItems = [
    { to: '/staff',          label: '📋 Lịch hôm nay',   end: true },
    { to: '/staff/bookings', label: '📅 Quản lý booking' },
    { to: '/staff/services', label: '🛒 Dịch vụ tại sân' },
    { to: '/staff/checkin',  label: '✅ Check-in'         },
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
    PENDING:   { bg: '#fef9c3', text: '#854d0e' },
    CONFIRMED: { bg: '#dcfce7', text: '#166534' },
    EXPIRED:   { bg: '#f3f4f6', text: '#6b7280' },
    CANCELLED: { bg: '#fee2e2', text: '#991b1b' },
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Quản lý Booking</h1>
        <div className={styles.filterTabs}>
          {['ALL','PENDING','CONFIRMED','EXPIRED','CANCELLED'].map(s => (
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
                return (
                  <tr key={b.id}>
                    <td className={styles.monoId}>#{String(b.id).slice(-6)}</td>
                    <td>{b.customerName || '—'}</td>
                    <td>{b.fieldName || '—'}</td>
                    <td>{b.bookingDate || '—'}</td>
                    <td>{b.totalAmount?.toLocaleString('vi-VN')}₫</td>
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
function CheckIn() {
  const [bookingId, setBookingId] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!bookingId.trim()) return
    setLoading(true); setResult(null)
    try {
      const r = await api.get(`/bookings/${bookingId}`)
      setResult({ ok: true, data: r.data })
    } catch (e) {
      setResult({ ok: false, msg: e.response?.data?.message || 'Không tìm thấy booking' })
    } finally { setLoading(false) }
  }

  const handleCheckin = async () => {
    if (!result?.data?.id) return
    try {
      await api.post(`/bookings/${result.data.id}/checkin`)
      setResult(r => ({ ...r, data: { ...r.data, status: 'CHECKED_IN' } }))
      alert('✅ Check-in thành công!')
    } catch (e) {
      alert('❌ ' + (e.response?.data?.message || 'Lỗi'))
    }
  }

  return (
    <div className={styles.page}>
      <h1>Check-in khách hàng</h1>
      <div className={styles.card}>
        <p style={{ color: '#6b7280', marginBottom: 12 }}>Nhập mã booking để tìm kiếm và check-in:</p>
        <div className={styles.formRow}>
          <input
            placeholder="Nhập mã booking (ID)"
            value={bookingId}
            onChange={e => setBookingId(e.target.value)}
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
                <div className={styles.infoRow}><span>Khách hàng:</span> <strong>{result.data.customerName}</strong></div>
                <div className={styles.infoRow}><span>Sân:</span> <strong>{result.data.fieldName}</strong></div>
                <div className={styles.infoRow}><span>Ngày:</span> <strong>{result.data.bookingDate}</strong></div>
                <div className={styles.infoRow}><span>Trạng thái:</span>
                  <span className={styles.statusBadge} style={{ background:'#dcfce7', color:'#166534' }}>
                    {result.data.status}
                  </span>
                </div>
                {result.data.status === 'CONFIRMED' && (
                  <button onClick={handleCheckin} className={styles.btnPrimary} style={{ marginTop: 16 }}>
                    ✅ Xác nhận Check-in
                  </button>
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
        </div>
        <div className={styles.content}>
          <Routes>
            <Route index        element={<TodaySchedule />} />
            <Route path="bookings" element={<BookingManagement />} />
            <Route path="services" element={<ServiceManagement />} />
            <Route path="checkin"  element={<CheckIn />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
