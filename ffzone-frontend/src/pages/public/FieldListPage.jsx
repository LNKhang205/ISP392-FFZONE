import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../services/api'
import styles from './FieldListPage.module.css'

const TYPE_LABEL = { '5V5':'Sân 5 người','7V7':'Sân 7 người','9V9':'Sân 9 người' }
const FALLBACK = 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600&q=80'
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080'

function getImageUrl(thumbnailUrl) {
  if (!thumbnailUrl) return FALLBACK
  if (thumbnailUrl.startsWith('http')) return thumbnailUrl
  return `${API_BASE}/${thumbnailUrl}`
}

export default function FieldListPage() {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  useEffect(() => {
    api.get('/fields/active').then(r => setFields(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.top}>
          <h1>Danh sách sân bóng</h1>
          <p>Chọn sân và đặt lịch phù hợp với bạn</p>
        </div>
        {loading ? (
          <div className={styles.grid}>
            {[1,2,3,4,5,6].map(i=><div key={i} style={{height:300,background:'var(--gray-100)',borderRadius:12,animation:'shimmer 1.5s infinite'}}/>)}
          </div>
        ) : fields.length === 0 ? (
          <div className={styles.empty}><span>⚽</span><p>Chưa có sân nào</p></div>
        ) : (
          <div className={styles.grid}>
            {fields.map(field => (
              <div key={field.id} className={`card ${styles.fieldCard}`} onClick={() => navigate(`/fields/${field.id}?date=${date}`)}>
                <div className={styles.img}>
                  <img
                    src={getImageUrl(field.thumbnailUrl)}
                    alt={field.name}
                    onError={e => { e.target.src = FALLBACK }}
                  />
                  <span className={`badge badge-green ${styles.badge}`}>{TYPE_LABEL[field.type]||field.type}</span>
                </div>
                <div className={styles.info}>
                  <h3>{field.name}</h3>
                  <p>{field.description || 'Sân cỏ nhân tạo chất lượng cao'}</p>
                  <div className={styles.footer}>
                    <span>📍 FFZone</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={e => { e.stopPropagation(); navigate(`/booking?fieldId=${field.id}`) }}
                    >Đặt ngay</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
