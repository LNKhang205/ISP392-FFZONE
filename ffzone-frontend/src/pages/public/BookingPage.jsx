import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useCustomerOnly } from '../../hooks/useCustomerOnly'
import styles from './BookingPage.module.css'

// ─── Constants ────────────────────────────────────────────────
const TYPE_CONFIG = {
  '5V5': { label: 'Sân 5 người', icon: '⚽', subtitle: '5 vs 5', headerClass: 'typeHeader5v5', badgeClass: 'badge5v5' },
  '7V7': { label: 'Sân 7 người', icon: '🏟️', subtitle: '7 vs 7', headerClass: 'typeHeader7v7', badgeClass: 'badge7v7' },
  '9V9': { label: 'Sân 9 người', icon: '🏆', subtitle: '9 vs 9', headerClass: 'typeHeader9v9', badgeClass: 'badge9v9' },
}
const STATUS_COLOR = { AVAILABLE: 'avail', PENDING: 'booked', OCCUPIED: 'booked', BOOKED: 'booked', CLOSED: 'closed' }
const MAX_SELECT  = 3
const SLOT_PLAY   = 60
const SLOT_BREAK  = 15

// ─── Helpers ──────────────────────────────────────────────────
function buildNext7Days() {
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    const label = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai'
      : d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
    const dayName = d.toLocaleDateString('vi-VN', { weekday: 'long' })
    days.push({ iso, label, dayName })
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

// FIX Bug 3: kiểm tra slot đã qua giờ hiện tại chưa
function isSlotPast(slotStartTime, selDate) {
  const now = new Date()
  const todayIso = now.toISOString().split('T')[0]
  if (selDate > todayIso) return false
  if (selDate < todayIso) return true
  const [h, m] = slotStartTime.split(':').map(Number)
  const slotMinutes = h * 60 + m
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return slotMinutes + SLOT_PLAY <= nowMinutes
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

// ─── Component ────────────────────────────────────────────────
export default function BookingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const guard = useCustomerOnly()
  const preFieldId = searchParams.get('fieldId')

  const days = buildNext7Days()
  const [selDate,     setSelDate]    = useState(days[0].iso)
  const [filterType,  setFilterType] = useState('ALL')
  const [filterField, setFilterField]= useState(preFieldId || 'ALL')
  const [filterAvail, setFilterAvail]= useState(false)

  const [fields,    setFields]    = useState([])
  const [slotsMap,  setSlotsMap]  = useState({})
  const [loading,   setLoading]   = useState(true)
  const [collapsed, setCollapsed] = useState({})
  const [selected,  setSelected]  = useState([])

  // Load fields
  useEffect(() => {
    api.get('/fields/active').then(r => setFields(r.data)).catch(() => {})
  }, [])

  // Load slots
  useEffect(() => {
    if (fields.length === 0) return
    setLoading(true)
    setSelected([])

    const fieldsToLoad = filterField !== 'ALL'
      ? fields.filter(f => f.id === filterField)
      : fields

    if (!fieldsToLoad.length) { setLoading(false); return }

    Promise.all(
      fieldsToLoad.map(f =>
        api.get(`/field-slots/field/${f.id}?date=${selDate}`)
          .then(sRes => ({ fieldId: f.id, slots: sRes.data }))
      )
    ).then(results => {
      const sm = {}
      results.forEach(r => { sm[r.fieldId] = r.slots })
      setSlotsMap(sm)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selDate, filterField, fields])

  useEffect(() => {
    if (preFieldId) setFilterField(preFieldId)
  }, [preFieldId])

  // FIX Bug 2: thêm fieldId vào slot khi toggle, và fix điều kiện canSelect
  const toggleSlot = useCallback((slot, fieldId) => {
    if (slot.status !== 'AVAILABLE') return
    if (isSlotPast(fmt(slot.startTime), selDate)) return
    const slotWithField = { ...slot, fieldId }
    setSelected(prev => {
      const exists = prev.find(s => s.id === slot.id)
      if (exists) return prev.filter(s => s.id !== slot.id)
      if (prev.length > 0 && prev[0].fieldId !== fieldId) return prev
      if (prev.length >= MAX_SELECT) return prev
      const next = [...prev, slotWithField].sort((a, b) => fmt(a.startTime).localeCompare(fmt(b.startTime)))
      for (let i = 0; i < next.length - 1; i++) {
        const expectedNext = addMinutes(fmt(next[i].startTime), SLOT_PLAY + SLOT_BREAK)
        if (fmt(next[i + 1].startTime) !== expectedNext) return prev
      }
      return next
    })
  }, [selDate])

  const canSelectSlot = (slot, fieldId) => {
    if (slot.status !== 'AVAILABLE') return false
    if (isSlotPast(fmt(slot.startTime), selDate)) return false
    if (selected.length === 0) return true
    if (selected[0].fieldId !== fieldId) return false
    if (selected.length >= MAX_SELECT) return false
    const sorted = [...selected].sort((a, b) => fmt(a.startTime).localeCompare(fmt(b.startTime)))
    const firstTime = fmt(sorted[0].startTime)
    const lastTime  = fmt(sorted[sorted.length - 1].startTime)
    const prevExpected = addMinutes(firstTime, -(SLOT_PLAY + SLOT_BREAK))
    const nextExpected = addMinutes(lastTime, SLOT_PLAY + SLOT_BREAK)
    return fmt(slot.startTime) === prevExpected || fmt(slot.startTime) === nextExpected
  }

  const slotStatus = (slot, fieldId) => {
    if (selected.find(s => s.id === slot.id)) return 'selected'
    if (isSlotPast(fmt(slot.startTime), selDate)) return 'closed'  // FIX Bug 3
    return STATUS_COLOR[slot.status] || 'avail'
  }

  // Grouped fields
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

  const summary    = calcSummary(selected)
  const totalPrice = selected.reduce((sum, s) => sum + Number(s.price || 0), 0)
  const selectedDay = days.find(d => d.iso === selDate)

  return (
    <div className={styles.page}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className={styles.header}>
        <div className="container">
          <div className={styles.headerTop}>
            <div>
              <h1 className={styles.title}>⚽ Đặt sân bóng</h1>
              <p className={styles.sub}>Chọn ngày, loại sân và khung giờ phù hợp</p>
            </div>
          </div>
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
          <div className={styles.infoItem}><span>ℹ️</span> Mỗi slot: <strong>60 phút</strong> thi đấu</div>
          <div className={styles.infoItem}><span>⏱️</span> Nghỉ giữa slot: <strong>15 phút</strong></div>
          <div className={styles.infoItem}><span>📌</span> Tối đa <strong>3 slot liên tiếp</strong></div>
          <div className={styles.infoItem}><span>📅</span> Ngày: <strong>{selectedDay?.dayName} {selDate}</strong></div>
        </div>

        {/* ── Filters ────────────────────────────────────── */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Loại sân</label>
            <div className={styles.filterBtns}>
              {[['ALL','Tất cả'],['5V5','⚽ Sân 5'],['7V7','🏟️ Sân 7'],['9V9','🏆 Sân 9']].map(([k,v]) => (
                <button key={k}
                  className={`${styles.filterBtn} ${filterType === k ? styles.filterBtnActive : ''}`}
                  onClick={() => setFilterType(k)}>{v}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.filterGroup}>
            <label>Sân cụ thể</label>
            <select className={styles.filterSelect} value={filterField}
              onChange={e => setFilterField(e.target.value)}>
              <option value="ALL">Tất cả sân</option>
              {fields.map(f => <option key={f.id} value={f.id}>{f.name} ({f.type})</option>)}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Tình trạng</label>
            <button
              className={`${styles.filterBtn} ${filterAvail ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterAvail(v => !v)}
            >
              {filterAvail ? '🟢 Chỉ còn trống' : '🔘 Tất cả'}
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
        ) : Object.keys(grouped).length === 0 ? (
          <div className={styles.empty}>
            <span>📅</span>
            <h3>Chưa có slot nào cho ngày này</h3>
            <p>Vui lòng chọn ngày khác hoặc liên hệ để biết thêm.</p>
          </div>
        ) : (
          <div className={styles.scheduleWrap}>
            {Object.entries(grouped).map(([type, fList]) => {
              const cfg = TYPE_CONFIG[type] || TYPE_CONFIG['5V5']

              // FIX Bug 1: allTimes tính riêng theo từng type group
              const typeTimes = [...new Set(
                fList.flatMap(f => (slotsMap[f.id] || []).map(s => fmt(s.startTime)))
              )].sort()

              return (
                <div key={type} className={styles.typeGroup}>
                  <button
                    className={`${styles.typeHeader} ${styles[cfg.headerClass]}`}
                    onClick={() => setCollapsed(c => ({ ...c, [type]: !c[type] }))}
                  >
                    <span className={styles.typeIcon}>{cfg.icon}</span>
                    <span className={styles.typeTitle}>{cfg.label}</span>
                    <span className={styles.typeSubtitle}>({cfg.subtitle})</span>
                    <span className={styles.typeCount}>{fList.length} sân</span>
                    <span className={styles.typeChevron}>{collapsed[type] ? '▶' : '▼'}</span>
                  </button>

                  {!collapsed[type] && (
                    <div className={styles.timelineOuter}>
                      {/* Time header */}
                      <div className={styles.timelineHeader}>
                        <div className={styles.fieldNameCol}/>
                        <div className={styles.slotsRow}>
                          {typeTimes.map(t => (
                            <div key={t} className={styles.timeLabel}>{t}</div>
                          ))}
                        </div>
                      </div>

                      {/* Field rows */}
                      {fList.map(field => {
                        const slots = slotsMap[field.id] || []
                        const slotByTime = {}
                        slots.forEach(s => { slotByTime[fmt(s.startTime)] = s })

                        return (
                          <div key={field.id} className={styles.timelineRow}>
                            <div className={styles.fieldNameCol}>
                              <span className={styles.fieldNameText}>{field.name}</span>
                              <span className={`${styles.fieldTypeBadge} ${styles[cfg.badgeClass]}`}>
                                {cfg.icon} {field.type}
                              </span>
                            </div>
                            <div className={styles.slotsRow}>
                              {typeTimes.map(t => {
                                const slot = slotByTime[t]
                                if (!slot) return (
                                  <div key={t} className={`${styles.slotCell} ${styles.slot_closed}`}/>
                                )
                                const st = slotStatus(slot, field.id)
                                const selectable = canSelectSlot(slot, field.id)
                                const isSelected = st === 'selected'
                                const isPast = isSlotPast(fmt(slot.startTime), selDate)
                                const hide = filterAvail && slot.status !== 'AVAILABLE' && !isSelected
                                return (
                                  <div
                                    key={t}
                                    title={`${field.name} - ${fmt(slot.startTime)}-${addMinutes(fmt(slot.startTime), SLOT_PLAY)} - ${Number(slot.price || 0).toLocaleString('vi-VN')} VND`}
                                    className={[
                                      styles.slotCell,
                                      styles[`slot_${st}`],
                                      selectable && !isSelected ? styles.slotSelectable : '',
                                      hide ? styles.slotDim : '',
                                    ].join(' ')}
                                    onClick={() => !isPast && toggleSlot(slot, field.id)}
                                  >
                                    {isSelected && <span className={styles.slotCheck}>✓</span>}
                                    {!isSelected && !isPast && slot.status === 'AVAILABLE' && (
                                      <span className={styles.slotTime}>{fmt(slot.startTime)}</span>
                                    )}
                                    {!isSelected && isPast && (
                                      <span className={styles.slotIcon}>🔒</span>
                                    )}
                                    {!isPast && (['BOOKED', 'PENDING', 'OCCUPIED'].includes(slot.status)) && (
                                      <span className={styles.slotIcon}>🔒</span>
                                    )}
                                    {!isPast && slot.status === 'CLOSED' && <span className={styles.slotIcon}>✕</span>}
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
              )
            })}
          </div>
        )}

        <div style={{ height: selected.length ? 180 : 0 }}/>
      </div>

      {/* ── Summary Panel ──────────────────────────────────── */}
      {selected.length > 0 && summary && (
        <div className={styles.summaryPanel}>
          <div className={`container ${styles.summaryInner}`}>
            <div className={styles.summaryLeft}>
              <div className={styles.summaryField}>
                ⚽ <strong>{fields.find(f => f.id === selected[0].fieldId)?.name}</strong>
                &nbsp;·&nbsp;{selDate}
              </div>
              <div className={styles.summarySlots}>
                {summary.sorted.map(s => (
                  <span key={s.id} className={styles.summarySlotTag}>
                    ✓ {fmt(s.startTime)}–{addMinutes(fmt(s.startTime), SLOT_PLAY)}
                  </span>
                ))}
              </div>
              <div className={styles.summaryMeta}>
                🕐 Sử dụng: <strong style={{color:'#fff'}}>{summary.first} – {summary.endTime}</strong>
                &nbsp;·&nbsp;{summary.count} slot · ⏱ {summary.durationLabel}
                {summary.breakMins > 0 && <> · gồm {summary.breakMins} phút dọn sân</>}
              </div>
            </div>
            <div className={styles.summaryRight}>
              <div className={styles.summaryPrice}>
                {totalPrice.toLocaleString('vi-VN')}₫
              </div>
              <button
                className={`${styles.summaryBtn}`}
                onClick={guard(() => {
                  const ids = selected.map(s => s.id).join(',')
                  navigate(`/booking/confirm?slots=${ids}`)
                })}
              >
                Tiếp tục →
              </button>
              <button className={styles.summaryClear} onClick={() => setSelected([])}>
                Xóa chọn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
