import { useState, useEffect, useRef } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import styles from './AdminDashboard.module.css'
import FieldManagement from './FieldManagement'
import ServiceManagement from './ServiceManagement'
import PricingManagement from './PricingManagement'

/* ── Sidebar ── */
function Sidebar({ onLogout }) {
  const items = [
    { to: '/admin',           label: '📊 Tổng quan',        end: true },
    { to: '/admin/accounts',  label: '👥 Tài khoản'         },
    { to: '/admin/fields',    label: '🏟️ Sân bóng'          },
    { to: '/admin/pricings',  label: '💰 Giá sân'           },
    { to: '/admin/vouchers',  label: '🎁 Voucher'           },
    { to: '/admin/services',  label: '🛒 Dịch vụ'           },
  ]
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarLogo}>
        <span>⚽</span> <strong>FF</strong>Zone
        <div className={styles.sidebarRole}>IT Admin</div>
      </div>
      <nav className={styles.sidebarNav}>
        {items.map(i => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navActive : ''}`
            }
          >
            {i.label}
          </NavLink>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        <button onClick={onLogout} className={styles.logoutBtn}>🚪 Đăng xuất</button>
      </div>
    </aside>
  )
}

/* ── Shared: CRUD Table ── */
function CrudTable({ columns, rows, onDelete, onEdit }) {
  if (!rows.length) return <p className={styles.empty}>Không có dữ liệu.</p>
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}
            {(onEdit || onDelete) && <th>Thao tác</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i}>
              {columns.map(c => (
                <td key={c.key}>{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>
              ))}
              {(onEdit || onDelete) && (
                <td>
                  <div className={styles.actions}>
                    {onEdit   && <button className={styles.btnEdit}   onClick={() => onEdit(row)}>✏️ Sửa</button>}
                    {onDelete && <button className={styles.btnDelete} onClick={() => onDelete(row)}>🗑️ Xóa</button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Overview ── */
function Overview() {
  const [counts, setCounts] = useState({})
  useEffect(() => {
    Promise.all([
      api.get('/accounts').catch(() => ({ data: [] })),
      api.get('/fields').catch(() => ({ data: [] })),
      api.get('/vouchers').catch(() => ({ data: [] })),
      api.get('/services').catch(() => ({ data: [] })),
    ]).then(([a, f, v, s]) => {
      setCounts({
        accounts: a.data?.length ?? 0,
        fields:   f.data?.length ?? 0,
        vouchers: v.data?.length ?? 0,
        services: s.data?.length ?? 0,
      })
    })
  }, [])

  const items = [
    { label: 'Tài khoản',   value: counts.accounts, color: '#3b82f6', icon: '👥' },
    { label: 'Sân bóng',    value: counts.fields,   color: '#10b981', icon: '🏟️' },
    { label: 'Voucher',     value: counts.vouchers, color: '#f59e0b', icon: '🎁' },
    { label: 'Dịch vụ',     value: counts.services, color: '#8b5cf6', icon: '🛒' },
  ]

  return (
    <div className={styles.page}>
      <h1>Tổng quan hệ thống</h1>
      <div className={styles.statsGrid}>
        {items.map(i => (
          <div key={i.label} className={styles.statCard} style={{ borderTopColor: i.color }}>
            <div className={styles.statIcon}>{i.icon}</div>
            <div className={styles.statValue} style={{ color: i.color }}>
              {i.value ?? '...'}
            </div>
            <div className={styles.statLabel}>{i.label}</div>
          </div>
        ))}
      </div>
      <div className={styles.hint}>
        <p>👈 Chọn mục trong sidebar để thực hiện quản lý CRUD.</p>
      </div>
    </div>
  )
}

/* ── Account Management ── */
function AccountManagement() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/accounts')
      .then(r => setAccounts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const toggleActive = async (acc) => {
    try {
      await api.put(`/accounts/${acc.id}`, { ...acc, isActive: !acc.isActive })
      load()
    } catch (e) { alert('Lỗi: ' + (e.response?.data?.message || e.message)) }
  }

  const filtered = accounts.filter(a =>
    !filter || a.fullName?.toLowerCase().includes(filter.toLowerCase())
      || a.email?.toLowerCase().includes(filter.toLowerCase())
  )

  const columns = [
    { key: 'fullName', label: 'Họ tên' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'SĐT' },
    { key: 'role', label: 'Role', render: r => (
      <span className={styles.roleBadge} data-role={r.role}>{r.role}</span>
    )},
    { key: 'isActive', label: 'Trạng thái', render: r => (
      <span className={styles.badge}
        style={r.isActive ? { background:'#dcfce7',color:'#166534' } : { background:'#fee2e2',color:'#991b1b' }}>
        {r.isActive ? 'Hoạt động' : 'Bị khóa'}
      </span>
    )},
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>Quản lý tài khoản</h1>
        <input
          className={styles.search}
          placeholder="🔍 Tìm theo tên hoặc email..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>
      {loading ? <p className={styles.loading}>Đang tải...</p> : (
        <CrudTable
          columns={columns}
          rows={filtered}
          onEdit={acc => toggleActive(acc)}
        />
      )}
    </div>
  )
}

/* ── Field Management ── */
// function FieldManagement() {
//   const [fields, setFields] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [form, setForm] = useState({ name: '', address: '', fieldType: 'FIELD_5', description: '' })
//   const [editing, setEditing] = useState(null)
//   const [msg, setMsg] = useState('')

//   const load = () => {
//     setLoading(true)
//     api.get('/fields').then(r => setFields(r.data)).catch(() => {}).finally(() => setLoading(false))
//   }
//   useEffect(load, [])

//   const save = async () => {
//     setMsg('')
//     try {
//       if (editing) {
//         await api.put(`/fields/${editing.id}`, form)
//         setEditing(null)
//         setMsg('✅ Đã cập nhật sân')
//       } else {
//         await api.post('/fields', form)
//         setMsg('✅ Đã thêm sân mới')
//       }
//       setForm({ name: '', address: '', fieldType: 'FIELD_5', description: '' })
//       load()
//     } catch (e) { setMsg('❌ ' + (e.response?.data?.message || 'Lỗi')) }
//   }

//   const startEdit = (f) => {
//     setEditing(f)
//     setForm({ name: f.name, address: f.address, fieldType: f.fieldType, description: f.description })
//   }

//   const del = async (f) => {
//     if (!window.confirm(`Xóa sân "${f.name}"?`)) return
//     try { await api.delete(`/fields/${f.id}`); load() }
//     catch (e) { alert('Không thể xóa: ' + (e.response?.data?.message || 'Lỗi')) }
//   }

//   const columns = [
//     { key: 'name', label: 'Tên sân' },
//     { key: 'fieldType', label: 'Loại' },
//     { key: 'address', label: 'Địa chỉ' },
//     { key: 'status', label: 'Trạng thái' },
//   ]

//   return (
//     <div className={styles.page}>
//       <h1>Quản lý sân bóng</h1>
//       <div className={styles.card}>
//         <h2>{editing ? `Sửa sân: ${editing.name}` : 'Thêm sân mới'}</h2>
//         <div className={styles.formGrid}>
//           <input className={styles.input} placeholder="Tên sân" value={form.name}
//             onChange={e => setForm(f => ({...f, name: e.target.value}))} />
//           <input className={styles.input} placeholder="Địa chỉ" value={form.address}
//             onChange={e => setForm(f => ({...f, address: e.target.value}))} />
//           <select className={styles.select} value={form.fieldType}
//             onChange={e => setForm(f => ({...f, fieldType: e.target.value}))}>
//             <option value="FIELD_5">Sân 5</option>
//             <option value="FIELD_7">Sân 7</option>
//             <option value="FIELD_9">Sân 9</option>
//           </select>
//           <input className={styles.input} placeholder="Mô tả" value={form.description}
//             onChange={e => setForm(f => ({...f, description: e.target.value}))} />
//         </div>
//         <div className={styles.formActions}>
//           <button onClick={save} className={styles.btnPrimary}>
//             {editing ? '💾 Lưu thay đổi' : '+ Thêm sân'}
//           </button>
//           {editing && (
//             <button onClick={() => { setEditing(null); setForm({ name:'',address:'',fieldType:'FIELD_5',description:'' }) }}
//               className={styles.btnCancel}>Hủy</button>
//           )}
//         </div>
//         {msg && <p className={styles.msg}>{msg}</p>}
//       </div>
//       {loading ? <p className={styles.loading}>Đang tải...</p> : (
//         <CrudTable columns={columns} rows={fields} onEdit={startEdit} onDelete={del} />
//       )}
//     </div>
//   )
// }


/* ── Voucher Management ── */
function VoucherManagement() {
  const [vouchers, setVouchers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [msg, setMsg]           = useState('')
  const [form, setForm]         = useState({
    code: '', voucherType: 'PERCENT', discountValue: '',
    quantity: '', startDate: '', endDate: ''
  })

  const load = () => {
    setLoading(true)
    api.get('/vouchers').then(r => setVouchers(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const save = async () => {
    setMsg('')
    if (!form.code || !form.discountValue || !form.quantity || !form.startDate || !form.endDate) {
      setMsg('❌ Vui lòng điền đầy đủ thông tin'); return
    }
    try {
      await api.post('/vouchers', {
        code:          form.code.toUpperCase(),
        voucherType:   form.voucherType,
        discountValue: Number(form.discountValue),
        quantity:      Number(form.quantity),
        startDate:     form.startDate,
        endDate:       form.endDate,
      })
      setMsg('✅ Tạo voucher thành công')
      setForm({ code: '', voucherType: 'PERCENT', discountValue: '', quantity: '', startDate: '', endDate: '' })
      load()
    } catch (e) { setMsg('❌ ' + (e.response?.data?.message || 'Lỗi tạo voucher')) }
  }

  const deactivate = async (v) => {
    if (!window.confirm(`Vô hiệu hóa voucher "${v.code}"?`)) return
    try { await api.delete(`/vouchers/${v.id}`); load() }
    catch { alert('Không thể vô hiệu hóa') }
  }

  const columns = [
    { key: 'code',          label: 'Mã voucher' },
    { key: 'voucherType',   label: 'Loại',       render: r => r.voucherType === 'PERCENT' ? 'Phần trăm' : 'Cố định' },
    { key: 'discountValue', label: 'Giảm',        render: r => r.voucherType === 'PERCENT' ? r.discountValue + '%' : Number(r.discountValue).toLocaleString('vi-VN') + '₫' },
    { key: 'remaining',     label: 'Còn lại',     render: r => `${r.remaining}/${r.quantity}` },
    { key: 'startDate',     label: 'Bắt đầu',     render: r => new Date(r.startDate).toLocaleDateString('vi-VN') },
    { key: 'endDate',       label: 'Kết thúc',    render: r => new Date(r.endDate).toLocaleDateString('vi-VN') },
    { key: 'status',        label: 'Trạng thái',  render: r => r.status === 'ACTIVE' ? '🟢 Hoạt động' : '🔴 Đã tắt' },
  ]

  return (
    <div className={styles.page}>
      <h1>Quản lý Voucher</h1>
      <div className={styles.card}>
        <h2>Tạo voucher mới</h2>
        <div className={styles.formGrid}>
          <input className={styles.input} placeholder="Mã voucher (VD: QUOCKHANH20)"
            value={form.code} onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))} />

          <select className={styles.input} value={form.voucherType}
            onChange={e => setForm(f => ({...f, voucherType: e.target.value}))}>
            <option value="PERCENT">Giảm theo %</option>
            <option value="FIXED">Giảm số tiền cố định (₫)</option>
          </select>

          <input type="number" className={styles.input}
            placeholder={form.voucherType === 'PERCENT' ? 'Giảm % (VD: 20)' : 'Giảm (₫) (VD: 50000)'}
            value={form.discountValue}
            onChange={e => setForm(f => ({...f, discountValue: e.target.value}))} />

          <input type="number" className={styles.input} placeholder="Số lượng voucher (VD: 50)"
            value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} />

          <input type="datetime-local" className={styles.input}
            title="Ngày bắt đầu nhận voucher"
            value={form.startDate} onChange={e => setForm(f => ({...f, startDate: e.target.value}))} />

          <input type="datetime-local" className={styles.input}
            title="Ngày hết hạn voucher"
            value={form.endDate} onChange={e => setForm(f => ({...f, endDate: e.target.value}))} />
        </div>
        <div className={styles.formActions}>
          <button onClick={save} className={styles.btnPrimary}>+ Tạo voucher</button>
        </div>
        {msg && <p className={styles.msg}>{msg}</p>}
      </div>

      {loading ? <p className={styles.loading}>Đang tải...</p> : (
        <CrudTable columns={columns} rows={vouchers} onDelete={deactivate} />
      )}
    </div>
  )
}

/* ── Main AdminDashboard ── */
export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

  return (
    <div className={styles.layout}>
      <Sidebar onLogout={handleLogout} />
      <div className={styles.main}>
        <div className={styles.topbar}>
          <span className={styles.welcome}>Xin chào, <strong>{user?.fullName}</strong></span>
          <span className={styles.roleBadgeTop}>IT Admin</span>
          <button onClick={() => navigate('/')} className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}>
            🏠 Về trang chủ
          </button>
        </div>
        <div className={styles.content}>
          <Routes>
            <Route index           element={<Overview />} />
            <Route path="accounts" element={<AccountManagement />} />
            <Route path="fields"   element={<FieldManagement />} />
            <Route path="pricings" element={<PricingManagement />} />
            <Route path="vouchers" element={<VoucherManagement />} />
            <Route path="services" element={<ServiceManagement />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}
