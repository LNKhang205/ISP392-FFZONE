import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import styles from '../user/ProfilePage.module.css'

export default function ChangePasswordPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  // Google accounts must not access this page (spec: hide + block route)
  if (!user) return null
  if (user.provider === 'GOOGLE') return <Navigate to="/profile" replace />

  const validate = () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      return 'Vui lòng nhập đầy đủ thông tin'
    }
    if (form.newPassword.length < 6) {
      return 'Mật khẩu mới phải có ít nhất 6 ký tự'
    }
    if (form.newPassword === form.currentPassword) {
      return 'Mật khẩu mới phải khác mật khẩu hiện tại'
    }
    if (form.newPassword !== form.confirmPassword) {
      return 'Xác nhận mật khẩu không khớp'
    }
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setMsg({ type: 'error', text: '❌ ' + err }); return }

    setSaving(true); setMsg(null)
    try {
      await api.put('/accounts/me/password', form)
      setMsg({ type: 'success', text: '✅ Đổi mật khẩu thành công' })
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (e2) {
      setMsg({ type: 'error', text: '❌ ' + (e2.response?.data?.message || 'Đổi mật khẩu thất bại') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Change Password</h1>

        <form className={styles.card} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {msg && (
            <p className={msg.type === 'success' ? styles.msgSuccess : styles.msgError}>{msg.text}</p>
          )}

          <label className={styles.field}>
            <span>Mật khẩu hiện tại</span>
            <input
              type="password"
              className={styles.input}
              value={form.currentPassword}
              onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              autoComplete="current-password"
            />
          </label>

          <label className={styles.field}>
            <span>Mật khẩu mới</span>
            <input
              type="password"
              className={styles.input}
              value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              autoComplete="new-password"
            />
          </label>

          <label className={styles.field}>
            <span>Xác nhận mật khẩu mới</span>
            <input
              type="password"
              className={styles.input}
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              autoComplete="new-password"
            />
          </label>

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate('/profile')} disabled={saving}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
