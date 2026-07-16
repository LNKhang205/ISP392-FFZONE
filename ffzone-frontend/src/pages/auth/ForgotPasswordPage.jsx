import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import styles from './AuthPage.module.css'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  // step 1 = nhập email, step 2 = nhập OTP + mật khẩu mới
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError(''); setMessage(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setMessage(data.message || 'Mã OTP đã được gửi tới email của bạn')
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi mã OTP, vui lòng thử lại')
    } finally { setLoading(false) }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError(''); setMessage('')

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword })
      setMessage('Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn')
    } finally { setLoading(false) }
  }

  const handleResendOtp = async () => {
    setError(''); setMessage(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setMessage(data.message || 'Mã OTP mới đã được gửi tới email của bạn')
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi lại mã OTP')
    } finally { setLoading(false) }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Link to="/" className={styles.logo}>⚽ FF<strong>Zone</strong></Link>
          <h1>{step === 1 ? 'Quên mật khẩu' : 'Nhập mã OTP'}</h1>
          <p>
            {step === 1
              ? 'Nhập email của bạn để nhận mã OTP khôi phục mật khẩu'
              : `Mã OTP đã được gửi tới ${email}`}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSendOtp}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="email@example.com" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
            {error && <p className="error-msg">{error}</p>}
            {message && <p style={{ color: 'var(--green)', fontSize: 14, marginTop: 4 }}>{message}</p>}
            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>Mã OTP</label>
              <input type="text" placeholder="Nhập mã 6 số" value={otp} maxLength={6}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required />
            </div>
            <div className="form-group">
              <label>Mật khẩu mới</label>
              <input type="password" placeholder="••••••••" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Xác nhận mật khẩu mới</label>
              <input type="password" placeholder="••••••••" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            {error && <p className="error-msg">{error}</p>}
            {message && <p style={{ color: 'var(--green)', fontSize: 14, marginTop: 4 }}>{message}</p>}
            <button type="submit" className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
            <button type="button" onClick={handleResendOtp} disabled={loading}
              style={{
                width: '100%', textAlign: 'center', marginTop: 12, background: 'none',
                border: 'none', color: 'var(--green)', fontSize: 14, fontWeight: 600, cursor: 'pointer'
              }}>
              Gửi lại mã OTP
            </button>
          </form>
        )}

        <p className={styles.footer}>
          Nhớ mật khẩu rồi? <Link to="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  )
}
