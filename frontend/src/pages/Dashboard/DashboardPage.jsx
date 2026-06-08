import { useNavigate } from 'react-router-dom';

function DashboardPage() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ color: '#1e3f7a' }}>🎉 Đăng nhập thành công!</h1>
            <p>Chào mừng bạn đến với Hệ thống Quản trị.</p>
            <p>Chức năng Dashboard đang được xây dựng...</p>
            <button 
                onClick={handleLogout}
                style={{
                    padding: '10px 20px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginTop: '20px'
                }}>
                Đăng xuất
            </button>
        </div>
    );
}

export default DashboardPage;
