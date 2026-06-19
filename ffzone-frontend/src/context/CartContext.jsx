import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart as clearCartApi } from '../api/serviceApi'
import { isCustomer } from '../utils/roles'

const CartCtx = createContext(null)

export function CartProvider({ children }) {
  const { user, isLoggedIn } = useAuth()
  const [cart, setCart] = useState(null)   // { id, items: [], total }
  const [loading, setLoading] = useState(false)

  const fetchCart = useCallback(async () => {
    if (!isLoggedIn || !isCustomer(user?.role)) { setCart(null); return }
    setLoading(true)
    try { setCart(await getCart()) } catch { setCart(null) } finally { setLoading(false) }
  }, [isLoggedIn, user?.role])

  useEffect(() => { fetchCart() }, [fetchCart])

  const add = async (serviceId, quantity = 1) => {
    const updated = await addToCart(serviceId, quantity)
    setCart(updated); return updated
  }

  const update = async (itemId, quantity) => {
    const updated = await updateCartItem(itemId, quantity)
    setCart(updated); return updated
  }

  const remove = async (itemId) => {
    const updated = await removeCartItem(itemId)
    setCart(updated); return updated
  }

  const clear = async () => {
    await clearCartApi(); setCart(c => c ? { ...c, items: [], total: 0 } : null)
  }

  const itemCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0

  return (
    <CartCtx.Provider value={{ cart, loading, fetchCart, add, update, remove, clear, itemCount }}>
      {children}
    </CartCtx.Provider>
  )
}

export const useCart = () => useContext(CartCtx)
