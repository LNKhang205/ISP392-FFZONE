import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api'
import styles from './PricingManagement.module.css'

// ── Hằng số ─────────────────────────────────────────────────────
// DEFAULT_PRICES removed — giá lấy từ DB thực tế
const TYPE_LABEL = {
  '5V5': 'Sân 5 người', '7V7': 'Sân 7 người', '9V9': 'Sân 9 người',
  'FIVE_VS_FIVE': 'Sân 5 người', 'SEVEN_VS_SEVEN': 'Sân 7 người', 'NINE_VS_NINE': 'Sân 9 người',
}

function vnd(n) {
  if (n == null || n === '') return '—'
  return Number(n).toLocaleString('vi-VN') + '₫'
}
function calcWeekend(wd) {
  if (!wd) return null
  return Math.ceil((Number(wd) * 1.25) / 1000) * 1000
}
function todayStr() {
  return new Date().toISOString().split('T')[0]
}
function statusOf(from, to) {
  const now = todayStr()
  if (to && to < now) return 'expired'
  if (from > now) return 'upcoming'
  return 'active'
}
const STATUS_STYLE = {
  active:   { background: '#dcfce7', color: '#166534' },
  upcoming: { background: '#fef9c3', color: '#854d0e' },
  expired:  { background: '#f3f4f6', color: '#6b7280' },
}
const STATUS_LABEL = { active: 'Đang áp dụng', upcoming: 'Sắp tới', expired: 'Đã hết hạn' }

function normalizeType(t) {
  if (!t) return ''
  const m = { FIVE_VS_FIVE: '5V5', SEVEN_VS_SEVEN: '7V7', NINE_VS_NINE: '9V9' }
  return m[t] || t
}

// ── Shared components ────────────────────────────────────────────
function Modal({ title, wide, onClose, children }) {
  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.modal} ${wide ? styles.modalWide : ''}`}>
        <div className={styles.modalHeader}>
          <h2>{title}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  )
}
function FormGroup({ label, required, hint, children }) {
  return (
    <div className={styles.formGroup}>
      <label>{label}{required && <span className={styles.req}> *</span>}</label>
      {children}
      {hint && <small className={styles.hint}>{hint}</small>}
    </div>
  )
}
function ModalFooter({ onCancel, onSave, saving, saveLabel = '💾 Lưu' }) {
  return (
    <div className={styles.modalFooter}>
      <button className={styles.btnCancel} onClick={onCancel}>Hủy</button>
      <button className={styles.btnGreen} onClick={onSave} disabled={saving}>
        {saving ? '⏳ Đang lưu...' : saveLabel}
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TAB 1 — BẢNG GIÁ SÂN
// ════════════════════════════════════════════════════════════════
function TabFieldPricing({ fields }) {
  const [pricings, setPricings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [editModal, setEditModal]   = useState(null)
  const [applyModal, setApplyModal] = useState(null)
  const [form, setForm]             = useState({})
  const [saving, setSaving]         = useState(false)
  const [msg, setMsg]               = useState('')
  const [applyMsg, setApplyMsg]     = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get('/field-pricings')
      .then(r => {
        console.log('[Pricing] raw API response:', r.data)
        // Lấy bản ghi WEEKDAY active mới nhất (effectiveFrom lớn nhất) cho mỗi sân
        const map = {}
        r.data
          .filter(p => p.dayOfWeek === 'WEEKDAY' && (p.isActive !== false && p.active !== false))
          .forEach(p => {
            const existing = map[p.fieldId]
            if (!existing || (p.effectiveFrom || '') > (existing.effectiveFrom || '')) {
              map[p.fieldId] = p
            }
          })
        console.log('[Pricing] after filter map:', map)
        setPricings(Object.values(map))
      })
      .catch(e => { console.error('[Pricing] API error:', e); setPricings([]) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const grouped = Object.entries({ '5V5': 'Sân 5 người', '7V7': 'Sân 7 người', '9V9': 'Sân 9 người' }).map(([type, label]) => {
    const fieldsOfType = fields.filter(f => normalizeType(f.type) === type)
    return { type, label, fields: fieldsOfType }
  }).filter(g => g.fields.length > 0)

  const getPricing = (fieldId) => pricings.find(p => p.fieldId === fieldId)

  // Giá thực từ DB: lấy giá trung bình (hoặc giá phổ biến nhất) của từng loại sân
  const getTypePrice = (type) => {
    const typePricings = pricings.filter(p => {
      const field = fields.find(f => f.id === p.fieldId)
      return field && normalizeType(field.type) === type
    })
    if (typePricings.length === 0) return null
    // Lấy giá xuất hiện nhiều nhất trong loại sân này
    const freq = {}
    typePricings.forEach(p => { freq[p.price] = (freq[p.price] || 0) + 1 })
    return Number(Object.entries(freq).sort((a,b) => b[1]-a[1])[0][0])
  }

  const openEdit = (field) => {
    const p = getPricing(field.id)
    setForm({
      fieldId:      field.id,
      fieldName:    field.name,
      weekdayPrice: p?.price || '',
      startTime:    p?.startTime?.substring(0, 5) || '05:00',
      endTime:      p?.endTime?.substring(0, 5)   || '23:30',
      effectiveFrom: todayStr(),
    })
    setMsg('')
    setEditModal(true)
  }

  const openApplyType = (type) => {
    const dbPrice = getTypePrice(type)
    setForm({
      type,
      weekdayPrice: dbPrice || '',
      startTime: '05:00',
      endTime: '23:30',
      effectiveFrom: todayStr(),
    })
    setApplyMsg('')
    setApplyModal(type)
  }

  const handleSaveOne = async () => {
    if (!form.weekdayPrice) { setMsg('Vui lòng nhập giá ngày thường'); return }
    setSaving(true); setMsg('')
    try {
      await api.post(`/field-pricings/field/${form.fieldId}`, {
        weekdayPrice:  Number(form.weekdayPrice),
        startTime:     form.startTime,
        endTime:       form.endTime,
        effectiveFrom: form.effectiveFrom || null,
      })
      setEditModal(null); load()
    } catch (e) {
      setMsg(e.response?.data?.message || 'Lỗi khi lưu')
    } finally { setSaving(false) }
  }

  const handleApplyAll = async () => {
    if (!form.weekdayPrice) { setApplyMsg('Vui lòng nhập giá'); return }
    setSaving(true); setApplyMsg('')
    try {
      const typeFields = fields.filter(f => normalizeType(f.type) === form.type)
      const count = await api.post('/field-pricings/bulk-apply', {
        fieldIds:      typeFields.map(f => f.id),
        weekdayPrice:  Number(form.weekdayPrice),
        startTime:     form.startTime,
        endTime:       form.endTime,
        effectiveFrom: form.effectiveFrom || null,
      })
      setApplyMsg(`✅ Đã áp giá cho ${count.data} sân`)
      setTimeout(() => { setApplyModal(null); load() }, 1200)
    } catch (e) {
      setApplyMsg('❌ ' + (e.response?.data?.message || 'Lỗi'))
    } finally { setSaving(false) }
  }

  const wkPreview = calcWeekend(form.weekdayPrice)

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Bảng giá sân</h2>
          <p className={styles.sectionDesc}>Giá cuối tuần = giá ngày thường × 1.25 (tự động tính)</p>
        </div>
      </div>

      {/* Cards giá thực từ DB — hiển thị giá phổ biến nhất của từng loại sân */}
      <div className={styles.defaultPriceRow}>
        {['5V5', '7V7', '9V9'].map(type => {
          const price = getTypePrice(type)
          const hasPrice = price != null
          return (
            <div key={type} className={styles.defaultPriceCard}>
              <div className={styles.defaultPriceType}>{TYPE_LABEL[type]}</div>
              {loading ? (
                <div className={styles.defaultPriceVal} style={{fontSize:14,opacity:.7}}>Đang tải...</div>
              ) : hasPrice ? (
                <>
                  <div className={styles.defaultPriceVal}>{vnd(price)}<span>/giờ</span></div>
                  <div className={styles.defaultPriceWE}>Cuối tuần: {vnd(calcWeekend(price))}</div>
                </>
              ) : (
                <>
                  <div className={styles.defaultPriceVal} style={{fontSize:14,opacity:.7}}>Chưa có giá</div>
                  <div className={styles.defaultPriceWE}>—</div>
                </>
              )}
              <button className={styles.btnApplyType} onClick={() => openApplyType(type)}>
                ⚡ Áp cho tất cả {TYPE_LABEL[type].toLowerCase()}
              </button>
            </div>
          )
        })}
      </div>

      {/* Bảng chi tiết từng sân */}
      {loading ? <p className={styles.loading}>Đang tải...</p>
        : grouped.map(g => (
          <div key={g.type} className={styles.group}>
            <div className={styles.groupHeader}>
              <span>⚽</span>
              <span className={styles.groupTitle}>{g.label}</span>
              <span className={styles.groupCount}>{g.fields.length} sân</span>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sân</th>
                  <th className={styles.numCol}>Giá ngày thường</th>
                  <th className={styles.numCol}>Giá cuối tuần</th>
                  <th>Hiệu lực từ</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {g.fields.map(field => {
                  const p = getPricing(field.id)
                  const wd = p?.price || null
                  const hasCustom = !!p
                  return (
                    <tr key={field.id}>
                      <td className={styles.bold}>{field.name}</td>
                      <td className={styles.numCol}><strong>{vnd(wd)}</strong></td>
                      <td className={`${styles.numCol} ${styles.weekendPrice}`}>{vnd(calcWeekend(wd))}</td>
                      <td className={styles.mono}>{p?.effectiveFrom || '—'}</td>
                      <td>
                        {hasCustom
                          ? <span className={styles.badge} style={{ background: '#dcfce7', color: '#166534' }}>Đã tùy chỉnh</span>
                          : <span className={styles.badge} style={{ background: '#f3f4f6', color: '#6b7280' }}>Mặc định</span>
                        }
                      </td>
                      <td>
                        <button className={styles.btnEdit} onClick={() => openEdit(field)}>✏️ Sửa</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))
      }

      {/* Modal sửa 1 sân */}
      {editModal && (
        <Modal title={`✏️ Cập nhật giá: ${form.fieldName}`} onClose={() => setEditModal(null)}>
          <FormGroup label="Giá ngày thường (₫)" required>
            <input type="number" className={styles.input} min={0} step={1000}
              value={form.weekdayPrice}
              onChange={e => setForm(f => ({ ...f, weekdayPrice: e.target.value }))} />
          </FormGroup>
          {wkPreview > 0 && (
            <div className={styles.autoCalc}>
              <span>Giá cuối tuần:</span>
              <strong>{vnd(wkPreview)}</strong>
              <span className={styles.formula}>= {vnd(form.weekdayPrice)} × 1.25</span>
            </div>
          )}
          <div className={styles.formRow}>
            <FormGroup label="Giờ mở cửa">
              <input type="time" className={styles.input} value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Giờ đóng cửa">
              <input type="time" className={styles.input} value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </FormGroup>
          </div>
          <FormGroup label="Hiệu lực từ ngày">
            <input type="date" className={styles.input} value={form.effectiveFrom}
              onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
          </FormGroup>
          {msg && <p className={styles.errMsg}>❌ {msg}</p>}
          <ModalFooter onCancel={() => setEditModal(null)} onSave={handleSaveOne} saving={saving} />
        </Modal>
      )}

      {/* Modal áp dụng theo loại sân */}
      {applyModal && (
        <Modal title={`⚡ Áp giá cho tất cả ${TYPE_LABEL[applyModal]}`} onClose={() => setApplyModal(null)}>
          <p className={styles.applyNote}>
            Sẽ áp dụng giá này cho <strong>tất cả {fields.filter(f => normalizeType(f.type) === applyModal).length} sân loại {TYPE_LABEL[applyModal]}</strong>.
          </p>
          <FormGroup label="Giá ngày thường (₫)" required>
            <input type="number" className={styles.input} min={0} step={1000}
              value={form.weekdayPrice}
              onChange={e => setForm(f => ({ ...f, weekdayPrice: e.target.value }))} />
          </FormGroup>
          {calcWeekend(form.weekdayPrice) > 0 && (
            <div className={styles.autoCalc}>
              <span>Giá cuối tuần:</span>
              <strong>{vnd(calcWeekend(form.weekdayPrice))}</strong>
              <span className={styles.formula}>× 1.25</span>
            </div>
          )}
          <div className={styles.formRow}>
            <FormGroup label="Giờ mở cửa">
              <input type="time" className={styles.input} value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Giờ đóng cửa">
              <input type="time" className={styles.input} value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </FormGroup>
          </div>
          <FormGroup label="Hiệu lực từ ngày">
            <input type="date" className={styles.input} value={form.effectiveFrom}
              onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
          </FormGroup>
          {applyMsg && <p className={styles.bulkMsg}>{applyMsg}</p>}
          <ModalFooter onCancel={() => setApplyModal(null)} onSave={handleApplyAll}
            saving={saving} saveLabel="⚡ Áp dụng tất cả" />
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TAB 2 — GIÁ NGÀY LỄ
// Tạo holiday: chọn tất cả hoặc chọn từng sân, nhập % tăng, preview giá
// ════════════════════════════════════════════════════════════════
function TabHolidayPricing({ fields }) {
  const [holidays, setHolidays]       = useState([])
  const [basePrices, setBasePrices]   = useState({})   // fieldId → weekday price
  const [loading, setLoading]         = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal]     = useState(null)
  const [form, setForm]               = useState({
    holidayName: '', effectiveFrom: '', effectiveTo: '',
    increasePercentage: '', targetAll: true, fieldIds: [],
  })
  const [editForm, setEditForm]       = useState({ effectiveFrom: '', effectiveTo: '' })
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState('')
  const [editMsg, setEditMsg]         = useState('')

  const load = () => {
    setLoading(true)
    api.get('/field-pricings/holidays')
      .then(r => setHolidays(r.data))
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false))
  }

  // Load giá ngày thường của từng sân để preview
  const loadBasePrices = useCallback(() => {
    api.get('/field-pricings').then(r => {
      const map = {}
      r.data.filter(p => p.dayOfWeek === 'WEEKDAY' && (p.isActive !== false && p.active !== false))
        .forEach(p => { map[p.fieldId] = Number(p.price) })
      setBasePrices(map)
    }).catch(() => {})
  }, [])

  useEffect(() => { load(); loadBasePrices() }, [loadBasePrices])

  const getBasePrice = (fieldId, fieldType) => {
    if (basePrices[fieldId]) return basePrices[fieldId]
    const t = normalizeType(fieldType)
    const fallback = { '5V5': 200000, '7V7': 240000, '9V9': 300000 }
    return fallback[t] || 200000
  }

  const calcHolidayPrice = (fieldId, fieldType, pct) => {
    if (!pct) return null
    const base = getBasePrice(fieldId, fieldType)
    return Math.ceil(base * (1 + Number(pct) / 100) / 1000) * 1000
  }

  // Nhóm holiday theo tên dịp lễ
  const groups = Object.values(
    holidays.reduce((acc, h) => {
      const key = h.holidayName || 'Không tên'
      if (!acc[key]) acc[key] = { name: key, from: h.effectiveFrom, to: h.effectiveTo, rows: [] }
      acc[key].rows.push(h)
      return acc
    }, {})
  ).sort((a, b) => (b.from || '').localeCompare(a.from || ''))

  const openCreate = () => {
    setForm({ holidayName: '', effectiveFrom: '', effectiveTo: '', increasePercentage: '', targetAll: true, fieldIds: [] })
    setMsg('')
    setCreateModal(true)
  }

  const toggleField = (id) => {
    setForm(f => ({
      ...f,
      fieldIds: f.fieldIds.includes(id) ? f.fieldIds.filter(x => x !== id) : [...f.fieldIds, id]
    }))
  }

  const previewFields = form.targetAll ? fields : fields.filter(f => form.fieldIds.includes(f.id))

  const handleCreate = async () => {
    if (!form.holidayName)        { setMsg('Vui lòng nhập tên dịp lễ'); return }
    if (!form.effectiveFrom)      { setMsg('Vui lòng chọn ngày bắt đầu'); return }
    if (!form.effectiveTo)        { setMsg('Vui lòng chọn ngày kết thúc'); return }
    if (!form.increasePercentage) { setMsg('Vui lòng nhập % tăng giá'); return }
    if (form.effectiveTo < form.effectiveFrom) { setMsg('Ngày kết thúc phải sau ngày bắt đầu'); return }
    if (!form.targetAll && form.fieldIds.length === 0) { setMsg('Vui lòng chọn ít nhất 1 sân'); return }
    const pct = Number(form.increasePercentage)
    if (isNaN(pct) || pct <= 0 || pct > 500) { setMsg('% tăng giá phải từ 1 đến 500'); return }

    setSaving(true); setMsg('')
    try {
      const payload = {
        holidayName:        form.holidayName,
        effectiveFrom:      form.effectiveFrom,
        effectiveTo:        form.effectiveTo,
        increasePercentage: pct,
      }
      // Nếu chọn riêng sân thì gửi fieldIds, không gửi → backend áp tất cả
      if (!form.targetAll && form.fieldIds.length > 0) {
        payload.fieldIds = form.fieldIds
      }

      const created = await api.post('/field-pricings/holiday/bulk', payload)

      // Sync giá các slot đã sinh trong khoảng ngày lễ
      const allFieldIds = [...new Set(created.data.map(p => p.fieldId))]
      if (allFieldIds.length > 0) {
        try {
          await api.post('/field-slots/apply-holiday', {
            fieldIds:          allFieldIds,
            from:              form.effectiveFrom,
            to:                form.effectiveTo,
            adjustmentPercent: pct,
          })
        } catch (slotErr) {
          console.warn('Sync slot không thành công:', slotErr)
          // Không block — pricing đã lưu thành công
        }
      }

      setCreateModal(false)
      load()
    } catch (e) {
      const errMsg = e.response?.data?.message || JSON.stringify(e.response?.data) || e.message || 'Lỗi khi lưu'
      setMsg(`❌ ${errMsg}`)
    } finally { setSaving(false) }
  }

  const openEditDates = (g) => {
    setEditForm({ holidayName: g.name, effectiveFrom: g.from, effectiveTo: g.to })
    setEditMsg('')
    setEditModal(g)
  }

  const handleUpdateDates = async () => {
    if (!editForm.effectiveFrom || !editForm.effectiveTo) { setEditMsg('Vui lòng chọn đủ ngày'); return }
    if (editForm.effectiveTo < editForm.effectiveFrom) { setEditMsg('Ngày kết thúc phải sau ngày bắt đầu'); return }
    setSaving(true); setEditMsg('')
    try {
      await api.put('/field-pricings/holiday/update-dates', {
        holidayName:   editModal.name,
        effectiveFrom: editForm.effectiveFrom,
        effectiveTo:   editForm.effectiveTo,
      })

      // Sync slot giá mới cho khoảng ngày vừa cập nhật
      const fieldIds = editModal.rows.map(r => r.fieldId)
      try {
        await api.post('/field-slots/apply-holiday', {
          fieldIds,
          from:              editForm.effectiveFrom,
          to:                editForm.effectiveTo,
          adjustmentPercent: 0, // 0 = dùng giá từ field_pricing HOLIDAY đã lưu
        })
      } catch { /* không block */ }

      setEditModal(null)
      load()
    } catch (e) {
      setEditMsg(e.response?.data?.message || 'Lỗi khi cập nhật')
    } finally { setSaving(false) }
  }

  const handleDeleteGroup = async (g) => {
    if (!window.confirm(`Xóa toàn bộ giá ngày lễ "${g.name}"? Giá slot không bị ảnh hưởng.`)) return
    try {
      await Promise.all(g.rows.map(r => api.delete(`/field-pricings/${r.id}`)))
      load()
    } catch (e) { alert('Lỗi: ' + (e.response?.data?.message || e.message)) }
  }

  const pct = Number(form.increasePercentage)

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Giá ngày lễ</h2>
          <p className={styles.sectionDesc}>
            Tăng giá theo % so với giá ngày thường · Tự động áp vào slot đã sinh · Có thể sửa thời gian và tái sử dụng
          </p>
        </div>
        <button className={styles.btnGreen} onClick={openCreate}>+ Thêm giá ngày lễ</button>
      </div>

      {loading ? <p className={styles.loading}>Đang tải...</p>
        : groups.length === 0
          ? (
            <div className={styles.emptyBox}>
              <div className={styles.emptyIcon}>🎉</div>
              <p>Chưa có giá ngày lễ nào. Nhấn "Thêm giá ngày lễ" để bắt đầu.</p>
            </div>
          )
          : groups.map(g => {
            const st = statusOf(g.from, g.to)
            return (
              <div key={g.name} className={`${styles.group} ${st === 'expired' ? styles.groupExpired : ''}`}>
                <div className={styles.groupHeader}>
                  <span>🎉</span>
                  <span className={styles.groupTitle}>{g.name}</span>
                  <span className={styles.mono}>{g.from} → {g.to}</span>
                  <span className={styles.badge} style={STATUS_STYLE[st]}>{STATUS_LABEL[st]}</span>
                  <span className={styles.groupCount}>{g.rows.length} sân</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button className={styles.btnEdit} onClick={() => openEditDates(g)}>
                      📅 Sửa thời gian
                    </button>
                    <button className={styles.btnDel} onClick={() => handleDeleteGroup(g)}>
                      🗑️
                    </button>
                  </div>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Sân</th>
                      <th>Loại</th>
                      <th className={styles.numCol}>Giá ngày lễ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map(h => (
                      <tr key={h.id}>
                        <td className={styles.bold}>{h.fieldName}</td>
                        <td>
                          <span className={styles.typeBadge}>{TYPE_LABEL[h.fieldType] || h.fieldType}</span>
                        </td>
                        <td className={styles.numCol}>
                          <strong className={styles.holidayPrice}>{vnd(h.price)}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })
      }

      {/* ── Modal tạo giá ngày lễ ──────────────────────────── */}
      {createModal && (
        <Modal title="🎉 Thêm giá ngày lễ" wide onClose={() => setCreateModal(false)}>
          {/* Tên dịp lễ */}
          <FormGroup label="Tên dịp lễ" required>
            <input className={styles.input}
              placeholder="VD: Tết Nguyên Đán, Quốc khánh 2/9, Nghỉ hè"
              value={form.holidayName}
              onChange={e => setForm(f => ({ ...f, holidayName: e.target.value }))} />
          </FormGroup>

          {/* Khoảng thời gian */}
          <div className={styles.formRow}>
            <FormGroup label="Từ ngày" required>
              <input type="date" className={styles.input} value={form.effectiveFrom}
                onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Đến ngày" required>
              <input type="date" className={styles.input} value={form.effectiveTo}
                onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value }))} />
            </FormGroup>
          </div>

          {/* % tăng giá */}
          <FormGroup label="Tăng giá (%)" required
            hint="Nhập số % tăng so với giá ngày thường · VD: 30 = tăng 30%">
            <input type="number" className={styles.input} min={1} max={500} step={1}
              placeholder="VD: 30"
              value={form.increasePercentage}
              onChange={e => setForm(f => ({ ...f, increasePercentage: e.target.value }))} />
          </FormGroup>

          {/* Chọn sân áp dụng */}
          <div className={styles.formGroup}>
            <label>Áp dụng cho sân</label>
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="radio" checked={form.targetAll}
                  onChange={() => setForm(f => ({ ...f, targetAll: true, fieldIds: [] }))} />
                Tất cả sân ({fields.length} sân)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="radio" checked={!form.targetAll}
                  onChange={() => setForm(f => ({ ...f, targetAll: false }))} />
                Chọn sân cụ thể
              </label>
            </div>

            {!form.targetAll && (
              <div className={styles.bulkCard}>
                <div className={styles.checkHeader}>
                  <button className={styles.btnSelectAll}
                    onClick={() => setForm(f => ({
                      ...f,
                      fieldIds: f.fieldIds.length === fields.length ? [] : fields.map(x => x.id)
                    }))}>
                    {form.fieldIds.length === fields.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
                <div className={styles.checkGrid}>
                  {fields.map(field => {
                    const on = form.fieldIds.includes(field.id)
                    const typeKey = normalizeType(field.type)
                    return (
                      <label key={field.id}
                        className={`${styles.checkItem} ${on ? styles.checkItemOn : ''}`}>
                        <input type="checkbox" checked={on} onChange={() => toggleField(field.id)} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{field.name}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{TYPE_LABEL[typeKey]}</div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Preview giá từng sân */}
          {pct > 0 && previewFields.length > 0 && (
            <div className={styles.previewBox}>
              <div className={styles.previewTitle}>📋 Xem trước giá ngày lễ (+{pct}%)</div>
              <table className={styles.table} style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>Sân</th>
                    <th className={styles.numCol}>Giá gốc</th>
                    <th className={styles.numCol}>Giá ngày lễ</th>
                  </tr>
                </thead>
                <tbody>
                  {previewFields.map(field => {
                    const base = getBasePrice(field.id, field.type)
                    const holiday = calcHolidayPrice(field.id, field.type, pct)
                    return (
                      <tr key={field.id}>
                        <td className={styles.bold}>{field.name}</td>
                        <td className={styles.numCol} style={{ color: '#6b7280' }}>{vnd(base)}</td>
                        <td className={styles.numCol}>
                          <strong className={styles.holidayPrice}>{vnd(holiday)}</strong>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {msg && <p className={styles.errMsg}>{msg}</p>}
          <ModalFooter onCancel={() => setCreateModal(false)} onSave={handleCreate}
            saving={saving} saveLabel="🎉 Tạo giá ngày lễ" />
        </Modal>
      )}

      {/* ── Modal sửa thời gian ──────────────────────────────── */}
      {editModal && (
        <Modal title={`📅 Sửa thời gian: ${editModal.name}`} onClose={() => setEditModal(null)}>
          <p className={styles.applyNote}>
            Cập nhật thời gian áp dụng mà <strong>không cần tạo lại</strong> giá ngày lễ.
            Giá tiền các sân giữ nguyên và slot sẽ được cập nhật tự động.
          </p>
          <div className={styles.formRow}>
            <FormGroup label="Từ ngày" required>
              <input type="date" className={styles.input} value={editForm.effectiveFrom}
                onChange={e => setEditForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Đến ngày" required>
              <input type="date" className={styles.input} value={editForm.effectiveTo}
                onChange={e => setEditForm(f => ({ ...f, effectiveTo: e.target.value }))} />
            </FormGroup>
          </div>
          {editMsg && <p className={styles.errMsg}>❌ {editMsg}</p>}
          <ModalFooter onCancel={() => setEditModal(null)} onSave={handleUpdateDates}
            saving={saving} saveLabel="📅 Cập nhật" />
        </Modal>
      )}
    </div>
  )
}


// ════════════════════════════════════════════════════════════════
// TAB 3 — PREVIEW GIÁ 14 NGÀY
// Hiện thị giá thực tế từng sân × từng ngày trong 14 ngày tới
// Tính từ field-pricings + holidays, không cần API mới
// ════════════════════════════════════════════════════════════════
function buildNext14Days() {
  const days = []
  for (let i = 0; i < 14; i++) {
    const d = new Date()
    d.setHours(0,0,0,0)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    const dow = d.getDay() // 0=CN, 6=T7
    const isWE = dow === 0 || dow === 6
    const dayNames = ['CN','T2','T3','T4','T5','T6','T7']
    days.push({ iso, label: dayNames[dow], isWE })
  }
  return days
}

function isDateInHoliday(isoDate, holidays) {
  return holidays.find(h =>
    isoDate >= (h.effectiveFrom || '') && isoDate <= (h.effectiveTo || isoDate)
  ) || null
}

function getEffectiveWeekdayPrice(fieldId, isoDate, allPricings) {
  // Lấy bản ghi WEEKDAY có effectiveFrom <= isoDate, effectiveTo IS NULL hoặc >= isoDate,
  // ưu tiên bản effectiveFrom mới nhất (giá mới nhất có hiệu lực)
  const candidates = allPricings.filter(p =>
    p.fieldId === fieldId &&
    p.dayOfWeek === 'WEEKDAY' &&
    (p.isActive !== false && p.active !== false) &&
    (p.effectiveFrom || '') <= isoDate &&
    (p.effectiveTo == null || p.effectiveTo >= isoDate)
  )
  if (!candidates.length) return null
  candidates.sort((a,b) => (b.effectiveFrom||'').localeCompare(a.effectiveFrom||''))
  return Number(candidates[0].price)
}

function calcPriceForDay(fieldId, fieldType, isoDate, allPricings, holidays) {
  const holiday = isDateInHoliday(isoDate, holidays)
  if (holiday) {
    // Lấy giá HOLIDAY từ DB cho sân này trong khoảng ngày lễ đó
    const hP = allPricings.find(p =>
      p.fieldId === fieldId &&
      p.dayOfWeek === 'HOLIDAY' &&
      (p.isActive !== false && p.active !== false) &&
      p.holidayName === holiday.holidayName &&
      (p.effectiveFrom || '') <= isoDate &&
      (p.effectiveTo == null || p.effectiveTo >= isoDate)
    )
    if (hP) return { price: Number(hP.price), type: 'holiday', holidayName: hP.holidayName }
  }

  const d = new Date(isoDate + 'T00:00:00')
  const isWE = d.getDay() === 0 || d.getDay() === 6

  if (isWE) {
    // Ưu tiên bản ghi WEEKEND riêng
    const weCandidates = allPricings.filter(p =>
      p.fieldId === fieldId &&
      p.dayOfWeek === 'WEEKEND' &&
      (p.isActive !== false && p.active !== false) &&
      (p.effectiveFrom || '') <= isoDate &&
      (p.effectiveTo == null || p.effectiveTo >= isoDate)
    )
    if (weCandidates.length) {
      weCandidates.sort((a,b) => (b.effectiveFrom||'').localeCompare(a.effectiveFrom||''))
      return { price: Number(weCandidates[0].price), type: 'weekend' }
    }
    // Fallback: weekday × 1.25
    const wd = getEffectiveWeekdayPrice(fieldId, isoDate, allPricings)
    if (wd) return { price: Math.ceil(wd * 1.25 / 1000) * 1000, type: 'weekend' }
    return { price: null, type: 'weekend' }
  }

  const wd = getEffectiveWeekdayPrice(fieldId, isoDate, allPricings)
  return { price: wd, type: 'weekday' }
}

const PRICE_TYPE_STYLE = {
  weekday: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0', label: 'Ngày thường' },
  weekend: { bg: '#fff7ed', color: '#9a3412', border: '#fed7aa', label: 'Cuối tuần' },
  holiday: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', label: 'Ngày lễ' },
}

function TabPricePreview({ fields }) {
  const [allPricings, setAllPricings] = useState([])
  const [holidays, setHolidays]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [filterType, setFilterType]   = useState('ALL')
  const days = buildNext14Days()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/field-pricings'),
      api.get('/field-pricings/holidays'),
    ]).then(([pRes, hRes]) => {
      setAllPricings(pRes.data)
      setHolidays(hRes.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const visibleFields = filterType === 'ALL'
    ? fields
    : fields.filter(f => normalizeType(f.type) === filterType)

  // Nhóm theo loại sân
  const grouped = ['5V5', '7V7', '9V9'].reduce((acc, t) => {
    const fs = visibleFields.filter(f => normalizeType(f.type) === t)
    if (fs.length) acc.push({ type: t, label: TYPE_LABEL[t], fields: fs })
    return acc
  }, [])

  // Kiểm tra ngày nào là ngày lễ để highlight header
  const dayHolidayMap = {}
  days.forEach(d => {
    const h = isDateInHoliday(d.iso, holidays)
    if (h) dayHolidayMap[d.iso] = h.holidayName
  })

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Preview giá 14 ngày tới</h2>
          <p className={styles.sectionDesc}>
            Giá thực tế từ database — admin kiểm tra trước khi user thấy
            &nbsp;·&nbsp;
            <span style={{color:'#166534'}}>■ Ngày thường</span>&nbsp;
            <span style={{color:'#9a3412'}}>■ Cuối tuần ×1.25</span>&nbsp;
            <span style={{color:'#991b1b'}}>■ Ngày lễ</span>
          </p>
        </div>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {[['ALL','Tất cả'],['5V5','Sân 5'],['7V7','Sân 7'],['9V9','Sân 9']].map(([k,v]) => (
            <button key={k}
              className={`${styles.tab} ${filterType===k ? styles.tabActive : ''}`}
              style={{padding:'5px 12px',fontSize:'0.8rem'}}
              onClick={() => setFilterType(k)}>{v}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>Đang tải dữ liệu giá...</p>
      ) : (
        grouped.map(g => (
          <div key={g.type} className={styles.group} style={{marginBottom:24}}>
            <div className={styles.groupHeader}>
              <span>⚽</span>
              <span className={styles.groupTitle}>{g.label}</span>
              <span className={styles.groupCount}>{g.fields.length} sân</span>
            </div>

            {/* Timeline scroll wrapper */}
            <div className={styles.previewScrollWrap}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>
                    <th className={styles.previewFieldCol}>Sân</th>
                    {days.map(d => (
                      <th key={d.iso}
                        className={`${styles.previewDayCol} ${d.isWE ? styles.previewDayWE : ''} ${dayHolidayMap[d.iso] ? styles.previewDayHoliday : ''}`}
                        title={dayHolidayMap[d.iso] ? `🎉 ${dayHolidayMap[d.iso]}` : ''}
                      >
                        <div className={styles.previewDayLabel}>{d.label}</div>
                        <div className={styles.previewDayDate}>{d.iso.substring(5)}</div>
                        {dayHolidayMap[d.iso] && <div className={styles.previewDayLe}>lễ</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {g.fields.map(field => (
                    <tr key={field.id}>
                      <td className={styles.previewFieldName}>{field.name}</td>
                      {days.map(d => {
                        const result = calcPriceForDay(field.id, field.type, d.iso, allPricings, holidays)
                        const st = PRICE_TYPE_STYLE[result.type] || PRICE_TYPE_STYLE.weekday
                        return (
                          <td key={d.iso}
                            className={styles.previewCell}
                            title={result.holidayName ? `🎉 ${result.holidayName}` : st.label}
                            style={{background: st.bg, borderColor: st.border}}
                          >
                            {result.price != null ? (
                              <span style={{color: st.color, fontWeight:600, fontSize:'0.78rem', whiteSpace:'nowrap'}}>
                                {(result.price/1000).toFixed(0)}k
                              </span>
                            ) : (
                              <span style={{color:'#d1d5db',fontSize:'0.72rem'}}>—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        ))
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
export default function PricingManagement() {
  const [fields, setFields] = useState([])
  const [tab, setTab]       = useState('pricing')

  useEffect(() => {
    api.get('/fields').then(r => setFields(r.data)).catch(() => {})
  }, [])

  const TABS = [
    { key: 'pricing', label: '💰 Bảng giá sân' },
    { key: 'holiday', label: '🎉 Giá ngày lễ' },
    { key: 'preview', label: '📅 Preview 14 ngày' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>💰 Quản lý giá sân</h1>
        <p className={styles.pageDesc}>Giá ngày thường → Cuối tuần tự tính × 1.25 → Ngày lễ theo %</p>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {tab === 'pricing' && <TabFieldPricing fields={fields} />}
        {tab === 'holiday' && <TabHolidayPricing fields={fields} />}
        {tab === 'preview' && <TabPricePreview fields={fields} />}
      </div>
    </div>
  )
}
