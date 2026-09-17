const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export function printRepairHandover(repair) {
  const popup = window.open('', '_blank', 'width=900,height=700');
  if (!popup) return false;
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Biên bản bàn giao ${escapeHtml(repair.handoverCode)}</title>
    <style>body{font-family:Arial,sans-serif;padding:36px;color:#111}h1{text-align:center;font-size:22px}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:9px;border:1px solid #bbb}.sign{display:flex;justify-content:space-between;margin-top:70px;text-align:center}.sign div{width:40%}</style>
    </head><body><h1>BIÊN BẢN BÀN GIAO THIẾT BỊ</h1>
    <table><tr><td>Mã bàn giao</td><td>${escapeHtml(repair.handoverCode)}</td></tr>
    <tr><td>Lệnh sửa chữa</td><td>${escapeHtml(repair.repairCode)}</td></tr>
    <tr><td>Thiết bị</td><td>${escapeHtml(repair.productName || repair.manualDeviceName)}</td></tr>
    <tr><td>Serial/Mã nhận diện</td><td>${escapeHtml(repair.serialNumber || repair.manualDeviceIdentifier)}</td></tr>
    <tr><td>Người nhận</td><td>${escapeHtml(repair.recipientName)} — ${escapeHtml(repair.recipientPhone)}</td></tr>
    <tr><td>Thời điểm</td><td>${escapeHtml(repair.returnedAt)}</td></tr>
    <tr><td>Ghi chú</td><td>${escapeHtml(repair.returnNote)}</td></tr></table>
    <div class="sign"><div><strong>Người bàn giao</strong><p>(Ký, ghi rõ họ tên)</p></div><div><strong>Người nhận</strong><p>(Ký, ghi rõ họ tên)</p></div></div>
    <script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
  popup.document.close();
  return true;
}
