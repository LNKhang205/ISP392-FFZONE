import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import styles from './OwnerDashboard.module.css'

/* ── Stat card ── */
function StatCard({ label, value, sub, color }) {
  return (
    <div className={styles.statCard} style={{ borderTopColor: color }}>
      <div className={styles.statValue} style={{ color }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
}

export default function OwnerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('today') // today | week | month

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get(`/bookings/stats?period=${period}`).catch(() => null),
      api.get('/bookings?limit=20').catch(() => null),
    ]).then(([statsRes, bookingsRes]) => {
      setStats(statsRes?.data || null)
      setBookings(bookingsRes?.data || [])
    }).finally(() => setLoading(false))
  }, [period])

  const handleLogout = () => { logout(); navigate('/') }

  // Fallback nếu chưa có API stats
  const revenue = stats?.totalRevenue ?? 0
  const totalBookings = stats?.totalBookings ?? bookings.length
  const confirmedCount = stats?.confirmedCount ?? bookings.filter(b => b.status === 'CONFIRMED').length

  return (
    <div className={styles.root}>
      {/* ── Topbar ── */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <span className={styles.logo}>⚽ <strong>FF</strong>Zone</span>
          <span className={styles.roleTag}>Chủ sân</span>
        </div>
        <div className={styles.topbarRight}>
          <span className={styles.welcome}>Xin chào, <strong>{user?.fullName}</strong></span>
          <button onClick={() => navigate('/')} className={styles.btnOutline}>
            🏠 Về trang chủ
          </button>
          <button onClick={handleLogout} className={styles.btnLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main className={styles.body}>
        <div className={styles.pageHeader}>
          <h1>Tổng quan doanh thu</h1>
          <div className={styles.periodTabs}>
            {[
              { value: 'today', label: 'Hôm nay' },
              { value: 'week',  label: '7 ngày'  },
              { value: 'month', label: '30 ngày' },
            ].map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`${styles.periodTab} ${period === p.value ? styles.periodActive : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className={styles.loading}>Đang tải dữ liệu...</p>
        ) : (
          <>
            {/* ── Stat cards ── */}
            <div className={styles.statsGrid}>
              <StatCard
                label="Doanh thu"
                value={revenue.toLocaleString('vi-VN') + '₫'}
                sub={`Kỳ: ${period}`}
                color="#3b82f6"
              />
              <StatCard
                label="Tổng booking"
                value={totalBookings}
                color="#10b981"
              />
              <StatCard
                label="Đã xác nhận"
                value={confirmedCount}
                color="#f59e0b"
              />
              <StatCard
                label="Tỉ lệ thành công"
                value={totalBookings ? Math.round(confirmedCount / totalBookings * 100) + '%' : '—'}
                color="#8b5cf6"
              />
            </div>

            {/* ── Recent bookings ── */}
            <div className={styles.section}>
              <h2>Lịch sử đặt sân gần đây</h2>
              {bookings.length === 0 ? (
                <p className={styles.empty}>Chưa có dữ liệu.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Mã booking</th>
                        <th>Khách hàng</th>
                        <th>Sân</th>
                        <th>Ngày đặt</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => {
                        const statusStyle = {
                          CONFIRMED: { bg: '#dcfce7', color: '#166534' },
                          PENDING:   { bg: '#fef9c3', color: '#854d0e' },
                          EXPIRED:   { bg: '#f3f4f6', color: '#6b7280' },
                          CANCELLED: { bg: '#fee2e2', color: '#991b1b' },
                        }[b.status] || { bg: '#f3f4f6', color: '#6b7280' }
                        return (
                          <tr key={b.id}>
                            <td className={styles.monoId}>#{String(b.id).slice(-6)}</td>
                            <td>{b.customerName || '—'}</td>
                            <td>{b.fieldName || '—'}</td>
                            <td>{b.bookingDate || '—'}</td>
                            <td>{b.totalAmount?.toLocaleString('vi-VN')}₫</td>
                            <td>
                              <span className={styles.badge} style={{ background: statusStyle.bg, color: statusStyle.color }}>
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

            {/* ── Lịch sân (xem nhanh) ── */}
            <div className={styles.section}>
              <h2>Xem lịch sân</h2>
              <p className={styles.hint}>
                Để xem chi tiết lịch sân, hãy chọn ngày cụ thể bên dưới:
              </p>
              <button
                className={styles.btnPrimary}
                onClick={() => navigate('/fields')}
              >
                📅 Xem lịch sân
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
