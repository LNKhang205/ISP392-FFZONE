import styles from './Footer.module.css'
export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <span>⚽ FF<strong>Zone</strong></span>
          <p>Hệ thống đặt sân bóng đá tiện lợi, nhanh chóng.</p>
        </div>
        <div className={styles.col}>
          <h4>Liên kết</h4>
          <a href="/">Trang chủ</a>
          <a href="/fields">Sân bóng</a>
        </div>
        <div className={styles.col}>
          <h4>Liên hệ</h4>
          <span>📞 0900 000 000</span>
          <span>📧 info@ffzone.vn</span>
        </div>
      </div>
      <div className={styles.bottom}>
        <div className="container">© 2026 FFZone. All rights reserved.</div>
      </div>
    </footer>
  )
}
