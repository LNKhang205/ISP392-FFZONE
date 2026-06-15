import { useState, useEffect, useCallback } from 'react'
import api from '../../../services/api'
import styles from './PricingManagement.module.css'

// ── Hằng số ───────────────────────────────────────────────────
const TYPE_LABEL   = { '5V5': 'Sân 5 người', '7V7': 'Sân 7 người', '9V9': 'Sân 9 người' }
const TYPE_OPTIONS = [
  { value: '5V5', label: '⚽ Sân 5 người' },
  { value: '7V7', label: '🏟️ Sân 7 người' },
  { value: '9V9', label: '🏆 Sân 9 người' },
]

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

// ── Modal chung ───────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
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

// ════════════════════════════════════════════════════════════════
// TAB 1 — BẢNG GIÁ SÂN
// ════════════════════════════════════════════════════════════════
function TabFieldPricing({ fields }) {
  const [pricings, setPricings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)  // null | { mode:'add'|'edit', data? }
  const [form, setForm]         = useState({
    fieldId: '', weekdayPrice: '',
    startTime: '05:00', endTime: '23:00',
    effectiveFrom: todayStr(), effectiveTo: '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')

  // Load: lấy tất cả pricing, chỉ giữ WEEKDAY để gộp hiển thị 1 dòng/sân
  const load = useCallback(() => {
    setLoading(true)
    api.get('/field-pricings')
      .then(r => {
        // Gộp theo fieldId, chỉ lấy bản ghi WEEKDAY active làm đại diện
        const map = {}
        r.data
          .filter(p => p.dayOfWeek === 'WEEKDAY' && p.isActive)
          .forEach(p => { map[p.fieldId] = p })
        setPricings(Object.values(map))
      })
      .catch(() => setPricings([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => {
    setForm({ fieldId: '', weekdayPrice: '', startTime: '05:00', endTime: '23:00', effectiveFrom: todayStr(), effectiveTo: '' })
    setMsg('')
    setModal({ mode: 'add' })
  }

  const openEdit = p => {
    setForm({
      fieldId:      p.fieldId,
      weekdayPrice: p.price || '',
      startTime:    p.startTime?.substring(0, 5) || '05:00',
      endTime:      p.endTime?.substring(0, 5)   || '23:00',
      effectiveFrom: p.effectiveFrom || todayStr(),
      effectiveTo:   p.effectiveTo   || '',
    })
    setMsg('')
    setModal({ mode: 'edit', data: p })
  }

  const handleSave = async () => {
    if (!form.fieldId)      { setMsg('Vui lòng chọn sân'); return }
    if (!form.weekdayPrice) { setMsg('Vui lòng nhập giá ngày thường'); return }
    setSaving(true); setMsg('')
    try {
      await api.post(`/field-pricings/field/${form.fieldId}`, {
        weekdayPrice:  Number(form.weekdayPrice),
        startTime:     form.startTime,
        endTime:       form.endTime,
        effectiveFrom: form.effectiveFrom || null,
        effectiveTo:   form.effectiveTo   || null,
      })
      setModal(null)
      load()
    } catch (e) {
      setMsg(e.response?.data?.message || 'Lỗi khi lưu')
    } finally { setSaving(false) }
  }

  const handleDelete = async fieldId => {
    if (!window.confirm('Xóa bảng giá của sân này?')) return
    try {
      const res = await api.get(`/field-pricings/field/${fieldId}`)
      await Promise.all(
        res.data
          .filter(p => p.dayOfWeek !== 'HOLIDAY')
          .map(p => api.delete(`/field-pricings/${p.id}`))
      )
      load()
    } catch (e) { alert('Lỗi: ' + (e.response?.data?.message || e.message)) }
  }

  const weekendPreview = calcWeekend(form.weekdayPrice)

  // Nhóm theo loại sân
  const grouped = ['5V5', '7V7', '9V9'].reduce((acc, t) => {
    const rows = pricings.filter(p => p.fieldType === t)
    if (rows.length) acc[t] = rows
    return acc
  }, {})

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Bảng giá sân</h2>
          <p className={styles.sectionDesc}>Giá cuối tuần tự động = giá ngày thường × 1.25</p>
        </div>
        <button className={styles.btnGreen} onClick={openAdd}>+ Đặt giá sân</button>
      </div>

      {loading ? <p className={styles.loading}>Đang tải...</p>
        : pricings.length === 0
          ? <EmptyState icon="💰" text="Chưa có bảng giá. Nhấn Đặt giá sân để bắt đầu." />
          : Object.entries(grouped).map(([type, rows]) => (
            <div key={type} className={styles.group}>
              <div className={styles.groupHeader}>
                <span>⚽</span>
                <span className={styles.groupTitle}>{TYPE_LABEL[type] || type}</span>
                <span className={styles.groupCount}>{rows.length} sân</span>
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sân</th>
                    <th>Loại</th>
                    <th>Giờ hoạt động</th>
                    <th className={styles.numCol}>Giá ngày thường</th>
                    <th className={styles.numCol}>Giá cuối tuần</th>
                    <th>Hiệu lực</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(p => (
                    <tr key={p.fieldId}>
                      <td className={styles.bold}>{p.fieldName}</td>
                      <td><TypeBadge type={p.fieldType} /></td>
                      <td className={styles.mono}>
                        {p.startTime?.substring(0,5)} – {p.endTime?.substring(0,5)}
                      </td>
                      <td className={styles.numCol}><strong>{vnd(p.price)}</strong></td>
                      <td className={`${styles.numCol} ${styles.weekendPrice}`}>
                        {vnd(calcWeekend(p.price))}
                      </td>
                      <td className={styles.mono}>
                        {p.effectiveFrom || '—'}
                        {p.effectiveTo ? ` → ${p.effectiveTo}` : ' → ∞'}
                      </td>
                      <td>
                        <div className={styles.rowBtns}>
                          <button className={styles.btnEdit} onClick={() => openEdit(p)}>✏️</button>
                          <button className={styles.btnDel}  onClick={() => handleDelete(p.fieldId)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
      }

      {modal && (
        <Modal
          title={modal.mode === 'add' ? '💰 Đặt giá sân' : `✏️ Cập nhật giá: ${modal.data?.fieldName}`}
          onClose={() => setModal(null)}
        >
          <FormGroup label="Sân bóng" required>
            <select className={styles.input} value={form.fieldId}
              onChange={e => setForm(f => ({ ...f, fieldId: e.target.value }))}
              disabled={modal.mode === 'edit'}>
              <option value="">-- Chọn sân --</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Giá ngày thường (₫)" required>
            <input type="number" className={styles.input} placeholder="VD: 200000"
              value={form.weekdayPrice} min={0} step={1000}
              onChange={e => setForm(f => ({ ...f, weekdayPrice: e.target.value }))} />
          </FormGroup>

          {weekendPreview > 0 && (
            <div className={styles.autoCalc}>
              <span>Giá cuối tuần (tự tính):</span>
              <strong>{vnd(weekendPreview)}</strong>
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

          <div className={styles.formRow}>
            <FormGroup label="Hiệu lực từ">
              <input type="date" className={styles.input} value={form.effectiveFrom}
                onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))} />
            </FormGroup>
            <FormGroup label="Hết hạn (để trống = vô thời hạn)">
              <input type="date" className={styles.input} value={form.effectiveTo}
                onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value }))} />
            </FormGroup>
          </div>

          {msg && <p className={styles.errMsg}>❌ {msg}</p>}
          <ModalFooter onCancel={() => setModal(null)} onSave={handleSave} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TAB 2 — ÁP GIÁ HÀNG LOẠT
// ════════════════════════════════════════════════════════════════
function TabBulkPricing({ fields }) {
  const [selType, setSelType]    = useState('5V5')
  const [selIds, setSelIds]      = useState([])
  const [weekdayPrice, setPrice] = useState('')
  const [startTime, setStart]    = useState('05:00')
  const [endTime, setEnd]        = useState('23:00')
  const [effectiveFrom, setFrom] = useState(todayStr())
  const [applying, setApplying]  = useState(false)
  const [msg, setMsg]            = useState('')

  const typeFields = fields.filter(f => f.type === selType)
  const allChecked = typeFields.length > 0 && selIds.length === typeFields.length

  const toggleAll   = () => setSelIds(allChecked ? [] : typeFields.map(f => f.id))
  const toggleField = id => setSelIds(p =>
    p.includes(id) ? p.filter(x => x !== id) : [...p, id]
  )

  const handleApply = async () => {
    if (!weekdayPrice) { setMsg('Vui lòng nhập giá ngày thường'); return }
    if (!selIds.length) { setMsg('Vui lòng chọn ít nhất 1 sân'); return }
    setApplying(true); setMsg('')
    try {
      const res = await api.post('/field-pricings/bulk-apply', {
        weekdayPrice: Number(weekdayPrice),
        fieldIds: selIds,
        startTime, endTime, effectiveFrom,
      })
      setMsg(`✅ Đã áp giá cho ${selIds.length} sân thành công!`)
      setSelIds([]); setPrice('')
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || 'Lỗi'))
    } finally { setApplying(false) }
  }

  const weekend = calcWeekend(weekdayPrice)

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Áp giá hàng loạt</h2>
          <p className={styles.sectionDesc}>Đồng bộ giá cho nhiều sân cùng loại một lúc</p>
        </div>
      </div>

      <div className={styles.bulkCard}>
        <FormGroup label="Chọn loại sân">
          <div className={styles.typeTabs}>
            {TYPE_OPTIONS.map(o => (
              <button key={o.value}
                className={`${styles.typeTab} ${selType === o.value ? styles.typeTabActive : ''}`}
                onClick={() => { setSelType(o.value); setSelIds([]) }}>
                {o.label}
              </button>
            ))}
          </div>
        </FormGroup>

        <FormGroup label={`Chọn sân (${selIds.length}/${typeFields.length} đã chọn)`}>
          <div className={styles.checkHeader}>
            <button className={styles.btnSelectAll} onClick={toggleAll}>
              {allChecked ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>
          <div className={styles.checkGrid}>
            {typeFields.length === 0
              ? <p className={styles.empty}>Không có sân loại {selType}</p>
              : typeFields.map(f => (
                <label key={f.id} className={`${styles.checkItem} ${selIds.includes(f.id) ? styles.checkItemOn : ''}`}>
                  <input type="checkbox" checked={selIds.includes(f.id)} onChange={() => toggleField(f.id)} />
                  <span>{f.name}</span>
                </label>
              ))
            }
          </div>
        </FormGroup>

        <div className={styles.formRow}>
          <FormGroup label="Giá ngày thường (₫)" required>
            <input type="number" className={styles.input} placeholder="VD: 200000"
              value={weekdayPrice} min={0} step={1000}
              onChange={e => setPrice(e.target.value)} />
          </FormGroup>
          <FormGroup label="Hiệu lực từ ngày">
            <input type="date" className={styles.input} value={effectiveFrom}
              onChange={e => setFrom(e.target.value)} />
          </FormGroup>
        </div>

        <div className={styles.formRow}>
          <FormGroup label="Giờ mở cửa">
            <input type="time" className={styles.input} value={startTime}
              onChange={e => setStart(e.target.value)} />
          </FormGroup>
          <FormGroup label="Giờ đóng cửa">
            <input type="time" className={styles.input} value={endTime}
              onChange={e => setEnd(e.target.value)} />
          </FormGroup>
        </div>

        {weekend > 0 && (
          <div className={styles.autoCalc}>
            <span>Giá cuối tuần (tự tính):</span>
            <strong>{vnd(weekend)}</strong>
            <span className={styles.formula}>= {vnd(weekdayPrice)} × 1.25</span>
          </div>
        )}

        {msg && <p className={styles.bulkMsg}>{msg}</p>}

        <button className={styles.btnApply} onClick={handleApply}
          disabled={applying || !selIds.length || !weekdayPrice}>
          {applying ? '⏳ Đang áp dụng...' : `⚡ Áp giá cho ${selIds.length} sân`}
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TAB 3 — GIÁ NGÀY LỄ
// ════════════════════════════════════════════════════════════════
function TabHolidayPricing({ fields }) {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState({
    holidayName: '', effectiveFrom: '', effectiveTo: '',
    increasePercentage: '', target: 'ALL', fieldType: '', fieldIds: [],
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg]       = useState('')

  const load = () => {
    setLoading(true)
    api.get('/field-pricings/holidays')
      .then(r => setHolidays(r.data))
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => {
    setForm({ holidayName: '', effectiveFrom: '', effectiveTo: '', increasePercentage: '', target: 'ALL', fieldType: '', fieldIds: [] })
    setMsg('')
    setModal(true)
  }

  const handleSave = async () => {
    if (!form.holidayName)        { setMsg('Vui lòng nhập tên dịp lễ'); return }
    if (!form.effectiveFrom)      { setMsg('Vui lòng chọn ngày bắt đầu'); return }
    if (!form.effectiveTo)        { setMsg('Vui lòng chọn ngày kết thúc'); return }
    if (!form.increasePercentage) { setMsg('Vui lòng nhập % tăng giá'); return }

    setSaving(true); setMsg('')

    const body = {
      holidayName:        form.holidayName,
      effectiveFrom:      form.effectiveFrom,
      effectiveTo:        form.effectiveTo,
      increasePercentage: Number(form.increasePercentage),
    }

    // Xác định mục tiêu
    if (form.target === 'TYPE' && form.fieldType) {
      body.fieldType = form.fieldType
    } else if (form.target === 'FIELDS' && form.fieldIds.length) {
      body.fieldIds = form.fieldIds
    }
    // target = 'ALL' → không gửi fieldIds/fieldType → service áp tất cả sân

    try {
      await api.post('/field-pricings/holiday/bulk', body)
      setModal(false)
      load()
    } catch (e) {
      setMsg(e.response?.data?.message || 'Lỗi khi lưu')
    } finally { setSaving(false) }
  }

  const handleDelete = async id => {
    if (!window.confirm('Xóa giá ngày lễ này?')) return
    try { await api.delete(`/field-pricings/${id}`); load() }
    catch (e) { alert('Lỗi: ' + (e.response?.data?.message || e.message)) }
  }

  const now = todayStr()
  const statusOf = h => {
    if (h.effectiveTo && h.effectiveTo < now) return 'expired'
    if (h.effectiveFrom > now) return 'upcoming'
    return 'active'
  }
  const statusStyle = {
    active:   { background: '#dcfce7', color: '#166534' },
    upcoming: { background: '#fef9c3', color: '#854d0e' },
    expired:  { background: '#f3f4f6', color: '#6b7280' },
  }
  const statusLabel = { active: 'Đang áp dụng', upcoming: 'Sắp tới', expired: 'Đã hết hạn' }

  // Group theo holidayName + effectiveFrom
  const groups = Object.values(
    holidays.reduce((acc, h) => {
      const key = `${h.holidayName}__${h.effectiveFrom}__${h.effectiveTo}`
      if (!acc[key]) acc[key] = { key, name: h.holidayName, from: h.effectiveFrom, to: h.effectiveTo, rows: [] }
      acc[key].rows.push(h)
      return acc
    }, {})
  ).sort((a, b) => b.from.localeCompare(a.from))

  const targetFields = form.fieldType
    ? fields.filter(f => f.type === form.fieldType)
    : fields

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Giá ngày lễ</h2>
          <p className={styles.sectionDesc}>
            Lưu vào bảng field_pricing (dayOfWeek = HOLIDAY) · Tự hết hạn sau ngày kết thúc
          </p>
        </div>
        <button className={styles.btnGreen} onClick={openAdd}>+ Thêm giá ngày lễ</button>
      </div>

      {loading ? <p className={styles.loading}>Đang tải...</p>
        : groups.length === 0
          ? <EmptyState icon="🎉" text="Chưa có giá ngày lễ nào." />
          : groups.map(g => {
            const st = statusOf(g.rows[0])
            return (
              <div key={g.key} className={`${styles.group} ${st === 'expired' ? styles.groupExpired : ''}`}>
                <div className={styles.groupHeader}>
                  <span>🎉</span>
                  <span className={styles.groupTitle}>{g.name}</span>
                  <span className={styles.mono}>{g.from} → {g.to}</span>
                  <span className={styles.badge} style={statusStyle[st]}>{statusLabel[st]}</span>
                  <span className={styles.groupCount}>{g.rows.length} sân</span>
                </div>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Sân</th>
                      <th>Loại</th>
                      <th className={styles.numCol}>Giá ngày lễ</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map(h => (
                      <tr key={h.id} className={st === 'expired' ? styles.rowExpired : ''}>
                        <td className={styles.bold}>{h.fieldName}</td>
                        <td><TypeBadge type={h.fieldType} /></td>
                        <td className={styles.numCol}>
                          <strong className={styles.holidayPrice}>{vnd(h.price)}</strong>
                        </td>
                        <td>
                          <button className={styles.btnDel} onClick={() => handleDelete(h.id)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })
      }

      {modal && (
        <Modal title="🎉 Thêm giá ngày lễ" onClose={() => setModal(false)} wide>
          <FormGroup label="Tên dịp lễ" required>
            <input className={styles.input} placeholder="VD: Tết Nguyên Đán, Quốc khánh 2/9..."
              value={form.holidayName}
              onChange={e => setForm(f => ({ ...f, holidayName: e.target.value }))} />
          </FormGroup>

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

          <FormGroup label="Tăng giá (%)" required>
            <input type="number" className={styles.input}
              placeholder="VD: 50 (tăng 50% so với giá ngày thường)"
              value={form.increasePercentage} min={1} max={500}
              onChange={e => setForm(f => ({ ...f, increasePercentage: e.target.value }))} />
            <small className={styles.hint}>
              Hệ thống tự tính: giá lễ = giá ngày thường × (1 + {form.increasePercentage || '?'}%)
            </small>
          </FormGroup>

          <FormGroup label="Áp dụng cho">
            <div className={styles.targetBtns}>
              {[
                { key: 'ALL',    label: '🌐 Tất cả sân' },
                { key: 'TYPE',   label: '⚽ Theo loại sân' },
                { key: 'FIELDS', label: '📋 Chọn sân cụ thể' },
              ].map(o => (
                <button key={o.key}
                  className={`${styles.typeTab} ${form.target === o.key ? styles.typeTabActive : ''}`}
                  onClick={() => setForm(f => ({ ...f, target: o.key, fieldType: '', fieldIds: [] }))}>
                  {o.label}
                </button>
              ))}
            </div>
          </FormGroup>

          {form.target === 'TYPE' && (
            <FormGroup label="Loại sân">
              <div className={styles.typeTabs}>
                {TYPE_OPTIONS.map(o => (
                  <button key={o.value}
                    className={`${styles.typeTab} ${form.fieldType === o.value ? styles.typeTabActive : ''}`}
                    onClick={() => setForm(f => ({ ...f, fieldType: o.value }))}>
                    {o.label}
                  </button>
                ))}
              </div>
            </FormGroup>
          )}

          {form.target === 'FIELDS' && (
            <FormGroup label="Chọn sân">
              <div className={styles.checkGrid}>
                {targetFields.map(f => (
                  <label key={f.id}
                    className={`${styles.checkItem} ${form.fieldIds.includes(f.id) ? styles.checkItemOn : ''}`}>
                    <input type="checkbox"
                      checked={form.fieldIds.includes(f.id)}
                      onChange={() => setForm(prev => ({
                        ...prev,
                        fieldIds: prev.fieldIds.includes(f.id)
                          ? prev.fieldIds.filter(x => x !== f.id)
                          : [...prev.fieldIds, f.id]
                      }))} />
                    <span>{f.name} ({f.type})</span>
                  </label>
                ))}
              </div>
            </FormGroup>
          )}

          {msg && <p className={styles.errMsg}>❌ {msg}</p>}
          <ModalFooter onCancel={() => setModal(false)} onSave={handleSave} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════
function FormGroup({ label, required, children }) {
  return (
    <div className={styles.formGroup}>
      <label>
        {label}
        {required && <span className={styles.req}> *</span>}
      </label>
      {children}
    </div>
  )
}

function ModalFooter({ onCancel, onSave, saving }) {
  return (
    <div className={styles.modalFooter}>
      <button className={styles.btnCancel} onClick={onCancel}>Hủy</button>
      <button className={styles.btnGreen} onClick={onSave} disabled={saving}>
        {saving ? '⏳ Đang lưu...' : '💾 Lưu'}
      </button>
    </div>
  )
}

function TypeBadge({ type }) {
  return <span className={styles.typeBadge}>{type}</span>
}

function EmptyState({ icon, text }) {
  return (
    <div className={styles.emptyBox}>
      <div className={styles.emptyIcon}>{icon}</div>
      <p>{text}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN — PricingManagement
// ════════════════════════════════════════════════════════════════
export default function PricingManagement() {
  const [fields, setFields] = useState([])
  const [tab, setTab]       = useState('pricing')

  useEffect(() => {
    api.get('/fields').then(r => setFields(r.data)).catch(() => {})
  }, [])

  const TABS = [
    { key: 'pricing', label: '💰 Bảng giá sân' },
    { key: 'bulk',    label: '⚡ Áp giá hàng loạt' },
    { key: 'holiday', label: '🎉 Giá ngày lễ' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1>💰 Quản lý giá sân</h1>
        <p className={styles.pageDesc}>
          Thiết lập giá → Hệ thống tự sinh slot → Khách đặt sân
        </p>
      </div>

      {/* Flow indicator */}
      <div className={styles.flow}>
        {['🏟️ Tạo sân', '💰 Đặt giá', '📅 Tự sinh slot', '⚽ Khách đặt sân'].map((step, i) => (
          <>
            <span key={step} className={`${styles.flowStep} ${i === 1 ? styles.flowStepActive : ''}`}>
              {step}
            </span>
            {i < 3 && <span key={`a${i}`} className={styles.flowArrow}>→</span>}
          </>
        ))}
      </div>

      {/* Tabs */}
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
        {tab === 'pricing' && <TabFieldPricing  fields={fields} />}
        {tab === 'bulk'    && <TabBulkPricing    fields={fields} />}
        {tab === 'holiday' && <TabHolidayPricing fields={fields} />}
      </div>
    </div>
  )
}
