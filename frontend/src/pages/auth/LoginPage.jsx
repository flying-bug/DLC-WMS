import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Chỗ này sau sẽ gọi API tới AuthController.java
    console.log('Login with', username, password);
    navigate('/');
  };

  const handleGoogleLogin = () => {
    console.log('Login with Google clicked');
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: 'var(--misa-body-bg)' }}>
      <div className="card shadow-sm border-0" style={{ width: '400px', borderRadius: '8px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <h3 className="fw-bold" style={{ color: 'var(--misa-primary)' }}>ERP AMIS</h3>
            <p className="text-secondary mb-0">Đăng nhập vào hệ thống</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label fw-medium" style={{ fontSize: '13px' }}>Tên đăng nhập</label>
              <input 
                type="text" 
                className="form-control form-control-lg" 
                placeholder="Nhập tài khoản" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required 
                style={{ fontSize: '14px' }}
              />
            </div>
            
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <label className="form-label fw-medium mb-0" style={{ fontSize: '13px' }}>Mật khẩu</label>
                <Link to="/forgot-password" style={{ fontSize: '12px', color: 'var(--misa-primary)', textDecoration: 'none' }}>
                  Quên mật khẩu?
                </Link>
              </div>
              <input 
                type="password" 
                className="form-control form-control-lg mt-2" 
                placeholder="Nhập mật khẩu" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                style={{ fontSize: '14px' }}
              />
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2 fw-medium mt-3" style={{ backgroundColor: 'var(--misa-primary)', border: 'none' }}>
              Đăng nhập
            </button>
          </form>

          <div className="d-flex align-items-center my-4">
            <hr className="flex-grow-1" />
            <span className="mx-3 text-secondary" style={{ fontSize: '12px' }}>HOẶC</span>
            <hr className="flex-grow-1" />
          </div>

          <button 
            type="button" 
            className="btn btn-outline-secondary w-100 py-2 fw-medium d-flex align-items-center justify-content-center"
            onClick={handleGoogleLogin}
            style={{ fontSize: '14px' }}
          >
            <i className="bi bi-google me-2 text-danger"></i> Đăng nhập với Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
