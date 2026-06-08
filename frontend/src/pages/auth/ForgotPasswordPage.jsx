import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleReset = (e) => {
    e.preventDefault();
    // Chỗ này sau sẽ gọi API tới SystemController.forgotPassword
    console.log('Reset request for', email);
    setIsSent(true);
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: 'var(--misa-body-bg)' }}>
      <div className="card shadow-sm border-0" style={{ width: '400px', borderRadius: '8px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <h3 className="fw-bold" style={{ color: 'var(--misa-primary)' }}>ERP AMIS</h3>
            <p className="text-secondary mb-0">Khôi phục mật khẩu</p>
          </div>

          {!isSent ? (
            <form onSubmit={handleReset}>
              <div className="mb-4">
                <label className="form-label fw-medium" style={{ fontSize: '13px' }}>Email liên kết với tài khoản</label>
                <input 
                  type="email" 
                  className="form-control form-control-lg" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  style={{ fontSize: '14px' }}
                />
              </div>

              <button type="submit" className="btn btn-primary w-100 py-2 fw-medium mb-3" style={{ backgroundColor: 'var(--misa-primary)', border: 'none' }}>
                Gửi yêu cầu đặt lại mật khẩu
              </button>
            </form>
          ) : (
            <div className="text-center mb-4">
              <div className="mb-3">
                <i className="bi bi-check-circle text-success" style={{ fontSize: '48px' }}></i>
              </div>
              <p className="text-success fw-medium">Đã gửi liên kết khôi phục!</p>
              <p className="text-secondary" style={{ fontSize: '13px' }}>
                Vui lòng kiểm tra hộp thư email <strong>{email}</strong> và làm theo hướng dẫn để lấy lại mật khẩu.
              </p>
            </div>
          )}

          <div className="text-center mt-4">
            <Link to="/login" style={{ fontSize: '13px', color: 'var(--misa-primary)', textDecoration: 'none' }}>
              <i className="bi bi-arrow-left me-1"></i> Quay lại trang Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
