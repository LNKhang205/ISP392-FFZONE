import { useState, useEffect, useRef } from 'react'
import {
  getAllServices, createService, updateService,
  toggleService, deleteService, uploadServiceImage,
} from '../../api/serviceApi'

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'http://localhost:8080'

const CATEGORY_LABEL = { DRINK: '🥤 Đồ uống', EQUIPMENT: '⚽ Dụng cụ', FACILITY: '🏟️ Tiện ích sân' }
const CATEGORY_COLOR = {
  DRINK:     { background: '#dbeafe', color: '#1d4ed8' },
  EQUIPMENT: { background: '#dcfce7', color: '#166534' },
  FACILITY:  { background: '#fef9c3', color: '#854d0e' },
}

const EMPTY_FORM = { name: '', category: 'DRINK', description: '', price: '', isActive: true }

function getApiError(e, fallback = 'Thao tác thất bại') {
  const status = e.response?.status
  const data   = e.response?.data
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (typeof data === 'string' && data.trim()) return data
  return data?.message || data?.error || fallback
}

function getImgSrc(url) {
  if (!url) return 'https://placehold.co/60x45?text=No'
  if (url.startsWith('http')) return url
  return `${BASE_URL}/${url}`
}

export default function ServiceManagement() {
  const [services, setServices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [pageMsg, setPageMsg]   = useState('')
  const [formMsg, setFormMsg]   = useState('')
  const [form, setForm]         = useState(EMPTY_FORM)
  const [editing, setEditing]   = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving]     = useState(false)

  const [pickedFile, setPickedFile]   = useState(null)
  const [previewUrl, setPreviewUrl]   = useState(null)
  const [inputKey, setInputKey]       = useState(0)
  const imageFileRef = useRef(null)

  const load = async () => {
    setLoading(true)
    try { setServices(await getAllServices()) }
    catch (e) { setPageMsg('❌ ' + getApiError(e, 'Không tải được danh sách dịch vụ')) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null); setForm(EMPTY_FORM); setFormMsg('')
    setPickedFile(null); setPreviewUrl(null)
    imageFileRef.current = null; setInputKey(k => k + 1)
    setFormOpen(true)
  }

  const openEdit = (svc) => {
    setEditing(svc)
    setForm({ name: svc.name, category: svc.category, description: svc.description ?? '', price: String(svc.price), isActive: svc.isActive })
    setPickedFile(null); setPreviewUrl(svc.imageUrl ? getImgSrc(svc.imageUrl) : null)
    imageFileRef.current = null; setInputKey(k => k + 1)
    setFormMsg(''); setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return
    setFormOpen(false); setEditing(null); setForm(EMPTY_FORM); setFormMsg('')
    setPickedFile(null); setPreviewUrl(null); imageFileRef.current = null
    setInputKey(k => k + 1)
  }

  const onFilePick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    imageFileRef.current = f
    setPickedFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const save = async () => {
    setFormMsg('')
    if (!form.name.trim())  { setFormMsg('❌ Vui lòng nhập tên dịch vụ'); return }
    if (!form.category)     { setFormMsg('❌ Vui lòng chọn danh mục'); return }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      setFormMsg('❌ Giá không hợp lệ'); return
    }

    const fileSnapshot = imageFileRef.current

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(), category: form.category,
        description: form.description.trim() || null,
        price: Number(form.price), isActive: form.isActive,
      }

      let serviceId = editing?.id
      if (editing) {
        await updateService(editing.id, payload)
      } else {
        const created = await createService(payload)
        serviceId = created.id
      }

      if (fileSnapshot && serviceId) {
        try {
          await uploadServiceImage(serviceId, fileSnapshot)
        } catch (imgErr) {
          console.error('Upload error:', imgErr.response)
          setPageMsg('⚠️ Lưu dịch vụ OK nhưng upload ảnh lỗi [' + imgErr.response?.status + ']: ' + JSON.stringify(imgErr.response?.data))
          closeForm(); await load(); return
        }
      }

      setPageMsg(editing ? '✅ Đã cập nhật dịch vụ' : '✅ Đã thêm: ' + form.name.trim())
      closeForm(); await load()
    } catch (e) {
      setFormMsg('❌ ' + getApiError(e, editing ? 'Không cập nhật được' : 'Không thêm được'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (svc) => {
    try { await toggleService(svc.id); setPageMsg(`✅ Đã ${svc.isActive ? 'tắt' : 'bật'} "${svc.name}"`); load() }
    catch (e) { alert('Lỗi: ' + getApiError(e)) }
  }

  const handleDelete = async (svc) => {
    if (!window.confirm(`Xóa dịch vụ "${svc.name}"?`)) return
    try { await deleteService(svc.id); setPageMsg('✅ Đã xóa "' + svc.name + '"'); load() }
    catch (e) { alert('Không thể xóa: ' + getApiError(e)) }
  }

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={s.pageHeader}>
        <h1 style={{ margin: 0 }}>🛒 Quản lý dịch vụ</h1>
        <button onClick={openCreate} style={s.primaryBtn}>➕ Thêm dịch vụ</button>
      </div>

      {pageMsg && (
        <div style={{ ...s.notice, color: pageMsg.startsWith('✅') ? '#166534' : '#991b1b' }}>
          {pageMsg}
        </div>
      )}

      {loading ? (
        <p style={s.empty}>⏳ Đang tải...</p>
      ) : services.length === 0 ? (
        <p style={s.empty}>Chưa có dịch vụ nào.</p>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Ảnh', 'Tên dịch vụ', 'Danh mục', 'Giá', 'Trạng thái', 'Thao tác'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map(svc => (
                <tr key={svc.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ ...s.td, width: 70 }}>
                    <img src={getImgSrc(svc.imageUrl)} alt={svc.name} style={s.thumb}
                      onError={e => { e.target.src = 'https://placehold.co/60x45?text=No' }} />
                  </td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{svc.name}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...(CATEGORY_COLOR[svc.category] || {}) }}>
                      {CATEGORY_LABEL[svc.category] || svc.category}
                    </span>
                  </td>
                  <td style={s.td}>{Number(svc.price).toLocaleString('vi-VN')}₫</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...(svc.isActive ? { background: '#dcfce7', color: '#166534' } : { background: '#fee2e2', color: '#991b1b' }) }}>
                      {svc.isActive ? 'Hoạt động' : 'Đã tắt'}
                    </span>
                  </td>
                  <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                    <div style={s.actions}>
                      <button onClick={() => handleToggle(svc)} style={s.btn(svc.isActive ? '#854d0e' : '#166534', svc.isActive ? '#fef9c3' : '#dcfce7', svc.isActive ? '#fde68a' : '#bbf7d0')}>
                        {svc.isActive ? '⏸ Tắt' : '▶ Bật'}
                      </button>
                      <button onClick={() => openEdit(svc)} style={s.btn('#1d4ed8', '#eff6ff', '#bfdbfe')}>✏️ Sửa</button>
                      <button onClick={() => handleDelete(svc)} style={s.btn('#991b1b', '#fef2f2', '#fecaca')}>🗑️ Xóa</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{editing ? `Sửa: ${editing.name}` : 'Thêm dịch vụ mới'}</h2>
              <button onClick={closeForm} style={s.closeBtn}>✕</button>
            </div>

            <div style={s.grid}>
              <div style={s.group}>
                <label style={s.label}>Tên dịch vụ <span style={s.required}>*</span></label>
                <input style={s.input} placeholder="VD: Nước suối" value={form.name} onChange={set('name')} />
              </div>

              <div style={s.group}>
                <label style={s.label}>Danh mục <span style={s.required}>*</span></label>
                <select style={s.input} value={form.category} onChange={set('category')}>
                  <option value="DRINK">🥤 Đồ uống</option>
                  <option value="EQUIPMENT">⚽ Dụng cụ thi đấu</option>
                  <option value="FACILITY">🏟️ Tiện ích sân</option>
                </select>
              </div>

              <div style={s.group}>
                <label style={s.label}>Giá (₫) <span style={s.required}>*</span></label>
                <input type="number" min="0" style={s.input} placeholder="VD: 15000" value={form.price} onChange={set('price')} />
              </div>

              <div style={s.group}>
                <label style={s.label}>Trạng thái</label>
                <select style={s.input} value={form.isActive ? 'true' : 'false'}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))}>
                  <option value="true">Hoạt động</option>
                  <option value="false">Tắt</option>
                </select>
              </div>

              <div style={{ ...s.group, gridColumn: '1 / -1' }}>
                <label style={s.label}>Hình ảnh</label>
                <div style={s.imagePicker}>
                  <label style={s.pickLabel}>
                    📁 {pickedFile ? 'Đổi ảnh' : 'Chọn ảnh'}
                    <input
                      key={inputKey}
                      type="file"
                      accept=".jpg,.jpeg,.png,.gif,.webp"
                      style={{ position: 'absolute', opacity: 0, width: 1, height: 1, overflow: 'hidden' }}
                      onChange={onFilePick}
                    />
                  </label>
                  {pickedFile && (
                    <span style={s.fileName}>{pickedFile.name}</span>
                  )}
                  {previewUrl ? (
                    <img src={previewUrl} alt="preview" style={s.previewImg}
                      onError={e => { e.target.style.display = 'none' }} />
                  ) : (
                    <span style={s.noImg}>Chưa chọn ảnh</span>
                  )}
                </div>
              </div>

              <div style={{ ...s.group, gridColumn: '1 / -1' }}>
                <label style={s.label}>Mô tả</label>
                <textarea style={{ ...s.input, minHeight: 72, resize: 'vertical' }}
                  placeholder="Mô tả ngắn..." value={form.description} onChange={set('description')} />
              </div>
            </div>

            {formMsg && <p style={s.errorText}>{formMsg}</p>}

            <div style={s.modalActions}>
              <button onClick={closeForm} style={s.cancelBtn} disabled={saving}>Hủy</button>
              <button onClick={save} style={{ ...s.primaryBtn, opacity: saving ? 0.65 : 1 }} disabled={saving}>
                {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm dịch vụ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' },
  notice:      { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontWeight: 600 },
  empty:       { textAlign: 'center', color: '#6b7280', padding: 32 },
  tableWrap:   { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:          { padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 13 },
  td:          { padding: '10px 14px', verticalAlign: 'middle' },
  thumb:       { width: 60, height: 45, objectFit: 'cover', borderRadius: 4, display: 'block' },
  badge:       { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actions:     { display: 'flex', gap: 6 },
  btn:         (color, bg, border) => ({ background: bg, color, border: `1px solid ${border}`, borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }),
  primaryBtn:  { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  cancelBtn:   { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 7, padding: '9px 16px', cursor: 'pointer', fontWeight: 600 },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal:       { background: '#fff', borderRadius: 10, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(15,23,42,0.35)', padding: 22 },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
  modalTitle:  { margin: 0, fontSize: 18, color: '#111827' },
  closeBtn:    { width: 34, height: 34, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 16 },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 16px' },
  group:       { display: 'flex', flexDirection: 'column', gap: 5 },
  label:       { fontSize: 13, fontWeight: 700, color: '#374151' },
  input:       { border: '1px solid #d1d5db', borderRadius: 6, padding: '9px 10px', fontSize: 14, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  required:    { color: '#dc2626' },
  errorText:   { margin: '12px 0 0', color: '#991b1b', fontWeight: 600 },
  modalActions:{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  imagePicker: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  pickLabel:   { position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, userSelect: 'none' },
  fileName:    { fontSize: 12, color: '#374151', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  previewImg:  { height: 64, width: 86, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' },
  noImg:       { fontSize: 13, color: '#9ca3af' },
}
