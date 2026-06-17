import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

/**
 * Landing page after Google OAuth2 redirect.
 * URL format: /oauth2/callback?token=<jwt>
 * 
 * We have the raw JWT but need the user profile — fetch /auth/me to get it.
 */
export default function OAuth2CallbackPage() {
  const [searchParams] = useSearchParams()
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      navigate('/login?error=' + encodeURIComponent(error), { replace: true })
      return
    }

    if (!token) {
      navigate('/login', { replace: true })
      return
    }

    // Temporarily store token so the api interceptor can attach it
    localStorage.setItem('token', token)

    // Fetch user profile
    api.get('/auth/me')
      .then(({ data }) => {
        loginWithToken(token, data)
        const role = data.role
        if (role === 'IT_ADMIN') navigate('/admin', { replace: true })
        else if (role === 'STAFF')    navigate('/staff', { replace: true })
        else if (role === 'OWNER')    navigate('/owner', { replace: true })
        else                          navigate('/',       { replace: true })
      })
      .catch(() => {
        localStorage.removeItem('token')
        navigate('/login?error=Đăng nhập Google thất bại', { replace: true })
      })
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 16, fontFamily: 'sans-serif'
    }}>
      <div style={{
        width: 40, height: 40, border: '4px solid #e5e7eb',
        borderTopColor: '#16a34a', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ color: '#6b7280', fontSize: 15 }}>Đang xử lý đăng nhập Google…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
