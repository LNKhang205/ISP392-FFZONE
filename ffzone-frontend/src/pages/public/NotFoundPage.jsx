import { Link } from 'react-router-dom'
export default function NotFoundPage() {
  return (
    <div style={{textAlign:'center',padding:'120px 24px'}}>
      <div style={{fontSize:80}}>⚽</div>
      <h1 style={{fontSize:48,fontWeight:800,margin:'16px 0 8px'}}>404</h1>
      <p style={{color:'var(--gray-500)',marginBottom:32}}>Trang bạn tìm không tồn tại</p>
      <Link to="/" className="btn btn-primary">Về trang chủ</Link>
    </div>
  )
}
