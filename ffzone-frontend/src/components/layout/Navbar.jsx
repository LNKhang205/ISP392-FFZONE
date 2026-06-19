import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import UserMenu from '../common/UserMenu'
import { isCustomer } from '../../utils/roles'
import styles from './Navbar.module.css'

export default function Navbar() {
  const { user, isLoggedIn } = useAuth()
  const { itemCount } = useCart() ?? {}

  return (
    <nav className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>⚽</span>
          <span>FF<strong>Zone</strong></span>
        </Link>

        <div className={styles.links}>
          <Link to="/"        className={styles.link}>Trang chủ</Link>
          <Link to="/fields"  className={styles.link}>Sân bóng</Link>
          <Link to="/booking" className={styles.link}>Đặt sân</Link>
          <Link to="/services" className={styles.link}>Dịch vụ</Link>
        </div>

        <div className={styles.actions}>
          {isLoggedIn ? (
            <>
              {isCustomer(user?.role) && (
                <Link to="/my-bookings" className={styles.link}>Lịch đặt</Link>
              )}
              {isCustomer(user?.role) && (
                <Link to="/cart" className={styles.cartIcon}>
                  🛒
                  {itemCount > 0 && (
                    <span className={styles.cartCount}>{itemCount}</span>
                  )}
                </Link>
              )}
              <UserMenu />
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
