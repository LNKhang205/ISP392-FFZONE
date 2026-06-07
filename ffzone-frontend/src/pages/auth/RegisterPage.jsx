import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './AuthPage.module.css'

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', password:'', confirm:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Mật khẩu xác nhận không khớp'); return }
    setError(''); setLoading(true)
    try {
      await register({ fullName: form.fullName, email: form.email, phone: form.phone, password: form.password })
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại')
    } finally { setLoading(false) }
  }

  const set = k => e => setForm(f => ({...f, [k]: e.target.value}))

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link to="/" className={styles.logo}>⚽ FF<strong>Zone</strong></Link>
          <h1>Đăng ký tài khoản</h1>
          <p>Tham gia cộng đồng FFZone</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Họ và tên</label>
            <input type="text" placeholder="Nguyễn Văn A" value={form.fullName} onChange={set('fullName')} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="email@example.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-group">
            <label>Số điện thoại</label>
            <input type="tel" placeholder="0901234567" value={form.phone} onChange={set('phone')} required />
          </div>
          <div className="form-group">
            <label>Mật khẩu</label>
            <input type="password" placeholder="Tối thiểu 6 ký tự" value={form.password} onChange={set('password')} required minLength={6} />
          </div>
          <div className="form-group">
            <label>Xác nhận mật khẩu</label>
            <input type="password" placeholder="Nhập lại mật khẩu" value={form.confirm} onChange={set('confirm')} required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:8}} disabled={loading}>
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>
        </form>
        <p className={styles.footer}>
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
