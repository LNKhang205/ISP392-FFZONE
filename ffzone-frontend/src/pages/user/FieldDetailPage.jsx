import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import styles from "./FieldDetailPage.module.css";

const STATUS_COLOR = {
  AVAILABLE: "#d1fae5",
  PENDING: "#fef9c3",
  OCCUPIED: "#fee2e2",
};
const STATUS_LABEL = {
  AVAILABLE: "Trống",
  PENDING: "Đang giữ",
  OCCUPIED: "Đã đặt",
};

export default function FieldDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(searchParams.get("date") || today);

  const [field, setField] = useState(null);
  const [slots, setSlots] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [voucherCode, setVoucherCode] = useState("");
  const [selectedSvcs, setSelectedSvcs] = useState({}); // { serviceId: quantity }
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pricing, setPricing] = useState(null);

  // Load field info
  useEffect(() => {
    api
      .get(`/fields/${id}`)
      .then((r) => setField(r.data))
      .catch(() => navigate("/fields"));
  }, [id]);

  // Load slots theo ngày
  useEffect(() => {
    setLoading(true);
    setSelectedSlots([]);
    api
      .get(`/field-slots/field/${id}?date=${date}`)
      .then((r) => setSlots(r.data))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [id, date]);

  // Load giá theo ngày
  useEffect(() => {
    if (!date || !id) return;

    // Fix timezone: parse thủ công thay vì dùng new Date(date)
    const [year, month, day] = date.split("-").map(Number);
    const dow = new Date(year, month - 1, day).getDay(); // local timezone
    const dayType = dow === 0 || dow === 6 ? "WEEKEND" : "WEEKDAY";

    api
      .get(`/field-pricings/field/${id}`)
      .then((r) => {
        console.log("Pricing data:", r.data); // debug xem trả về gì
        console.log("dayType:", dayType); // debug xem đang tìm loại gì
        const matched = r.data.find((p) => p.dayOfWeek === dayType);
        console.log("matched:", matched); // debug xem có match không
        setPricing(matched ? Number(matched.price) : null);
      })
      .catch((err) => {
        console.log("Pricing error:", err);
        setPricing(null);
      });
  }, [id, date]);

  // Load dịch vụ
  useEffect(() => {
    api
      .get("/services/active")
      .then((r) => setServices(r.data))
      .catch(() => setServices([]));
  }, []);

  // Toggle chọn slot
  const toggleSlot = (slot) => {
    if (slot.status !== "AVAILABLE") return;
    setSelectedSlots((prev) => {
      const ids = prev.map((s) => s.id);
      if (ids.includes(slot.id)) {
        return prev.filter((s) => s.id !== slot.id);
      }
      if (prev.length >= 3) {
        setError("Tối đa 3 slot liên tiếp");
        return prev;
      }
      setError("");
      return [...prev, slot];
    });
  };

  // Tính tổng ước tính (frontend estimate)
  const estimatedTotal = selectedSlots.length * 0; // thực tế lấy từ response

  // Đặt sân
  const handleBooking = async () => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: `/fields/${id}?date=${date}` } });
      return;
    }
    if (selectedSlots.length === 0) {
      setError("Vui lòng chọn ít nhất 1 slot");
      return;
    }
    setSubmitting(true);
    setError("");

    const payload = {
      slotIds: selectedSlots.map((s) => s.id),
      voucherCode: voucherCode.trim() || null,
      services: Object.entries(selectedSvcs)
        .filter(([, qty]) => qty > 0)
        .map(([serviceId, quantity]) => ({ serviceId, quantity })),
      note: note.trim() || null,
    };

    try {
      const { data } = await api.post("/bookings", payload);
      navigate(`/booking-confirm/${data.id}`, { state: { booking: data } });
    } catch (e) {
      setError(
        e.response?.data?.message || "Đặt sân thất bại, vui lòng thử lại",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!field)
    return <div className={styles.loading}>Đang tải thông tin sân...</div>;

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 7);

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header sân */}
        <div className={styles.fieldHeader}>
          <div>
            <h1>{field.name}</h1>
            <p>{field.description || "Sân cỏ nhân tạo chất lượng cao"}</p>
            <span className={`badge badge-green`}>
              {{
                FIVE_VS_FIVE: "Sân 5v5",
                SEVEN_VS_SEVEN: "Sân 7v7",
                ELEVEN_VS_ELEVEN: "Sân 11v11",
              }[field.type] || field.type}
            </span>
          </div>
          <div className={styles.datePicker}>
            <label>📅 Chọn ngày</label>
            <input
              type="date"
              value={date}
              min={today}
              max={maxDate.toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.body}>
          {/* Lưới slot */}
          <div className={styles.slotSection}>
            <h2>Lịch slot ngày {date}</h2>
            <div className={styles.legend}>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <span key={k} className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{ background: STATUS_COLOR[k] }}
                  />
                  {v}
                </span>
              ))}
            </div>

            {loading ? (
              <p className={styles.loadingText}>Đang tải lịch...</p>
            ) : slots.length === 0 ? (
              <p className={styles.empty}>Không có slot nào trong ngày này</p>
            ) : (
              <div className={styles.slotGrid}>
                {slots
                  .filter((slot) => {
                    // Nếu không phải ngày hôm nay thì hiển thị tất cả slot
                    if (date !== new Date().toISOString().split("T")[0])
                      return true;

                    // Nếu là hôm nay thì chỉ hiển thị các slot chưa bắt đầu
                    const now = new Date();

                    const slotTime = new Date();
                    const [hour, minute] = slot.startTime.split(":");
                    slotTime.setHours(Number(hour), Number(minute), 0, 0);

                    return slotTime > now;
                  })
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((slot) => {
                    const isSelected = selectedSlots.some(
                      (s) => s.id === slot.id,
                    );

                    return (
                      <div
                        key={slot.id}
                        className={`${styles.slotCard} ${
                          isSelected ? styles.slotSelected : ""
                        } ${slot.status !== "AVAILABLE" ? styles.slotDisabled : ""}`}
                        style={{
                          background: isSelected
                            ? "#bfdbfe"
                            : STATUS_COLOR[slot.status],
                        }}
                        onClick={() => toggleSlot(slot)}
                      >
                        <div className={styles.slotTime}>
                          {slot.startTime.slice(0, 5)} –{" "}
                          {slot.endTime.slice(0, 5)}
                        </div>

                        <div className={styles.slotStatus}>
                          {isSelected ? "✓ Đã chọn" : STATUS_LABEL[slot.status]}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Panel đặt sân */}
          <div className={styles.bookingPanel}>
            <h2>Thông tin đặt sân</h2>

            {/* Giá hiện tại */}
            <div className={styles.priceTag}>
              💰 Giá:{" "}
              <strong>
                {pricing
                  ? pricing.toLocaleString("vi-VN") + "₫/slot"
                  : "Đang tải..."}
              </strong>
            </div>

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
                      <span>
                        🕐 {s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            fontSize: ".82rem",
                            color: "#1d4ed8",
                            fontWeight: 700,
                          }}
                        >
                          {pricing ? pricing.toLocaleString("vi-VN") + "₫" : ""}
                        </span>
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
            {(selectedSlots.length > 0 ||
              Object.values(selectedSvcs).some((q) => q > 0)) && (
              <div className={styles.summary}>
                {selectedSlots.length > 0 && (
                  <div className={styles.summaryRow}>
                    <span>Tiền sân ({selectedSlots.length} slot)</span>
                    <span>
                      {(pricing * selectedSlots.length).toLocaleString("vi-VN")}
                      ₫
                    </span>
                  </div>
                )}
                {services
                  .filter((s) => selectedSvcs[s.id] > 0)
                  .map((s) => (
                    <div key={s.id} className={styles.summaryRow}>
                      <span>
                        {s.name} ×{selectedSvcs[s.id]}
                      </span>
                      <span>
                        {(s.price * selectedSvcs[s.id]).toLocaleString("vi-VN")}
                        ₫
                      </span>
                    </div>
                  ))}
                <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                  <span>Tổng cộng</span>
                  <strong>
                    {(
                      (pricing || 0) * selectedSlots.length +
                      services.reduce(
                        (acc, s) =>
                          acc + (s.price || 0) * (selectedSvcs[s.id] || 0),
                        0,
                      )
                    ).toLocaleString("vi-VN")}
                    ₫
                  </strong>
                </div>
              </div>
            )}

            {error && <p className={styles.error}>{error}</p>}

            <button
              className={`btn btn-primary ${styles.bookBtn}`}
              onClick={handleBooking}
              disabled={submitting || selectedSlots.length === 0}
            >
              {submitting
                ? "Đang xử lý..."
                : isLoggedIn
                  ? "⚽ Đặt sân ngay"
                  : "🔑 Đăng nhập để đặt sân"}
            </button>

            <p className={styles.note}>
              * Slot sẽ được giữ 5 phút để hoàn tất thanh toán
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
