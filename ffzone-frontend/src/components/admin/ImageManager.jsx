import { useState, useEffect, useRef } from 'react'
import { getImagesByField, uploadImage, setThumbnail, deleteImage } from '../../api/fieldApi'

const BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
  : 'http://localhost:8080'

function getApiError(e, fallback = 'Thao tác thất bại') {
  const status = e.response?.status
  const data = e.response?.data
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập bằng tài khoản IT Admin.'
  if (typeof data === 'string' && data.trim()) return data
  return data?.message || data?.error || fallback
}

function ImageManager({ field, onClose }) {
  const [images, setImages] = useState([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isThumbnail, setIsThumbnail] = useState(false)
  const [msg, setMsg] = useState('')
  const [uploadMsg, setUploadMsg] = useState('')
  const fileRef = useRef(null)

  const load = () =>
    getImagesByField(field.id)
      .then(setImages)
      .catch(e => setMsg('❌ ' + getApiError(e, 'Không tải được ảnh')))

  useEffect(() => { load() }, [field.id])

  const openUpload = () => {
    setUploadMsg('')
    setIsThumbnail(images.length === 0)
    setUploadOpen(true)
  }

  const closeUpload = () => {
    if (uploading) return
    setUploadOpen(false)
    setUploadMsg('')
    setIsThumbnail(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleUpload = async () => {
    const file = fileRef.current?.files[0]
    if (!file) { setUploadMsg('❌ Vui lòng chọn file ảnh'); return }
    setUploading(true)
    setUploadMsg('')
    try {
      await uploadImage(field.id, file, isThumbnail)
      setMsg('✅ Upload thành công')
      closeUpload()
      load()
    } catch (e) {
      setUploadMsg('❌ ' + getApiError(e, 'Upload thất bại'))
    } finally {
      setUploading(false)
    }
  }

  const handleSetThumbnail = async (imgId) => {
    try {
      await setThumbnail(imgId)
      setMsg('✅ Đã cập nhật thumbnail')
      load()
    } catch (e) {
      setMsg('❌ ' + getApiError(e, 'Không đặt được thumbnail'))
    }
  }

  const handleDelete = async (img) => {
    if (!window.confirm('Xóa ảnh này? File vật lý cũng sẽ bị xóa.')) return
    try {
      await deleteImage(img.id)
      setMsg('✅ Đã xóa ảnh')
      load()
    } catch (e) {
      setMsg('❌ ' + getApiError(e, 'Không xóa được ảnh'))
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.panel}>
        <div style={s.header}>
          <h3 style={{ margin: 0 }}>🖼️ Ảnh sân: <strong>{field.name}</strong></h3>
          <div style={s.headerActions}>
            <button onClick={openUpload} style={s.uploadBtn}>⬆️ Thêm ảnh</button>
            <button onClick={onClose} style={s.closeBtn}>✕</button>
          </div>
        </div>

        {msg && <p style={{ ...s.msgText, color: msg.startsWith('✅') ? '#166534' : '#991b1b' }}>{msg}</p>}

        {images.length === 0
          ? <p style={s.empty}>Chưa có ảnh nào.</p>
          : (
            <div style={s.grid}>
              {images.map(img => (
                <div key={img.id} style={s.card(img.isThumbnail)}>
                  <div style={{ position: 'relative' }}>
                    <img
                      src={`${BASE_URL}/${img.imageUrl}`}
                      alt="field"
                      style={s.img}
                      onError={e => { e.target.src = 'https://placehold.co/200x130?text=No+Image' }}
                    />
                    {img.isThumbnail && <span style={s.badge}>⭐ Thumbnail</span>}
                  </div>
                  <div style={s.cardActions}>
                    {!img.isThumbnail && (
                      <button onClick={() => handleSetThumbnail(img.id)} style={s.actionBtn('#b45309', '#fffbeb')}>
                        Thumbnail
                      </button>
                    )}
                    <button onClick={() => handleDelete(img)} style={s.actionBtn('#dc2626', '#fef2f2')}>
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {uploadOpen && (
        <div style={s.nestedOverlay}>
          <div style={s.uploadPanel}>
            <div style={s.header}>
              <h3 style={{ margin: 0 }}>Thêm ảnh sân</h3>
              <button onClick={closeUpload} style={s.closeBtn}>✕</button>
            </div>

            <div style={s.uploadForm}>
              <label style={s.label}>File ảnh</label>
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" style={s.fileInput} />

              <label style={s.checkboxLabel}>
                <input type="checkbox" checked={isThumbnail} onChange={e => setIsThumbnail(e.target.checked)} />
                Đặt làm thumbnail
              </label>

              {uploadMsg && <p style={s.errorText}>{uploadMsg}</p>}

              <div style={s.modalActions}>
                <button onClick={closeUpload} disabled={uploading} style={s.cancelBtn}>Hủy</button>
                <button onClick={handleUpload} disabled={uploading} style={{ ...s.uploadBtn, opacity: uploading ? 0.65 : 1 }}>
                  {uploading ? 'Đang upload...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  panel: { background: '#fff', borderRadius: 10, padding: 24, width: '100%', maxWidth: 780, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 70px rgba(15,23,42,0.35)' },
  nestedOverlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  uploadPanel: { background: '#fff', borderRadius: 10, padding: 22, width: '100%', maxWidth: 480, boxShadow: '0 24px 70px rgba(15,23,42,0.35)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerActions: { display: 'flex', alignItems: 'center', gap: 8 },
  closeBtn: { width: 34, height: 34, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', fontSize: 16 },
  uploadBtn: { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 14px', cursor: 'pointer', fontWeight: 700 },
  cancelBtn: { background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 7, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 },
  msgText: { margin: '0 0 14px', fontWeight: 600 },
  errorText: { margin: 0, color: '#991b1b', fontWeight: 600 },
  empty: { textAlign: 'center', color: '#6b7280', padding: '32px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 },
  card: (thumb) => ({ border: thumb ? '2px solid #f59e0b' : '1px solid #e5e7eb', borderRadius: 8, padding: 8, background: thumb ? '#fffbeb' : '#fafafa' }),
  img: { width: '100%', height: 120, objectFit: 'cover', borderRadius: 4, display: 'block' },
  badge: { position: 'absolute', top: 4, left: 4, background: '#f59e0b', color: '#fff', fontSize: 11, borderRadius: 4, padding: '2px 6px', fontWeight: 700 },
  cardActions: { display: 'flex', gap: 6, marginTop: 8 },
  actionBtn: (color, bg) => ({ flex: 1, background: bg, color, border: `1px solid ${color}`, borderRadius: 5, padding: '5px 0', cursor: 'pointer', fontSize: 12, fontWeight: 700 }),
  uploadForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  label: { fontSize: 13, fontWeight: 700, color: '#374151' },
  fileInput: { border: '1px solid #d1d5db', borderRadius: 6, padding: 9, fontSize: 14 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
}

export default ImageManager
