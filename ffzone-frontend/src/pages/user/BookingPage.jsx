import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import styles from "./BookingPage.module.css";

const TYPE_LABEL = {
  FIVE_VS_FIVE: "Sân 5",
  SEVEN_VS_SEVEN: "Sân 7",
  ELEVEN_VS_ELEVEN: "Sân 9",
};
const TYPE_VALUE = {
  FIVE_VS_FIVE: "5V5",
  SEVEN_VS_SEVEN: "7V7",
  ELEVEN_VS_ELEVEN: "11V11",
};

// Tạo 7 ngày từ hôm nay
function getWeekDays() {
  const days = [];
  const labels = [
    "Hôm nay",
    "Ngày mai",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
    "CN",
  ];
  const dayNames = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const [year, month, day] = dateStr.split("-");
    const label =
      i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : dayNames[d.getDay()];
    days.push({
      label,
      sub: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      date: dateStr,
    });
  }
  return days;
}

export default function BookingPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const weekDays = getWeekDays();
  const [selectedDate, setSelectedDate] = useState(weekDays[0].date);
  const [filterType, setFilterType] = useState("ALL"); // ALL | FIVE_VS_FIVE | SEVEN_VS_SEVEN | ELEVEN_VS_ELEVEN
  const [filterField, setFilterField] = useState("ALL"); // ALL | fieldId
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL | AVAILABLE | OCCUPIED | PENDING

  const [fields, setFields] = useState([]);
  const [allSlots, setAllSlots] = useState([]); // tất cả slot của ngày đó
  const [services, setServices] = useState([]);
  const [pricingMap, setPricingMap] = useState({}); // { fieldId: price }
  const [loading, setLoading] = useState(true);

  // Booking state
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [selectedSvcs, setSelectedSvcs] = useState({});
  const [voucherCode, setVoucherCode] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load fields
  useEffect(() => {
    api
      .get("/fields/active")
      .then((r) => setFields(r.data))
      .catch(() => {});
  }, []);

  // Load pricing cho tất cả fields
  useEffect(() => {
    if (fields.length === 0) return;
    const [year, month, day] = selectedDate.split("-").map(Number);
    const dow = new Date(year, month - 1, day).getDay();
    const dayType = dow === 0 || dow === 6 ? "WEEKEND" : "WEEKDAY";

    Promise.all(
      fields.map((f) =>
        api
          .get(`/field-pricings/field/${f.id}`)
          .then((r) => {
            const matched = r.data.find((p) => p.dayOfWeek === dayType);
            return {
              fieldId: f.id,
              price: matched ? Number(matched.price) : null,
            };
          })
          .catch(() => ({ fieldId: f.id, price: null })),
      ),
    ).then((results) => {
      const map = {};
      results.forEach((r) => {
        map[r.fieldId] = r.price;
      });
      setPricingMap(map);
    });
  }, [fields, selectedDate]);

  // Load slots theo ngày
  useEffect(() => {
    if (fields.length === 0) return;
    setLoading(true);
    setSelectedSlots([]);

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const nowTime = now.toTimeString().slice(0, 5);

    Promise.all(
      fields.map((f) =>
        api
          .get(`/field-slots/field/${f.id}?date=${selectedDate}`)
          .then((r) =>
            r.data.map((s) => ({
              ...s,
              fieldId: f.id,
              fieldName: f.name,
              fieldType: f.type,
            })),
          )
          .catch(() => []),
      ),
    )
      .then((results) => {
        let slots = results.flat();
        // Filter bỏ slot đã qua giờ nếu là hôm nay
        if (selectedDate === todayStr) {
          slots = slots.filter((s) => s.startTime.slice(0, 5) > nowTime);
        }
        setAllSlots(slots);
      })
      .finally(() => setLoading(false));
  }, [fields, selectedDate]);

  // Load services
  useEffect(() => {
    api
      .get("/services/active")
      .then((r) => setServices(r.data))
      .catch(() => {});
  }, []);

  // Filtered slots
  const filteredSlots = allSlots.filter((s) => {
    const typeMap = {
      FIVE_VS_FIVE: "5V5",
      SEVEN_VS_SEVEN: "7V7",
      ELEVEN_VS_ELEVEN: "11V11",
    };
    if (filterType !== "ALL" && typeMap[s.fieldType] !== filterType)
      return false;
    if (filterField !== "ALL" && s.fieldId !== filterField) return false;
    if (filterStatus !== "ALL" && s.status !== filterStatus) return false;
    return true;
  });

  // Group theo sân
  const slotsByField = filteredSlots.reduce((acc, slot) => {
    const key = slot.fieldId;
    if (!acc[key])
      acc[key] = {
        fieldName: slot.fieldName,
        fieldType: slot.fieldType,
        slots: [],
      };
    acc[key].slots.push(slot);
    return acc;
  }, {});

  // Toggle chọn slot
  const toggleSlot = (slot) => {
    if (slot.status !== "AVAILABLE") return;
    setError("");
    setSelectedSlots((prev) => {
      const exists = prev.find((s) => s.id === slot.id);
      if (exists) return prev.filter((s) => s.id !== slot.id);

      // Kiểm tra tối đa 3 slot
      if (prev.length >= 3) {
        setError("Tối đa 3 slot liên tiếp");
        return prev;
      }

      // Kiểm tra cùng sân
      if (prev.length > 0 && prev[0].fieldId !== slot.fieldId) {
        setError("Chỉ được chọn slot cùng một sân");
        return prev;
      }
      return [...prev, slot];
    });
  };

  // Tính tổng
  const fieldTotal =
    selectedSlots.length > 0
      ? selectedSlots.reduce((acc, s) => acc + (pricingMap[s.fieldId] || 0), 0)
      : 0;
  const serviceTotal = services.reduce(
    (acc, s) => acc + (s.price || 0) * (selectedSvcs[s.id] || 0),
    0,
  );
  const grandTotal = fieldTotal + serviceTotal;

  // Đặt sân
  const handleBooking = async () => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: "/booking" } });
      return;
    }
    if (selectedSlots.length === 0) {
      setError("Vui lòng chọn ít nhất 1 slot");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/bookings", {
        slotIds: selectedSlots.map((s) => s.id),
        voucherCode: voucherCode.trim() || null,
        services: Object.entries(selectedSvcs)
          .filter(([, qty]) => qty > 0)
          .map(([serviceId, quantity]) => ({ serviceId, quantity })),
        note: note.trim() || null,
      });
      navigate(`/booking-confirm/${data.id}`, { state: { booking: data } });
    } catch (e) {
      setError(
        e.response?.data?.message || "Đặt sân thất bại, vui lòng thử lại",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const slotStatusColor = {
    AVAILABLE: "#e8f5e9",
    PENDING: "#fff9c4",
    OCCUPIED: "#ffebee",
  };
  const slotStatusLabel = {
    AVAILABLE: "Còn trống",
    PENDING: "Đang giữ",
    OCCUPIED: "Đã đặt",
  };

  // Fields cho dropdown filter
  const filteredFieldsForDropdown =
    filterType === "ALL"
      ? fields
      : fields.filter((f) => {
          const typeMap = {
            FIVE_VS_FIVE: "5V5",
            SEVEN_VS_SEVEN: "7V7",
            ELEVEN_VS_ELEVEN: "11V11",
          };
          return typeMap[f.type] === filterType;
        });

  return (
    <div className={styles.page}>
      {/* ── HERO HEADER ── */}
      <div className={styles.hero}>
        <div className="container">
          <h1>⚽ Đặt sân bóng</h1>
          <p>Chọn ngày, sân và khung giờ phù hợp với bạn</p>

          {/* Tab ngày */}
          <div className={styles.dayTabs}>
            {weekDays.map((d) => (
              <button
                key={d.date}
                className={`${styles.dayTab} ${selectedDate === d.date ? styles.dayTabActive : ""}`}
                onClick={() => setSelectedDate(d.date)}
              >
                <span className={styles.dayLabel}>{d.label}</span>
                <span className={styles.daySub}>{d.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container">
        <div className={styles.body}>
          {/* ── CỘT TRÁI: slot ── */}
          <div className={styles.leftCol}>
            {/* Info banner */}
            <div className={styles.infoBanner}>
              <span>
                ℹ️ Mỗi slot bao gồm <strong>60 phút</strong> thi đấu
              </span>
              <span>
                ⏱ Giữa các slot có <strong>15 phút</strong> dọn sân
              </span>
              <span>
                🔗 Đặt nhiều slot liên tiếp: khoảng nghỉ được tính vào thời gian
                sử dụng thực tế
              </span>
              <span>
                📌 Tối đa <strong>3 slot liên tiếp</strong> mỗi lần đặt
              </span>
            </div>

            {/* Filter */}
            <div className={styles.filters}>
              {/* Loại sân */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>LOẠI SÂN</span>
                <div className={styles.filterBtns}>
                  {[
                    ["ALL", "Tất cả"],
                    ["5V5", "Sân 5"],
                    ["7V7", "Sân 7"],
                    ["11V11", "Sân 9"],
                  ].map(([k, v]) => (
                    <button
                      key={k}
                      className={`${styles.filterBtn} ${filterType === k ? styles.filterBtnActive : ""}`}
                      onClick={() => {
                        setFilterType(k);
                        setFilterField("ALL");
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sân */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>SÂN</span>
                <select
                  className={styles.select}
                  value={filterField}
                  onChange={(e) => setFilterField(e.target.value)}
                >
                  <option value="ALL">Tất cả</option>
                  {filteredFieldsForDropdown.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tình trạng */}
              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>TÌNH TRẠNG</span>
                <select
                  className={styles.select}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="ALL">Tất cả</option>
                  <option value="AVAILABLE">Còn trống</option>
                  <option value="PENDING">Đang giữ</option>
                  <option value="OCCUPIED">Đã đặt</option>
                </select>
              </div>
            </div>

            {/* Legend */}
            <div className={styles.legend}>
              <span>
                <span
                  className={styles.dot}
                  style={{ background: "#e8f5e9", border: "1px solid #a5d6a7" }}
                />
                Còn trống
              </span>
              <span>
                <span
                  className={styles.dot}
                  style={{ background: "#ffebee", border: "1px solid #ef9a9a" }}
                />
                Đã đặt
              </span>
              <span>
                <span
                  className={styles.dot}
                  style={{ background: "#fff9c4", border: "1px solid #f9e076" }}
                />
                Đóng cửa
              </span>
              <span>
                <span
                  className={styles.dot}
                  style={{ background: "#bbdefb", border: "1px solid #64b5f6" }}
                />
                Đang chọn
              </span>
            </div>

            {/* Slot grid */}
            {loading ? (
              <div className={styles.loadingWrap}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={styles.skeleton} />
                ))}
              </div>
            ) : Object.keys(slotsByField).length === 0 ? (
              <div className={styles.empty}>
                <span>📅</span>
                <p>Chưa có slot nào cho ngày này</p>
                <small>
                  Vui lòng chọn ngày khác hoặc liên hệ để biết thêm.
                </small>
              </div>
            ) : (
              Object.entries(slotsByField).map(
                ([fieldId, { fieldName, fieldType, slots }]) => (
                  <div key={fieldId} className={styles.fieldSection}>
                    <div className={styles.fieldSectionHeader}>
                      <span className={styles.fieldSectionName}>
                        {fieldName}
                      </span>
                      <span className={styles.fieldSectionType}>
                        {TYPE_VALUE[fieldType] || fieldType}
                      </span>
                      {pricingMap[fieldId] && (
                        <span className={styles.fieldSectionPrice}>
                          💰 {pricingMap[fieldId].toLocaleString("vi-VN")}₫/slot
                        </span>
                      )}
                    </div>
                    <div className={styles.slotGrid}>
                      {slots
                        .sort((a, b) => a.startTime.localeCompare(b.startTime))
                        .map((slot) => {
                          const isSelected = selectedSlots.some(
                            (s) => s.id === slot.id,
                          );
                          return (
                            <div
                              key={slot.id}
                              className={`${styles.slotCard} ${isSelected ? styles.slotSelected : ""} ${slot.status !== "AVAILABLE" ? styles.slotDisabled : ""}`}
                              style={{
                                background: isSelected
                                  ? "#bbdefb"
                                  : slotStatusColor[slot.status] || "#f5f5f5",
                              }}
                              onClick={() => toggleSlot(slot)}
                            >
                              <div className={styles.slotTime}>
                                {slot.startTime.slice(0, 5)} –{" "}
                                {slot.endTime.slice(0, 5)}
                              </div>
                              <div className={styles.slotStatus}>
                                {isSelected
                                  ? "✓ Đang chọn"
                                  : slotStatusLabel[slot.status] || slot.status}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ),
              )
            )}
          </div>

          {/* ── CỘT PHẢI: thông tin đặt sân ── */}
          <div className={styles.rightCol}>
            <div className={styles.panel}>
              <h2>Thông tin đặt sân</h2>

              {/* Slot đã chọn */}
              <div className={styles.section}>
                <label>Slot đã chọn ({selectedSlots.length}/3)</label>
                {selectedSlots.length === 0 ? (
                  <p className={styles.hint}>← Chọn slot ở lịch bên trái</p>
                ) : (
                  selectedSlots
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((s) => (
                      <div key={s.id} className={styles.selectedSlot}>
                        <div>
                          <div className={styles.selectedSlotField}>
                            {s.fieldName}
                          </div>
                          <div className={styles.selectedSlotTime}>
                            🕐 {s.startTime.slice(0, 5)} –{" "}
                            {s.endTime.slice(0, 5)}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {pricingMap[s.fieldId] && (
                            <span className={styles.selectedSlotPrice}>
                              {pricingMap[s.fieldId].toLocaleString("vi-VN")}₫
                            </span>
                          )}
                          <button
                            className={styles.removeBtn}
                            onClick={() =>
                              setSelectedSlots((prev) =>
                                prev.filter((x) => x.id !== s.id),
                              )
                            }
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>

              {/* Dịch vụ */}
              {services.length > 0 && (
                <div className={styles.section}>
                  <label>Dịch vụ thêm (tuỳ chọn)</label>
                  {services.map((svc) => (
                    <div key={svc.id} className={styles.serviceRow}>
                      <span>{svc.name}</span>
                      <span className={styles.svcPrice}>
                        {svc.price?.toLocaleString("vi-VN")}₫
                      </span>
                      <div className={styles.qtyControl}>
                        <button
                          onClick={() =>
                            setSelectedSvcs((p) => ({
                              ...p,
                              [svc.id]: Math.max(0, (p[svc.id] || 0) - 1),
                            }))
                          }
                        >
                          −
                        </button>
                        <span>{selectedSvcs[svc.id] || 0}</span>
                        <button
                          onClick={() =>
                            setSelectedSvcs((p) => ({
                              ...p,
                              [svc.id]: (p[svc.id] || 0) + 1,
                            }))
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Voucher */}
              <div className={styles.section}>
                <label>Mã voucher (tuỳ chọn)</label>
                <input
                  className={styles.input}
                  placeholder="Nhập mã voucher..."
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                />
              </div>

              {/* Ghi chú */}
              <div className={styles.section}>
                <label>Ghi chú</label>
                <textarea
                  className={styles.input}
                  rows={2}
                  placeholder="Ghi chú thêm (tuỳ chọn)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {/* Tổng tiền */}
              {(selectedSlots.length > 0 || serviceTotal > 0) && (
                <div className={styles.summary}>
                  {selectedSlots.length > 0 && (
                    <div className={styles.summaryRow}>
                      <span>Tiền sân ({selectedSlots.length} slot)</span>
                      <span>{fieldTotal.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  {services
                    .filter((s) => (selectedSvcs[s.id] || 0) > 0)
                    .map((s) => (
                      <div key={s.id} className={styles.summaryRow}>
                        <span>
                          {s.name} ×{selectedSvcs[s.id]}
                        </span>
                        <span>
                          {((s.price || 0) * selectedSvcs[s.id]).toLocaleString(
                            "vi-VN",
                          )}
                          ₫
                        </span>
                      </div>
                    ))}
                  <div
                    className={`${styles.summaryRow} ${styles.summaryTotal}`}
                  >
                    <span>Tổng cộng</span>
                    <strong>{grandTotal.toLocaleString("vi-VN")}₫</strong>
                  </div>
                </div>
              )}

              {error && <p className={styles.error}>{error}</p>}

              <button
                className={styles.bookBtn}
                onClick={handleBooking}
                disabled={submitting || selectedSlots.length === 0}
              >
                {submitting
                  ? "Đang xử lý..."
                  : isLoggedIn
                    ? "⚽ Đặt sân ngay"
                    : "🔑 Đăng nhập để đặt sân"}
              </button>

              <p className={styles.noteText}>
                * Slot sẽ được giữ 5 phút để hoàn tất thanh toán
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
