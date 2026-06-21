import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { resolveAvatarUrl, getInitials } from '../../utils/avatar'
import { ROLES, ROLE_LABEL, ROLE_HOME, isCustomer } from '../../utils/roles'
import styles from './UserMenu.module.css'

/**
 * Avatar + dropdown menu replacing the old "User Name + Logout" navbar block.
 * Behavior modeled after GitHub/Shopee: click avatar -> dropdown opens below it.
 *
 * Menu content depends on role:
 *  - CUSTOMER (USER): My Profile, Change Password (LOCAL only), Logout
 *  - STAFF / ITADMIN / OWNER: <Role> Dashboard, Logout (no profile/password)
 */
export default function UserMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  if (!user) return null

  const avatarSrc = resolveAvatarUrl(user.avatarUrl)
  const initials = getInitials(user.fullName)
  const customer = isCustomer(user.role)
  const isLocal = user.provider === 'LOCAL'

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/')
  }

  return (
    <div className={styles.wrap} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt={user.fullName} className={styles.avatarImg} />
        ) : (
          <span className={styles.avatarFallback}>{initials}</span>
        )}
        <span className={styles.chevron}>▼</span>
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <div className={styles.dropdownName}>{user.fullName}</div>
            {!customer && (
              <div className={styles.dropdownRole}>{ROLE_LABEL[user.role]}</div>
            )}
          </div>

          <div className={styles.divider} />

          {customer ? (
            <>
              <Link to="/profile" className={styles.item} onClick={() => setOpen(false)}>
                👤 My Profile
              </Link>
              <Link to="/profile/bookings" className={styles.item} onClick={() => setOpen(false)}>
                📋 Đơn đặt sân của tôi
              </Link>
              {isLocal && (
                <Link to="/profile/change-password" className={styles.item} onClick={() => setOpen(false)}>
                  🔒 Change Password
                </Link>
              )}
            </>
          ) : (
            <Link to={ROLE_HOME[user.role] || '/'} className={styles.item} onClick={() => setOpen(false)}>
              📊 {ROLE_LABEL[user.role]} Dashboard
            </Link>
          )}

          <div className={styles.divider} />

          <button className={styles.itemDanger} onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  )
}
