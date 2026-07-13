import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import { getAvailableVouchers, claimVoucher, getMyVouchers } from '../../api/voucherApi'
import styles from './HomePage.module.css'
import { getLocalDateString } from '../../utils/date'

const FIELD_TYPE_LABEL = { '5V5': 'Sân 5 người', '7V7': 'Sân 7 người', '9V9': 'Sân 9 người' }
const FIELD_IMG_FALLBACK = 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=600&q=80'
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080'

function getImageUrl(thumbnailUrl) {
  if (!thumbnailUrl) return FIELD_IMG_FALLBACK
  if (thumbnailUrl.startsWith('http')) return thumbnailUrl
  return `${API_BASE}/${thumbnailUrl}`
}

/* ── Voucher Slider ── */
function VoucherSlider() {
  const { isLoggedIn, user } = useAuth()
  const [vouchers, setVouchers] = useState([])   // chỉ chứa voucher CHƯA nhận
  const [idx, setIdx]           = useState(0)
  const [claiming, setClaiming] = useState(false)
  const [toast, setToast]       = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  // Key sessionStorage lưu các voucherId đã nhận hoặc bỏ qua trong session này
  const SESSION_KEY = 'ffzone_dismissed_vouchers'
  const getDismissed = () => {
    try { return new Set(JSON.parse(sessionStorage.getItem(SESSION_KEY) || '[]')) } catch { return new Set() }
  }
  const addDismissed = (id) => {
    const s = getDismissed(); s.add(id)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...s]))
  }

  useEffect(() => {
    if (!isLoggedIn || user?.role !== 'USER') return
    Promise.allSettled([getAvailableVouchers(), getMyVouchers()]).then(([avail, mine]) => {
      if (avail.status === 'fulfilled') {
        // Tập hợp ID voucher user đã nhận (từ DB)
        const myIds = mine.status === 'fulfilled'
          ? new Set(mine.value.map(v => v.voucherId))
          : new Set()
        // Tập hợp ID voucher đã nhận/bỏ qua trong session này
        const dismissed = getDismissed()
        // Chỉ hiện voucher chưa nhận (cả DB lẫn session cache)
        setVouchers(avail.value.filter(v => !myIds.has(v.id) && !dismissed.has(v.id)))
      }
    })
  }, [isLoggedIn])

  // Không hiện gì nếu ko login, ko phải USER, hoặc không còn voucher chưa nhận
  if (!isLoggedIn || user?.role !== 'USER' || vouchers.length === 0) return null

  const v       = vouchers[idx] 
  const soldOut = v?.remaining <= 0
  const pct     = Math.round(((v?.usedQuantity || 0) / (v?.quantity || 1)) * 100)

  const prev = () => setIdx(i => (i - 1 + vouchers.length) % vouchers.length)
  const next = () => setIdx(i => (i + 1) % vouchers.length)

  const handleClaim = async () => {
    if (claiming || soldOut) return
    setClaiming(true)
    try {
      await claimVoucher(v.id)
      // Đánh dấu đã nhận vào session để không hiện lại
      addDismissed(v.id)
      // Xóa voucher vừa nhận khỏi danh sách
      setVouchers(vs => {
        const next = vs.filter(x => x.id !== v.id)
        setIdx(i => Math.min(i, Math.max(0, next.length - 1)))
        return next
      })
      showToast(`🎉 Nhận voucher ${v.code} thành công!`)
    } catch (e) {
      const msg = e.response?.data?.message || ''
      if (msg.includes('phát hết') || msg.includes('hết')) showToast('😢 Voucher đã được phát hết!')
      else if (msg.includes('đã nhận')) {
        // Voucher thực ra đã nhận rồi — đánh dấu dismiss để không hiện nữa
        addDismissed(v.id)
        setVouchers(vs => {
          const next = vs.filter(x => x.id !== v.id)
          setIdx(i => Math.min(i, Math.max(0, next.length - 1)))
          return next
        })
        showToast('Bạn đã nhận voucher này rồi')
      }
      else showToast('❌ Không thể nhận, thử lại sau')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
      background: '#fff', border: '2px solid #22c55e', borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,.15)', width: 320, padding: '20px 24px'
    }}>
      {/* Close */}
      <button onClick={() => { vouchers.forEach(x => addDismissed(x.id)); setVouchers([]) }} style={{
        position: 'absolute', top: 10, right: 14,
        background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af'
      }}>✕</button>

      <div style={{fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 4}}>
        🎁 Voucher đang phát ({idx + 1}/{vouchers.length})
      </div>

      <div style={{fontSize: 22, fontWeight: 900, letterSpacing: 2, color: '#16a34a'}}>{v.code}</div>
      <div style={{fontSize: 26, fontWeight: 900, color: '#dc2626', margin: '4px 0'}}>
        {v.voucherType === 'PERCENT' ? `Giảm ${v.discountValue}%` : `Giảm ${Number(v.discountValue).toLocaleString('vi-VN')}₫`}
      </div>
      <div style={{fontSize: 12, color: '#6b7280'}}>
        📅 Hết hạn: {new Date(v.endDate).toLocaleDateString('vi-VN')}
      </div>

      {/* Progress */}
      <div style={{fontSize: 12, color: '#6b7280', marginTop: 8}}>
        Đã phát: {v.usedQuantity}/{v.quantity}
        {soldOut && <span style={{color:'#dc2626', fontWeight:700}}> — Hết!</span>}
      </div>
      <div style={{height: 6, borderRadius: 999, background: '#e5e7eb', marginTop: 4, overflow: 'hidden'}}>
        <div style={{height: '100%', width: pct + '%', background: soldOut ? '#dc2626' : '#22c55e', borderRadius: 999, transition: 'width .3s'}} />
      </div>

      {/* Arrow + Claim */}
      <div style={{display: 'flex', gap: 8, marginTop: 14, alignItems: 'center'}}>
        {vouchers.length > 1 && (
          <button onClick={prev} style={{
            width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb',
            background: '#f9fafb', cursor: 'pointer', fontSize: 16, flexShrink: 0
          }}>‹</button>
        )}

        {soldOut ? (
          <button disabled style={{flex:1, padding:'8px 0', borderRadius:8, border:'none', background:'#e5e7eb', color:'#9ca3af', fontWeight:700, fontSize:13}}>
            😢 Đã hết
          </button>
        ) : (
          <button onClick={handleClaim} disabled={claiming} style={{
            flex:1, padding:'8px 0', borderRadius:8, border:'none',
            background:'#16a34a', color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer'
          }}>
            {claiming ? 'Đang nhận...' : '🎁 Nhận ngay'}
          </button>
        )}

        {vouchers.length > 1 && (
          <button onClick={next} style={{
            width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb',
            background: '#f9fafb', cursor: 'pointer', fontSize: 16, flexShrink: 0
          }}>›</button>
        )}
      </div>

      {toast && (
        <div style={{marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', fontSize: 13, fontWeight: 600, textAlign: 'center'}}>
          {toast}
        </div>
      )}
    </div>
  )
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

  const today = getLocalDateString()

  return (
    <div>
      <VoucherSlider />

      {/* HERO */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <div className={styles.heroText}>
            <span className={`badge badge-green ${styles.heroBadge}`}>Đặt sân nhanh chóng</span>
            <h1>Sân bóng đá <br /><span>chất lượng cao</span></h1>
            <p>Đặt sân trực tuyến 24/7 – Thanh toán VNPay an toàn – Xác nhận tức thì</p>
            <div className={styles.heroSearch}>
              <div className={styles.searchBox}>

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
                      <span className={styles.fieldStatus}>Đang hoạt động</span>
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
      </section>

      {/* HOW IT WORKS */}
      <section className={styles.howSection}>
        <div className="container">
          <h2 className={styles.centerTitle}>Cách đặt sân đơn giản</h2>
          <div className={styles.stepsGrid}>
            {[
              ['1','Chọn sân','Xem danh sách sân và chọn sân phù hợp với nhu cầu'],
              ['2','Chọn giờ','Xem lịch trống và chọn khung giờ muốn đặt (tối đa 3 slot)'],
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