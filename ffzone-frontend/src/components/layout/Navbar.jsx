import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, logout, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/') }

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
        </div>
        <div className={styles.actions}>
          {isLoggedIn ? (
            <>
              <Link to="/my-bookings" className={styles.link}>Lịch đặt</Link>
              <div className={styles.userMenu}>
                <span className={styles.userName}>{user.fullName}</span>
                <button onClick={handleLogout} className="btn btn-outline btn-sm">Đăng xuất</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
