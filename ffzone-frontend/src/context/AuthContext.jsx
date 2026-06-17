import { createContext, useContext, useState, useCallback } from 'react'
import api from '../services/api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })

  // Email/password login — unchanged
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  // Called by OAuth2CallbackPage after Google login succeeds
  const loginWithToken = useCallback((token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  // Refresh cached user after profile/avatar updates so Navbar etc. stay in sync
  const updateUser = useCallback((userData) => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  return (
    <Ctx.Provider value={{ user, login, loginWithToken, register, logout, updateUser, isLoggedIn: !!user }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
