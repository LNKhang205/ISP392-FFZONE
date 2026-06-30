import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useCustomerOnly } from '../../hooks/useCustomerOnly'
import styles from './FieldDetailPage.module.css'

const FALLBACK = 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600&q=80'
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080'
const TYPE_LABEL = { '5V5': 'Sân 5 người', '7V7': 'Sân 7 người', '9V9': 'Sân 9 người' }

function getImageUrl(url) {
  if (!url) return FALLBACK
  if (url.startsWith('http')) return url
  return `${API_BASE}/${url}`
}

export default function FieldDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const guard = useCustomerOnly()

  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || todayStr)

  const [field, setField] = useState(null)
  const [images, setImages] = useState([])
  const [pricings, setPricings] = useState([])
  const [activeImg, setActiveImg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      api.get(`/fields/${id}`),
      api.get(`/field-images/field/${id}`),
      api.get(`/field-pricings/field/${id}`).catch(() => ({ data: [] })),
    ])
      .then(([fieldRes, imagesRes, pricingsRes]) => {
        setField(fieldRes.data)
        setImages(imagesRes.data || [])
        setPricings(pricingsRes.data || [])
      })
      .catch(() => setError('Không tìm thấy sân này.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.skeleton} />
      </div>
    </div>
  )

  if (error || !field) return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.notFound}>
          <span>⚽</span>
          <h2>{error || 'Không tìm thấy sân'}</h2>
          <button className="btn btn-primary" onClick={() => navigate('/fields')}>← Quay lại danh sách</button>
        </div>
      </div>
    </div>
  )

  // Lấy danh sách ảnh để hiển thị gallery
  const galleryImages = images.length > 0
    ? images.map(img => getImageUrl(img.imageUrl))
    : [getImageUrl(field.thumbnailUrl)]

  // Determine day type for pricing lookup
  const selectedDayOfWeek = new Date(selectedDate + 'T00:00:00').getDay()
  const isWeekendDay = selectedDayOfWeek === 0 || selectedDayOfWeek === 6
  const dayType = isWeekendDay ? 'WEEKEND' : 'WEEKDAY'

  const activePricings = pricings.filter(p =>
    p.isActive &&
    (p.dayOfWeek === dayType || p.dayOfWeek === 'HOLIDAY' || p.dayOfWeek === 'ALL' || !p.dayOfWeek) &&
    (!p.effectiveFrom || p.effectiveFrom <= selectedDate) &&
    (!p.effectiveTo || p.effectiveTo >= selectedDate)
  )

  // Fallback: nếu không có WEEKEND record, tính từ WEEKDAY × 1.25
  if (activePricings.length === 0 && isWeekendDay) {
    const wdPricings = pricings.filter(p =>
      p.isActive && p.dayOfWeek === 'WEEKDAY' &&
      (!p.effectiveFrom || p.effectiveFrom <= selectedDate) &&
      (!p.effectiveTo || p.effectiveTo >= selectedDate)
    )
    wdPricings.forEach(p => {
      activePricings.push({ ...p, price: Math.ceil(Number(p.price) * 1.25 / 1000) * 1000, dayOfWeek: 'WEEKEND' })
    })
  }

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb}>
          <span onClick={() => navigate('/')} className={styles.breadLink}>Trang chủ</span>
          <span> / </span>
          <span onClick={() => navigate('/fields')} className={styles.breadLink}>Sân bóng</span>
          <span> / </span>
          <span>{field.name}</span>
        </nav>

        <div className={styles.layout}>
          {/* LEFT: Gallery + Info */}
          <div className={styles.left}>
            {/* Main image */}
            <div className={styles.mainImg}>
              <img
                src={galleryImages[activeImg] || FALLBACK}
                alt={field.name}
                onError={e => { e.target.src = FALLBACK }}
              />
              <span className={`badge badge-green ${styles.typeBadge}`}>{TYPE_LABEL[field.type] || field.type}</span>
            </div>

            {/* Thumbnail strip */}
            {galleryImages.length > 1 && (
              <div className={styles.thumbs}>
                {galleryImages.map((src, i) => (
                  <div
                    key={i}
                    className={`${styles.thumb} ${i === activeImg ? styles.thumbActive : ''}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img src={src} alt={`Ảnh ${i+1}`} onError={e => { e.target.src = FALLBACK }} />
                  </div>
                ))}
              </div>
            )}

            {/* Field info */}
            <div className={styles.infoCard}>
              <h1>{field.name}</h1>
              <div className={styles.meta}>
                <span className={styles.code}>Mã sân: <strong>{field.code}</strong></span>
                <span className={`${styles.status} ${field.status === 'ACTIVE' ? styles.active : styles.inactive}`}>
                  {field.status === 'ACTIVE' ? '🟢 Đang hoạt động' : '🔴 Tạm dừng'}
                </span>
              </div>
              {field.description && (
                <p className={styles.desc}>{field.description}</p>
              )}

              <div className={styles.features}>
                <div className={styles.feature}><span>🌿</span><span>Cỏ nhân tạo cao cấp</span></div>
                <div className={styles.feature}><span>💡</span><span>Hệ thống đèn LED</span></div>
                <div className={styles.feature}><span>🚿</span><span>Phòng thay đồ sạch sẽ</span></div>
                <div className={styles.feature}><span>🅿️</span><span>Bãi đậu xe miễn phí</span></div>
              </div>
            </div>
          </div>

          {/* RIGHT: Booking panel */}
          <div className={styles.right}>
            <div className={styles.bookingCard}>
              <h3>Đặt sân ngay</h3>

              <div className={styles.dateSelector}>
                <label>📅 Chọn ngày thi đấu</label>
                <input
                  type="date"
                  min={todayStr}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className={styles.dateInput}
                />
              </div>

              {/* Bảng giá */}
              <div className={styles.priceSection}>
                <h4>Bảng giá ({isWeekendDay ? 'Cuối tuần' : 'Ngày thường'})</h4>
                {activePricings.length === 0 ? (
                  <p className={styles.noPrice}>Chưa có bảng giá cho ngày này. Vui lòng liên hệ để biết thêm.</p>
                ) : (
                  <div className={styles.priceList}>
                    {activePricings.map(p => (
                      <div key={p.id} className={styles.priceRow}>
                        <span className={styles.priceTime}>
                          {p.startTime?.substring(0,5)} – {p.endTime?.substring(0,5)}
                        </span>
                        <span className={styles.priceAmount}>
                          {Number(p.price).toLocaleString('vi-VN')}₫/giờ
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                className={`btn btn-primary ${styles.bookBtn}`}
                disabled={field.status !== 'ACTIVE'}
                onClick={guard(() => navigate(`/booking?fieldId=${field.id}`))}
              >
                {field.status === 'ACTIVE' ? '⚽ Đặt sân ngay' : 'Sân đang tạm dừng'}
              </button>

              <div className={styles.contact}>
                <p>📞 Hỗ trợ: <strong>1800 xxxx</strong></p>
                <p>🕐 Mở cửa: <strong>06:00 – 23:00</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
