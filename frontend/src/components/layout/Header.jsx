

const Header = () => {
  return (
    <div style={{
      height: 'var(--misa-header-height)',
      backgroundColor: 'white',
      borderBottom: '1px solid var(--misa-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      {/* Nút toggle & Tên công ty */}
      <div className="d-flex align-items-center">
        <i className="bi bi-list fs-4 me-3" style={{cursor: 'pointer'}}></i>
        <span className="fw-bold" style={{fontSize: '16px'}}>CÔNG TY TNHH MÁY TÍNH DUY LONG</span>
      </div>

      {/* Thông tin user & Tiện ích */}
      <div className="d-flex align-items-center">
        <div className="position-relative me-4" style={{cursor: 'pointer'}}>
          <i className="bi bi-bell fs-5 text-secondary"></i>
          <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"></span>
        </div>
        
        <div className="d-flex align-items-center" style={{cursor: 'pointer'}}>
          <img 
            src="https://ui-avatars.com/api/?name=Admin+User&background=0075c0&color=fff" 
            alt="avatar" 
            className="rounded-circle me-2" 
            style={{width: '32px', height: '32px'}} 
          />
          <span className="fw-medium">Super Admin</span>
          <i className="bi bi-chevron-down ms-2" style={{fontSize: '12px'}}></i>
        </div>
      </div>
    </div>
  );
};

export default Header;
