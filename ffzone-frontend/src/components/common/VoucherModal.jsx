import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getAvailableVouchers, claimVoucher, getMyVouchers } from '../../api/voucherApi'

export default function VoucherModal() {
  const { isLoggedIn } = useAuth()
  const [vouchers, setVouchers] = useState([])
  const [index, setIndex]       = useState(0)
  const [visible, setVisible]   = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed]   = useState(false)
  const [msg, setMsg]           = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const all = await getAvailableVouchers()
        if (!all || all.length === 0) return

        // Lọc ra voucher user chưa nhận
        let unclaimed = all
        if (isLoggedIn) {
          const mine = await getMyVouchers()
          const myIds = new Set(mine.map(v => v.voucherId))
          unclaimed = all.filter(v => !myIds.has(v.id))
        }

        if (unclaimed.length > 0) {
          setVouchers(unclaimed)
          setIndex(0)
          setVisible(true)
        }
      } catch {}
    }
    load()
  }, [isLoggedIn])

  if (!visible || vouchers.length === 0) return null

  const v = vouchers[index]

  const handleClaim = async () => {
    if (!isLoggedIn) { window.location.href = '/login'; return }
    setClaiming(true); setMsg('')
    try {
      await claimVoucher(v.id)
      setClaimed(true)
      setMsg('🎉 Nhận voucher thành công!')
    } catch (e) {
      const m = e.response?.data?.message || ''
      setMsg(m.includes('hết') ? '😢 Voucher đã được phát hết!' : m.includes('đã nhận') ? 'Bạn đã nhận voucher này rồi' : '❌ Không thể nhận, thử lại sau')
    } finally { setClaiming(false) }
  }

  const handleNext = () => {
    setClaimed(false); setMsg('')
    if (index + 1 < vouchers.length) setIndex(i => i + 1)
    else setVisible(false)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}
      onClick={() => setVisible(false)}>
      <div style={{background:'#fff',borderRadius:16,padding:32,maxWidth:400,width:'90%',position:'relative',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}
        onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button onClick={() => setVisible(false)}
          style={{position:'absolute',top:12,right:16,background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#9ca3af'}}>✕</button>

        {/* Badge */}
        <div style={{textAlign:'center',marginBottom:8}}>
          <span style={{background:'#dcfce7',color:'#16a34a',padding:'4px 14px',borderRadius:999,fontSize:12,fontWeight:700}}>
            🎁 Voucher đặc biệt
          </span>
        </div>

        {/* Content */}
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:36,fontWeight:900,color:'#dc2626',margin:'12px 0'}}>
            {v.voucherType === 'PERCENT' ? `Giảm ${v.discountValue}%` : `Giảm ${Number(v.discountValue).toLocaleString('vi-VN')}₫`}
          </div>
          <div style={{fontSize:20,fontWeight:800,letterSpacing:3,color:'#16a34a',marginBottom:8}}>{v.code}</div>
          <div style={{fontSize:13,color:'#6b7280'}}>
            📅 Hết hạn: {new Date(v.endDate).toLocaleDateString('vi-VN')}
          </div>
          <div style={{fontSize:13,color:'#6b7280',marginTop:4}}>
            Còn lại: <strong style={{color: v.remaining <= 5 ? '#dc2626' : '#16a34a'}}>{v.remaining}/{v.quantity}</strong>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{height:6,borderRadius:999,background:'#e5e7eb',margin:'16px 0',overflow:'hidden'}}>
          <div style={{height:'100%',borderRadius:999,background:'#22c55e',width: Math.round((v.usedQuantity/v.quantity)*100)+'%',transition:'width .3s'}} />
        </div>

        {/* Message */}
        {msg && <p style={{textAlign:'center',fontWeight:600,color: msg.includes('thành công') ? '#16a34a' : '#dc2626',marginBottom:12}}>{msg}</p>}

        {/* Buttons */}
        {!claimed ? (
          <button onClick={handleClaim} disabled={claiming}
            style={{width:'100%',padding:'12px 0',background:'#16a34a',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:15,cursor:claiming?'not-allowed':'pointer',opacity:claiming?.7:1}}>
            {claiming ? 'Đang nhận...' : isLoggedIn ? '🎁 Nhận ngay' : '🔑 Đăng nhập để nhận'}
          </button>
        ) : (
          <button onClick={handleNext}
            style={{width:'100%',padding:'12px 0',background:'#2563eb',color:'#fff',border:'none',borderRadius:8,fontWeight:700,fontSize:15,cursor:'pointer'}}>
            {index + 1 < vouchers.length ? `Xem voucher tiếp theo (${index+2}/${vouchers.length}) →` : 'Đóng'}
          </button>
        )}

        {/* Skip */}
        {!claimed && index + 1 < vouchers.length && (
          <button onClick={handleNext}
            style={{width:'100%',marginTop:8,padding:'8px 0',background:'none',border:'none',color:'#9ca3af',fontSize:13,cursor:'pointer'}}>
            Bỏ qua, xem voucher tiếp ({index+2}/{vouchers.length})
          </button>
        )}

        {/* Pagination dots */}
        {vouchers.length > 1 && (
          <div style={{display:'flex',justifyContent:'center',gap:6,marginTop:12}}>
            {vouchers.map((_, i) => (
              <div key={i} style={{width:8,height:8,borderRadius:'50%',background: i===index ? '#16a34a' : '#e5e7eb'}} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}