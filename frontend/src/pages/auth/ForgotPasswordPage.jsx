import { useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập email!');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      await axiosClient.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`);
      setIsSent(true);
    } catch (error) {
      console.error('Forgot password failed:', error);
      if (error.response && error.response.status === 400) {
        setErrorMsg('Email không tồn tại trong hệ thống!');
      } else {
        setErrorMsg('Tài khoản không tồn tại hoặc có lỗi xảy ra. Vui lòng thử lại!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: 'var(--misa-body-bg)' }}>
      <div className="card shadow-sm border-0" style={{ width: '400px', borderRadius: '8px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <h3 className="fw-bold" style={{ color: 'var(--misa-primary)' }}>ERP AMIS</h3>
            <p className="text-secondary mb-0">Khôi phục mật khẩu</p>
          </div>

          {errorMsg && (
            <div className="alert alert-danger" role="alert" style={{ fontSize: '13px', padding: '10px' }}>
              {errorMsg}
            </div>
          )}

          {!isSent ? (
            <form onSubmit={handleReset}>
              <div className="mb-4">
                <label className="form-label fw-medium" style={{ fontSize: '13px' }}>Email liên kết với tài khoản</label>
                <input 
                  type="email" 
                  className={`form-control form-control-lg ${errorMsg ? 'is-invalid' : ''}`} 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  style={{ fontSize: '14px' }}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary w-100 py-2 fw-medium mb-3" 
                disabled={isLoading}
                style={{ backgroundColor: 'var(--misa-primary)', border: 'none' }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Đang xử lý...
                  </>
                ) : 'Khôi phục mật khẩu'}
              </button>
            </form>
          ) : (
            <div className="text-center mb-4">
              <div className="mb-3">
                <i className="bi bi-check-circle text-success" style={{ fontSize: '48px' }}></i>
              </div>
              <p className="text-success fw-medium">Đã gửi email khôi phục thành công!</p>
              <p className="text-secondary" style={{ fontSize: '13px' }}>
                Hệ thống đã gửi một mật khẩu mới ngẫu nhiên tới hộp thư <strong>{email}</strong>.<br/><br/>
                Vui lòng kiểm tra email (cả thư mục rác/spam), đăng nhập lại và đổi mật khẩu mới để đảm bảo an toàn.
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
