import { Component } from 'react';

// React chỉ bắt được lỗi render qua một Error Boundary (class component - chưa có hook
// tương đương). Không có boundary nào trong app trước đây, nên bất kỳ lỗi runtime nào khi
// render (vd. gọi .map trên dữ liệu chưa đúng dạng) đều làm sập toàn bộ cây React, để lại
// màn hình trắng tinh không thông báo gì. Bọc quanh <Outlet/> trong AdminLayout để chỉ vùng
// nội dung trang bị lỗi, còn sidebar/header vẫn dùng được, và bọc quanh cả App ở main.jsx làm
// lưới an toàn cuối cùng.
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error('Lỗi hiển thị trang:', error, info?.componentStack);
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '48px 24px',
                    textAlign: 'center',
                    minHeight: '320px',
                }}>
                    <i className="bi bi-exclamation-triangle" style={{ fontSize: '40px', color: '#dc3545' }} />
                    <h5 style={{ margin: 0 }}>Đã có lỗi xảy ra khi hiển thị trang này</h5>
                    <p style={{ color: '#6c757d', maxWidth: '480px', margin: 0 }}>
                        Vui lòng thử tải lại trang. Nếu lỗi vẫn tiếp diễn, hãy báo cho quản trị viên kèm theo thao tác bạn vừa thực hiện.
                    </p>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button type="button" className="btnDefault" onClick={() => window.history.back()}>
                            <i className="bi bi-arrow-left" /> Quay lại
                        </button>
                        <button type="button" className="btnPrimary" onClick={() => window.location.reload()}>
                            <i className="bi bi-arrow-clockwise" /> Tải lại trang
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
