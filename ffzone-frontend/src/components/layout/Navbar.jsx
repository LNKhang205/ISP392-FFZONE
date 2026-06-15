import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './Navbar.module.css'

// Map role → dashboard URL
const ROLE_HOME = {
  IT_ADMIN: '/admin',
  STAFF:    '/staff',
  OWNER:    '/owner',
  USER:     '/',
}

export default function Navbar() {
  const { user, logout, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  // Label hiển thị cho từng role
  const roleLabel = {
    IT_ADMIN: 'IT Admin',
    STAFF:    'Nhân viên',
    OWNER:    'Chủ sân',
    USER:     '',
  }[user?.role] || ''

  return (
    <nav className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>⚽</span>
          <span>FF<strong>Zone</strong></span>
        </Link>

        <div className={styles.links}>
          <Link to="/" className={styles.link}>Trang chủ</Link>
          <Link to="/fields" className={styles.link}>Sân bóng</Link>
          <Link to="/booking" className={styles.link}>Đặt sân</Link>
        </div>

        <div className={styles.actions}>
          {isLoggedIn ? (
            <>
              {user?.role === 'USER' && (
                <Link to="/my-bookings" className={styles.link}>Lịch đặt</Link>
              )}
              {user?.role !== 'USER' && (
                <Link to={ROLE_HOME[user?.role] || '/'} className={styles.link}>
                  Dashboard
                </Link>
              )}
              <div className={styles.userMenu}>
                {roleLabel && (
                  <span className={styles.roleBadge}>{roleLabel}</span>
                )}
                <span className={styles.userName}>{user?.fullName}</span>
                <button onClick={handleLogout} className="btn btn-outline btn-sm">
                  Đăng xuất
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn btn-outline btn-sm">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
