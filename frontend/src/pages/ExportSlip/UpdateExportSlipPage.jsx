import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as exportApi from '../../api/inventoryExportApi';
import CustomerModal from '../Customer/components/CustomerModal';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import SuccessPrintModal from '../../components/ui/SuccessPrintModal/SuccessPrintModal';
import { printExportSlip } from '../../utils/printExportSlip';
import ProductGridSelect from '../../components/ui/ProductGridSelect/ProductGridSelect';
import QuickAddProductModal from '../../components/ui/QuickAddProductModal/QuickAddProductModal';
import Select from 'react-select';
import ManageSerialModal from '../CreateImportSlip/ManageSerialModal';
import styles from './UpdateExportSlipPage.module.css';
import ReferenceDocumentModal from '../../components/ReferenceDocumentModal';
import { getTodayIsoDate } from '../../utils/dateFormat';
import { focusField } from '../../utils/focusField';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = getTodayIsoDate;
const money = (value) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;

const normalizeProductType = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const isServiceProduct = (item) => normalizeProductType(item?.productType) === 'dich vu';
const isWarehouseProduct = (item) => {
  const type = normalizeProductType(item?.productType);
  return type === 'hang hoa' || type === 'thanh pham';
};

const filterWarehouseProducts = (items) => (items || []).filter(isWarehouseProduct);

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '32px',
    height: '32px',
    fontSize: '13px',
    borderColor: state.isFocused ? '#2563eb' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 1px #2563eb' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#2563eb' : '#9ca3af'
    }
  }),
  valueContainer: (base) => ({
    ...base,
    height: '32px',
    padding: '0 8px'
  }),
  input: (base) => ({
    ...base,
    margin: '0',
    padding: '0'
  }),
  indicatorSeparator: () => ({
    display: 'none'
  }),
  indicatorsContainer: (base) => ({
    ...base,
    height: '30px'
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: '4px'
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: '4px'
  }),
  menu: (base) => ({
    ...base,
    fontSize: '13px',
    zIndex: 9999
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: '200px',
    overflowY: 'auto'
  }),
  option: (base) => ({
    ...base,
    padding: '6px 12px'
  })
};

const emptyLine = () => ({
  localId: crypto.randomUUID(),
  variantId: '',
  serialNumbers: [],
  scannedCode: '',
  quantity: 1,
  price: 0,
  note: '',
});

function UpdateExportSlipPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const returnUrl = location.state?.returnUrl || null;
  const [loading, setLoading] = useState(true);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickAddLineId, setQuickAddLineId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'error', message: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [serialModalItemId, setSerialModalItemId] = useState(null);
  const [savedSlip, setSavedSlip] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [form, setForm] = useState({
    docCode: '',
    warehouseId: '',
    partnerId: '',
    salespersonId: '',
    customerAddress: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    docDate: today(),
    note: '',
    referenceType: '',
    referenceId: '',
    referenceCode: '',
  });
  const [items, setItems] = useState([emptyLine()]);
  const [inventoryBalances, setInventoryBalances] = useState([]);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  useEffect(() => {
    if (form.warehouseId) {
      exportApi.getInventoryBalance({ warehouseId: form.warehouseId })
        .then(res => setInventoryBalances(pageContent(unwrap(res))))
        .catch(err => console.error('Failed to load balances', err));
    }
  }, [form.warehouseId]);

  const inventoryMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(inventoryBalances)) {
      inventoryBalances.forEach(b => {
        const totalQuantity = Number(b.totalQuantity ?? b.quantityOnHand ?? 0);
        const totalReserved = Number(b.totalReserved ?? b.quantityReserved ?? 0);
        const availableQuantity = Number(b.availableQuantity ?? (totalQuantity - totalReserved));
        const stock = Math.max(0, availableQuantity);
        if (b.variantId) map.set(String(b.variantId), stock);
        else if (b.itemId) map.set(String(b.itemId), stock);
      });
    }
    return map;
  }, [inventoryBalances]);
  const warehouseScopedProducts = useMemo(() => {
    if (!form.warehouseId) return products;
    const selectedIds = new Set(items.map(item => String(item.variantId || '')).filter(Boolean));
    return products.filter(product => inventoryMap.has(String(product.id)) || selectedIds.has(String(product.id)));
  }, [form.warehouseId, inventoryMap, items, products]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [detailRes, warehouseRes, productRes, customerRes, userRes] = await Promise.allSettled([
          exportApi.getExportDetail(id),
          exportApi.getWarehouses({ size: 100 }),
          exportApi.getProducts({ size: 1000 }),
          exportApi.getCustomers({ size: 1000 }),
          exportApi.getUsers({ size: 1000 }).catch(() => null),
        ]);

        let detail = null;
        if (detailRes.status === 'fulfilled') {
          detail = unwrap(detailRes.value);
        }

        if (warehouseRes.status === 'fulfilled') {
          setWarehouses(pageContent(unwrap(warehouseRes.value)));
        }
        if (productRes.status === 'fulfilled') {
          setProducts(filterWarehouseProducts(pageContent(unwrap(productRes.value))));
        }
        if (customerRes.status === 'fulfilled') {
          setCustomers(pageContent(unwrap(customerRes.value)));
        }
        if (userRes.status === 'fulfilled' && userRes.value) {
          setUsers(pageContent(unwrap(userRes.value)));
        }

        if (detail) {
          const userList = userRes.status === 'fulfilled' ? pageContent(unwrap(userRes.value)) : [];
          setUsers(userList);
          const salespersonUser = userList.find(u => String(u.id) === String(detail.salespersonId));
          const currentUserId = sessionStorage.getItem('userId') || sessionStorage.getItem('id');
          const salespersonIdToSet = detail.salespersonId ? String(detail.salespersonId) : (currentUserId ? String(currentUserId) : '');

          setForm({
            docCode: detail.docCode || '',
            warehouseId: detail.warehouseId || '',
            partnerId: detail.partnerId || '',
            salesOrderId: detail.salesOrderId || '',
            salespersonId: salespersonIdToSet,
            customerAddress: detail.customerAddress || '',
            receiverName: detail.recipientName || '',
            receiverPhone: detail.receiverPhone || '',
            receiverAddress: detail.recipientAddress || '',
            docDate: detail.docDate || '',
            note: detail.note || '',
            status: detail.status || 'DRAFT',
            issuePurpose: detail.issuePurpose || '',
            referenceType: detail.referenceType || '',
            referenceId: detail.referenceId || '',
            referenceCode: detail.referenceCode || (detail.referenceId ? `Tham chiếu #${detail.referenceId}` : ''),
          });
          setItems((detail.lines || []).map(line => ({
            localId: crypto.randomUUID(),
            id: line.id,
            variantId: line.variantId || '',
            quantity: line.quantityOut || 1,
            price: line.unitPrice || 0,
            vatPercent: line.vatPercent ?? line.vatRate ?? 0,
            warrantyMonths: line.warrantyMonths || 0,
            note: line.note || '',
            serialNumbers: line.serialNumbers || [],
            scannedCode: line.serialNumber || line.productCode || '',
          })));
        }
      } catch (err) {
        setError(err.response?.data?.userMessage || 'Không tải được phiếu xuất kho');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  const selectedCustomer = useMemo(() => customers.find(c => String(c.id) === String(form.partnerId)), [customers, form.partnerId]);

  const productById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);
  const userById = useMemo(() => new Map(users.map(user => [String(user.id), user])), [users]);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const totalVat = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0) * Number(item.vatPercent || 0) / 100), 0);
  const grandTotal = totalPrice + totalVat;
  const isLineValid = (item) => {
    const product = productById.get(String(item.variantId));
    const vat = item.vatPercent !== undefined && item.vatPercent !== '' ? Number(item.vatPercent) : 0;
    return product && isWarehouseProduct(product) && Number(item.quantity) > 0 && Number(item.price) >= 0 && !isNaN(vat) && vat >= 0 && vat <= 10;
  };
  const isFormValid = Boolean(
    form.warehouseId &&
    form.docDate &&
    (form.issuePurpose === 'SALES' ? (form.partnerId && form.referenceId)
      : form.issuePurpose === 'ASSEMBLY' ? form.referenceId
        : true) &&
    items.length &&
    items.every(isLineValid)
  );

  const handleFormChange = (field, value) => {
    setForm(prev => {
      const newForm = { ...prev, [field]: value };
      if (field === 'partnerId') {
        const cust = customers.find(c => String(c.id) === String(value));
        if (cust) {
          newForm.customerAddress = cust.address || '';
          newForm.receiverName = cust.name || '';
          newForm.receiverPhone = cust.phone || '';
          newForm.receiverAddress = cust.address || '';
        } else {
          newForm.customerAddress = '';
          newForm.receiverName = '';
          newForm.receiverPhone = '';
          newForm.receiverAddress = '';
        }
      }
      return newForm;
    });
  };

  const handleItemChange = (localId, field, value) => {
    setItems(prev => {
      if (field === 'quantity') {
        const quantity = Number(value || 0);
        return prev.map(item => item.localId === localId ? {
          ...item,
          quantity: value,
          serialNumbers: item.serialNumbers?.slice(0, Math.max(0, quantity)) || []
        } : item);
      }
      if (field === 'variantId') {
        if (!value) {
          return prev.map(item => item.localId === localId ? { ...item, variantId: '', serialNumbers: [], price: 0, warrantyMonths: 0 } : item);
        }
        const existingIndex = prev.findIndex(item => item.localId !== localId && String(item.variantId) === String(value) && !(item.serialNumbers && item.serialNumbers.length > 0));
        if (existingIndex >= 0) {
          const currentItem = prev.find(item => item.localId === localId);
          const addedQty = Number(currentItem?.quantity) || 1;
          const newItems = [...prev];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: Number(newItems[existingIndex].quantity || 0) + addedQty
          };
          showToast('info', 'Sản phẩm đã tồn tại trong danh sách, đã tự động tăng số lượng.');
          return newItems.filter(item => item.localId !== localId);
        }
        const selectedProduct = products.find(p => String(p.id) === String(value));
        return prev.map(item => item.localId === localId ? {
          ...item,
          variantId: value,
          serialNumbers: [],
          price: selectedProduct ? Number(selectedProduct.salePrice || 0) : 0,
          warrantyMonths: selectedProduct ? Number(selectedProduct.warrantyMonths || 0) : 0
        } : item);
      }
      return prev.map(item => item.localId === localId ? { ...item, [field]: value } : item);
    });
  };

  const handleQuickAddProductSuccess = async (newProduct) => {
    try {
      const response = await exportApi.getProducts({ size: 1000 });
      const refreshedProducts = filterWarehouseProducts(pageContent(unwrap(response)));
      setProducts(refreshedProducts);
      const createdVariant = refreshedProducts.find(product => String(product.productId) === String(newProduct?.id));

      if (createdVariant && quickAddLineId) {
        setItems(prev => prev.map(item => item.localId === quickAddLineId
          ? {
              ...item,
              variantId: String(createdVariant.id),
              serialNumbers: [],
              price: Number(createdVariant.salePrice || 0),
              warrantyMonths: Number(createdVariant.warrantyMonths || 0)
            }
          : item));
        showToast('success', `Đã thêm và chọn sản phẩm ${createdVariant.productName || ''}`.trim());
      } else {
        showToast('warning', 'Đã thêm sản phẩm nhưng chưa tìm thấy biến thể mặc định để chọn.');
      }
    } catch (err) {
      showToast('error', 'Thêm sản phẩm thành công nhưng không tải lại được danh sách hàng hóa.');
    } finally {
      setShowQuickAddProduct(false);
      setQuickAddLineId(null);
    }
  };

  const selectedSerialItem = items.find(item => item.localId === serialModalItemId);
  const selectedSerialProduct = selectedSerialItem ? productById.get(String(selectedSerialItem.variantId)) : null;

  const handleSerialModalClose = (serialNumbers) => {
    if (Array.isArray(serialNumbers) && serialModalItemId) {
      setItems(prev => prev.map(item => item.localId === serialModalItemId
        ? { ...item, serialNumbers }
        : item));
    }
    setSerialModalItemId(null);
  };

  const handleSavePartner = async (isEdit, isContinue) => {
    try {
      const res = await exportApi.getCustomers({ size: 1000 });
      const data = pageContent(unwrap(res));
      setCustomers(data);
      if (data && data.length > 0) {
        const newlyAdded = data[data.length - 1];
        if (newlyAdded) {
          handleFormChange('partnerId', newlyAdded.id);
        }
      }
      setToast({ isVisible: true, type: 'success', message: 'Thêm mới khách hàng thành công!' });
    } catch (err) {
      console.error(err);
    } finally {
      if (!isContinue) {
        setShowPartnerModal(false);
      }
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, emptyLine()]);
  };

  const ensureScannedProduct = (scanResult) => {
    if (isServiceProduct(scanResult)) {
      setError('Dịch vụ không áp dụng cho phiếu xuất kho.');
      return false;
    }

    setProducts(prev => {
      if (prev.some(product => String(product.id) === String(scanResult.variantId))) {
        return prev;
      }
      return [
        ...prev,
        {
          id: scanResult.variantId,
          productCode: scanResult.productCode,
          productName: scanResult.productName,
          sku: scanResult.sku || scanResult.code,
          barcode: scanResult.barcode,
          variantName: scanResult.productName,
          unitName: scanResult.unitName || '',
          warrantyMonths: scanResult.warrantyMonths || 0,
          salePrice: scanResult.salePrice || 0,
          trackSerial: scanResult.trackSerial,
          productType: scanResult.productType || 'Hàng hóa',
        },
      ];
    });
    return true;
  };

  const addScannedItem = (scanResult) => {
    if (!ensureScannedProduct(scanResult)) return;

    setItems(prev => {
      const existingIndex = prev.findIndex(item => String(item.variantId) === String(scanResult.variantId));
      const serial = scanResult.serialNumber;

      if (existingIndex >= 0) {
        const newItems = [...prev];
        const currentItem = newItems[existingIndex];
        const currentSerials = currentItem.serialNumbers || [];

        if (serial && !currentSerials.includes(serial)) {
          const newSerials = [...currentSerials, serial];
          newItems[existingIndex] = {
            ...currentItem,
            serialNumbers: newSerials,
            quantity: Math.max(Number(currentItem.quantity || 0), newSerials.length)
          };
        } else if (!serial) {
          newItems[existingIndex] = {
            ...currentItem,
            quantity: Number(currentItem.quantity || 0) + 1
          };
        } else {
          showToast('warning', `Serial ${serial} đã được quét trước đó.`);
        }
        return newItems;
      }

      const newLine = {
        ...emptyLine(),
        variantId: scanResult.variantId,
        scannedCode: scanResult.code,
        quantity: 1,
        price: scanResult.salePrice || 0,
        warrantyMonths: scanResult.warrantyMonths || 0,
        serialNumbers: serial ? [serial] : []
      };

      const basePrev = prev.filter(item => Boolean(item.variantId));
      return [...basePrev, newLine];
    });
  };

  const handleScanSubmit = async (event) => {
    event.preventDefault();
    const code = scanCode.trim();
    if (!code) return;
    if (!form.warehouseId) {
      setError('Vui lòng chọn kho xuất trước khi quét mã.');
      return;
    }

    setScanLoading(true);
    setError('');
    try {
      const response = await exportApi.resolveScan({
        code,
        warehouseId: Number(form.warehouseId),
      });
      addScannedItem(unwrap(response));
      setScanCode('');
    } catch (err) {
      setError(err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không tìm thấy mã vừa quét');
    } finally {
      setScanLoading(false);
    }
  };

  const removeItem = (localId) => {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.localId !== localId) : [{ ...emptyLine(), isNew: false }]);
  };

  const buildPayload = (status) => ({
    docCode: form.docCode || undefined,
    warehouseId: Number(form.warehouseId),
    partnerId: form.partnerId ? Number(form.partnerId) : null,
    salespersonId: (!isNaN(Number(form.salespersonId)) && String(form.salespersonId).trim() !== '') ? Number(form.salespersonId) : null,
    customerAddress: form.customerAddress,
    recipientName: form.receiverName || customers.find(s => String(s.id) === String(form.partnerId))?.name || '',
    receiverPhone: form.receiverPhone || selectedCustomer?.phone || '',
    recipientAddress: form.receiverAddress || form.customerAddress || customers.find(s => String(s.id) === String(form.partnerId))?.address || '',
    docDate: form.docDate,
    status,
    note: form.note,
    createdBy: Number(sessionStorage.getItem('userId') || sessionStorage.getItem('id') || 1),
    lines: items.map(item => ({
      id: item.id || undefined,
      variantId: Number(item.variantId),
      quantityIn: 0,
      quantityOut: Number(item.quantity),
      unitCost: 0,
      unitPrice: Number(item.price),
      vatRate: Number(item.vatPercent || 0),
      vatPercent: Number(item.vatPercent || 0),
      warrantyMonths: Number(item.warrantyMonths || 0),
      serialNumbers: item.serialNumbers || [],
      note: item.note,
    })),
    salesOrderId: form.salesOrderId || undefined,
    issuePurpose: form.issuePurpose || undefined,
    referenceType: form.referenceType || undefined,
    referenceId: form.referenceId || undefined,
  });

  const submit = async (status, shouldPost = false) => {
    if (!form.warehouseId) {
      focusField('export-warehouseId');
      return showToast('error', 'Vui lòng chọn kho xuất.');
    }
    if (form.issuePurpose === 'SALES' && !form.partnerId) {
      focusField('export-partnerId');
      return showToast('error', 'Vui lòng chọn khách hàng.');
    }
    if (form.issuePurpose === 'SALES' && !form.referenceId) {
      return showToast('error', 'Vui lòng chọn chứng từ tham chiếu.');
    }
    if (!form.docDate) {
      focusField('export-docDate');
      return showToast('error', 'Vui lòng chọn ngày ghi nhận.');
    }

    if (!items.length) {
      return showToast('error', 'Vui lòng thêm ít nhất một dòng hàng hóa.');
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.variantId) {
        focusField(`export-line-product-${i}`);
        return showToast('error', `Dòng ${i + 1}: Vui lòng chọn hàng hóa.`);
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        focusField(`export-line-qty-${i}`);
        return showToast('error', `Dòng ${i + 1}: Số lượng phải là số nguyên lớn hơn 0.`);
      }
      const vat = item.vatPercent !== undefined && item.vatPercent !== '' ? Number(item.vatPercent) : 0;
      if (isNaN(vat) || vat < 0 || vat > 10) {
        focusField(`export-line-vat-${i}`);
        return showToast('error', `Dòng ${i + 1}: Thuế VAT phải nằm trong khoảng từ 0% đến 10%.`);
      }
      const product = productById.get(String(item.variantId));
      if (product?.trackSerial) {
        const serialCount = item.serialNumbers ? item.serialNumbers.length : 0;
        if (serialCount !== qty) {
          setSerialModalItemId(item.localId);
          return showToast('error', `Dòng ${i + 1}: Vui lòng nhập đủ ${qty} mã serial (hiện có ${serialCount}).`);
        }
      }
    }
    setSaving(true);
    try {
      await exportApi.updateExportSlip(id, buildPayload(status));
      if (shouldPost) {
        await exportApi.postExportSlip(id);
      }

      const fullSlipData = {
        id,
        docCode: form.docCode,
        docDate: form.docDate,
        status: shouldPost ? 'POSTED' : status,
        lines: items.map(item => ({
          ...item,
          quantityOut: item.quantity,
          unitPrice: item.price,
          variantName: productById.get(String(item.variantId))?.variantName || productById.get(String(item.variantId))?.name,
          sku: productById.get(String(item.variantId))?.sku,
          unitName: productById.get(String(item.variantId))?.unitName,
          warrantyMonths: productById.get(String(item.variantId))?.warrantyMonths,
        })),
        customerName: form.customerName || customers.find(c => String(c.id) === String(form.partnerId))?.name,
        customerAddress: form.customerAddress,
        partnerName: form.customerName || customers.find(c => String(c.id) === String(form.partnerId))?.name,
        salespersonName: users.find(u => String(u.id) === String(form.salespersonId))?.fullName,
      };

      setSavedSlip(fullSlipData);
      setShowSuccessModal(true);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không cập nhật được phiếu xuất kho');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.pageHeader}>
        <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); returnUrl ? navigate(returnUrl) : navigate('/export-slips'); }}>
          <i className="bi bi-arrow-left"></i> Cập nhật phiếu xuất kho {form.docCode ? form.docCode : ''}
        </a>
      </div>

      <div className={styles.pageBody}>
        {error && <div className={styles.errorCard}>{error}</div>}
        {loading ? (
          <div className={styles.card}>
            <div className={styles.cardBody}>Đang tải dữ liệu...</div>
          </div>
        ) : (
          <>

            <div className={styles.topSection}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <i className="bi bi-person-fill"></i> Thông tin chung
                </div>
                <div className={styles.cardBody}>
                  <div className="misa-form-row">
                    <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                      <label className="misa-label">Mã KH <span className="required">*</span></label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <Select
                            inputId="export-partnerId"
                            options={customers.map(c => ({ value: c.id, label: c.code || `KH#${c.id}` }))}
                            value={customers.find(c => String(c.id) === String(form.partnerId)) ? { value: form.partnerId, label: customers.find(c => String(c.id) === String(form.partnerId)).code || `KH#${form.partnerId}` } : null}
                            onChange={(selected) => handleFormChange('partnerId', selected ? selected.value : '')}
                            placeholder="Chọn Mã KH..."
                            isClearable
                            styles={customSelectStyles}
                          />
                        </div>
                        <button type="button" onClick={() => setShowPartnerModal(true)} style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="bi bi-plus" style={{ fontSize: '18px', color: 'var(--color-primary)' }}></i>
                        </button>
                      </div>
                    </div>
                    <div className="misa-form-group" style={{ flex: '0 0 62%' }}>
                      <label className="misa-label">Tên Khách hàng</label>
                      <Select
                        options={customers.map(c => ({ value: c.id, label: c.name || '' }))}
                        value={customers.find(c => String(c.id) === String(form.partnerId)) ? { value: form.partnerId, label: customers.find(c => String(c.id) === String(form.partnerId)).name || '' } : null}
                        onChange={(selected) => handleFormChange('partnerId', selected ? selected.value : '')}
                        placeholder="Chọn Tên KH..."
                        isClearable
                        styles={customSelectStyles}
                      />
                    </div>
                  </div>

                  <div className="misa-form-group" style={{ marginTop: '12px' }}>
                    <label className="misa-label">Địa chỉ khách hàng</label>
                    <input type="text" className="misa-input" readOnly value={customers.find(s => String(s.id) === String(form.partnerId))?.address || ''} style={{ backgroundColor: '#f3f4f6' }} placeholder="Tự động điền theo Mã KH" />
                  </div>

                  <div className="misa-form-row" style={{ marginTop: '12px' }}>
                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                      <label className="misa-label">Kho xuất <span className="required">*</span></label>
                      <Select
                        inputId="export-warehouseId"
                        options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                        value={warehouses.find(w => String(w.id) === String(form.warehouseId)) ? { value: form.warehouseId, label: `${warehouses.find(w => String(w.id) === String(form.warehouseId)).code} - ${warehouses.find(w => String(w.id) === String(form.warehouseId)).name}` } : null}
                        onChange={(selected) => handleFormChange('warehouseId', selected ? selected.value : '')}
                        placeholder="Chọn kho"
                        isClearable
                        styles={customSelectStyles}
                      />
                    </div>
                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                      <label className="misa-label">Nhân viên xuất hàng</label>
                      <input
                        type="text"
                        className="misa-input"
                        value={users.find(u => String(u.id) === String(form.salespersonId)) ? (users.find(u => String(u.id) === String(form.salespersonId)).fullName || users.find(u => String(u.id) === String(form.salespersonId)).username) : 'Đang tải...'}
                        readOnly
                        style={{ backgroundColor: '#f3f4f6' }}
                      />
                    </div>
                  </div>

                  <div className="misa-form-group" style={{ marginTop: '12px' }}>
                    <label className="misa-label">Ghi chú</label>
                    <input className="misa-input" value={form.note} onChange={(event) => handleFormChange('note', event.target.value)} placeholder="Nhập ghi chú" />
                  </div>

                  <div className="misa-form-group" style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <label className="misa-label" style={{ marginBottom: 0 }}>
                        Kèm theo chứng từ
                        {form.issuePurpose === 'SALES' && <span className="required" style={{ marginLeft: '4px' }}>*</span>}
                      </label>
                      {!form.referenceId && (
                        <button
                          type="button"
                          style={{ padding: 0, fontSize: '13px', background: 'none', border: 'none', color: '#0070cc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setShowReferenceModal(true)}
                        >
                          <i className="bi bi-link-45deg" style={{ fontSize: '16px' }}></i> Tham chiếu
                        </button>
                      )}
                    </div>
                    {form.referenceId ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <span style={{ color: 'var(--color-primary)', fontWeight: '500', cursor: 'pointer' }} onClick={() => setShowReferenceModal(true)}>
                          <i className="bi bi-file-earmark-text"></i> {form.referenceCode}
                        </span>
                        <i
                          className="bi bi-x-circle-fill"
                          style={{ color: '#dc3545', cursor: 'pointer', fontSize: '14px' }}
                          onClick={() => setForm(prev => ({ ...prev, referenceType: '', referenceId: '', referenceCode: '' }))}
                          title="Xóa tham chiếu"
                        ></i>
                      </div>
                    ) : (
                      <input type="text" className="misa-input" style={{ marginTop: '8px' }} placeholder="Số chứng từ đính kèm..." />
                    )}
                  </div>


                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <i className="bi bi-file-earmark-text-fill"></i> Thông tin chứng từ
                </div>
                <div className={styles.cardBody}>
                  <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                    <label className="misa-label">Ngày ghi nhận <span className="required">*</span></label>
                    <input id="export-docDate" type="date" className="misa-input" value={form.docDate} onChange={(event) => handleFormChange('docDate', event.target.value)} />
                  </div>

                  <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                    <label className="misa-label">Số phiếu</label>
                    <input className="misa-input" placeholder="Để trống để hệ thống tự sinh" value={form.docCode} onChange={(event) => handleFormChange('docCode', event.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.scanPanel}>
                <div>
                  <div className={styles.scanTitle}>Scan Product / Serial</div>
                  <div className={styles.scanHint}>Quét serial cho hàng có serial, hoặc barcode/SKU cho hàng thường.</div>
                </div>
                <form className={styles.scanForm} onSubmit={handleScanSubmit}>
                  <div className={styles.scanInputWrap}>
                    <i className="bi bi-upc-scan"></i>
                    <input
                      className="misa-input"
                      style={{ paddingLeft: '32px', height: '34px' }}
                      value={scanCode}
                      onChange={(event) => setScanCode(event.target.value)}
                      placeholder="Đặt con trỏ vào đây rồi quét mã"
                      disabled={scanLoading}
                    />
                  </div>
                  <button className={styles.btnAddRow} type="submit" disabled={scanLoading} style={{ display: 'none' }}>
                    {scanLoading ? 'Đang quét...' : 'Thêm mã'}
                  </button>
                </form>
              </div>

              <div className={styles.tableHeaderRow}>
                <div className={styles.tableTitle}>Bảng hàng hóa</div>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center', whiteSpace: 'nowrap' }}>STT</th>
                      <th style={{ width: '12%' }}>Mã hàng</th>
                      <th style={{ width: '22%' }}>Tên hàng</th>
                      <th style={{ width: '7%' }}>ĐVT</th>
                      <th style={{ width: '8%' }} className={styles.textCenter}>Tồn khả dụng</th>
                      <th style={{ width: '8%' }} className={styles.textRight}>SL</th>
                      <th style={{ width: '10%', textAlign: 'center' }}>Serial</th>
                      <th style={{ width: '8%', textAlign: 'center' }}>BH (T)</th>
                      <th style={{ width: '11%' }} className={styles.textRight}>Đơn giá</th>
                      <th style={{ width: '11%' }} className={styles.textRight}>Thành tiền</th>
                      <th style={{ width: '8%' }} className={styles.textRight}>% VAT</th>
                      <th style={{ width: '40px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const product = productById.get(String(item.variantId));
                      return (
                        <tr key={item.localId}>
                          <td className={styles.textCenter}>{index + 1}</td>
                          <td>
                            <ProductGridSelect
                              id={`export-line-product-${index}`}
                              products={warehouseScopedProducts}
                              inventoryMap={inventoryMap}
                              value={item.variantId}
                              onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.id : '')}
                              onAddNew={() => { setQuickAddLineId(item.localId); setShowQuickAddProduct(true); }}
                              displayMode="code"
                              placeholder="Chọn mã"
                            />
                          </td>
                          <td style={{ maxWidth: '300px' }}>
                            <ProductGridSelect
                              products={warehouseScopedProducts}
                              inventoryMap={inventoryMap}
                              value={item.variantId}
                              onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.id : '')}
                              onAddNew={() => { setQuickAddLineId(item.localId); setShowQuickAddProduct(true); }}
                              displayMode="name"
                              placeholder="Chọn hàng"
                            />
                          </td>
                          <td>
                            {product?.unitName || ''}
                            {item.serialNumberId && <div className={styles.serialTag}>{item.scannedCode}</div>}
                          </td>
                          <td className={styles.textCenter} style={{ fontWeight: '600', color: '#0052cc' }}>
                            {product ? (inventoryMap.get(String(product.id)) || 0) : ''}
                          </td>
                          <td className={styles.textRight}>
                            <input id={`export-line-qty-${index}`} type="number" min="0" className="misa-input text-right" style={{ height: '32px', padding: '0 8px', width: '100%', maxWidth: '100px', margin: '0 auto', textAlign: 'right', fontSize: '13px' }} value={item.quantity} onChange={(event) => handleItemChange(item.localId, 'quantity', event.target.value)} />
                          </td>
                          <td align="center">
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              {product?.trackSerial && (
                                <button
                                  type="button"
                                  style={{
                                    background: (item.serialNumbers?.length || 0) === Number(item.quantity || 0) ? '#dcfce7' : '#fef9c3',
                                    color: (item.serialNumbers?.length || 0) === Number(item.quantity || 0) ? '#166534' : '#854d0e',
                                    border: `1px solid ${(item.serialNumbers?.length || 0) === Number(item.quantity || 0) ? '#bbf7d0' : '#fef08a'}`,
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onClick={() => setSerialModalItemId(item.localId)}
                                >
                                  <i className="bi bi-upc-scan"></i>
                                  {(item.serialNumbers?.length || 0)} / {Number(item.quantity || 0)}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className={styles.textCenter}>
                            <input id={`export-line-warranty-${index}`} type="number" min="0" className="misa-input text-center" style={{ height: '32px', padding: '0 8px', width: '100%', maxWidth: '60px', margin: '0 auto', textAlign: 'center', fontSize: '13px' }} value={item.warrantyMonths !== undefined ? item.warrantyMonths : ''} onChange={(event) => handleItemChange(item.localId, 'warrantyMonths', event.target.value)} />
                          </td>
                          <td className={styles.textRight}>
                            <input id={`export-line-price-${index}`} type="text" className="misa-input text-right" style={{ height: '32px', padding: '0 8px', width: '100%', maxWidth: '130px', marginLeft: 'auto', textAlign: 'right', fontSize: '13px' }} value={item.price ? new Intl.NumberFormat('vi-VN').format(item.price) : ''} onChange={(event) => handleItemChange(item.localId, 'price', event.target.value.replace(/\D/g, ''))} />
                          </td>
                          <td className={`${styles.textRight} ${styles.textBlue}`}>{money(Number(item.quantity || 0) * Number(item.price || 0))}</td>
                          <td className={styles.textRight}>
                            <input id={`export-line-vat-${index}`} type="number" min="0" max="10" step="any" className="misa-input text-right" style={{ height: '32px', padding: '0 8px', width: '100%', maxWidth: '65px', marginLeft: 'auto', textAlign: 'right', fontSize: '13px' }} value={item.vatPercent !== undefined ? item.vatPercent : ''} onChange={(event) => handleItemChange(item.localId, 'vatPercent', event.target.value)} />
                          </td>
                          <td className={styles.textCenter}>
                            <button className={styles.iconBtnDanger} onClick={() => removeItem(item.localId)}><i className="bi bi-trash"></i></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className={styles.tableFooter}>
                <div className={styles.summaryBox}>
                  <div className={styles.summaryRow}>
                    <span>Tổng số lượng:</span>
                    <span>{money(totalQuantity)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Tiền hàng:</span>
                    <span>{money(totalPrice)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Tiền thuế VAT:</span>
                    <span>{money(totalVat)}</span>
                  </div>
                  <div className={styles.summaryTotal}>
                    <span>Tổng cộng thanh toán:</span>
                    <span className={styles.totalValue}>{money(grandTotal)}</span>
                  </div>
                </div>
              </div>
              <div className={styles.tableActions}>
                <button className={styles.actionLink} onClick={addItem}>
                  <i className="bi bi-plus-circle"></i> Thêm dòng mới
                </button>
              </div>
            </div>
          </>
        )}</div>

      <div className={styles.bottomBar}>
        <button className="btn-misa-cancel" onClick={() => navigate('/export-slips')}>
          <i className="bi bi-x-circle"></i> Hủy bỏ
        </button>
        <div className={styles.actionButtons}>
          <button className="btn-misa-draft" disabled={saving} onClick={() => submit('DRAFT')}>
            <i className="bi bi-save"></i> Lưu tạm
          </button>
          <button className="btn-misa-post" disabled={!isFormValid || saving} onClick={() => setShowConfirm(true)}>
            <i className="bi bi-check-circle-fill"></i> Lưu và ghi sổ
          </button>
        </div>
      </div>
      <CustomerModal
        isOpen={showPartnerModal}
        editData={null}
        onClose={() => setShowPartnerModal(false)}
        onSaved={handleSavePartner}
        onError={(msg) => showToast('error', msg)}
      />
      <QuickAddProductModal
        isOpen={showQuickAddProduct}
        onClose={() => { setShowQuickAddProduct(false); setQuickAddLineId(null); }}
        onSuccess={handleQuickAddProductSuccess}
        productType="Hàng hóa"
        allowedProductTypes={['Hàng hóa', 'Thành phẩm']}
      />
      <ReferenceDocumentModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={(data) => {
          setForm(prev => ({
            ...prev,
            referenceType: data.referenceType,
            referenceId: data.referenceId,
            referenceCode: data.docCode
          }));
          setShowReferenceModal(false);
        }}
        type="EXPORT"
      />
      <ConfirmModal
        isOpen={showConfirm}
        title="Xác nhận ghi sổ"
        message="Bạn có chắc chắn muốn lưu và ghi sổ phiếu xuất kho này không? Thao tác này không thể hoàn tác và sẽ cập nhật lại số lượng hàng hóa trong kho."
        onConfirm={() => {
          setShowConfirm(false);
          submit('DRAFT', true);
        }}
        onCancel={() => setShowConfirm(false)}
      />
      {serialModalItemId && selectedSerialProduct && (
        <ManageSerialModal
          isOpen={true}
          onClose={handleSerialModalClose}
          productName={selectedSerialProduct.variantName || selectedSerialProduct.productName}
          targetQuantity={Number(selectedSerialItem.quantity || 0)}
          initialSerials={selectedSerialItem.serialNumbers || []}
          mode="export"
          warehouseId={form.warehouseId}
          variantId={selectedSerialProduct.id}
          onValidateSerial={async (serialValue) => {
            try {
              const response = await exportApi.resolveScan({
                code: serialValue,
                warehouseId: form.warehouseId,
              });
              const scanResult = unwrap(response);
              if (!scanResult.serialNumber) {
                throw new Error('Mã này không tồn tại hoặc không phải là serial.');
              }
              if (String(scanResult.variantId) !== String(selectedSerialProduct.id)) {
                throw new Error('Serial này thuộc về sản phẩm khác.');
              }
              return true;
            } catch (err) {
              throw new Error(err.response?.data?.userMessage || err.message || 'Mã Serial không hợp lệ.', { cause: err });
            }
          }}
        />
      )}
      <SuccessPrintModal
        isOpen={showSuccessModal}
        title={savedSlip?.status === 'POSTED' || savedSlip?.statusCode === 'POSTED' ? 'Ghi sổ phiếu xuất kho thành công!' : 'Cập nhật phiếu xuất kho thành công!'}
        message="Phiếu xuất kho đã được lưu và cập nhật thành công. Bạn có thể in phiếu ngay bây giờ."
        docCode={savedSlip?.docCode || form.docCode}
        printBtnText="In phiếu xuất kho"
        onPrint={() => {
          const customer = customers.find(c => String(c.id) === String(savedSlip?.partnerId || form.partnerId)) || {};
          const warehouseName = warehouses.find(w => String(w.id) === String(savedSlip?.warehouseId || form.warehouseId))?.name || '';
          printExportSlip(savedSlip || {}, {
            customer,
            warehouseName,
            productById,
            userById,
            isImport: false
          });
        }}
        onViewList={() => navigate('/export-slips')}
        onClose={() => navigate('/export-slips')}
      />

      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    </AdminLayout>
  );
}

export default UpdateExportSlipPage;
