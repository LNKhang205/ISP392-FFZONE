import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { isCustomer, CUSTOMER_ONLY_MESSAGE } from '../utils/roles'

/**
 * Gate customer-only actions (book field, checkout, use voucher, buy service,
 * submit survey) for STAFF/OWNER/IT_ADMIN accounts browsing public pages.
 *
 * Guests (not logged in) are allowed through — they hit the normal login
 * redirect flow further down the line. Only logged-in non-customer roles
 * are blocked, per spec: "STAFF, ITADMIN and OWNER ... must NOT book fields,
 * checkout, use vouchers, purchase services, submit surveys."
 *
 * Usage:
 *   const guard = useCustomerOnly()
 *   <button onClick={guard(() => navigate('/booking'))}>Đặt sân ngay</button>
 */
export function useCustomerOnly() {
  const { user, isLoggedIn } = useAuth()

  const blocked = isLoggedIn && !isCustomer(user?.role)

  const guard = useCallback((action) => {
    return (...args) => {
      if (blocked) {
        alert(CUSTOMER_ONLY_MESSAGE)
        return
      }
      action?.(...args)
    }
  }, [blocked])

  return guard
}

export default useCustomerOnly
