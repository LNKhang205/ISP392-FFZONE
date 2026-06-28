import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getAvailableVouchers, claimVoucher, getMyVouchers } from '../../api/voucherApi'

const styles = {
  page:    { padding: '48px 0 64px', minHeight: '60vh' },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24, marginTop: 32 },
  card:    { border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, background: '#fff', position: 'relative' },
  badge:   { display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 8 },
  code:    { fontSize: 22, fontWeight: 800, letterSpacing: 2, color: '#16a34a', marginBottom: 4 },
  discount:{ fontSize: 28, fontWeight: 900, color: '#dc2626' },
  meta:    { fontSize: 13, color: '#6b7280', marginTop: 8 },
  progress:{ height: 6, borderRadius: 999, background: '#e5e7eb', marginTop: 12, overflow: 'hidden' },
  fill:    { height: '100%', background: '#22c55e', borderRadius: 999, transition: 'width .3s' },
  btn:     { marginTop: 16, width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: '#16a34a', color: '#fff' },
  btnDis:  { marginTop: 16, width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14, background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' },
  toast:   { position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: '#1f2937', color: '#fff', padding: '12px 28px', borderRadius: 999, fontWeight: 600, zIndex: 9999 },
}

export default function VouchersPage() {
  const { isLoggedIn } = useAuth()
  const [vouchers, setVouchers]   = useState([])
  const [myIds, setMyIds]         = useState(new Set())
  const [loading, setLoading]     = useState(true)
  const [claiming, setClaiming]   = useState({})
  const [toast, setToast]         = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = async () => {
    setLoading(true)
    const [avail, mine] = await Promise.allSettled([
      getAvailableVouchers(),
      isLoggedIn ? getMyVouchers() : Promise.resolve([])
    ])
    if (avail.status === 'fulfilled') setVouchers(avail.value)
    if (mine.status  === 'fulfilled') setMyIds(new Set(mine.value.map(v => v.voucherId)))
    setLoading(false)
  }

  useEffect(() => { load() }, [isLoggedIn])

  const handleClaim = async (voucher) => {
    if (!isLoggedIn) { window.location.href = '/login'; return }
    if (claiming[voucher.id]) return

    setClaiming(c => ({...c, [voucher.id]: true}))
    try {
      await claimVoucher(voucher.id)
      setMyIds(s => new Set([...s, voucher.id]))
      setVouchers(vs => vs.map(v => v.id === voucher.id
        ? {...v, remaining: v.remaining - 1, usedQuantity: v.usedQuantity + 1}
        : v
      ))
      showToast(`🎉 Nhận voucher ${voucher.code} thành công!`)
    } catch (e) {
      const msg = e.response?.data?.message || ''
      if (msg.includes('phát hết') || msg.includes('hết')) {
        showToast('😢 Voucher đã được phát hết!')
        load()
      } else if (msg.includes('đã nhận')) {
        showToast('Bạn đã nhận voucher này rồi')
      } else {
        showToast('❌ Không thể nhận voucher, thử lại sau')
      }
    } finally {
      setClaiming(c => ({...c, [voucher.id]: false}))
    }
  }

  return (
    <div style={styles.page}>
      <div className="container">
        <h1 style={{fontSize: 28, fontWeight: 800}}>🎁 Voucher đang phát</h1>
        <p style={{color: '#6b7280', marginTop: 4}}>Nhận ngay voucher ưu đãi — số lượng có hạn!</p>

        {loading ? (
          <p style={{marginTop: 32, color: '#9ca3af'}}>Đang tải...</p>
        ) : vouchers.length === 0 ? (
          <div style={{textAlign: 'center', padding: 80, color: '#9ca3af'}}>
            <div style={{fontSize: 64}}>🎫</div>
            <p style={{marginTop: 16}}>Hiện không có voucher nào đang phát</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {vouchers.map(v => {
              const claimed = myIds.has(v.id)
              const soldOut = v.remaining <= 0
              const pct     = Math.round((v.usedQuantity / v.quantity) * 100)

              return (
                <div key={v.id} style={styles.card}>
                  <span style={{...styles.badge, background: v.voucherType === 'PERCENT' ? '#dcfce7' : '#dbeafe', color: v.voucherType === 'PERCENT' ? '#16a34a' : '#2563eb'}}>
                    {v.voucherType === 'PERCENT' ? '% Phần trăm' : '₫ Cố định'}
                  </span>

                  <div style={styles.code}>{v.code}</div>
                  <div style={styles.discount}>
                    {v.voucherType === 'PERCENT'
                      ? `Giảm ${v.discountValue}%`
                      : `Giảm ${Number(v.discountValue).toLocaleString('vi-VN')}₫`}
                  </div>

                  <div style={styles.meta}>
                    📅 Hết hạn: {new Date(v.endDate).toLocaleDateString('vi-VN')}
                  </div>

                  <div style={{...styles.meta, marginTop: 12}}>
                    Đã phát: {v.usedQuantity}/{v.quantity}
                    {soldOut && <span style={{color: '#dc2626', fontWeight: 700}}> — Đã hết!</span>}
                  </div>
                  <div style={styles.progress}>
                    <div style={{...styles.fill, width: pct + '%', background: soldOut ? '#dc2626' : '#22c55e'}} />
                  </div>

                  {claimed ? (
                    <button style={styles.btnDis} disabled>✅ Đã nhận</button>
                  ) : soldOut ? (
                    <button style={styles.btnDis} disabled>😢 Đã hết voucher</button>
                  ) : (
                    <button style={styles.btn} onClick={() => handleClaim(v)} disabled={claiming[v.id]}>
                      {claiming[v.id] ? 'Đang nhận...' : '🎁 Nhận voucher'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  )
}