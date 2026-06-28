import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import styles from './OwnerDashboard.module.css'

// ── Tiện ích ─────────────────────────────────────────────────────────────────

const fmt = (num) =>
  num == null ? '0₫' : Number(num).toLocaleString('vi-VN') + '₫'

const fmtShort = (num) => {
  if (num == null) return '0'
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'tỷ'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'tr'
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'k'
  return String(num)
}

const STATUS_MAP = {
  PENDING_PAYMENT: { label: 'Chờ TT',      bg: '#fef3c7', color: '#92400e' },
  CONFIRMED:       { label: 'Đã xác nhận', bg: '#d1fae5', color: '#065f46' },
  IN_PROGRESS:     { label: 'Đang chơi',   bg: '#dbeafe', color: '#1e40af' },
  COMPLETED:       { label: 'Hoàn thành',  bg: '#ede9fe', color: '#5b21b6' },
  CANCELLED:       { label: 'Đã hủy',      bg: '#fee2e2', color: '#991b1b' },
  REFUND_PENDING:  { label: 'Chờ hoàn',    bg: '#fef9c3', color: '#854d0e' },
  REFUNDED:        { label: 'Đã hoàn',     bg: '#f3f4f6', color: '#4b5563' },
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className={styles.statCard} style={{ borderTopColor: color }}>
      <div className={styles.statCardTop}>
        <span className={styles.statIcon}>{icon}</span>
      </div>
      <div className={styles.statValue} style={{ color }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  )
}

// ── Biểu đồ cột doanh thu (SVG thuần) ────────────────────────────────────────

function RevenueChart({ data }) {
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  if (!data || data.length === 0) return (
    <div className={styles.chartEmpty}>Chưa có dữ liệu doanh thu</div>
  )

  const W = 700, H = 220
  const PAD = { top: 20, right: 20, bottom: 36, left: 60 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const maxRev = Math.max(...data.map(d => Number(d.revenue || 0)), 1)
  const barW = Math.max(Math.floor(chartW / data.length) - 4, 4)

  // Y ticks (4 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: PAD.top + chartH - t * chartH,
    label: fmtShort(maxRev * t),
  }))

  return (
    <div className={styles.chartWrapper}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={t.y} y2={t.y}
              stroke="#f1f5f9" strokeWidth="1" />
            <text x={PAD.left - 6} y={t.y + 4}
              fontSize="10" fill="#9ca3af" textAnchor="end">{t.label}</text>
          </g>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const rev = Number(d.revenue || 0)
          const barH = Math.max((rev / maxRev) * chartH, rev > 0 ? 2 : 0)
          const x = PAD.left + i * (chartW / data.length) + (chartW / data.length - barW) / 2
          const y = PAD.top + chartH - barH
          const isHover = tooltip?.i === i

          return (
            <g key={i}
              onMouseEnter={(e) => setTooltip({ i, x: e.clientX, y: e.clientY, d })}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={x} y={y} width={barW} height={barH}
                fill={isHover ? '#2563eb' : '#3b82f6'}
                rx="3"
                style={{ transition: 'fill 0.15s' }}
              />
              {/* X label */}
              {i % 5 === 0 && (
                <text x={x + barW / 2} y={H - PAD.bottom + 14}
                  fontSize="9" fill="#9ca3af" textAnchor="middle">
                  {d.date}
                </text>
              )}
            </g>
          )
        })}

        {/* Y axis line */}
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + chartH}
          stroke="#e5e7eb" strokeWidth="1" />
      </svg>

      {tooltip && (
        <div className={styles.chartTooltip}>
          <strong>{tooltip.d.date}</strong>
          <div>Doanh thu: <b>{fmt(tooltip.d.revenue)}</b></div>
          <div>Booking: <b>{tooltip.d.bookingCount}</b></div>
        </div>
      )}
    </div>
  )
}

// ── Bảng thống kê từng sân ─────────────────────────────────────────────────────

function FieldStatsTable({ data }) {
  if (!data || data.length === 0)
    return <p className={styles.empty}>Chưa có dữ liệu sân.</p>

  const maxRev = Math.max(...data.map(d => Number(d.revenue || 0)), 1)

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Sân</th>
            <th>Loại</th>
            <th style={{ textAlign: 'right' }}>Tổng booking</th>
            <th style={{ textAlign: 'right' }}>Đã xác nhận</th>
            <th style={{ textAlign: 'right' }}>Doanh thu</th>
            <th style={{ minWidth: 120 }}>Tỉ lệ lấp đầy</th>
          </tr>
        </thead>
        <tbody>
          {data.map((f) => {
            const pct = Math.min(Number(f.occupancyRate || 0), 100)
            const revPct = Number(f.revenue || 0) / maxRev * 100
            const typeLabel = {
              FIVE_VS_FIVE: '5 vs 5',
              SEVEN_VS_SEVEN: '7 vs 7',
              ELEVEN_VS_ELEVEN: '11 vs 11',
            }[f.fieldType] || f.fieldType
            return (
              <tr key={f.fieldId}>
                <td>
                  <div className={styles.fieldName}>{f.fieldName}</div>
                  <div className={styles.fieldCode}>{f.fieldCode}</div>
                </td>
                <td>
                  <span className={styles.typeBadge}>{typeLabel}</span>
                </td>
                <td style={{ textAlign: 'right' }}>{f.totalBookings}</td>
                <td style={{ textAlign: 'right' }}>{f.confirmedBookings}</td>
                <td style={{ textAlign: 'right' }}>
                  <div>{fmt(f.revenue)}</div>
                  <div className={styles.miniBar}>
                    <div className={styles.miniBarFill} style={{ width: revPct + '%' }} />
                  </div>
                </td>
                <td>
                  <div className={styles.occBar}>
                    <div className={styles.occFill}
                      style={{ width: pct + '%', background: pct > 60 ? '#10b981' : pct > 30 ? '#f59e0b' : '#ef4444' }} />
                  </div>
                  <span className={styles.occLabel}>{pct.toFixed(1)}%</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Bảng booking gần đây ─────────────────────────────────────────────────────

function RecentBookingsTable({ data }) {
  if (!data || data.length === 0)
    return <p className={styles.empty}>Chưa có booking nào.</p>

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Mã</th>
            <th>Khách hàng</th>
            <th>Sân</th>
            <th>Ngày chơi</th>
            <th>Khung giờ</th>
            <th style={{ textAlign: 'right' }}>Tổng tiền</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {data.map((b) => {
            const s = STATUS_MAP[b.status] || { label: b.status, bg: '#f3f4f6', color: '#6b7280' }
            return (
              <tr key={b.bookingId}>
                <td className={styles.monoId}>{b.bookingCode}</td>
                <td>{b.customerName || '—'}</td>
                <td>{b.fieldName || '—'}</td>
                <td>{b.slotDate || '—'}</td>
                <td className={styles.monoId}>{b.slotTime || '—'}</td>
                <td style={{ textAlign: 'right' }}>{fmt(b.totalAmount)}</td>
                <td>
                  <span className={styles.badge}
                    style={{ background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)   // chỉ true lần đầu chưa có data
  const [fetching, setFetching] = useState(false)  // true khi đang refetch (đổi period)
  const [error, setError]       = useState(null)
  const [period, setPeriod]     = useState('month')
  const [tab, setTab]           = useState('overview') // overview | fields | bookings

  useEffect(() => {
    // Lần đầu chưa có data → show full spinner
    // Lần sau (đổi period) → giữ data cũ, chỉ dim nhẹ
    if (data === null) {
      setLoading(true)
    } else {
      setFetching(true)
    }
    setError(null)
    api.get(`/owner/dashboard?period=${period}`)
      .then(res => setData(res.data))
      .catch(err => {
        console.error(err)
        setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại.')
      })
      .finally(() => { setLoading(false); setFetching(false) })
  }, [period])

  const handleLogout = () => { logout(); navigate('/') }

  const d = data || {}

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
          <button onClick={() => navigate('/')} className={styles.btnOutline}>🏠 Trang chủ</button>
          <button onClick={handleLogout} className={styles.btnLogout}>Đăng xuất</button>
        </div>
      </header>

      {/* ── Body ── */}
      <main className={styles.body}>

        {/* Page header + tabs */}
        <div className={styles.pageHeader}>
          <div>
            <h1>Dashboard Chủ Sân</h1>
            <p className={styles.pageSubtitle}>Thống kê doanh thu và tình trạng đặt sân</p>
          </div>
          <div className={styles.periodTabs}>
            {[
              { value: 'today', label: 'Hôm nay' },
              { value: 'week',  label: '7 ngày' },
              { value: 'month', label: '30 ngày' },
            ].map(p => (
              <button key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`${styles.periodTab} ${period === p.value ? styles.periodActive : ''}`}>
                {p.label}
              </button>
            ))}
            {fetching && <span className={styles.fetchingDot} title="Đang cập nhật..." />}
          </div>
        </div>

        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <span>⚠️ {error}</span>
            <button onClick={() => setPeriod(p => p)} className={styles.btnOutline}>Thử lại</button>
          </div>
        ) : (
          <div style={{ opacity: fetching ? 0.6 : 1, transition: 'opacity 0.15s' }}>
            {/* ── Stat cards ── */}
            <div className={styles.statsGrid}>
              <StatCard icon="💰" label="Doanh thu" color="#3b82f6"
                value={fmt(d.totalRevenue)}
                sub={`TB: ${fmt(d.avgRevenuePerBooking)}/booking`}
              />
              <StatCard icon="📋" label="Tổng booking" color="#10b981"
                value={d.totalBookings ?? 0}
                sub={`Trong kỳ đã chọn`}
              />
              <StatCard icon="✅" label="Đã xác nhận" color="#f59e0b"
                value={d.confirmedBookings ?? 0}
                sub={`${d.cancelledBookings ?? 0} đã hủy`}
              />
              <StatCard icon="📈" label="Tỉ lệ thành công" color="#8b5cf6"
                value={(d.successRate ?? 0) + '%'}
                sub={`Xác nhận / Tổng booking`}
              />
            </div>

            {/* ── Biểu đồ doanh thu ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>📊 Biểu đồ doanh thu</h2>
                <span className={styles.sectionHint}>
                  {period === 'today' ? 'Hôm nay' : period === 'week' ? '7 ngày qua' : '30 ngày qua'}
                </span>
              </div>
              <RevenueChart data={d.revenueByDay} />
            </div>

            {/* ── Nav tabs ── */}
            <div className={styles.tabNav}>
              {[
                { id: 'fields',   label: '🏟️ Thống kê từng sân' },
                { id: 'bookings', label: '📝 Booking gần đây' },
              ].map(t => (
                <button key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`${styles.tabBtn} ${tab === t.id ? styles.tabActive : ''}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Tab: Thống kê sân ── */}
            {tab === 'fields' && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2>Thống kê theo sân</h2>
                  <span className={styles.sectionHint}>{(d.fieldStats || []).length} sân</span>
                </div>
                <FieldStatsTable data={d.fieldStats} />
              </div>
            )}

            {/* ── Tab: Booking gần đây ── */}
            {tab === 'bookings' && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2>Booking gần đây</h2>
                  <span className={styles.sectionHint}>20 booking mới nhất trong kỳ</span>
                </div>
                <RecentBookingsTable data={d.recentBookings} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
