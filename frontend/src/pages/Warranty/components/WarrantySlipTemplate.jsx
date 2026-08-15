import React, { forwardRef } from 'react';
import { formatDateOnly } from '../../../utils/dateFormat';

const fmtDate = formatDateOnly;

const WarrantySlipTemplate = forwardRef(({ warranty }, ref) => {
    if (!warranty) return null;

    const lines = warranty.lines || [];
    let idxCounter = 1;

    return (
        <div ref={ref} style={{
            padding: '40px',
            fontFamily: 'Arial, sans-serif',
            color: '#000',
            backgroundColor: '#fff',
            fontSize: '14px',
            lineHeight: '1.5'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>CÔNG TY TNHH Duy Long</h2>
                    <p style={{ margin: '2px 0', fontSize: '13px' }}>Địa chỉ: Số 59 Thịnh Liệt - Hoàng Mai - Hà Nội</p>
                    <p style={{ margin: '2px 0', fontSize: '13px' }}>Điện thoại: 0392718888 - Email: Duylongcomputer@gmail.com</p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '13px' }}>
                    <p style={{ margin: '2px 0' }}><strong>Ngày in:</strong> {fmtDate(new Date())}</p>
                    <p style={{ margin: '2px 0' }}><strong>Mã bảo hành:</strong> {warranty.warrantyCode}</p>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>PHIẾU BẢO HÀNH</h1>
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '13px' }}>(Kính gửi: Quý Khách hàng)</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '25%', padding: '4px 0' }}><strong>Khách hàng / Đơn vị:</strong></td>
                            <td style={{ width: '75%', padding: '4px 0' }}>{warranty.partnerName || warranty.customerName || 'Khách lẻ'}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 0' }}><strong>Điện thoại:</strong></td>
                            <td style={{ padding: '4px 0' }}>{warranty.partnerPhone || warranty.customerPhone || 'Chưa cung cấp'}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 0' }}><strong>Địa chỉ:</strong></td>
                            <td style={{ padding: '4px 0' }}>{warranty.partnerAddress || warranty.customerAddress || 'Chưa cung cấp'}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 0' }}><strong>Thời hạn bảo hành:</strong></td>
                            <td style={{ padding: '4px 0' }}>Từ {fmtDate(warranty.startDate)} đến {fmtDate(warranty.endDate)}</td>
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 0' }}><strong>Ghi chú:</strong></td>
                            <td style={{ padding: '4px 0' }}>{warranty.note || 'Không có ghi chú'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Danh sách sản phẩm bảo hành:</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                <thead>
                    <tr>
                        <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f3f4f6', width: '5%' }}>STT</th>
                        <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f3f4f6', width: '15%' }}>Mã SKU</th>
                        <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f3f4f6', width: '40%', textAlign: 'left' }}>Sản phẩm</th>
                        <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f3f4f6', width: '20%' }}>Serial</th>
                        <th style={{ border: '1px solid #000', padding: '8px', backgroundColor: '#f3f4f6', width: '20%' }}>Hạn bảo hành</th>
                    </tr>
                </thead>
                <tbody>
                    {lines.map((line, idx) => (
                        <tr key={idx}>
                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{idxCounter++}</td>
                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{line.sku || 'N/A'}</td>
                            <td style={{ border: '1px solid #000', padding: '8px' }}>{line.variantName || 'Sản phẩm'}</td>
                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{line.serialNumber || 'N/A'}</td>
                            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{fmtDate(line.endDate)}</td>
                        </tr>
                    ))}
                    {lines.length === 0 && (
                        <tr>
                            <td colSpan="5" style={{ border: '1px solid #000', padding: '16px', textAlign: 'center' }}>Chưa có sản phẩm</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div style={{ fontSize: '13px', marginBottom: '40px', fontStyle: 'italic' }}>
                <strong>Điều kiện bảo hành:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li>Sản phẩm còn trong thời hạn bảo hành.</li>
                    <li>Tem bảo hành còn nguyên vẹn, không có dấu hiệu cạo sửa, rách nát.</li>
                    <li>Sản phẩm hư hỏng do lỗi kỹ thuật của nhà sản xuất.</li>
                    <li>Không bảo hành đối với sản phẩm bị rơi vỡ, vô nước, cháy nổ hoặc do thiên tai gây ra.</li>
                </ul>
            </div>

            <table style={{ width: '100%', marginTop: '30px' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top' }}>
                            <strong>Khách hàng</strong><br />
                            <span style={{ fontSize: '12px', fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</span>
                        </td>
                        <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top' }}>
                            <strong>Đại diện công ty</strong><br />
                            <span style={{ fontSize: '12px', fontStyle: 'italic' }}>(Ký, ghi rõ họ tên)</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
});

export default WarrantySlipTemplate;
