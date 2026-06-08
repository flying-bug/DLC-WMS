import LoginPanel from './components/LoginPanel';
import BrandPanel from './components/BrandPanel';
import styles from './LoginPage.module.css';

function LoginPage() {
    return (
        <div className={styles.loginWrapper}>
            {/* Cột trái: Brand panel */}
            <BrandPanel />

            {/* Cột phải: Form đăng nhập */}
            <LoginPanel />
        </div>
    );
}

export default LoginPage;
