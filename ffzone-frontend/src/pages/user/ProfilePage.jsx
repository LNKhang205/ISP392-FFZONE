import { useState, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { resolveAvatarUrl, getInitials } from '../../utils/avatar'
import styles from './ProfilePage.module.css'

const GENDER_LABEL = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' }

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const fileInputRef = useRef(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    dateOfBirth: user?.dateOfBirth || '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'success'|'error', text }

  if (!user) return null

  const isGoogle = user.provider === 'GOOGLE'
  const avatarSrc = resolveAvatarUrl(user.avatarUrl)

  const startEdit = () => {
    setForm({
      fullName: user.fullName || '',
      phone: user.phone || '',
      gender: user.gender || '',
      dateOfBirth: user.dateOfBirth || '',
    })
    setMsg(null)
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true); setMsg(null)
    try {
      const { data } = await api.put('/accounts/me/profile', {
        fullName: form.fullName,
        phone: form.phone,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
      })
      updateUser(data)
      setEditing(false)
      setMsg({ type: 'success', text: '✅ Đã cập nhật hồ sơ' })
    } catch (e) {
      setMsg({ type: 'error', text: '❌ ' + (e.response?.data?.message || 'Cập nhật thất bại') })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarPick = () => fileInputRef.current?.click()

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setMsg(null)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const { data } = await api.post('/accounts/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      updateUser(data)
      setMsg({ type: 'success', text: '✅ Đã cập nhật ảnh đại diện' })
    } catch (err) {
      setMsg({ type: 'error', text: '❌ ' + (err.response?.data?.message || 'Tải ảnh thất bại') })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>My Profile</h1>

        <div className={styles.card}>
          {/* Avatar */}
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrap}>
              {avatarSrc ? (
                <img src={avatarSrc} alt={user.fullName} className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarFallback}>{getInitials(user.fullName)}</div>
              )}
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleAvatarPick}
              disabled={uploading}
            >
              {uploading ? 'Đang tải...' : '📷 Đổi ảnh đại diện'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
              hidden
              onChange={handleAvatarChange}
            />
          </div>

          {msg && (
            <p className={msg.type === 'success' ? styles.msgSuccess : styles.msgError}>
              {msg.text}
            </p>
          )}

          {/* Fields */}
          {!editing ? (
            <div className={styles.infoGrid}>
              <Row label="Họ và tên" value={user.fullName} />
              <Row label="Email" value={user.email} />
              <Row label="Số điện thoại" value={user.phone || '—'} />
              <Row label="Giới tính" value={GENDER_LABEL[user.gender] || '—'} />
              <Row label="Ngày sinh" value={user.dateOfBirth || '—'} />
              <Row label="Đăng nhập qua" value={isGoogle ? 'Google' : 'Local (Email/Mật khẩu)'} />

              <button className="btn btn-primary" onClick={startEdit} style={{ marginTop: 16 }}>
                ✏️ Chỉnh sửa hồ sơ
              </button>
            </div>
          ) : (
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Họ và tên</span>
                <input
                  className={styles.input}
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                />
              </label>

              <label className={styles.field}>
                <span>Email</span>
                <input className={styles.input} value={user.email} disabled />
                {isGoogle && <small className={styles.hint}>Email không thể thay đổi (đăng nhập qua Google)</small>}
              </label>

              <label className={styles.field}>
                <span>Số điện thoại</span>
                <input
                  className={styles.input}
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </label>

              <label className={styles.field}>
                <span>Giới tính</span>
                <select
                  className={styles.input}
                  value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                >
                  <option value="">-- Chọn --</option>
                  <option value="MALE">Nam</option>
                  <option value="FEMALE">Nữ</option>
                  <option value="OTHER">Khác</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Ngày sinh</span>
                <input
                  type="date"
                  className={styles.input}
                  value={form.dateOfBirth || ''}
                  onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </label>

              <div className={styles.formActions}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button className="btn btn-outline" onClick={() => setEditing(false)} disabled={saving}>
                  Hủy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{value}</span>
    </div>
  )
}
