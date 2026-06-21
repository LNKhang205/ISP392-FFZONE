import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import styles from "./CartPage.module.css";

const API_BASE =
  import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:8080";
const FALLBACK = "https://placehold.co/80x60?text=?";

function getImg(url) {
  if (!url) return FALLBACK;
  if (url.startsWith("http")) return url;
  return `${API_BASE}/${url}`;
}

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, loading, update, remove, clear } = useCart();
  const [busy, setBusy] = useState({});
  const [msg, setMsg] = useState("");

  if (loading)
    return (
      <div className={styles.page}>
        <div className="container">
          <p>⏳ Đang tải giỏ hàng...</p>
        </div>
      </div>
    );

  const items = cart?.items ?? [];
  const pendingSlots = sessionStorage.getItem("ffzone_pending_booking_slots");

  const handleQty = async (item, delta) => {
    const newQty = item.quantity + delta;
    setBusy((b) => ({ ...b, [item.id]: true }));
    try {
      await update(item.id, newQty); // quantity ≤ 0 → xóa item (xử lý ở backend)
    } catch {
      setMsg("❌ Không thể cập nhật. Vui lòng thử lại.");
    } finally {
      setBusy((b) => ({ ...b, [item.id]: false }));
    }
  };

  const handleRemove = async (item) => {
    setBusy((b) => ({ ...b, [item.id]: true }));
    try {
      await remove(item.id);
    } catch {
      setMsg("❌ Không thể xóa item.");
    } finally {
      setBusy((b) => ({ ...b, [item.id]: false }));
    }
  };

  const handleClear = async () => {
    if (!window.confirm("Xóa toàn bộ giỏ hàng?")) return;
    try {
      await clear();
    } catch {
      setMsg("❌ Không thể xóa giỏ.");
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>🛒 Giỏ hàng dịch vụ</h1>

        {pendingSlots && (
          <div className={styles.pendingBanner}>
            🕐 Bạn đang có một lượt đặt sân dở dang.{" "}
            <button
              className={styles.pendingBannerLink}
              onClick={() => navigate(`/booking/confirm?slots=${pendingSlots}`)}
            >
              Quay lại xác nhận đặt sân →
            </button>
          </div>
        )}

        {msg && <p className={styles.error}>{msg}</p>}

        {items.length === 0 ? (
          <div className={styles.empty}>
            <span>🛒</span>
            <p>Giỏ hàng trống</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/services")}
            >
              Xem dịch vụ
            </button>
          </div>
        ) : (
          <div className={styles.layout}>
            {/* Danh sách item */}
            <div className={styles.itemList}>
              {items.map((item) => (
                <div key={item.id} className={styles.item}>
                  <img
                    src={getImg(item.imageUrl)}
                    alt={item.serviceName}
                    className={styles.thumb}
                    onError={(e) => {
                      e.target.src = FALLBACK;
                    }}
                  />
                  <div className={styles.info}>
                    <div className={styles.name}>{item.serviceName}</div>
                    <div className={styles.cat}>
                      {item.serviceCategory === "DRINK"
                        ? "🥤 Đồ uống"
                        : item.serviceCategory === "EQUIPMENT"
                          ? "⚽ Dụng cụ"
                          : "🏟️ Tiện ích"}
                    </div>
                    <div className={styles.unitPrice}>
                      {Number(item.unitPrice).toLocaleString("vi-VN")}₫ / cái
                    </div>
                  </div>
                  <div className={styles.qtyControl}>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => handleQty(item, -1)}
                      disabled={busy[item.id]}
                    >
                      −
                    </button>
                    <span className={styles.qtyNum}>{item.quantity}</span>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => handleQty(item, +1)}
                      disabled={busy[item.id]}
                    >
                      +
                    </button>
                  </div>
                  <div className={styles.subtotal}>
                    {Number(item.subtotal).toLocaleString("vi-VN")}₫
                  </div>
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemove(item)}
                    disabled={busy[item.id]}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div className={styles.listFooter}>
                <button className={styles.clearBtn} onClick={handleClear}>
                  🗑️ Xóa tất cả
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate("/services")}
                >
                  ← Tiếp tục chọn dịch vụ
                </button>
              </div>
            </div>

            {/* Summary */}
            <div className={styles.summary}>
              <h2 className={styles.summaryTitle}>Tổng giỏ hàng</h2>
              <div className={styles.summaryRow}>
                <span>Số loại dịch vụ</span>
                <span>{items.length}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Tổng số lượng</span>
                <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className={styles.divider} />
              <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                <span>Tổng cộng</span>
                <span>{Number(cart?.total ?? 0).toLocaleString("vi-VN")}₫</span>
              </div>
              <p className={styles.hint}>
                💡 Dịch vụ sẽ được gắn vào đơn đặt sân khi bạn xác nhận booking.
              </p>
              <button
                className={`btn btn-primary ${styles.bookingBtn}`}
                onClick={() => {
                  // Nếu đang có 1 lượt đặt sân dở dang (vào /cart từ trang
                  // /booking/confirm), quay lại đúng chỗ đó thay vì bắt
                  // chọn slot lại từ đầu.
                  const pendingSlots = sessionStorage.getItem(
                    "ffzone_pending_booking_slots",
                  );
                  if (pendingSlots) {
                    navigate(`/booking/confirm?slots=${pendingSlots}`);
                  } else {
                    navigate("/booking");
                  }
                }}
              >
                ⚽ Đặt sân kèm dịch vụ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
