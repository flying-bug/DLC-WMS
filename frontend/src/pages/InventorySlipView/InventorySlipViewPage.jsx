import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import AttachmentUpload from '../../components/ui/AttachmentUpload/AttachmentUpload';
import IssueInvoiceModal from '../SalesOrder/components/IssueInvoiceModal';
import EInvoicePreviewModal from '../EInvoice/components/EInvoicePreviewModal';
import * as importApi from '../../api/inventoryImportApi';
import * as exportApi from '../../api/inventoryExportApi';
import * as customerApi from '../../api/customerApi';
import * as einvoiceApi from '../../api/einvoiceApi';
import useGoBack from '../../hooks/useGoBack';
import { canViewPricing, hasPermission } from '../../auth/session';
import { formatDateOnly, formatDateTime } from '../../utils/dateFormat';
import { parseNoteAndAttachments } from '../../utils/attachmentHelper';
import { EXPORT_PURPOSE_OPTIONS, IMPORT_PURPOSE_OPTIONS } from '../../utils/documentFilterOptions';
import { printImportSlip } from '../../utils/printImportSlip';
import { printExportSlip } from '../../utils/printExportSlip';
import { isSlipEditable } from '../../utils/inventorySlipStatus';
import styles from './InventorySlipViewPage.module.css';

// Màn XEM phiếu nhập / xuất kho (chỉ đọc). Bấm vào mã phiếu ở mọi nơi mở màn này; chỉ phiếu còn sửa được
// (lưu tạm / chờ duyệt / đã bỏ ghi sổ) mới có nút "Sửa" chuyển sang màn sửa.

const unwrap = (res) => res?.data?.data ?? res?.data;
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const quantity = (value) => Number(value || 0).toLocaleString('vi-VN');

const STATUS = {
  DRAFT: { label: 'Lưu tạm', tone: 'draft' },
  SUBMITTED: { label: 'Chờ duyệt', tone: 'draft' },
  POSTED: { label: 'Đã ghi sổ', tone: 'posted' },
  UNPOSTED: { label: 'Đã bỏ ghi sổ', tone: 'warning' },
  CANCELLED: { label: 'Đã hủy', tone: 'cancelled' },
  CANCELED: { label: 'Đã hủy', tone: 'cancelled' },
};

const PURPOSE_LABELS = {
  ...Object.fromEntries([...IMPORT_PURPOSE_OPTIONS, ...EXPORT_PURPOSE_OPTIONS].map(o => [o.value, o.label])),
  TRANSFER_EXPORT: 'Xuất chuyển kho',
  TRANSFER_IMPORT: 'Nhận chuyển kho',
  INVENTORY_ADJUSTMENT: 'Xuất điều chỉnh kiểm kê',
  PO_BACKORDER: 'Nhập bù đơn mua hàng',
};

const REFERENCE_LABELS = {
  SALES_ORDER: 'Đơn bán hàng',
  PURCHASE_ORDER: 'Đơn mua hàng',
  STOCKTAKE: 'Kiểm kê',
  STOCK_TRANSFER: 'Chuyển kho',
  REPAIR: 'Sửa chữa',
  ASSEMBLY_ORDER: 'Lệnh lắp ráp / tháo dỡ',
  WARRANTY: 'Bảo hành',
};

/** Đường dẫn tới chứng từ tham chiếu (cùng quy tắc với danh sách phiếu nhập/xuất). */
function referencePath(refType, refId) {
  if (!refType || !refId) return null;
  const type = String(refType).trim().toUpperCase();
  if (type.includes('STOCKTAKE') || type.includes('STOCK_TAKE')) return `/stocktakes/${refId}`;
  if (type.includes('PURCHASE') || type === 'PO') return `/purchase-orders/${refId}`;
  if (type.includes('SALES') || type === 'SO') return `/sales-orders/${refId}`;
  if (type.includes('ASSEMBLY')) return `/assembly-orders/${refId}`;
  if (type.includes('REPAIR')) return `/repairs/${refId}`;
  if (type.includes('WARRANTY')) return `/warranties/${refId}`;
  if (type.includes('TRANSFER')) return `/transfer-history/${refId}/edit`;
  return null;
}

export default function InventorySlipViewPage({ kind }) {
  const isImport = kind === 'import';
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = useGoBack(isImport ? '/import-history' : '/export-slips');
  const showPricing = canViewPricing();

  const [slip, setSlip] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ isVisible: false, type: 'info', message: '' });

  const [einvoice, setEinvoice] = useState(null);
  const [soInvoice, setSoInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issuingInvoice, setIssuingInvoice] = useState(false);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const canUseEInvoice = !isImport && hasPermission('einvoice:view');

  const loadEInvoice = useCallback(async (salesOrderId) => {
    try {
      setEinvoice(unwrap(await einvoiceApi.getEInvoiceByExportId(id)) || null);
    } catch {
      setEinvoice(null);
    }
    if (!salesOrderId) return;
    try {
      const list = unwrap(await einvoiceApi.getEInvoicesBySalesOrderId(salesOrderId));
      const invoices = Array.isArray(list) ? list : (list ? [list] : []);
      // HĐ gộp cả đơn (không gắn phiếu xuất cụ thể)
      setSoInvoice(invoices.find(inv => !inv.inventoryDocumentId) || null);
    } catch {
      setSoInvoice(null);
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const detail = unwrap(await (isImport ? importApi.getImportDetail(id) : exportApi.getExportDetail(id)));
        if (cancelled) return;
        if (!detail) throw new Error('empty');
        setSlip(detail);
        if (detail.partnerId) {
          // Địa chỉ / SĐT / MST dùng khi in phiếu và xuất HĐĐT; không đọc được (vd nhà cung cấp) thì chỉ dùng tên
          customerApi.getCustomerById(detail.partnerId)
            .then(res => { if (!cancelled) setPartner(unwrap(res) || null); })
            .catch(() => {});
        }
        if (canUseEInvoice && detail.status === 'POSTED') {
          loadEInvoice(detail.salesOrderId);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.userMessage || `Không tải được phiếu ${isImport ? 'nhập' : 'xuất'} kho.`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, isImport, canUseEInvoice, loadEInvoice]);

  const lines = useMemo(() => slip?.lines || [], [slip]);
  const qtyOf = useCallback((line) => Number(isImport
    ? (line.quantityIn ?? line.quantity)
    : (line.quantityOut ?? line.quantity)) || 0, [isImport]);
  const priceOf = useCallback((line) => Number(isImport ? line.unitCost : line.unitPrice) || 0, [isImport]);
  const vatOf = (line) => Number(line.vatPercent ?? line.vatRate ?? 0) || 0;

  const totals = useMemo(() => lines.reduce((sum, line) => {
    const amount = qtyOf(line) * priceOf(line);
    return {
      quantity: sum.quantity + qtyOf(line),
      amount: sum.amount + amount,
      vat: sum.vat + amount * vatOf(line) / 100,
    };
  }, { quantity: 0, amount: 0, vat: 0 }), [lines, qtyOf, priceOf]);

  const warehouseName = useMemo(() => {
    if (!slip) return '';
    const headerLine = lines.find(l => String(l.warehouseId) === String(slip.warehouseId)) || lines[0];
    return headerLine?.warehouseName || (slip.warehouseId ? `Kho #${slip.warehouseId}` : '-');
  }, [slip, lines]);

  const partnerInfo = useMemo(() => ({
    ...(partner || {}),
    name: partner?.name || slip?.partnerName || '',
  }), [partner, slip]);

  const status = STATUS[slip?.status] || { label: slip?.status || '-', tone: 'draft' };
  const editable = slip && isSlipEditable(slip.status);
  const canEdit = editable && (hasPermission(isImport ? 'import:edit' : 'export:edit')
    || hasPermission(isImport ? 'import:post' : 'export:post'));
  const { note, attachments } = parseNoteAndAttachments(slip?.note || '');
  const docLabel = isImport ? 'nhập' : 'xuất';
  const refPath = referencePath(slip?.referenceType, slip?.referenceId);

  const handlePrint = () => {
    if (!slip) return;
    // Bảng tra cứu cho mẫu in dựng từ chính dữ liệu phiếu (không cần tải danh mục sản phẩm / kho / người dùng)
    const productById = new Map(lines.map(l => [String(l.variantId), {
      sku: l.sku, productName: l.productName, variantName: l.variantName, name: l.productName,
      unitName: l.unitName, warrantyMonths: l.warrantyMonths,
    }]));
    const warehouseById = new Map(lines.filter(l => l.warehouseId).map(l => [String(l.warehouseId), { name: l.warehouseName }]));
    const userById = new Map();
    if (slip.createdBy) userById.set(String(slip.createdBy), { fullName: slip.createdByName });
    if (slip.salespersonId) userById.set(String(slip.salespersonId), { fullName: slip.salespersonName });
    const partnerById = new Map(slip.partnerId ? [[String(slip.partnerId), partnerInfo]] : []);
    const onError = (msg) => showToast('error', msg);

    if (isImport) {
      printImportSlip(slip, {
        supplier: partnerInfo, customer: partnerInfo, warehouseName,
        supplierById: partnerById, customerById: partnerById, warehouseById, productById, userById,
        isImport: true, onError,
      });
    } else {
      printExportSlip(slip, { customer: partnerInfo, warehouseName, productById, userById, isImport: false, onError });
    }
  };

  const handleIssueEInvoice = async (formData) => {
    setIssuingInvoice(true);
    try {
      await einvoiceApi.issueEInvoice({
        salesOrderId: slip.salesOrderId || undefined,
        inventoryDocumentId: Number(id),
        buyerName: formData.name,
        buyerLegalName: formData.legalName,
        buyerTaxCode: formData.taxCode,
        buyerAddress: formData.address,
        buyerPhone: formData.phone,
        buyerEmail: formData.email,
        paymentMethod: 'TM/CK',
      });
      showToast('success', 'Phát hành Hóa đơn điện tử thành công!');
      setShowIssueModal(false);
      loadEInvoice(slip.salesOrderId);
    } catch (err) {
      showToast('error', err?.response?.data?.userMessage || err?.response?.data?.devMessage || 'Phát hành HĐĐT thất bại');
    } finally {
      setIssuingInvoice(false);
    }
  };

  const renderEInvoiceActions = () => {
    if (!canUseEInvoice || slip?.status !== 'POSTED') return null;
    if (einvoice) {
      return (
        <button type="button" className={styles.btnSuccessOutline} onClick={() => setPreviewInvoice(einvoice)}>
          <i className="bi bi-file-earmark-check-fill" /> Xem HĐĐT ({einvoice.invoiceNumber || 'Đã cấp'})
        </button>
      );
    }
    if (soInvoice) {
      return (
        <button type="button" className={styles.btnOutline} onClick={() => setPreviewInvoice(soInvoice)}
          title="Đơn bán hàng gốc đã xuất HĐĐT gộp toàn bộ đơn">
          <i className="bi bi-receipt" /> HĐĐT theo đơn {slip.referenceCode || ''} ({soInvoice.invoiceNumber || 'Đã cấp'})
        </button>
      );
    }
    if (!hasPermission('einvoice:add')) return null;
    return (
      <button type="button" className={styles.btnSuccess} onClick={() => setShowIssueModal(true)}>
        <i className="bi bi-file-earmark-plus" /> Xuất Hóa Đơn Điện Tử
      </button>
    );
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <button type="button" className={styles.backLink} onClick={goBack}>
            <i className="bi bi-arrow-left" /> Chi tiết phiếu {docLabel} kho {slip?.docCode || ''}
          </button>
          {slip && <span className={`${styles.statusBadge} ${styles[status.tone]}`}>{status.label}</span>}
          <div className={styles.headerActions}>
            {slip && renderEInvoiceActions()}
            {slip && (
              <button type="button" className={styles.btnOutline} onClick={handlePrint}>
                <i className="bi bi-printer" /> In phiếu
              </button>
            )}
            {canEdit && (
              <button type="button" className={styles.btnPrimary}
                onClick={() => navigate(`/${isImport ? 'import' : 'export'}-slips/${id}/edit`)}>
                <i className="bi bi-pencil" /> Sửa / ghi sổ
              </button>
            )}
          </div>
        </div>

        {loading && <div className={styles.card}><div className={styles.cardBody}>Đang tải dữ liệu...</div></div>}
        {!loading && error && <div className={styles.errorCard}>{error}</div>}

        {!loading && slip && (
          <>
            {slip.status === 'UNPOSTED' && slip.unpostedAt && (
              <div className={styles.noticeWarning}>
                <i className="bi bi-arrow-counterclockwise" /> Phiếu đã bỏ ghi sổ
                {slip.unpostedByName ? ` bởi ${slip.unpostedByName}` : ''} lúc {formatDateTime(slip.unpostedAt)}
                {slip.unpostReason ? `. Lý do: ${slip.unpostReason}` : ''}
              </div>
            )}

            <div className={styles.card}>
              <div className={styles.cardHeader}><i className="bi bi-info-circle" /> Thông tin chung</div>
              <div className={`${styles.cardBody} ${styles.infoGrid}`}>
                <Info label={isImport ? 'Ngày nhập kho' : 'Ngày xuất kho'} value={formatDateOnly(slip.docDate) || '-'} />
                <Info label={isImport ? 'Kho nhập' : 'Kho xuất'} value={warehouseName} />
                <Info label="Mục đích" value={PURPOSE_LABELS[slip.issuePurpose] || slip.issuePurpose || '-'} />
                <Info label={isImport ? 'Nhà cung cấp / đối tác' : 'Khách hàng / đối tác'} value={slip.partnerName || '-'} />
                {slip.referenceType && slip.referenceId && (
                  <Info
                    label={`Chứng từ tham chiếu${REFERENCE_LABELS[slip.referenceType] ? ` (${REFERENCE_LABELS[slip.referenceType]})` : ''}`}
                    value={refPath
                      ? <button type="button" className={styles.link} onClick={() => navigate(refPath)}>{slip.referenceCode || `#${slip.referenceId}`}</button>
                      : (slip.referenceCode || `#${slip.referenceId}`)}
                  />
                )}
                {slip.recipientName && <Info label={isImport ? 'Người giao hàng' : 'Người nhận hàng'} value={slip.recipientName} />}
                {slip.recipientAddress && <Info label="Địa chỉ" value={slip.recipientAddress} />}
                {slip.salespersonName && <Info label={isImport ? 'Nhân viên mua hàng' : 'Nhân viên bán hàng'} value={slip.salespersonName} />}
                <Info label="Người lập" value={slip.createdByName || '-'} hint={slip.createdAt ? formatDateTime(slip.createdAt) : ''} />
                {slip.postedAt && <Info label="Ghi sổ lúc" value={formatDateTime(slip.postedAt)} />}
                <Info label="Ghi chú" value={note || 'Không có ghi chú'} muted={!note} wide />
              </div>
              {attachments.length > 0 && (
                <div className={styles.cardBody} style={{ paddingTop: 0 }}>
                  <AttachmentUpload files={attachments} disabled />
                </div>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}><i className="bi bi-box-seam" /> Hàng hóa ({lines.length} dòng)</div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.center}>#</th>
                      <th>Mã hàng</th>
                      <th>Tên hàng hóa</th>
                      <th>ĐVT</th>
                      <th>Kho</th>
                      <th className={styles.right}>Số lượng</th>
                      {showPricing && <th className={styles.right}>{isImport ? 'Giá nhập' : 'Đơn giá'}</th>}
                      {showPricing && <th className={styles.right}>VAT</th>}
                      {showPricing && <th className={styles.right}>Thành tiền</th>}
                      <th>Serial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => {
                      const name = line.variantName && line.variantName !== line.productName
                        ? `${line.productName || ''} - ${line.variantName}` : (line.productName || line.variantName || '');
                      const amount = qtyOf(line) * priceOf(line);
                      return (
                        <tr key={line.id || index}>
                          <td className={styles.center}>{index + 1}</td>
                          <td className={styles.sku}>{line.sku || `#${line.variantId}`}</td>
                          <td>
                            {name}
                            {line.note && <div className={styles.lineNote}>{line.note}</div>}
                          </td>
                          <td>{line.unitName || '-'}</td>
                          <td>{line.warehouseName || warehouseName}</td>
                          <td className={`${styles.right} ${styles.strong}`}>{quantity(qtyOf(line))}</td>
                          {showPricing && <td className={styles.right}>{money(priceOf(line))}</td>}
                          {showPricing && <td className={styles.right}>{vatOf(line)}%</td>}
                          {showPricing && <td className={`${styles.right} ${styles.strong}`}>{money(amount + amount * vatOf(line) / 100)}</td>}
                          <td>
                            {(line.serialNumbers || []).length > 0
                              ? <div className={styles.serials}>{line.serialNumbers.map(sn => <span key={sn} className={styles.serial}>{sn}</span>)}</div>
                              : <span className={styles.muted}>-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.totals}>
                <span>Tổng số lượng: <strong>{quantity(totals.quantity)}</strong></span>
                {showPricing && (
                  <>
                    <span>Tiền hàng: <strong>{money(totals.amount)}</strong></span>
                    <span>Tiền VAT: <strong>{money(totals.vat)}</strong></span>
                    <span className={styles.grandTotal}>Tổng cộng: <strong>{money(totals.amount + totals.vat)}</strong></span>
                  </>
                )}
              </div>
            </div>

            {(slip.references || []).length > 0 && (
              <div className={styles.card}>
                <div className={styles.cardHeader}><i className="bi bi-link-45deg" /> Chứng từ liên quan</div>
                <div className={styles.cardBody}>
                  {slip.references.map(ref => (
                    <div key={ref.id || ref.referenceDocId} className={styles.referenceRow}>
                      <button type="button" className={styles.link}
                        onClick={() => navigate(`/${isImport ? 'import' : 'export'}-slips/${ref.referenceDocId}`)}>
                        {ref.referenceDocCode || `#${ref.referenceDocId}`}
                      </button>
                      {ref.createdAt && <span className={styles.muted}>{formatDateTime(ref.createdAt)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!isImport && slip && (
        <IssueInvoiceModal
          isOpen={showIssueModal}
          onClose={() => setShowIssueModal(false)}
          exportDoc={{
            ...slip,
            partnerName: partnerInfo.name,
            partnerTaxCode: partner?.taxCode || '',
            partnerAddress: slip.recipientAddress || partner?.address || '',
            partnerPhone: partner?.phone || '',
            partnerEmail: partner?.email || '',
            lines: lines.map(line => ({
              ...line,
              quantityOut: qtyOf(line),
              unitPrice: priceOf(line),
              vatRate: vatOf(line),
              serialNumbersText: (line.serialNumbers || []).join(', '),
            })),
          }}
          onConfirm={handleIssueEInvoice}
          loading={issuingInvoice}
        />
      )}
      <EInvoicePreviewModal invoice={previewInvoice} isOpen={Boolean(previewInvoice)} onClose={() => setPreviewInvoice(null)} />

      <Toast
        isVisible={toast.isVisible}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />
    </AdminLayout>
  );
}

function Info({ label, value, hint, muted, wide }) {
  return (
    <div className={`${styles.info} ${wide ? styles.infoWide : ''}`}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={`${styles.infoValue} ${muted ? styles.muted : ''}`}>{value}</span>
      {hint && <span className={styles.infoHint}>{hint}</span>}
    </div>
  );
}
