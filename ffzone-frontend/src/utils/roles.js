// Centralized role helpers — keeps role-based UI logic consistent
// across Navbar, dashboards, and customer-only action gating.

export const ROLES = {
  USER: 'USER', // CUSTOMER trong tài liệu yêu cầu — entity hiện tại dùng USER
  STAFF: 'STAFF',
  OWNER: 'OWNER',
  IT_ADMIN: 'IT_ADMIN',
}

export const ADMIN_ROLES = [ROLES.STAFF, ROLES.OWNER, ROLES.IT_ADMIN]

export const isCustomer = (role) => role === ROLES.USER
export const isAdminRole = (role) => ADMIN_ROLES.includes(role)

export const ROLE_HOME = {
  [ROLES.IT_ADMIN]: '/admin',
  [ROLES.STAFF]: '/staff',
  [ROLES.OWNER]: '/owner',
  [ROLES.USER]: '/',
}

export const ROLE_LABEL = {
  [ROLES.IT_ADMIN]: 'IT Admin',
  [ROLES.STAFF]: 'Nhân viên',
  [ROLES.OWNER]: 'Chủ sân',
  [ROLES.USER]: '',
}

export const CUSTOMER_ONLY_MESSAGE = 'This feature is only available for customer accounts.'
