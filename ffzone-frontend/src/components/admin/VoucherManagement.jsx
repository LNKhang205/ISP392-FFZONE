import { useState, useEffect } from 'react'
import api from '../../services/api'

const TYPE_LABEL  = { PERCENT: '% Giảm theo %', FIXED: '₫ Giảm cố định' }
const TYPE_COLOR  = { PERCENT: { background:'#eff6ff', color:'#1d4ed8' }, FIXED: { background:'#f0fdf4', color:'#166534' } }
const STATUS_COLOR = {
  ACTIVE:   { background:'#dcfce7', color:'#166534' },
  INACTIVE: { background:'#f3f4f6', color:'#6b7280' },
  EXPIRED:  { background:'#fee2e2', color:'#991b1b' },
}
const STATUS_LABEL = { ACTIVE:'✅ Đang dùng', INACTIVE:'⏸ Tạm dừng', EXPIRED:'⌛ Hết hạn' }

const nowLocal = () => {
  const d = new Date(); d.setMinutes(0,0,0)
  return d.toISOString().slice(0,16)
}
const nextMonth = () => {
  const d = new Date(); d.setMonth(d.getMonth()+1); d.setMinutes(0,0,0)
  return d.toISOString().slice(0,16)
}

const EMPTY = {
  code: '', voucherType: 'PERCENT', discountValue: '',
  quantity: '', startDate: nowLocal(), endDate: nextMonth(),
}

function getApiError(e, fallback = 'Thao tác thất bại') {
  const data = e.response?.data
  if (typeof data === 'string' && data.trim()) return data
  return data?.message || data?.error || fallback
}

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [pageMsg,  setPageMsg]  = useState('')
  const [formMsg,  setFormMsg]  = useState('')
  const [form,     setForm]     = useState(EMPTY)
  const [editing,  setEditing]  = useState(null)
  const [open,     setOpen]     = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [filter,   setFilter]   = useState('ALL')

  const load = async () => {
    setLoading(true)
    try { setVouchers((await api.get('/vouchers')).data) }
    catch { setPageMsg('❌ Không tải được dữ liệu') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null); setForm(EMPTY); setFormMsg(''); setOpen(true)
  }
  const openEdit = (v) => {
    setEditing(v)
    setForm({
      code:          v.code,
      voucherType:   v.voucherType,
      discountValue: String(v.discountValue),
      quantity:      String(v.quantity),
      startDate:     v.startDate?.slice(0,16) || nowLocal(),
      endDate:       v.endDate?.slice(0,16)   || nextMonth(),
    })
    setFormMsg(''); setOpen(true)
  }
  const closeForm = () => { if (saving) return; setOpen(false); setEditing(null); setForm(EMPTY); setFormMsg('') }

  const validate = () => {
    if (!form.code.trim())     return '❌ Vui lòng nhập mã voucher'
    if (!/^[A-Z0-9_-]+$/i.test(form.code)) return '❌ Mã chỉ dùng chữ, số, gạch ngang/dưới'
    if (!form.discountValue || isNaN(Number(form.discountValue)) || Number(form.discountValue) <= 0)
      return '❌ Giá trị giảm phải lớn hơn 0'
    if (form.voucherType === 'PERCENT' && Number(form.discountValue) > 100)
      return '❌ Giảm % không thể vượt 100%'
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) < 1)
      return '❌ Số lượng phải lớn hơn 0'
    if (!form.startDate || !form.endDate) return '❌ Vui lòng chọn thời gian'
    if (form.startDate >= form.endDate) return '❌ Ngày kết thúc phải sau ngày bắt đầu'
    return null
  }

  const save = async () => {
    setFormMsg('')
    const err = validate(); if (err) { setFormMsg(err); return }
    setSaving(true)
    try {
      const payload = {
        code:          form.code.toUpperCase().trim(),
        voucherType:   form.voucherType,
        discountValue: Number(form.discountValue),
        quantity:      Number(form.quantity),
        startDate:     form.startDate + ':00',
        endDate:       form.endDate   + ':00',
      }
      if (editing) {
        await api.put(`/vouchers/${editing.id}`, payload)
        setPageMsg('✅ Đã cập nhật voucher')
      } else {
        await api.post('/vouchers', payload)
        setPageMsg('✅ Đã tạo voucher mới')
      }
      closeForm(); load()
    } catch(e) {
      setFormMsg('❌ ' + getApiError(e, editing ? 'Không cập nhật được' : 'Không tạo được'))
    } finally { setSaving(false) }
  }

  const del = async (v) => {
    if (!window.confirm(`Xóa / tắt voucher "${v.code}"?\nVoucher sẽ chuyển sang INACTIVE.`)) return
    try { await api.delete(`/vouchers/${v.id}`); setPageMsg('✅ Đã tắt voucher'); load() }
    catch(e) { alert('Không thể xóa: ' + getApiError(e)) }
  }

  const genCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const code = 'FFZ' + Array.from({length:6}, () => chars[Math.floor(Math.random()*chars.length)]).join('')
    setForm(f => ({...f, code}))
  }

  const set = k => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({...f, [k]: val}))
  }

  const now = new Date().toISOString()
  const filtered = vouchers.filter(v => filter === 'ALL' || v.status === filter)

  // Stats
  const stats = {
    total:   vouchers.length,
    active:  vouchers.filter(v => v.status === 'ACTIVE').length,
    expired: vouchers.filter(v => v.status === 'EXPIRED').length,
    used:    vouchers.reduce((s, v) => s + (v.usedQuantity||0), 0),
  }

  return (
    <div style={{padding:'0 4px'}}>
      {/* Header */}
      <div style={s.pageHeader}>
        <h1 style={{margin:0}}>🎟️ Quản lý Voucher</h1>
        <button onClick={openCreate} style={s.primaryBtn}>➕ Tạo voucher mới</button>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {[
          ['🎟️', stats.total,   'Tổng voucher',   '#6b7280'],
          ['✅', stats.active,  'Đang hoạt động', '#16a34a'],
          ['⌛', stats.expired, 'Đã hết hạn',     '#dc2626'],
          ['📊', stats.used,    'Lượt đã dùng',   '#1d4ed8'],
        ].map(([icon, val, label, color]) => (
          <div key={label} style={s.statCard}>
            <span style={{fontSize:24}}>{icon}</span>
            <strong style={{fontSize:26, color}}>{val}</strong>
            <span style={{fontSize:12, color:'#6b7280'}}>{label}</span>
          </div>
        ))}
      </div>

      {pageMsg && (
        <div style={{...s.notice, color: pageMsg.startsWith('✅') ? '#166534':'#991b1b',
          background: pageMsg.startsWith('✅') ? '#f0fdf4':'#fef2f2',
          borderColor: pageMsg.startsWith('✅') ? '#bbf7d0':'#fecaca'}}>
          {pageMsg}
          <button onClick={() => setPageMsg('')} style={s.noticeDismiss}>✕</button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={s.tabs}>
        {[['ALL','Tất cả'],['ACTIVE','Đang dùng'],['INACTIVE','Tạm dừng'],['EXPIRED','Hết hạn']].map(([k,v]) => (
          <button key={k}
            style={{...s.tab, ...(filter===k ? s.tabActive : {})}}
            onClick={() => setFilter(k)}>
            {v} <span style={s.tabCount}>{k==='ALL' ? vouchers.length : vouchers.filter(x=>x.status===k).length}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <p style={s.empty}>⏳ Đang tải...</p>
      ) : filtered.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={{fontSize:52}}>🎟️</div>
          <p>Chưa có voucher nào{filter !== 'ALL' ? ' ở trạng thái này' : ''}.</p>
          <button onClick={openCreate} style={s.primaryBtn}>➕ Tạo voucher đầu tiên</button>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={{background:'#f1f5f9'}}>
                {['Mã Voucher','Loại giảm','Giá trị','Đã dùng / Tổng','Thời hạn','Trạng thái','Thao tác'].map(h=>(
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => {
                const pct = v.quantity > 0 ? Math.round(v.usedQuantity/v.quantity*100) : 0
                const isExpired = v.endDate && v.endDate < now
                return (
                  <tr key={v.id} style={{borderBottom:'1px solid #e5e7eb', opacity: v.status==='INACTIVE'?0.6:1}}>
                    <td style={s.td}>
                      <span style={s.codeChip}>{v.code}</span>
                    </td>
                    <td style={s.td}>
                      <span style={{...s.badge, ...TYPE_COLOR[v.voucherType]}}>
                        {TYPE_LABEL[v.voucherType]}
                      </span>
                    </td>
                    <td style={{...s.td, fontWeight:800, fontSize:15, color: v.voucherType==='PERCENT'?'#1d4ed8':'#16a34a'}}>
                      {v.voucherType === 'PERCENT'
                        ? `${v.discountValue}%`
                        : `${Number(v.discountValue).toLocaleString('vi-VN')}₫`}
                    </td>
                    <td style={s.td}>
                      <div style={s.usageWrap}>
                        <span style={s.usageText}>{v.usedQuantity} / {v.quantity}</span>
                        <div style={s.bar}>
                          <div style={{...s.barFill, width:`${pct}%`,
                            background: pct>=100?'#dc2626': pct>=70?'#f59e0b':'#16a34a'}}/>
                        </div>
                        <span style={{fontSize:11, color:'#6b7280'}}>{v.remaining} còn lại</span>
                      </div>
                    </td>
                    <td style={s.td}>
                      <div style={{fontSize:12}}>
                        <div>Từ: <strong>{v.startDate?.slice(0,16).replace('T',' ')}</strong></div>
                        <div style={{color: isExpired?'#dc2626':'inherit'}}>
                          Đến: <strong>{v.endDate?.slice(0,16).replace('T',' ')}</strong>
                        </div>
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={{...s.badge, ...STATUS_COLOR[v.status]}}>
                        {STATUS_LABEL[v.status]}
                      </span>
                    </td>
                    <td style={{...s.td, whiteSpace:'nowrap'}}>
                      <div style={s.actions}>
                        <button onClick={() => openEdit(v)} style={s.btnEdit}>✏️ Sửa</button>
                        <button onClick={() => del(v)}      style={s.btnDel}>🗑️ Tắt</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form */}
      {open && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{editing ? '✏️ Sửa voucher' : '🎟️ Tạo voucher mới'}</h2>
              <button onClick={closeForm} style={s.closeBtn}>✕</button>
            </div>

            <div style={s.grid}>
              {/* Mã */}
              <div style={{...s.group, gridColumn:'1 / -1'}}>
                <label style={s.label}>Mã voucher <span style={s.req}>*</span></label>
                <div style={{display:'flex', gap:8}}>
                  <input style={{...s.input, flex:1, textTransform:'uppercase', letterSpacing:2, fontWeight:700}}
                    placeholder="VD: FFZONE50" value={form.code}
                    onChange={e => setForm(f => ({...f, code: e.target.value.toUpperCase()}))}
                    disabled={!!editing}
                  />
                  {!editing && (
                    <button onClick={genCode} style={s.genBtn} title="Tự sinh mã ngẫu nhiên">🎲 Tự sinh</button>
                  )}
                </div>
                {editing && <small style={s.hint}>Không thể đổi mã khi chỉnh sửa</small>}
              </div>

              {/* Loại giảm */}
              <div style={s.group}>
                <label style={s.label}>Loại giảm giá <span style={s.req}>*</span></label>
                <select style={s.input} value={form.voucherType} onChange={set('voucherType')}>
                  <option value="PERCENT">% Giảm theo phần trăm</option>
                  <option value="FIXED">₫ Giảm số tiền cố định</option>
                </select>
              </div>

              {/* Giá trị */}
              <div style={s.group}>
                <label style={s.label}>
                  {form.voucherType === 'PERCENT' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (₫)'}
                  <span style={s.req}> *</span>
                </label>
                <div style={{position:'relative'}}>
                  <input type="number" min={1} max={form.voucherType==='PERCENT'?100:undefined}
                    style={{...s.input, paddingRight:36}}
                    placeholder={form.voucherType==='PERCENT' ? 'VD: 20' : 'VD: 50000'}
                    value={form.discountValue} onChange={set('discountValue')} />
                  <span style={s.suffix}>{form.voucherType==='PERCENT' ? '%' : '₫'}</span>
                </div>
                {form.voucherType==='FIXED' && form.discountValue && !isNaN(Number(form.discountValue)) && (
                  <small style={{color:'#16a34a', fontWeight:600}}>
                    = {Number(form.discountValue).toLocaleString('vi-VN')} VNĐ
                  </small>
                )}
              </div>

              {/* Số lượng */}
              <div style={s.group}>
                <label style={s.label}>Số lượng voucher <span style={s.req}>*</span></label>
                <input type="number" min={1} style={s.input}
                  placeholder="VD: 100" value={form.quantity} onChange={set('quantity')} />
              </div>

              {/* Ngày bắt đầu */}
              <div style={s.group}>
                <label style={s.label}>Ngày bắt đầu <span style={s.req}>*</span></label>
                <input type="datetime-local" style={s.input} value={form.startDate} onChange={set('startDate')} />
              </div>

              {/* Ngày kết thúc */}
              <div style={s.group}>
                <label style={s.label}>Ngày kết thúc <span style={s.req}>*</span></label>
                <input type="datetime-local" style={s.input}
                  min={form.startDate} value={form.endDate} onChange={set('endDate')} />
              </div>

              {/* Preview */}
              {form.code && form.discountValue && (
                <div style={{...s.group, gridColumn:'1 / -1'}}>
                  <div style={s.preview}>
                    <span style={{fontSize:20}}>🎟️</span>
                    <div>
                      <div style={{fontWeight:800, letterSpacing:2}}>{form.code}</div>
                      <div style={{fontSize:13, color:'#6b7280'}}>
                        Giảm {form.voucherType==='PERCENT' ? `${form.discountValue}%` : `${Number(form.discountValue||0).toLocaleString('vi-VN')}₫`}
                        {form.quantity ? ` · ${form.quantity} lượt` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {formMsg && <p style={s.errorText}>{formMsg}</p>}

            <div style={s.modalActions}>
              <button onClick={closeForm} style={s.cancelBtn} disabled={saving}>Hủy</button>
              <button onClick={save} style={{...s.primaryBtn, opacity: saving?0.65:1}} disabled={saving}>
                {saving ? 'Đang lưu...' : editing ? '💾 Lưu thay đổi' : '🎟️ Tạo voucher'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  pageHeader: {display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:18,flexWrap:'wrap'},
  statsRow: {display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:18},
  statCard: {background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,padding:'16px 20px',display:'flex',flexDirection:'column',gap:4,boxShadow:'0 1px 3px rgba(0,0,0,0.06)'},
  notice: {display:'flex',justifyContent:'space-between',alignItems:'center',border:'1px solid',borderRadius:8,padding:'10px 14px',marginBottom:14,fontWeight:600},
  noticeDismiss: {background:'none',border:'none',cursor:'pointer',fontSize:16,color:'inherit',opacity:0.6},
  tabs: {display:'flex',gap:4,marginBottom:14,borderBottom:'2px solid #e5e7eb',paddingBottom:0},
  tab: {padding:'8px 16px',border:'none',background:'none',cursor:'pointer',fontSize:13,fontWeight:600,color:'#6b7280',borderBottom:'2px solid transparent',marginBottom:-2},
  tabActive: {color:'#16a34a',borderBottomColor:'#16a34a'},
  tabCount: {background:'#e5e7eb',color:'#374151',borderRadius:99,padding:'1px 7px',fontSize:11,marginLeft:4},
  empty: {textAlign:'center',color:'#6b7280',padding:32},
  emptyBox: {textAlign:'center',padding:'60px 20px',color:'#6b7280'},
  tableWrap: {background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,overflow:'auto',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'},
  table: {width:'100%',borderCollapse:'collapse',fontSize:14,minWidth:700},
  th: {padding:'10px 14px',textAlign:'left',fontWeight:700,color:'#374151',fontSize:13,whiteSpace:'nowrap'},
  td: {padding:'10px 14px',verticalAlign:'middle'},
  badge: {padding:'3px 10px',borderRadius:20,fontSize:12,fontWeight:600},
  codeChip: {fontFamily:'monospace',fontWeight:800,fontSize:14,letterSpacing:1,background:'#f3f4f6',padding:'4px 10px',borderRadius:6},
  usageWrap: {display:'flex',flexDirection:'column',gap:3,minWidth:120},
  usageText: {fontSize:13,fontWeight:700},
  bar: {height:6,background:'#e5e7eb',borderRadius:99,overflow:'hidden'},
  barFill: {height:'100%',borderRadius:99,transition:'width .3s'},
  actions: {display:'flex',gap:6},
  btnEdit: {background:'#eff6ff',color:'#1d4ed8',border:'1px solid #bfdbfe',borderRadius:5,padding:'5px 10px',cursor:'pointer',fontSize:12,fontWeight:600},
  btnDel:  {background:'#fef2f2',color:'#991b1b',border:'1px solid #fecaca',borderRadius:5,padding:'5px 10px',cursor:'pointer',fontSize:12,fontWeight:600},
  primaryBtn: {background:'#16a34a',color:'#fff',border:'none',borderRadius:7,padding:'9px 18px',cursor:'pointer',fontWeight:700,fontSize:14},
  cancelBtn: {background:'#f3f4f6',color:'#374151',border:'1px solid #d1d5db',borderRadius:7,padding:'9px 16px',cursor:'pointer',fontWeight:600},
  overlay: {position:'fixed',inset:0,background:'rgba(15,23,42,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16},
  modal: {background:'#fff',borderRadius:12,width:'100%',maxWidth:640,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 24px 70px rgba(15,23,42,0.35)',padding:24},
  modalHeader: {display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:20},
  modalTitle: {margin:0,fontSize:18,color:'#111827'},
  closeBtn: {width:34,height:34,background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:6,cursor:'pointer',fontSize:16},
  grid: {display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'14px 18px'},
  group: {display:'flex',flexDirection:'column',gap:5},
  label: {fontSize:13,fontWeight:700,color:'#374151'},
  input: {border:'1px solid #d1d5db',borderRadius:6,padding:'9px 10px',fontSize:14,width:'100%',boxSizing:'border-box',fontFamily:'inherit',outline:'none'},
  suffix: {position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',color:'#6b7280',fontWeight:600},
  req: {color:'#dc2626'},
  hint: {color:'#6b7280',fontSize:12},
  genBtn: {padding:'9px 14px',background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:6,cursor:'pointer',fontWeight:600,fontSize:13,whiteSpace:'nowrap'},
  preview: {display:'flex',gap:12,alignItems:'center',background:'linear-gradient(135deg,#f0fdf4,#dcfce7)',border:'1.5px dashed #16a34a',borderRadius:10,padding:'12px 16px'},
  errorText: {margin:'12px 0 0',color:'#991b1b',fontWeight:600},
  modalActions: {display:'flex',justifyContent:'flex-end',gap:10,marginTop:20,paddingTop:16,borderTop:'1px solid #e5e7eb'},
}
