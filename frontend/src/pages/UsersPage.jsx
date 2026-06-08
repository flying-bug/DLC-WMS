import React, { useState } from 'react';

const UsersPage = () => {
  // Dummy Data for Preview
  const [users] = useState([
    { id: 1, username: 'admin', fullName: 'Nguyễn Duy Long', email: 'long@duylong.com', role: 'Super Admin', status: 'APPROVED' },
    { id: 2, username: 'manager01', fullName: 'Trần Thị A', email: 'mana@duylong.com', role: 'Manager', status: 'APPROVED' },
    { id: 3, username: 'staff01', fullName: 'Lê Văn B', email: 'staff@duylong.com', role: 'Staff', status: 'DRAFT' },
    { id: 4, username: 'staff02', fullName: 'Phạm C', email: 'phamc@duylong.com', role: 'Staff', status: 'INACTIVE' },
  ]);

  return (
    <div className="d-flex flex-column h-100">
      {/* Page Header Area */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="m-0 fw-bold">Danh sách Tài khoản</h4>
        <div>
          <button className="btn-misa-outline me-2">
            <i className="bi bi-arrow-clockwise me-1"></i> Làm mới
          </button>
          <button className="btn-misa-primary">
            <i className="bi bi-plus-lg me-1"></i> Thêm mới
          </button>
        </div>
      </div>

      {/* Filter Area (Giống MISA có thanh lọc) */}
      <div className="d-flex align-items-center mb-3 gap-3">
        <div className="input-group" style={{ width: '300px' }}>
          <span className="input-group-text bg-white text-secondary border-end-0">
            <i className="bi bi-search"></i>
          </span>
          <input type="text" className="form-control border-start-0 ps-0" placeholder="Tìm kiếm theo Tên, Email..." />
        </div>
        <select className="form-select" style={{ width: '200px' }}>
          <option value="">Tất cả trạng thái</option>
          <option value="APPROVED">Đang hoạt động</option>
          <option value="DRAFT">Chờ duyệt</option>
          <option value="INACTIVE">Đã khóa</option>
        </select>
      </div>

      {/* Table Area */}
      <div className="misa-table flex-grow-1 overflow-auto">
        <table className="table table-borderless mb-0">
          <thead>
            <tr>
              <th width="40"><input type="checkbox" /></th>
              <th>Tên đăng nhập</th>
              <th>Họ và tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th className="text-center" width="100">Chức năng</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td><input type="checkbox" /></td>
                <td className="fw-medium text-primary">{user.username}</td>
                <td>{user.fullName}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span className={`status-badge ${
                    user.status === 'APPROVED' ? 'status-approved' : 
                    user.status === 'DRAFT' ? 'status-draft' : 'status-inactive'
                  }`}>
                    {user.status === 'APPROVED' ? 'Đang hoạt động' : 
                     user.status === 'DRAFT' ? 'Bản nháp' : 'Đã khóa'}
                  </span>
                </td>
                <td className="text-center">
                  <i className="bi bi-pencil-square text-primary me-2" style={{cursor: 'pointer'}} title="Sửa"></i>
                  {user.status === 'APPROVED' ? (
                    <i className="bi bi-lock text-danger" style={{cursor: 'pointer'}} title="Khóa"></i>
                  ) : (
                    <i className="bi bi-unlock text-success" style={{cursor: 'pointer'}} title="Mở khóa"></i>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-4 text-secondary">
                  Không có dữ liệu
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div className="d-flex justify-content-between align-items-center mt-3 bg-white p-2 rounded shadow-sm border">
        <span className="text-secondary" style={{fontSize: '13px'}}>Tổng số: <b>{users.length}</b> bản ghi</span>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select form-select-sm" style={{width: 'auto'}}>
            <option>10 bản ghi/trang</option>
            <option>20 bản ghi/trang</option>
            <option>50 bản ghi/trang</option>
          </select>
          <div className="btn-group btn-group-sm">
            <button className="btn btn-outline-secondary" disabled><i className="bi bi-chevron-left"></i></button>
            <button className="btn btn-outline-secondary" disabled><i className="bi bi-chevron-right"></i></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
