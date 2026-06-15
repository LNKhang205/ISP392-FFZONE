import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import styles from './BookingPage.module.css'

// ─── Constants ────────────────────────────────────────────────
const TYPE_LABEL = { '5V5': 'Sân 5 người', '7V7': 'Sân 7 người', '9V9': 'Sân 9 người' }
const TYPE_KEY   = { '5V5': '5v5', '7V7': '7v7', '9V9': '9v9' }
const STATUS_COLOR = { AVAILABLE: 'avail', BOOKED: 'booked', CLOSED: 'closed' }
const MAX_SELECT  = 3
const SLOT_PLAY   = 60   // phút thi đấu
const SLOT_BREAK  = 15  // phút nghỉ giữa slot

// ─── Helpers ──────────────────────────────────────────────────
function buildNext7Days() {
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    const label = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai'
      : d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
    days.push({ iso, label })
  }
  return days
}

function fmt(time) {
  if (!time) return ''
  return String(time).substring(0, 5)
}

function addMinutes(timeStr, mins) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function minutesBetween(a, b) {
  const [ah, am] = a.split(':').map(Number)
  const [bh, bm] = b.split(':').map(Number)
  return (bh * 60 + bm) - (ah * 60 + am)
}

function calcSummary(slots) {
  if (!slots.length) return null
  const sorted = [...slots].sort((a, b) => fmt(a.startTime).localeCompare(fmt(b.startTime)))
  const first  = fmt(sorted[0].startTime)
  const last   = sorted[sorted.length - 1]
  const endTime = addMinutes(fmt(last.startTime), SLOT_PLAY)
  const totalMins = minutesBetween(first, endTime)
  const breakMins = (slots.length - 1) * SLOT_BREAK
  const hours = Math.floor(totalMins / 60)
  const mins  = totalMins % 60
  const durationLabel = hours > 0
    ? `${hours} giờ${mins > 0 ? ` ${mins} phút` : ''}`
    : `${mins} phút`
  return { first, endTime, breakMins, durationLabel, count: slots.length, sorted }
}

function getPriceForSlot(slot, pricings) {
  if (!pricings?.length) return 200000
  const day = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY']
    [new Date(slot.slotDate + 'T00:00:00').getDay()]
  const startStr = fmt(slot.startTime)
  const match = pricings.find(p =>
    p.isActive &&
    (!p.dayOfWeek || p.dayOfWeek === 'ALL' || p.dayOfWeek === day) &&
    (!p.startTime || fmt(p.startTime) <= startStr) &&
    (!p.endTime   || fmt(p.endTime)   >= startStr)
  )
  return match ? Number(match.price) : 200000
}

// ─── Component ────────────────────────────────────────────────
export default function BookingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const preFieldId = searchParams.get('fieldId')

  const days = buildNext7Days()
  const [selDate,    setSelDate]    = useState(days[0].iso)
  const [filterType, setFilterType] = useState('ALL')
  const [filterField,setFilterField]= useState(preFieldId || 'ALL')
  const [filterAvail,setFilterAvail]= useState(false)

  const [fields,   setFields]   = useState([])
  const [slotsMap, setSlotsMap] = useState({}) // fieldId → slot[]
  const [pricMap,  setPricMap]  = useState({}) // fieldId → pricing[]
  const [loading,  setLoading]  = useState(true)
  const [collapsed, setCollapsed] = useState({})

  const [selected, setSelected] = useState([]) // slot objects
  const scrollRef = useRef(null)

  // Load fields
  useEffect(() => {
    api.get('/fields/active').then(r => setFields(r.data)).catch(() => {})
  }, [])

  // Load slots + pricings khi date, filterField, hoặc fields thay đổi
  // Dùng fields.length > 0 để đảm bảo fields đã load xong mới gọi
  useEffect(() => {
    if (fields.length === 0) return   // ← chờ fields load xong

    setLoading(true)
    setSelected([])

    const fieldsToLoad = filterField !== 'ALL'
      ? fields.filter(f => f.id === filterField)
      : fields

    if (!fieldsToLoad.length) { setLoading(false); return }

    Promise.all(
      fieldsToLoad.map(f =>
        Promise.all([
          api.get(`/field-slots/field/${f.id}?date=${selDate}`),
          api.get(`/field-pricings/field/${f.id}`).catch(() => ({ data: [] })),
        ]).then(([sRes, pRes]) => ({ fieldId: f.id, slots: sRes.data, pricings: pRes.data }))
      )
    ).then(results => {
      const sm = {}, pm = {}
      results.forEach(r => { sm[r.fieldId] = r.slots; pm[r.fieldId] = r.pricings })
      setSlotsMap(sm); setPricMap(pm)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selDate, filterField, fields])

  // Reset field filter when coming from another page
  useEffect(() => {
    if (preFieldId) setFilterField(preFieldId)
  }, [preFieldId])

  // ── Slot selection logic ──────────────────────────────────
  const toggleSlot = useCallback((slot) => {
    if (slot.status !== 'AVAILABLE') return
    setSelected(prev => {
      const key = slot.id
      const exists = prev.find(s => s.id === key)

      if (exists) {
        // deselect
        return prev.filter(s => s.id !== key)
      }

      // Must be same field
      if (prev.length > 0 && prev[0].fieldId !== slot.fieldId) return prev
      if (prev.length >= MAX_SELECT) return prev

      // Must be consecutive — check adjacency
      const next = [...prev, slot].sort((a, b) =>
        fmt(a.startTime).localeCompare(fmt(b.startTime)))

      // validate consecutiveness: each slot[i+1].startTime === slot[i].endTime + BREAK
      for (let i = 0; i < next.length - 1; i++) {
        const expectedNext = addMinutes(fmt(next[i].startTime), SLOT_PLAY + SLOT_BREAK)
        if (fmt(next[i + 1].startTime) !== expectedNext) return prev
      }

      return next
    })
  }, [])

  // ── Grouped + filtered fields ─────────────────────────────
  const visibleFields = fields.filter(f => {
    if (filterType !== 'ALL' && f.type !== filterType) return false
    if (filterField !== 'ALL' && f.id !== filterField) return false
    return true
  })

  const grouped = ['5V5', '7V7', '9V9'].reduce((acc, t) => {
    const fs = visibleFields.filter(f => f.type === t)
    if (fs.length) acc[t] = fs
    return acc
  }, {})

  // All unique slot times across visible fields (for column headers)
  const allTimes = [...new Set(
    visibleFields.flatMap(f => (slotsMap[f.id] || []).map(s => fmt(s.startTime)))
  )].sort()

  const summary = calcSummary(selected)
  const totalPrice = selected.reduce((sum, s) =>
    sum + getPriceForSlot(s, pricMap[s.fieldId]), 0)

  const toggleCollapse = (type) =>
    setCollapsed(c => ({ ...c, [type]: !c[type] }))

  const slotStatus = (slot) => {
    if (selected.find(s => s.id === slot.id)) return 'selected'
    return STATUS_COLOR[slot.status] || 'avail'
  }

  const canSelectSlot = (slot) => {
    if (slot.status !== 'AVAILABLE') return false
    if (selected.length === 0) return true
    if (selected[0].fieldId !== slot.fieldId) return false
    if (selected.length >= MAX_SELECT) return false
    // Check if this slot is adjacent to current selection
    const sorted = [...selected].sort((a, b) => fmt(a.startTime).localeCompare(fmt(b.startTime)))
    const firstTime = fmt(sorted[0].startTime)
    const lastTime  = fmt(sorted[sorted.length - 1].startTime)
    const prevExpected = addMinutes(firstTime, -(SLOT_PLAY + SLOT_BREAK))
    const nextExpected = addMinutes(lastTime,  SLOT_PLAY + SLOT_BREAK)
    return fmt(slot.startTime) === prevExpected || fmt(slot.startTime) === nextExpected
  }

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className={styles.header}>
        <div className="container">
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.title}>⚽ Đặt sân bóng</h1>
              <p className={styles.sub}>Chọn ngày, sân và khung giờ phù hợp với bạn</p>
            </div>
          </div>

          {/* Date strip */}
          <div className={styles.dateStrip}>
            {days.map(d => (
              <button
                key={d.iso}
                className={`${styles.dateBtn} ${selDate === d.iso ? styles.dateBtnActive : ''}`}
                onClick={() => setSelDate(d.iso)}
              >
                <span className={styles.dateBtnLabel}>{d.label}</span>
                <span className={styles.dateBtnIso}>{d.iso.substring(5)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        {/* ── Info card ──────────────────────────────────── */}
        <div className={styles.infoCard}>
          <div className={styles.infoItem}><span>ℹ️</span> Mỗi slot bao gồm <strong>60 phút</strong> thi đấu</div>
          <div className={styles.infoItem}><span>⏱️</span> Giữa các slot có <strong>15 phút</strong> dọn sân</div>
          <div className={styles.infoItem}><span>⚽</span> Đặt nhiều slot liên tiếp: khoảng nghỉ được tính vào thời gian sử dụng thực tế</div>
          <div className={styles.infoItem}><span>📌</span> Tối đa <strong>3 slot liên tiếp</strong> mỗi lần đặt</div>
        </div>

        {/* ── Filters ────────────────────────────────────── */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Loại sân</label>
            <div className={styles.filterBtns}>
              {[['ALL','Tất cả'],['5V5','Sân 5'],['7V7','Sân 7'],['9V9','Sân 9']].map(([k,v]) => (
                <button key={k}
                  className={`${styles.filterBtn} ${filterType === k ? styles.filterBtnActive : ''}`}
                  onClick={() => setFilterType(k)}>{v}</button>
              ))}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label>Sân</label>
            <select
              className={styles.filterSelect}
              value={filterField}
              onChange={e => setFilterField(e.target.value)}
            >
              <option value="ALL">Tất cả sân</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Tình trạng</label>
            <button
              className={`${styles.filterBtn} ${filterAvail ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterAvail(v => !v)}
            >
              {filterAvail ? '🟢 Chỉ còn trống' : 'Tất cả'}
            </button>
          </div>
        </div>

        {/* ── Legend ─────────────────────────────────────── */}
        <div className={styles.legend}>
          <span><span className={`${styles.dot} ${styles.dotAvail}`}/>Còn trống</span>
          <span><span className={`${styles.dot} ${styles.dotBooked}`}/>Đã đặt</span>
          <span><span className={`${styles.dot} ${styles.dotClosed}`}/>Đóng cửa</span>
          <span><span className={`${styles.dot} ${styles.dotSelected}`}/>Đang chọn</span>
        </div>

        {/* ── Schedule ───────────────────────────────────── */}
        {loading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner}/>
            <p>Đang tải lịch sân...</p>
          </div>
        ) : allTimes.length === 0 ? (
          <div className={styles.empty}>
            <span>📅</span>
            <h3>Chưa có slot nào cho ngày này</h3>
            <p>Vui lòng chọn ngày khác hoặc liên hệ để biết thêm.</p>
          </div>
        ) : (
          <div className={styles.scheduleWrap} ref={scrollRef}>
            {Object.entries(grouped).map(([type, fList]) => (
              <div key={type} className={styles.typeGroup}>
                <button
                  className={styles.typeHeader}
                  onClick={() => toggleCollapse(type)}
                >
                  <span>{collapsed[type] ? '▶' : '▼'}</span>
                  <span>{TYPE_LABEL[type]}</span>
                  <span className={styles.typeCount}>{fList.length} sân</span>
                </button>

                {!collapsed[type] && (
                  <div className={styles.timelineOuter}>
                    {/* sticky time header */}
                    <div className={styles.timelineHeader}>
                      <div className={styles.fieldNameCol}/>
                      <div className={styles.slotsRow}>
                        {allTimes.map(t => (
                          <div key={t} className={styles.timeLabel}>{t}</div>
                        ))}
                      </div>
                    </div>

                    {/* rows */}
                    {fList.map(field => {
                      const slots = slotsMap[field.id] || []
                      // Map time → slot
                      const slotByTime = {}
                      slots.forEach(s => { slotByTime[fmt(s.startTime)] = s })

                      return (
                        <div key={field.id} className={styles.timelineRow}>
                          <div className={styles.fieldNameCol}>
                            <span className={styles.fieldNameText}>{field.name}</span>
                            <span className={`badge badge-gray`} style={{fontSize:11}}>{field.type}</span>
                          </div>
                          <div className={styles.slotsRow}>
                            {allTimes.map(t => {
                              const slot = slotByTime[t]
                              if (!slot) return (
                                <div key={t} className={`${styles.slotCell} ${styles.slotNone}`}/>
                              )
                              const st = slotStatus(slot)
                              const selectable = canSelectSlot(slot)
                              const isSelected = st === 'selected'
                              const hide = filterAvail && slot.status !== 'AVAILABLE' && !isSelected
                              return (
                                <div
                                  key={t}
                                  title={`${field.name} · ${fmt(slot.startTime)} - ${addMinutes(fmt(slot.startTime), SLOT_PLAY)}`}
                                  className={[
                                    styles.slotCell,
                                    styles[`slot_${st}`],
                                    selectable && !isSelected ? styles.slotSelectable : '',
                                    hide ? styles.slotDim : '',
                                  ].join(' ')}
                                  onClick={() => toggleSlot(slot)}
                                >
                                  {isSelected && <span className={styles.slotCheck}>✓</span>}
                                  {!isSelected && slot.status === 'AVAILABLE' && (
                                    <span className={styles.slotTime}>{fmt(slot.startTime)}</span>
                                  )}
                                  {slot.status === 'BOOKED'  && <span className={styles.slotIcon}>🔒</span>}
                                  {slot.status === 'CLOSED'  && <span className={styles.slotIcon}>✕</span>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* spacer so sticky panel doesn't cover last row */}
        <div style={{height: selected.length ? 200 : 0}}/>
      </div>

      {/* ── Booking Summary Panel (sticky bottom) ──────── */}
      {selected.length > 0 && summary && (
        <div className={styles.summaryPanel}>
          <div className={`container ${styles.summaryInner}`}>
            <div className={styles.summaryLeft}>
              <div className={styles.summaryField}>
                ⚽ <strong>{fields.find(f => f.id === selected[0].fieldId)?.name || 'Sân'}</strong>
              </div>
              <div className={styles.summarySlots}>
                {summary.sorted.map(s => (
                  <span key={s.id} className={styles.summarySlotTag}>
                    ✓ {fmt(s.startTime)} – {addMinutes(fmt(s.startTime), SLOT_PLAY)}
                  </span>
                ))}
              </div>
              <div className={styles.summaryMeta}>
                🕐 Sử dụng thực tế: <strong>{summary.first} – {summary.endTime}</strong>
                &nbsp;·&nbsp;{summary.count} slot liên tiếp
                {summary.breakMins > 0 && <>&nbsp;·&nbsp;bao gồm {summary.breakMins} phút dọn sân</>}
                &nbsp;·&nbsp;⏱ {summary.durationLabel}
              </div>
            </div>

            <div className={styles.summaryRight}>
              <div className={styles.summaryPrice}>
                {totalPrice.toLocaleString('vi-VN')}₫
              </div>
              <button
                className={`btn btn-primary ${styles.summaryBtn}`}
                onClick={() => {
                  // TODO: navigate to checkout với slot IDs
                  const ids = selected.map(s => s.id).join(',')
                  navigate(`/booking/confirm?slots=${ids}`)
                }}
              >
                Tiếp tục →
              </button>
              <button
                className={styles.summaryClear}
                onClick={() => setSelected([])}
              >
                Xóa chọn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
