import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import { GoogleLogin } from '@react-oauth/google';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    // Validate cơ bản ở Front-end
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }

    setIsLoading(true);
    try {
      // Gọi API đăng nhập
      const response = await axiosClient.post('/auth/login', {
        username: username,
        password: password
      });
      
      console.log('Login success:', response);
      // Lưu token vào localStorage (nếu backend trả về token)
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        // Lưu role
        if (response.data.role) {
           localStorage.setItem('role', response.data.role);
        }
      }
      
      // Chuyển hướng vào trang chính
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      if (error.response && error.response.status === 401) {
          setErrorMsg('Tên đăng nhập hoặc mật khẩu không chính xác!');
      } else {
          setErrorMsg('Đăng nhập thất bại. Vui lòng thử lại sau!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await axiosClient.post('/auth/login-google?token=' + credentialResponse.credential);
      console.log('Google Login success:', response);
      if (response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        if (response.data.role) {
           localStorage.setItem('role', response.data.role);
        }
        navigate('/');
      }
    } catch (error) {
      console.error('Google Login failed:', error);
      if (error.response && error.response.status === 403) {
        setErrorMsg('Tài khoản không tồn tại. Vui lòng liên hệ Admin!');
      } else if (error.response && error.response.status === 500) {
        setErrorMsg('Lỗi máy chủ hoặc xác thực Google thất bại!');
      } else {
        setErrorMsg('Đăng nhập bằng Google thất bại. Vui lòng thử lại!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrorMsg('Đăng nhập bằng Google thất bại!');
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: 'var(--misa-body-bg)' }}>
      <div className="card shadow-sm border-0" style={{ width: '400px', borderRadius: '8px' }}>
        <div className="card-body p-5">
          <div className="text-center mb-4">
            <h3 className="fw-bold" style={{ color: 'var(--misa-primary)' }}>ERP AMIS</h3>
            <p className="text-secondary mb-0">Đăng nhập vào hệ thống</p>
          </div>

          {errorMsg && (
            <div className="alert alert-danger" role="alert" style={{ fontSize: '13px', padding: '10px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label className="form-label fw-medium" style={{ fontSize: '13px' }}>Tên đăng nhập</label>
              <input 
                type="text" 
                className={`form-control form-control-lg ${errorMsg ? 'is-invalid' : ''}`} 
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
                className={`form-control form-control-lg mt-2 ${errorMsg ? 'is-invalid' : ''}`} 
                placeholder="Nhập mật khẩu" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                style={{ fontSize: '14px' }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-100 py-2 fw-medium mt-3" 
              disabled={isLoading}
              style={{ backgroundColor: 'var(--misa-primary)', border: 'none' }}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Đang đăng nhập...
                </>
              ) : 'Đăng nhập'}
            </button>
          </form>

          <div className="d-flex align-items-center my-4">
            <hr className="flex-grow-1" />
            <span className="mx-3 text-secondary" style={{ fontSize: '12px' }}>HOẶC</span>
            <hr className="flex-grow-1" />
          </div>

          <div className="d-flex justify-content-center w-100">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signin_with"
              theme="outline"
              size="large"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
