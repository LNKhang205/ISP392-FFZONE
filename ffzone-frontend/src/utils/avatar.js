// Resolve avatarUrl (relative "uploads/..." path, absolute Google photo URL,
// or null) into a usable <img src>. Mirrors the same convention used for
// field images in FieldDetailPage / FieldListPage.

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080'

export function resolveAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http')) return avatarUrl
  return `${API_BASE}/${avatarUrl}`
}

// Initials fallback (e.g. "Nguyen Van A" -> "NA") for when there's no
// uploaded avatar and no Google profile picture.
export function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
