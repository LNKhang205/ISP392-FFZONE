import { useState, useEffect } from 'react'
import api from '../../services/api'

const DAY_LABEL = { WEEKDAY: 'Ngày thường (T2–T6)', WEEKEND: 'Cuối tuần (T7, CN)', HOLIDAY: 'Lễ / Tết' }
const DAY_COLOR = {
  WEEKDAY: { background: '#eff6ff', color: '#1d4ed8' },
  WEEKEND: { background: '#f0fdf4', color: '#166534' },
  HOLIDAY: { background: '#fff7ed', color: '#9a3412' },
}
const EMPTY_FORM = {
  fieldId: '', dayOfWeek: 'WEEKDAY',
  startTime: '05:00', endTime: '23:00',
  price: '', effectiveFrom: new Date().toISOString().split('T')[0], effectiveTo: '',
  isActive: true,
}

function getApiError(e, fallback = 'Thao tác thất bại') {
  const data = e.response?.data
  if (typeof data === 'string' && data.trim()) return data
  return data?.message || data?.error || fallback
}

export default function PricingManagement() {
  const [pricings, setPricings] = useState([])
  const [fields,   setFields]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [pageMsg,  setPageMsg]  = useState('')
  const [formMsg,  setFormMsg]  = useState('')
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [editing,  setEditing]  = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [filterField, setFilterField] = useState('ALL')

  const load = async () => {
    setLoading(true)
    try {
      const [fRes, allFields] = await Promise.all([
        api.get('/field-pricings/all').catch(() => api.get('/field-pricings')),
        api.get('/fields'),
      ])
      setPricings(fRes.data)
      setFields(allFields.data)
    } catch (e) {
      setPageMsg('❌ Không tải được dữ liệu')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, fieldId: fields[0]?.id || '' })
    setFormMsg('')
    setFormOpen(true)
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({
      fieldId:       p.fieldId,
      dayOfWeek:     p.dayOfWeek,
      startTime:     p.startTime?.substring(0, 5) || '05:00',
      endTime:       p.endTime?.substring(0, 5)   || '23:00',
      price:         String(p.price),
      effectiveFrom: p.effectiveFrom || '',
      effectiveTo:   p.effectiveTo   || '',
      isActive:      p.isActive ?? true,
    })
    setFormMsg('')
    setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return
    setFormOpen(false); setEditing(null); setForm(EMPTY_FORM); setFormMsg('')
  }

  const save = async () => {
    setFormMsg('')
    if (!form.fieldId)   { setFormMsg('❌ Vui lòng chọn sân'); return }
    if (!form.price || isNaN(Number(form.price))) { setFormMsg('❌ Vui lòng nhập giá hợp lệ'); return }
    if (!form.startTime || !form.endTime)         { setFormMsg('❌ Vui lòng nhập giờ'); return }
    if (form.startTime >= form.endTime)           { setFormMsg('❌ Giờ bắt đầu phải nhỏ hơn giờ kết thúc'); return }
    if (!form.effectiveFrom)                       { setFormMsg('❌ Vui lòng nhập ngày hiệu lực'); return }

    setSaving(true)
    try {
      const payload = {
        fieldId:       String(form.fieldId),   // UUID string, không convert sang number
        dayOfWeek:     form.dayOfWeek,
        startTime:     form.startTime,
        endTime:       form.endTime,
        price:         Number(form.price),
        effectiveFrom: form.effectiveFrom,
        effectiveTo:   form.effectiveTo || null,
        isActive:      form.isActive,
      }
      if (editing) {
        await api.put(`/field-pricings/${editing.id}`, payload)
        setPageMsg('✅ Đã cập nhật bảng giá — slot sẽ được tạo lại tự động')
      } else {
        await api.post('/field-pricings', payload)
        setPageMsg('✅ Đã thêm bảng giá — slot sẽ được tạo tự động trong 5 giây')
      }
      closeForm(); await load()
    } catch (e) {
      setFormMsg('❌ ' + getApiError(e, editing ? 'Không cập nhật được' : 'Không thêm được'))
    } finally {
      setSaving(false)
    }
  }

  const del = async (p) => {
    const fieldName = fields.find(f => f.id === p.fieldId)?.name || p.fieldName || ''
    if (!window.confirm(`Xóa bảng giá "${DAY_LABEL[p.dayOfWeek]}" của "${fieldName}"?\nCác slot AVAILABLE chưa đặt sẽ bị xóa theo.`)) return
    try {
      await api.delete(`/field-pricings/${p.id}`)
      setPageMsg('✅ Đã xóa bảng giá')
      load()
    } catch (e) {
      alert('Không thể xóa: ' + getApiError(e))
    }
  }

  const set = (key) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [key]: val }))
  }

  const filtered = filterField === 'ALL'
    ? pricings
    : pricings.filter(p => p.fieldId === filterField)

  return (
    <div style={{ padding: '0 4px' }}>
      {/* Header */}
      <div style={s.pageHeader}>
        <h1 style={{ margin: 0 }}>💰 Quản lý bảng giá sân</h1>
        <button onClick={openCreate} style={s.primaryBtn}>➕ Thêm bảng giá</button>
      </div>

      {pageMsg && (
        <div style={{ ...s.notice, color: pageMsg.startsWith('✅') ? '#166534' : '#991b1b',
          background: pageMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
          borderColor: pageMsg.startsWith('✅') ? '#bbf7d0' : '#fecaca' }}>
          {pageMsg}
          <button onClick={() => setPageMsg('')} style={s.noticeDismiss}>✕</button>
        </div>
      )}

      {/* Filter */}
      <div style={s.filterBar}>
        <label style={s.filterLabel}>Lọc theo sân:</label>
        <select style={s.filterSelect} value={filterField} onChange={e => setFilterField(e.target.value)}>
          <option value="ALL">Tất cả sân</option>
          {fields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <span style={s.filterCount}>{filtered.length} bảng giá</span>
      </div>

      {/* Table */}
      {loading ? (
        <p style={s.empty}>⏳ Đang tải...</p>
      ) : filtered.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={{ fontSize: 48 }}>💰</div>
          <p>Chưa có bảng giá nào{filterField !== 'ALL' ? ' cho sân này' : ''}.</p>
          <button onClick={openCreate} style={s.primaryBtn}>➕ Thêm bảng giá đầu tiên</button>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Sân', 'Loại ngày', 'Khung giờ', 'Giá / giờ', 'Hiệu lực từ', 'Đến ngày', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ ...s.td, fontWeight: 700 }}>{p.fieldName}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...DAY_COLOR[p.dayOfWeek] }}>
                      {DAY_LABEL[p.dayOfWeek] || p.dayOfWeek}
                    </span>
                  </td>
                  <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 600 }}>
                    {p.startTime?.substring(0,5)} – {p.endTime?.substring(0,5)}
                  </td>
                  <td style={{ ...s.td, color: '#16a34a', fontWeight: 700 }}>
                    {Number(p.price).toLocaleString('vi-VN')}₫
                  </td>
                  <td style={s.td}>{p.effectiveFrom || '—'}</td>
                  <td style={s.td}>{p.effectiveTo || 'Không giới hạn'}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge,
                      ...(p.isActive
                        ? { background: '#dcfce7', color: '#166534' }
                        : { background: '#fee2e2', color: '#991b1b' }) }}>
                      {p.isActive ? '✅ Đang dùng' : '⏸ Tạm dừng'}
                    </span>
                  </td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                    <div style={s.actions}>
                      <button onClick={() => openEdit(p)} style={s.btnEdit}>✏️ Sửa</button>
                      <button onClick={() => del(p)}      style={s.btnDel}>🗑️ Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {formOpen && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>
                {editing ? '✏️ Sửa bảng giá' : '➕ Thêm bảng giá mới'}
              </h2>
              <button onClick={closeForm} style={s.closeBtn}>✕</button>
            </div>

            <div style={s.grid}>
              {/* Sân */}
              <div style={{ ...s.group, gridColumn: '1 / -1' }}>
                <label style={s.label}>Sân <span style={s.req}>*</span></label>
                <select style={s.input} value={form.fieldId} onChange={set('fieldId')} disabled={!!editing}>
                  <option value="">-- Chọn sân --</option>
                  {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.type})</option>)}
                </select>
                {editing && <small style={s.hint}>Không thể đổi sân khi sửa, hãy xóa và tạo mới</small>}
              </div>

              {/* Loại ngày */}
              <div style={s.group}>
                <label style={s.label}>Loại ngày <span style={s.req}>*</span></label>
                <select style={s.input} value={form.dayOfWeek} onChange={set('dayOfWeek')}>
                  <option value="WEEKDAY">Ngày thường (Thứ 2 – Thứ 6)</option>
                  <option value="WEEKEND">Cuối tuần (Thứ 7, Chủ nhật)</option>
                  <option value="HOLIDAY">Lễ / Tết</option>
                </select>
              </div>

              {/* Giá */}
              <div style={s.group}>
                <label style={s.label}>Giá mỗi slot (60 phút) <span style={s.req}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number" style={{ ...s.input, paddingRight: 36 }}
                    placeholder="VD: 150000" value={form.price} onChange={set('price')}
                  />
                  <span style={s.inputSuffix}>₫</span>
                </div>
                {form.price && !isNaN(Number(form.price)) && (
                  <small style={{ color: '#16a34a', fontWeight: 600 }}>
                    = {Number(form.price).toLocaleString('vi-VN')} VNĐ
                  </small>
                )}
              </div>

              {/* Giờ bắt đầu */}
              <div style={s.group}>
                <label style={s.label}>Giờ bắt đầu <span style={s.req}>*</span></label>
                <input type="time" style={s.input} value={form.startTime} onChange={set('startTime')} />
              </div>

              {/* Giờ kết thúc */}
              <div style={s.group}>
                <label style={s.label}>Giờ kết thúc <span style={s.req}>*</span></label>
                <input type="time" style={s.input} value={form.endTime} onChange={set('endTime')} />
                {form.startTime && form.endTime && form.startTime < form.endTime && (
                  <small style={{ color: '#6b7280' }}>
                    Tạo được {calcSlotCount(form.startTime, form.endTime)} slot (mỗi slot 75 phút)
                  </small>
                )}
              </div>

              {/* Ngày hiệu lực từ */}
              <div style={s.group}>
                <label style={s.label}>Hiệu lực từ ngày <span style={s.req}>*</span></label>
                <input type="date" style={s.input} value={form.effectiveFrom} onChange={set('effectiveFrom')} />
              </div>

              {/* Ngày kết thúc */}
              <div style={s.group}>
                <label style={s.label}>Đến ngày <span style={{ color: '#9ca3af' }}>(để trống = vô thời hạn)</span></label>
                <input type="date" style={s.input} value={form.effectiveTo}
                  min={form.effectiveFrom} onChange={set('effectiveTo')} />
              </div>

              {/* isActive */}
              <div style={{ ...s.group, gridColumn: '1 / -1' }}>
                <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.isActive} onChange={set('isActive')}
                    style={{ width: 16, height: 16, accentColor: '#16a34a' }} />
                  Đang áp dụng (bỏ chọn = tạm dừng bảng giá này)
                </label>
              </div>
            </div>

            {formMsg && <p style={s.errorText}>{formMsg}</p>}

            <div style={s.modalActions}>
              <button onClick={closeForm} style={s.cancelBtn} disabled={saving}>Hủy</button>
              <button onClick={save} style={{ ...s.primaryBtn, opacity: saving ? 0.65 : 1 }} disabled={saving}>
                {saving ? 'Đang lưu...' : editing ? '💾 Lưu thay đổi' : '➕ Thêm bảng giá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function calcSlotCount(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const total = (eh * 60 + em) - (sh * 60 + sm)
  return Math.max(0, Math.floor(total / 75))
}

const s = {
  pageHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, marginBottom:18, flexWrap:'wrap' },
  notice: { display:'flex', justifyContent:'space-between', alignItems:'center', border:'1px solid', borderRadius:8, padding:'10px 14px', marginBottom:14, fontWeight:600 },
  noticeDismiss: { background:'none', border:'none', cursor:'pointer', fontSize:16, color:'inherit', opacity:0.6 },
  filterBar: { display:'flex', alignItems:'center', gap:12, marginBottom:14, flexWrap:'wrap' },
  filterLabel: { fontSize:13, fontWeight:700, color:'#374151' },
  filterSelect: { padding:'7px 12px', border:'1px solid #d1d5db', borderRadius:7, fontSize:14, outline:'none' },
  filterCount: { fontSize:13, color:'#6b7280', background:'#f3f4f6', padding:'4px 12px', borderRadius:99 },
  empty: { textAlign:'center', color:'#6b7280', padding:32 },
  emptyBox: { textAlign:'center', padding:'60px 20px', color:'#6b7280' },
  tableWrap: { background:'#fff', border:'1px solid #e5e7eb', borderRadius:10, overflow:'auto', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  table: { width:'100%', borderCollapse:'collapse', fontSize:14, minWidth:700 },
  th: { padding:'10px 14px', textAlign:'left', fontWeight:700, color:'#374151', fontSize:13, whiteSpace:'nowrap' },
  td: { padding:'10px 14px', verticalAlign:'middle' },
  badge: { padding:'3px 10px', borderRadius:20, fontSize:12, fontWeight:600 },
  actions: { display:'flex', gap:6 },
  btnEdit: { background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe', borderRadius:5, padding:'5px 10px', cursor:'pointer', fontSize:12, fontWeight:600 },
  btnDel:  { background:'#fef2f2', color:'#991b1b', border:'1px solid #fecaca', borderRadius:5, padding:'5px 10px', cursor:'pointer', fontSize:12, fontWeight:600 },
  primaryBtn: { background:'#16a34a', color:'#fff', border:'none', borderRadius:7, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:14 },
  cancelBtn: { background:'#f3f4f6', color:'#374151', border:'1px solid #d1d5db', borderRadius:7, padding:'9px 16px', cursor:'pointer', fontWeight:600 },
  overlay: { position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  modal: { background:'#fff', borderRadius:12, width:'100%', maxWidth:680, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 70px rgba(15,23,42,0.35)', padding:24 },
  modalHeader: { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:20 },
  modalTitle: { margin:0, fontSize:18, color:'#111827' },
  closeBtn: { width:34, height:34, background:'#f3f4f6', border:'1px solid #e5e7eb', borderRadius:6, cursor:'pointer', fontSize:16 },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'14px 18px' },
  group: { display:'flex', flexDirection:'column', gap:5 },
  label: { fontSize:13, fontWeight:700, color:'#374151' },
  input: { border:'1px solid #d1d5db', borderRadius:6, padding:'9px 10px', fontSize:14, width:'100%', boxSizing:'border-box', fontFamily:'inherit', outline:'none' },
  inputSuffix: { position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#6b7280', fontWeight:600 },
  req: { color:'#dc2626' },
  hint: { color:'#6b7280', fontSize:12 },
  errorText: { margin:'12px 0 0', color:'#991b1b', fontWeight:600 },
  modalActions: { display:'flex', justifyContent:'flex-end', gap:10, marginTop:20, paddingTop:16, borderTop:'1px solid #e5e7eb' },
}
