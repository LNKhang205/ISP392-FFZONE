import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getBookingByCode } from '../../api/bookingApi'
import styles from './PaymentResultPage.module.css'

/**
 * VNPay redirect trình duyệt user về đây sau khi thanh toán (xem PaymentController.handleReturn).
 * Backend đã verify chữ ký và gắn ?status=success|failed&txnRef=...
 *
 * LƯU Ý: trang này CHỈ hiển thị kết quả cho người dùng xem — việc xác nhận
 * booking thật sự (CONFIRMED) đã xảy ra ở phía backend qua IPN, độc lập với
 * trang này. Có thể IPN tới sau vài giây so với lúc trình duyệt redirect về,
 * nên trang chủ động poll lại trạng thái booking vài lần.
 */
export default function PaymentResultPage() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') // 'success' | 'failed'
  const bookingCode = searchParams.get('bookingCode') || ''

  const [booking, setBooking] = useState(null)
  const [polling, setPolling] = useState(true)

  useEffect(() => {
    if (!bookingCode || status !== 'success') { setPolling(false); return }

    let attempts = 0
    const maxAttempts = 6 // ~12 giây
    const interval = setInterval(async () => {
      attempts++
      try {
        const data = await getBookingByCode(bookingCode)
        setBooking(data)
        if (data.status === 'CONFIRMED' || attempts >= maxAttempts) {
          clearInterval(interval)
          setPolling(false)
        }
      } catch {
        if (attempts >= maxAttempts) {
          clearInterval(interval)
          setPolling(false)
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [bookingCode, status])

  if (status !== 'success') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.iconFail}>✕</div>
          <h1 className={styles.title}>Thanh toán không thành công</h1>
          <p className={styles.desc}>
            Giao dịch của bạn chưa hoàn tất hoặc đã bị hủy. Khung giờ vẫn được giữ
            chỗ trong thời gian còn lại — bạn có thể thử thanh toán lại từ trang
            lịch sử đặt sân.
          </p>
          <Link to="/profile/bookings" className="btn btn-primary">Xem đơn đặt sân của tôi</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {polling ? (
          <>
            <div className={styles.spinner} />
            <h1 className={styles.title}>Đang xác nhận thanh toán...</h1>
            <p className={styles.desc}>Vui lòng đợi trong giây lát, hệ thống đang xác nhận giao dịch với VNPay.</p>
          </>
        ) : booking?.status === 'CONFIRMED' ? (
          <>
            <div className={styles.iconSuccess}>✓</div>
            <h1 className={styles.title}>Đặt sân thành công!</h1>
            <p className={styles.desc}>
              Mã đặt sân: <strong>{booking.bookingCode}</strong><br />
              Sân: <strong>{booking.fieldName}</strong><br />
              Tổng tiền: <strong>{Number(booking.totalAmount).toLocaleString('vi-VN')}₫</strong>
            </p>
            <Link to="/profile/bookings" className="btn btn-primary">Xem chi tiết đơn đặt sân</Link>
          </>
        ) : (
          <>
            <div className={styles.iconWarn}>!</div>
            <h1 className={styles.title}>Đang chờ xác nhận</h1>
            <p className={styles.desc}>
              VNPay báo giao dịch thành công, nhưng hệ thống chưa nhận được xác
              nhận cuối cùng. Vui lòng kiểm tra lại trong mục "Đơn đặt sân của tôi"
              sau ít phút.
            </p>
            <Link to="/profile/bookings" className="btn btn-primary">Xem đơn đặt sân của tôi</Link>
          </>
        )}
      </div>
    </div>
  )
}
