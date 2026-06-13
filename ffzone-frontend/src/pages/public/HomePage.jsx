import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import styles from './HomePage.module.css'

const FIELD_TYPE_LABEL = { '5V5': 'Sân 5 người', '7V7': 'Sân 7 người', '9V9': 'Sân 9 người' }
const FIELD_IMG_FALLBACK = 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600&q=80'
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080'

function getImageUrl(thumbnailUrl) {
  if (!thumbnailUrl) return FIELD_IMG_FALLBACK
  if (thumbnailUrl.startsWith('http')) return thumbnailUrl
  return `${API_BASE}/${thumbnailUrl}`
}

export default function HomePage() {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchDate, setSearchDate] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/fields/active')
      .then(r => setFields(r.data))
      .catch(() => setFields([]))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <span className={`badge badge-green ${styles.heroBadge}`}>⚡ Đặt sân nhanh chóng</span>
            <h1>Sân bóng đá <br /><span>chất lượng cao</span></h1>
            <p>Đặt sân trực tuyến 24/7 – Thanh toán VNPay an toàn – Xác nhận tức thì</p>
            <div className={styles.heroSearch}>
              <div className={styles.searchBox}>
                <span>📅</span>
                <input
                  type="date"
                  min={today}
                  value={searchDate}
                  onChange={e => setSearchDate(e.target.value)}
                  placeholder="Chọn ngày đặt sân"
                />
              </div>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate(searchDate ? `/fields?date=${searchDate}` : '/fields')}
              >
                Tìm sân trống
              </button>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <img src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=700&q=80" alt="Sân bóng" />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className={styles.stats}>
        <div className="container">
          <div className={styles.statsGrid}>
            {[['⚽','3+','Sân bóng'],['📅','24/7','Đặt lịch'],['⚡','5 phút','Xác nhận'],['🏆','100%','Uy tín']].map(([icon,num,label]) => (
              <div key={label} className={styles.statItem}>
                <span className={styles.statIcon}>{icon}</span>
                <strong>{num}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FIELDS */}
      <section className={styles.section}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <h2>Sân bóng đá</h2>
            <a href="/fields" className="btn btn-outline">Xem tất cả →</a>
          </div>
          {loading ? (
            <div className={styles.loadingGrid}>
              {[1,2,3].map(i => <div key={i} className={styles.skeleton} />)}
            </div>
          ) : (
            <div className={styles.fieldsGrid}>
              {fields.slice(0,3).map(field => (
                <div key={field.id} className="card" onClick={() => navigate(`/fields/${field.id}`)}>
                  <div className={styles.fieldImg}>
                    <img
                      src={getImageUrl(field.thumbnailUrl)}
                      alt={field.name}
                      onError={e => { e.target.src = FIELD_IMG_FALLBACK }}
                    />
                    <span className={`badge badge-green ${styles.fieldBadge}`}>{FIELD_TYPE_LABEL[field.type] || field.type}</span>
                  </div>
                  <div className={styles.fieldInfo}>
                    <h3>{field.name}</h3>
                    <p>{field.description || 'Sân cỏ nhân tạo chất lượng cao'}</p>
                    <div className={styles.fieldFooter}>
                      <span className={styles.fieldStatus}>🟢 Đang hoạt động</span>
                      <button className="btn btn-primary btn-sm">Đặt ngay</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.howSection}>
        <div className="container">
          <h2 className={styles.centerTitle}>Cách đặt sân đơn giản</h2>
          <div className={styles.stepsGrid}>
            {[
              ['1','Chọn sân','Xem danh sách sân và chọn sân phù hợp với nhu cầu'],
              ['2','Chọn giờ','Xem lịch trống và chọn khung giờ muốn đặt (tối đa 5 slot)'],
              ['3','Thanh toán','Thanh toán qua VNPay nhanh chóng và bảo mật'],
              ['4','Vào sân','Đến sân, check-in với Staff và bắt đầu thi đấu'],
            ].map(([num, title, desc]) => (
              <div key={num} className={styles.step}>
                <div className={styles.stepNum}>{num}</div>
                <h4>{title}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className="container">
          <div className={styles.ctaBox}>
            <h2>Sẵn sàng đá bóng?</h2>
            <p>Đăng ký miễn phí và đặt sân ngay hôm nay</p>
            <div className={styles.ctaBtns}>
              <a href="/register" className="btn btn-primary btn-lg">Đăng ký ngay</a>
              <a href="/fields" className="btn btn-lg" style={{background:'rgba(255,255,255,.2)',color:'#fff',border:'2px solid rgba(255,255,255,.5)'}}>Xem sân</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
