import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { getActiveServices } from '../../api/serviceApi'
import { isCustomer } from '../../utils/roles'
import { CUSTOMER_ONLY_MESSAGE } from '../../utils/roles'
import styles from './ServicesPage.module.css'

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080'
const FALLBACK_IMG = 'https://placehold.co/320x200?text=Dịch+vụ'

const FILTERS = [
  { key: 'ALL',       label: 'Tất cả' },
  { key: 'DRINK',     label: '🥤 Đồ uống' },
  { key: 'EQUIPMENT', label: '⚽ Dụng cụ' },
  { key: 'FACILITY',  label: '🏟️ Tiện ích' },
]

function getImgSrc(url) {
  if (!url) return FALLBACK_IMG
  if (url.startsWith('http')) return url
  return `${API_BASE}/${url}`
}

export default function ServicesPage() {
  const { user, isLoggedIn } = useAuth()
  const { add, itemCount }   = useCart()

  const [services, setServices]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('ALL')
  const [addedMap, setAddedMap]   = useState({})  // { [serviceId]: 'adding'|'done' }

  useEffect(() => {
    getActiveServices()
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'ALL'
    ? services
    : services.filter(s => s.category === filter)

  const handleAdd = async (svc) => {
    if (isLoggedIn && !isCustomer(user?.role)) {
      alert(CUSTOMER_ONLY_MESSAGE); return
    }
    if (!isLoggedIn) {
      window.location.href = '/login'; return
    }
    if (addedMap[svc.id] === 'adding') return

    setAddedMap(m => ({ ...m, [svc.id]: 'adding' }))
    try {
      await add(svc.id, 1)
      setAddedMap(m => ({ ...m, [svc.id]: 'done' }))
      setTimeout(() => setAddedMap(m => ({ ...m, [svc.id]: null })), 1500)
    } catch {
      setAddedMap(m => ({ ...m, [svc.id]: null }))
      alert('Không thể thêm vào giỏ. Vui lòng thử lại.')
    }
  }

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.top}>
          <h1>Dịch vụ kèm theo</h1>
          <p>Nâng cao trải nghiệm thi đấu với các dịch vụ tiện ích của FFZone</p>
        </div>

        {/* Filter tabs */}
        <div className={styles.filters}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`${styles.filterBtn} ${filter === f.key ? styles.filterActive : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
          {isLoggedIn && isCustomer(user?.role) && itemCount > 0 && (
            <a href="/cart" className={styles.cartBadge}>
              🛒 Giỏ hàng ({itemCount})
            </a>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className={styles.grid}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <span>🛒</span>
            <p>Không có dịch vụ nào trong danh mục này</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(svc => {
              const state = addedMap[svc.id]
              return (
                <div key={svc.id} className={`card ${styles.card}`}>
                  <div className={styles.imgWrap}>
                    <img
                      src={getImgSrc(svc.imageUrl)}
                      alt={svc.name}
                      onError={e => { e.target.src = FALLBACK_IMG }}
                    />
                    <span className={`badge badge-green ${styles.catBadge}`}>
                      {svc.category === 'DRINK' ? '🥤 Đồ uống'
                        : svc.category === 'EQUIPMENT' ? '⚽ Dụng cụ'
                        : '🏟️ Tiện ích'}
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardName}>{svc.name}</h3>
                    <p className={styles.cardDesc}>{svc.description || 'Dịch vụ chất lượng cao'}</p>
                    <div className={styles.cardFooter}>
                      <span className={styles.price}>
                        {Number(svc.price).toLocaleString('vi-VN')}₫
                      </span>
                      <button
                        className={`btn btn-primary btn-sm ${styles.addBtn}`}
                        onClick={() => handleAdd(svc)}
                        disabled={state === 'adding'}
                      >
                        {state === 'adding' ? '...'
                          : state === 'done' ? '✅ Đã thêm'
                          : '🛒 Thêm vào giỏ'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
