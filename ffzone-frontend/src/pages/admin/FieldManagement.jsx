import { useState, useEffect } from 'react'
import { getAllFields, createField, updateField, deleteField, getImagesByField } from '../../api/fieldApi'
import ImageManager from '../../components/admin/ImageManager'

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'http://localhost:8080'

const EMPTY_FORM = { code: '', name: '', type: '5V5', description: '', status: 'ACTIVE' }
const STATUS_LABEL = { ACTIVE: 'Hoạt động', INACTIVE: 'Ngừng', MAINTENANCE: 'Bảo trì' }
const STATUS_COLOR = {
  ACTIVE: { background: '#dcfce7', color: '#166534' },
  INACTIVE: { background: '#fee2e2', color: '#991b1b' },
  MAINTENANCE: { background: '#fef9c3', color: '#854d0e' },
}
const TYPE_LABEL = { '5V5': 'Sân 5', '7V7': 'Sân 7', '9V9': 'Sân 9' }

function getApiError(e, fallback = 'Thao tác thất bại') {
  const status = e.response?.status
  const data = e.response?.data
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập bằng tài khoản IT Admin.'
  if (typeof data === 'string' && data.trim()) return data
  return data?.message || data?.error || fallback
}

function FieldManagement() {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageMsg, setPageMsg] = useState('')
  const [formMsg, setFormMsg] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageTarget, setImageTarget] = useState(null)
  const [thumbnails, setThumbnails] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await getAllFields()
      setFields(data)
      const entries = await Promise.all(
        data.map(f =>
          getImagesByField(f.id)
            .then(imgs => [f.id, imgs.find(i => i.isThumbnail)?.imageUrl ?? null])
            .catch(() => [f.id, null])
        )
      )
      setThumbnails(Object.fromEntries(entries))
    } catch (e) {
      setPageMsg(getApiError(e, 'Không tải được danh sách sân'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormMsg('')
    setFormOpen(true)
  }

  const openEdit = (field) => {
    setEditing(field)
    setForm({
      code: field.code,
      name: field.name,
      type: field.type === '11V11' ? '9V9' : field.type,
      description: field.description ?? '',
      status: field.status,
    })
    setFormMsg('')
    setFormOpen(true)
  }

  const closeForm = () => {
    if (saving) return
    setFormOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormMsg('')
  }

  const save = async () => {
    setFormMsg('')
    if (!form.code.trim()) { setFormMsg('Vui lòng nhập mã sân'); return }
    if (!form.name.trim()) { setFormMsg('Vui lòng nhập tên sân'); return }

    setSaving(true)
    try {
      if (editing) {
        await updateField(editing.id, {
          name: form.name.trim(),
          type: form.type,
          description: form.description,
          status: form.status,
        })
        setPageMsg('Đã cập nhật sân')
      } else {
        const code = form.code.trim().toUpperCase()
        await createField({
          code,
          name: form.name.trim(),
          type: form.type,
          description: form.description,
          status: form.status,
        })
        setPageMsg('Đã thêm sân: ' + code)
      }
      closeForm()
      await load()
    } catch (e) {
      setFormMsg(getApiError(e, editing ? 'Không cập nhật được sân' : 'Không thêm được sân'))
    } finally {
      setSaving(false)
    }
  }

  const del = async (field) => {
    if (!window.confirm(`Xóa sân "${field.name}"?\nToàn bộ ảnh của sân cũng sẽ bị xóa!`)) return
    try {
      await deleteField(field.id)
      setPageMsg('Đã xóa sân')
      load()
    } catch (e) {
      alert('Không thể xóa: ' + getApiError(e, 'Không xóa được sân'))
    }
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div style={{ padding: '0 4px' }}>
      <div style={s.pageHeader}>
        <h1 style={{ margin: 0 }}>Quản lý sân bóng</h1>
        <button onClick={openCreate} style={s.primaryBtn}>Thêm sân</button>
      </div>

      {pageMsg && (
        <div style={{ ...s.notice, color: '#166534' }}>
          {pageMsg}
        </div>
      )}

      {loading
        ? <p style={s.empty}>Đang tải...</p>
        : fields.length === 0
          ? <p style={s.empty}>Chưa có sân nào.</p>
          : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    {['Ảnh', 'Mã sân', 'Tên sân', 'Loại', 'Trạng thái', 'Thao tác'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map(f => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ ...s.td, width: 70 }}>
                        <img
                          src={thumbnails[f.id] ? `${BASE_URL}/${thumbnails[f.id]}` : 'https://placehold.co/60x45?text=No'}
                          alt="thumb"
                          style={s.thumb}
                          onError={e => { e.target.src = 'https://placehold.co/60x45?text=No' }}
                        />
                      </td>
                      <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 700 }}>{f.code}</td>
                      <td style={s.td}>{f.name}</td>
                      <td style={s.td}>{TYPE_LABEL[f.type] || f.type}</td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, ...STATUS_COLOR[f.status] }}>
                          {STATUS_LABEL[f.status] || f.status}
                        </span>
                      </td>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                        <div style={s.actions}>
                          <button onClick={() => setImageTarget(f)} style={s.btn('#1d4ed8', '#eff6ff', '#bfdbfe')}>Ảnh</button>
                          <button onClick={() => openEdit(f)} style={s.btn('#166534', '#f0fdf4', '#bbf7d0')}>Sửa</button>
                          <button onClick={() => del(f)} style={s.btn('#991b1b', '#fef2f2', '#fecaca')}>Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }

      {formOpen && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{editing ? `Sửa sân: ${editing.code}` : 'Thêm sân mới'}</h2>
              <button onClick={closeForm} style={s.closeBtn}>✕</button>
            </div>

            <div style={s.grid}>
              <div style={s.group}>
                <label style={s.label}>Mã sân <span style={s.required}>*</span></label>
                <input style={s.input} placeholder="VD: SAN-A1" value={form.code} disabled={!!editing} onChange={set('code')} />
                {editing && <small style={s.hint}>Mã sân không thể thay đổi</small>}
              </div>

              <div style={s.group}>
                <label style={s.label}>Tên sân <span style={s.required}>*</span></label>
                <input style={s.input} placeholder="VD: Sân A1 - Trong nhà" value={form.name} onChange={set('name')} />
              </div>

              <div style={s.group}>
                <label style={s.label}>Loại sân</label>
                <select style={s.input} value={form.type} onChange={set('type')}>
                  <option value="5V5">Sân 5 (5v5)</option>
                  <option value="7V7">Sân 7 (7v7)</option>
                  <option value="9V9">Sân 9 (9v9)</option>
                </select>
              </div>

              <div style={s.group}>
                <label style={s.label}>Trạng thái</label>
                <select style={s.input} value={form.status} onChange={set('status')}>
                  <option value="ACTIVE">Hoạt động</option>
                  <option value="INACTIVE">Ngừng hoạt động</option>
                  <option value="MAINTENANCE">Đang bảo trì</option>
                </select>
              </div>

              <div style={{ ...s.group, gridColumn: '1 / -1' }}>
                <label style={s.label}>Mô tả</label>
                <textarea style={{ ...s.input, minHeight: 88, resize: 'vertical' }} placeholder="Trang thiết bị, vị trí..." value={form.description} onChange={set('description')} />
              </div>
            </div>

            {formMsg && <p style={s.errorText}>{formMsg}</p>}

            <div style={s.modalActions}>
              <button onClick={closeForm} style={s.cancelBtn} disabled={saving}>Hủy</button>
              <button onClick={save} style={{ ...s.primaryBtn, opacity: saving ? 0.65 : 1 }} disabled={saving}>
                {saving ? 'Đang lưu...' : editing ? 'Lưu thay đổi' : 'Thêm sân'}
              </button>
            </div>
          </div>
        </div>
      )}

      {imageTarget && (
        <ImageManager
          field={imageTarget}
          onClose={() => { setImageTarget(null); load() }}
        />
      )}
    </div>
  )
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' },
  notice: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontWeight: 600 },
  empty: { textAlign: 'center', color: '#6b7280', padding: 32 },
  tableWrap: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 13 },
  td: { padding: '10px 14px', verticalAlign: 'middle' },
  thumb: { width: 60, height: 45, objectFit: 'cover', borderRadius: 4, display: 'block' },
  badge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actions: { display: 'flex', gap: 6 },
  btn: (color, bg, border) => ({ background: bg, color, border: `1px solid ${border}`, borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }),
  primaryBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 14 },
  cancelBtn: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 7, padding: '9px 16px', cursor: 'pointer', fontWeight: 600 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { background: '#fff', borderRadius: 10, width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(15,23,42,0.35)', padding: 22 },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18 },
  modalTitle: { margin: 0, fontSize: 18, color: '#111827' },
  closeBtn: { width: 34, height: 34, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 16px' },
  group: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 13, fontWeight: 700, color: '#374151' },
  input: { border: '1px solid #d1d5db', borderRadius: 6, padding: '9px 10px', fontSize: 14, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  required: { color: '#dc2626' },
  hint: { color: '#6b7280' },
  errorText: { margin: '12px 0 0', color: '#991b1b', fontWeight: 600 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
}

export default FieldManagement
