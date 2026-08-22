import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as importApi from '../../api/inventoryImportApi';
import * as customerApi from '../../api/customerApi';
import * as assemblyOrderApi from '../../api/assemblyOrderApi';
import * as exportApi from '../../api/inventoryExportApi';
import SupplierModal from '../Supplier/components/SupplierModal';
import CustomerModal from '../Customer/components/CustomerModal';
import AssemblyOrderSelectionModal from '../CreateImportSlip/components/AssemblyOrderSelectionModal';
import ReferenceDocumentModal from '../../components/ReferenceDocumentModal';
import Toast from '../../components/ui/Toast/Toast';
import ManageSerialModal from '../CreateImportSlip/ManageSerialModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import SuccessPrintModal from '../../components/ui/SuccessPrintModal/SuccessPrintModal';
import ProductGridSelect from '../../components/ui/ProductGridSelect/ProductGridSelect';
import QuickAddProductModal from '../../components/ui/QuickAddProductModal/QuickAddProductModal';
import Select from 'react-select';
import { printImportSlip } from '../../utils/printImportSlip';
import styles from './UpdateImportSlipPage.module.css';
import { getTodayIsoDate } from '../../utils/dateFormat';
import { focusField } from '../../utils/focusField';

const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const money = (value) => Number(value || 0).toLocaleString('vi-VN');
const variantLabel = (item) => item?.variantName && item.variantName !== item.productName
  ? `${item.productName} - ${item.variantName}`
  : item?.productName || '';

const normalizeProductType = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const isWarehouseProduct = (item) => {
  if (!item) return false;
  const type = normalizeProductType(item?.productType);
  return type !== 'dich vu' && type !== 'service';
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

const emptyLine = (defaultWarehouseId = '') => ({
  localId: crypto.randomUUID(),
  id: null,
  variantId: '',
  warehouseId: defaultWarehouseId,
  quantity: 1,
  price: 0,
  vatPercent: 0,
  note: '',
  serialNumbers: [],
  isNew: true,
});

function UpdateImportSlipPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const returnUrl = location.state?.returnUrl || null;
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickAddLineId, setQuickAddLineId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [toast, setToast] = useState({ isVisible: false, type: 'error', message: '' });
  const [serialModalItemId, setSerialModalItemId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savedSlip, setSavedSlip] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [form, setForm] = useState({
    docCode: '',
    warehouseId: '',
    partnerId: '',
    partnerName: '',
    customerName: '',
    docDate: getTodayIsoDate(),
    note: '',
    status: 'DRAFT',
  });
  const [importType, setImportType] = useState('PURCHASE');
  const [customers, setCustomers] = useState([]);
  const [assemblyOrders, setAssemblyOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [showAssemblyOrderModal, setShowAssemblyOrderModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [items, setItems] = useState([emptyLine()]);
  const [inventoryBalances, setInventoryBalances] = useState([]);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const handleSavePartner = async (formData) => {
    try {
      const res = await importApi.createSupplier(formData);
      const newSupplier = unwrap(res);
      if (newSupplier?.id) {
        setSuppliers(prev => [...prev, newSupplier]);
        handleFormChange('partnerId', newSupplier.id);
      } else {
        const supRes = await importApi.getSuppliers({ size: 1000 });
        const list = pageContent(unwrap(supRes)).filter(s => s.status !== 'INACTIVE');
        setSuppliers(list);
        if (list.length > 0) handleFormChange('partnerId', list[list.length - 1].id);
      }
      setShowPartnerModal(false);
      showToast('success', 'Thêm mới nhà cung cấp thành công!');
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Có lỗi xảy ra khi tạo nhà cung cấp');
    }
  };

  const handleSaveCustomer = async (isEdit, isContinue) => {
    try {
      const res = await customerApi.searchCustomers('', 'APPROVED', '', 0, 1000);
      const data = pageContent(unwrap(res));
      setCustomers(data);
      if (data && data.length > 0) {
        const newlyAdded = data[data.length - 1];
        if (newlyAdded) {
          handleFormChange('customerId', newlyAdded.id);
        }
      }
    } finally {
      if (!isContinue) {
        setShowCustomerDrawer(false);
      }
    }
  };

  useEffect(() => {
    exportApi.getInventoryBalance({ size: 10000 })
      .then(res => setInventoryBalances(pageContent(unwrap(res))))
      .catch(err => console.error('Lỗi khi tải tồn kho', err));
  }, []);

  const inventoryMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(inventoryBalances)) {
      inventoryBalances.forEach(b => {
        const totalQuantity = Number(b.totalQuantity ?? b.quantityOnHand ?? 0);
        const totalReserved = Number(b.totalReserved ?? b.quantityReserved ?? 0);
        const availableQuantity = Number(b.availableQuantity ?? (totalQuantity - totalReserved));
        const stock = Math.max(0, availableQuantity);
        const vId = b.variantId || b.itemId;
        const wId = b.warehouseId;
        if (vId && wId) {
          map.set(`${vId}_${wId}`, stock);
        }
        if (vId) {
          const currentTotal = map.get(String(vId)) || 0;
          map.set(String(vId), currentTotal + stock);
        }
      });
    }
    return map;
  }, [inventoryBalances]);

  const handleApplyWarehouseToAllLines = (whId) => {
    if (!whId) return;
    setItems(prev => {
      const mergedMap = new Map();
      const result = [];
      prev.forEach(item => {
        if (!item.variantId) {
          result.push({ ...item, warehouseId: String(whId), serialNumbers: [] });
          return;
        }
        const key = String(item.variantId);
        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key);
          existing.quantity = Number(existing.quantity || 0) + (Number(item.quantity) || 1);
        } else {
          const newItem = { ...item, warehouseId: String(whId), serialNumbers: [] };
          mergedMap.set(key, newItem);
          result.push(newItem);
        }
      });
      return result;
    });
    showToast('info', 'Đã áp dụng kho cho tất cả các dòng sản phẩm và tự động gộp các dòng trùng');
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [detailRes, warehouseRes, supplierRes, productRes, customerRes, assemblyOrderRes, userRes] = await Promise.allSettled([
          importApi.getImportDetail(id),
          importApi.getWarehouses({ size: 100 }),
          importApi.getSuppliers(),
          importApi.getProducts({ size: 1000 }),
          customerApi.searchCustomers('', 'APPROVED', '', 0, 1000),
          assemblyOrderApi.getAssemblyOrders({ size: 100 }),
          exportApi.getUsers({ size: 1000 })
        ]);

        if (warehouseRes.status === 'fulfilled') setWarehouses(pageContent(unwrap(warehouseRes.value)));
        if (supplierRes.status === 'fulfilled') setSuppliers(pageContent(unwrap(supplierRes.value)).filter(s => s.status !== 'INACTIVE'));
        if (productRes.status === 'fulfilled') setProducts(filterWarehouseProducts(pageContent(unwrap(productRes.value))));
        if (customerRes.status === 'fulfilled') setCustomers(pageContent(unwrap(customerRes.value)));
        if (assemblyOrderRes.status === 'fulfilled') setAssemblyOrders(pageContent(unwrap(assemblyOrderRes.value)));
        const userList = userRes.status === 'fulfilled' ? pageContent(unwrap(userRes.value)) : [];
        setUsers(userList);

        const detail = detailRes.status === 'fulfilled' ? unwrap(detailRes.value) : null;
        if (!detail) throw new Error('Cannot load slip details');

        const loadedImportType = detail.issuePurpose || 'PURCHASE';
        setImportType(loadedImportType);

        const purchaserUser = userList.find(u => String(u.id) === String(detail.salespersonId));
        const currentUserId = sessionStorage.getItem('userId') || sessionStorage.getItem('id');
        const purchaserId = detail.salespersonId ? String(detail.salespersonId) : (currentUserId ? String(currentUserId) : '');

        setForm({
          docCode: detail.docCode || '',
          warehouseId: detail.warehouseId || '',
          partnerId: loadedImportType === 'PURCHASE' ? detail.partnerId || '' : '',
          partnerName: detail.partnerName || '',
          customerId: loadedImportType === 'RETURN' ? detail.partnerId || '' : '',
          customerName: loadedImportType === 'RETURN' ? detail.partnerName || '' : '',
          assemblyOrderId: loadedImportType === 'PRODUCTION' ? detail.referenceId || '' : '',
          assemblyOrderCode: '', // will be resolved in render
          deliverer: detail.recipientName || '',
          purchaser: purchaserId,
          referenceType: detail.referenceType || '',
          referenceId: detail.referenceId || '',
          referenceCode: detail.referenceCode || '',
          docDate: detail.docDate ? detail.docDate.split('T')[0] : '',
          note: detail.note || '',
          status: detail.status || 'DRAFT',
          hasDiscrepancy: detail.hasDiscrepancy || false,
          discrepancyNote: detail.discrepancyNote || '',
        });
        setItems((detail.lines || []).map(line => ({
          localId: crypto.randomUUID(),
          id: line.id,
          variantId: line.variantId || '',
          warehouseId: String(line.warehouseId || detail.warehouseId || ''),
          quantity: line.quantityIn || 1,
          expectedQuantity: line.expectedQuantity !== undefined ? line.expectedQuantity : (line.quantityIn || 1),
          rejectedQuantity: line.rejectedQuantity || 0,
          discrepancyReason: line.discrepancyReason || '',
          price: line.unitCost || 0,
          vatPercent: line.vatPercent ?? line.vatRate ?? 0,
          warrantyMonths: line.warrantyMonths || 0,
          note: line.note || '',
          serialNumbers: line.serialNumbers || [],
          isNew: false,
        })));
      } catch (err) {
        showToast('error', err.response?.data?.userMessage || 'Không tải được phiếu nhập kho');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const productById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);

  const filteredProducts = useMemo(() => {
    return filterWarehouseProducts(products);
  }, [products]);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalPrice = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const totalVat = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.price || 0) * Number(item.vatPercent || 0) / 100), 0);
  const grandTotal = totalPrice + totalVat;
  const isLineValid = (item) => {
    const product = productById.get(String(item.variantId));
    const quantity = Number(item.quantity || 0);
    const vat = item.vatPercent !== undefined && item.vatPercent !== '' ? Number(item.vatPercent) : 0;
    const hasValidSerials = !product?.trackSerial || (Number.isInteger(quantity) && item.serialNumbers?.length === quantity);
    return product && isWarehouseProduct(product) && quantity > 0 && Number(item.price) >= 0 && !isNaN(vat) && vat >= 0 && vat <= 10 && hasValidSerials;
  };
  const isFormValid = Boolean(
    form.warehouseId &&
    form.docDate &&
    (importType === 'PURCHASE' ? (form.partnerId && form.referenceId)
      : (importType === 'PRODUCTION' || importType === 'SCRAP') ? form.assemblyOrderId
        : importType === 'RETURN' ? (form.customerId && form.referenceId)
          : true) &&
    items.length &&
    items.every(isLineValid)
  );

  const handleFormChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
          return prev.map(item => item.localId === localId ? { ...item, variantId: '', serialNumbers: [], warrantyMonths: 0 } : item);
        }
        const existingIndex = prev.findIndex(item => item.localId !== localId && String(item.variantId) === String(value));
        if (existingIndex >= 0) {
          const currentItem = prev.find(item => item.localId === localId);
          const addedQty = Number(currentItem?.quantity) || 1;
          const newItems = [...prev];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: Number(newItems[existingIndex].quantity || 0) + addedQty
          };
          showToast('info', 'Sản phẩm đã tồn tại trong danh sách, đã tự động cộng dồn số lượng.');
          return newItems.filter(item => item.localId !== localId);
        }
        const product = products.find(p => String(p.id) === String(value));
        return prev.map(item => item.localId === localId ? {
          ...item,
          [field]: String(value),
          serialNumbers: [],
          warrantyMonths: product ? Number(product.warrantyMonths || 0) : 0
        } : item);
      }
      return prev.map(item => item.localId === localId ? { ...item, [field]: value } : item);
    });
  };

  const handleQuickAddProductSuccess = async (newProduct) => {
    try {
      const response = await importApi.getProducts({ size: 1000 });
      const refreshedProducts = filterWarehouseProducts(pageContent(unwrap(response)));
      setProducts(refreshedProducts);
      const createdVariant = refreshedProducts.find(product => String(product.productId) === String(newProduct?.id));

      if (createdVariant && quickAddLineId) {
        setItems(prev => prev.map(item => item.localId === quickAddLineId
          ? {
              ...item,
              variantId: String(createdVariant.id),
              serialNumbers: [],
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

  const addItem = () => {
    setItems(prev => [...prev, { ...emptyLine(form.warehouseId || (warehouses[0]?.id ? String(warehouses[0]?.id) : '')), variantId: filteredProducts[0]?.id || '' }]);
  };

  const removeItem = (localId) => {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.localId !== localId) : [{ ...emptyLine(form.warehouseId), isNew: false }]);
  };

  const handleSerialModalClose = (savedSerials) => {
    if (savedSerials !== null && serialModalItemId) {
handleItemChange(serialModalItemId, 'serialNumbers', savedSerials);
    }
    setSerialModalItemId(null);
  };

  const selectedSerialItem = useMemo(() => items.find(i => i.localId === serialModalItemId), [items, serialModalItemId]);
  const selectedSerialProduct = useMemo(() => selectedSerialItem ? productById.get(String(selectedSerialItem.variantId)) : null, [selectedSerialItem, productById]);
  
  const buildPayload = (status) => {
    return {
      docCode: form.docCode || undefined,
      warehouseId: Number(form.warehouseId),
      partnerId: importType === 'RETURN' ? (form.customerId ? Number(form.customerId) : null)
        : importType === 'OTHER' ? null
          : (form.partnerId ? Number(form.partnerId) : null),
      docDate: form.docDate,
      status,
      note: form.note,
      createdBy: Number(sessionStorage.getItem('userId') || sessionStorage.getItem('id') || 1),
      lines: items.map(item => ({
        variantId: Number(item.variantId),
        warehouseId: Number(item.warehouseId || form.warehouseId),
        quantityIn: Number(item.quantity),
        expectedQuantity: item.expectedQuantity !== undefined && item.expectedQuantity !== '' ? Number(item.expectedQuantity) : Number(item.quantity),
        rejectedQuantity: item.rejectedQuantity !== undefined && item.rejectedQuantity !== '' ? Number(item.rejectedQuantity) : 0,
        discrepancyReason: item.discrepancyReason || '',
        unitCost: Number(item.price || 0),
        vatPercent: Number(item.vatPercent || 0),
        warrantyMonths: Number(item.warrantyMonths || 0),
        serialNumbers: item.serialNumbers || [],
        note: item.note,
      })),
      issuePurpose: importType,
      recipientName: importType === 'OTHER' ? form.otherObjectName : form.deliverer,
      salespersonId: (!isNaN(Number(form.purchaser)) && String(form.purchaser).trim() !== '') ? Number(form.purchaser) : null,
      referenceType: importType === 'PRODUCTION' && form.assemblyOrderId ? 'ASSEMBLY_ORDER' : (form.referenceType || undefined),
      referenceId: importType === 'PRODUCTION' && form.assemblyOrderId ? Number(form.assemblyOrderId) : (form.referenceId || undefined),
    };
  };

  const submit = async (status, shouldPost = false) => {
    if (importType === 'PURCHASE' && !form.partnerId) {
      focusField('import-partnerId');
      return showToast('error', 'Vui lòng chọn nhà cung cấp.');
    }
    if ((importType === 'PRODUCTION' || importType === 'SCRAP') && !form.assemblyOrderId) {
      focusField('import-assemblyOrderId');
      return showToast('error', 'Vui lòng chọn lệnh quản lý cấu hình.');
    }
    if (importType === 'RETURN' && !form.customerId) {
      focusField('import-customerId');
      return showToast('error', 'Vui lòng chọn khách hàng.');
    }
    if ((importType === 'PURCHASE' || importType === 'RETURN') && !form.referenceId) {
      return showToast('error', 'Vui lòng chọn chứng từ tham chiếu.');
    }
    if (!form.warehouseId) {
      focusField('import-warehouseId');
      return showToast('error', 'Vui lòng chọn kho nhập.');
    }
    if (!form.docDate) {
      focusField('import-docDate');
      return showToast('error', 'Vui lòng chọn ngày nhập kho.');
    }

    if (!items.length) {
      return showToast('error', 'Vui lòng thêm ít nhất một dòng hàng hóa.');
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.variantId) {
        focusField(`import-line-product-${i}`);
        return showToast('error', `Dòng ${i + 1}: Vui lòng chọn hàng hóa.`);
      }
      const qty = Number(item.quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        focusField(`import-line-qty-${i}`);
        return showToast('error', `Dòng ${i + 1}: Số lượng phải là số nguyên lớn hơn 0.`);
      }
      const vat = item.vatPercent !== undefined && item.vatPercent !== '' ? Number(item.vatPercent) : 0;
      if (isNaN(vat) || vat < 0 || vat > 10) {
        focusField(`import-line-vat-${i}`);
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
      const response = await importApi.updateImportSlip(id, buildPayload(status));
      const updated = unwrap(response);
      if (shouldPost) {
        await importApi.postImportSlip(id);
      }

      const fullSlipData = {
        ...updated,
        id,
        docCode: form.docCode,
        docDate: form.docDate,
        status: shouldPost ? 'POSTED' : status,
        warehouseId: form.warehouseId,
        lines: items.map(item => ({
          ...item,
          warehouseId: Number(item.warehouseId),
          warehouseName: warehouses.find(w => String(w.id) === String(item.warehouseId))?.name,
          quantityIn: item.quantity,
          unitCost: item.price,
          unitPrice: item.price,
          variantName: productById.get(String(item.variantId))?.variantName || productById.get(String(item.variantId))?.name,
          sku: productById.get(String(item.variantId))?.sku,
          unitName: productById.get(String(item.variantId))?.unitName,
          warrantyMonths: item.warrantyMonths || productById.get(String(item.variantId))?.warrantyMonths,
        })),
        partnerName: form.partnerName || suppliers.find(s => String(s.id) === String(form.partnerId))?.name,
        purchaserName: users.find(u => String(u.id) === String(form.purchaser))?.fullName,
        delivererName: form.deliverer,
      };

      setSavedSlip(fullSlipData);
      setShowSuccessModal(true);
    } catch (err) {
      showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không cập nhật được phiếu nhập kho');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (printMode = 'SUMMARY') => {
    const slipForPrint = savedSlip || {
      ...buildPayload(form.status),
      docCode: form.docCode
    };

    printImportSlip(slipForPrint, {
      supplier: suppliers.find(s => String(s.id) === String(slipForPrint.partnerId || form.partnerId)),
      customer: customers.find(c => String(c.id) === String(slipForPrint.partnerId || form.partnerId)),
      warehouseById: new Map(warehouses.map(w => [w.id, w])),
      supplierById: new Map(suppliers.map(s => [s.id, s])),
      customerById: new Map(customers.map(c => [c.id, c])),
      assemblyOrderById: new Map(assemblyOrders.map(a => [a.id, a])),
      productById: new Map(products.map(p => [p.id, p])),
      userById: new Map(users.map(u => [u.id, u])),
      isImport: true,
      printMode,
    });
  };

  return (
    <AdminLayout>
      <div className={styles.pageBody}>
        <div className={styles.pageHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); returnUrl ? navigate(returnUrl) : navigate('/import-history'); }}>
              <i className="bi bi-arrow-left"></i> Sửa phiếu nhập kho {form.docCode ? form.docCode : ''}
            </a>
            <span style={{ color: '#d1d5db', fontSize: '20px' }}>|</span>
            <div style={{ width: '280px' }}>
              <Select
                value={[
                  { value: 'PURCHASE', label: 'Nhập kho mua hàng' },
                  { value: 'PRODUCTION', label: 'Nhập kho thành phẩm sản xuất' },
                  { value: 'RETURN', label: 'Nhập kho hàng bán bị trả lại' },
                  { value: 'OTHER', label: 'Khác' }
                ].find(o => o.value === importType)}
                options={[
                  { value: 'PURCHASE', label: 'Nhập kho mua hàng' },
                  { value: 'PRODUCTION', label: 'Nhập kho thành phẩm sản xuất' },
                  { value: 'RETURN', label: 'Nhập kho hàng bán bị trả lại' },
                  { value: 'OTHER', label: 'Khác' }
                ]}
                onChange={(option) => {
                  setImportType(option.value);
                  setForm(prev => ({
                    ...prev,
                    partnerId: '',
                    customerId: '',
                    assemblyOrderId: ''
                  }));
                  setItems([{ ...emptyLine(), isNew: false }]);
                }}
                styles={{
                  ...customSelectStyles,
                  control: (base, state) => ({ ...customSelectStyles.control(base, state), fontWeight: 'bold' })
                }}
                isSearchable={false}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className={styles.card}>Đang tải dữ liệu...</div>
        ) : (
          <>
            {form.hasDiscrepancy && (
              <div style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: 10,
                padding: '16px 20px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                boxShadow: '0 2px 4px rgba(234, 88, 12, 0.06)'
              }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 24, color: '#ea580c', flexShrink: 0, marginTop: 2 }}></i>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#9a3412', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>CẢNH BÁO CHÊNH LỆCH NHẬP KHO (THỦ KHO ĐÃ GHI NHẬN THIẾU / HÀNG LỖI)</span>
                    <span style={{ fontSize: 11, background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>Cần Kế toán đối soát</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#c2410c', lineHeight: 1.5, whiteSpace: 'pre-line', background: '#ffffff', padding: '8px 12px', borderRadius: 6, border: '1px dashed #fdba74', margin: '8px 0' }}>
                    {form.discrepancyNote || 'Phiếu nhập kho này có phát sinh chênh lệch giữa số lượng dự kiến từ HĐ và số lượng thực nhận vào kho.'}
                  </div>
                  <div style={{ fontSize: 12, color: '#7c2d12', marginTop: 4, lineHeight: 1.4 }}>
                    💡 <strong>Hướng dẫn nghiệp vụ cho Kế toán:</strong> Hệ thống đã tự động ghi nhận công nợ trả NCC theo đúng <strong>số lượng thực nhận</strong> (bảo vệ quỹ tiền). Kế toán vui lòng liên hệ NCC để: <strong>(1)</strong> Yêu cầu NCC hủy & xuất lại HĐGTGT theo đúng số lượng thực nhận, HOẶC <strong>(2)</strong> Lập biên bản yêu cầu NCC giao bù các sản phẩm còn thiếu trong đợt tiếp theo.
                  </div>
                </div>
              </div>
            )}

            <div className={styles.topGrid}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <i className={`bi bi-info-circle ${styles.cardIcon}`}></i>
                    Thông tin chung
                  </h2>
                </div>
                <div className={styles.cardBody}>
                  {importType === 'PURCHASE' && (
                    <>
                      <div className="misa-form-row">
                        <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                          <label className="misa-label">Mã nhà cung cấp <span className="required">*</span></label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <Select
                                inputId="import-partnerId"
                                options={suppliers.map(s => ({ value: s.id, label: `${s.code || `NCC#${s.id}`} - ${s.name || ''}`, codeOnly: s.code || `NCC#${s.id}` }))}
                                value={suppliers.find(s => String(s.id) === String(form.partnerId)) ? { value: form.partnerId, label: `${suppliers.find(s => String(s.id) === String(form.partnerId)).code || `NCC#${form.partnerId}`} - ${suppliers.find(s => String(s.id) === String(form.partnerId)).name || ''}`, codeOnly: suppliers.find(s => String(s.id) === String(form.partnerId)).code || `NCC#${form.partnerId}` } : null}
                                onChange={(selected) => {
                                  handleFormChange('partnerId', selected ? selected.value : '');
                                  handleFormChange('partnerName', selected ? (suppliers.find(s => String(s.id) === String(selected.value))?.name || '') : '');
                                }}
                                formatOptionLabel={(option, { context }) => context === 'value' ? option.codeOnly : option.label}
                                placeholder="Chọn Mã NCC..."
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
                          <label className="misa-label">Tên nhà cung cấp</label>
                          <input type="text" className="misa-input" readOnly value={form.partnerName || suppliers.find(s => String(s.id) === String(form.partnerId))?.name || ''} style={{ backgroundColor: '#f9fafb' }} />
                        </div>
                      </div>
                      <div className="misa-form-row" style={{ marginTop: '12px' }}>
                        <div className="misa-form-group" style={{ flex: '1' }}>
                          <label className="misa-label">Địa chỉ</label>
                          <input type="text" className="misa-input" readOnly value={suppliers.find(s => String(s.id) === String(form.partnerId))?.address || ''} style={{ backgroundColor: '#f3f4f6' }} />
                        </div>
                      </div>
                    </>
                  )}

                  {importType === 'PRODUCTION' && (
                    <div className="misa-form-row">
                      <div className="misa-form-group" style={{ flex: '1' }}>
                        <label className="misa-label">Lệnh sản xuất / Lắp ráp <span className="required">*</span></label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            className="misa-input"
                            readOnly
                            value={assemblyOrders.find(a => String(a.id) === String(form.assemblyOrderId))?.orderCode || form.referenceCode || ''}
                            placeholder="Nhấn chọn lệnh sản xuất..."
                            style={{ flex: 1, backgroundColor: '#f3f4f6', cursor: 'pointer' }}
                            onClick={() => setShowAssemblyOrderModal(true)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowAssemblyOrderModal(true)}
                            style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <i className="bi bi-search" style={{ fontSize: '16px', color: 'var(--color-primary)' }}></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {importType === 'RETURN' && (
                    <>
                      <div className="misa-form-row">
                        <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                          <label className="misa-label">Mã khách hàng <span className="required">*</span></label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <Select
                                inputId="import-customerId"
                                options={customers.map(c => ({ value: c.id, label: `${c.code || `KH#${c.id}`} - ${c.name || ''}`, codeOnly: c.code || `KH#${c.id}` }))}
                                value={customers.find(c => String(c.id) === String(form.customerId)) ? { value: form.customerId, label: `${customers.find(c => String(c.id) === String(form.customerId)).code || `KH#${form.customerId}`} - ${customers.find(c => String(c.id) === String(form.customerId)).name || ''}`, codeOnly: customers.find(c => String(c.id) === String(form.customerId)).code || `KH#${form.customerId}` } : null}
                                onChange={(selected) => {
                                  handleFormChange('customerId', selected ? selected.value : '');
                                  handleFormChange('customerName', selected ? (customers.find(c => String(c.id) === String(selected.value))?.name || '') : '');
                                }}
                                formatOptionLabel={(option, { context }) => context === 'value' ? option.codeOnly : option.label}
                                placeholder="Chọn Mã khách hàng..."
                                isClearable
                                styles={customSelectStyles}
                              />
                            </div>
                            <button type="button" onClick={() => setShowCustomerDrawer(true)} style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <i className="bi bi-plus" style={{ fontSize: '18px', color: 'var(--color-primary)' }}></i>
                            </button>
                          </div>
                        </div>
                        <div className="misa-form-group" style={{ flex: '0 0 62%' }}>
                          <label className="misa-label">Tên khách hàng</label>
                          <input
                            type="text"
                            className="misa-input"
                            value={form.customerName !== undefined ? form.customerName : (customers.find(c => String(c.id) === String(form.customerId))?.name || '')}
                            onChange={(e) => handleFormChange('customerName', e.target.value)}
                            placeholder="Nhập tên khách hàng..."
                            readOnly={!!form.customerId}
                            style={{ backgroundColor: form.customerId ? '#f9fafb' : '#fff' }}
                          />
                        </div>
                      </div>
                      <div className="misa-form-row" style={{ marginTop: '12px' }}>
                        <div className="misa-form-group" style={{ flex: '1' }}>
                          <label className="misa-label">Địa chỉ</label>
                          <input type="text" className="misa-input" readOnly value={customers.find(c => String(c.id) === String(form.customerId))?.address || ''} style={{ backgroundColor: '#f3f4f6' }} />
                        </div>
                      </div>
                    </>
                  )}

                  {importType === 'OTHER' && (
                    <>
                      <div className="misa-form-row">
                        <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                          <label className="misa-label">Mã đối tượng</label>
                          <input
                            type="text"
                            className="misa-input"
                            value={form.otherObjectCode || ''}
                            onChange={(e) => handleFormChange('otherObjectCode', e.target.value)}
                            placeholder="Nhập mã đối tượng..."
                          />
                        </div>
                        <div className="misa-form-group" style={{ flex: '0 0 62%' }}>
                          <label className="misa-label">Tên đối tượng</label>
                          <input
                            type="text"
                            className="misa-input"
                            value={form.otherObjectName || ''}
                            onChange={(e) => handleFormChange('otherObjectName', e.target.value)}
                            placeholder="Nhập tên đối tượng..."
                          />
                        </div>
                      </div>
                      <div className="misa-form-row" style={{ marginTop: '12px' }}>
                        <div className="misa-form-group" style={{ flex: '1' }}>
                          <label className="misa-label">Địa chỉ</label>
                          <input
                            type="text"
                            className="misa-input"
                            value={form.otherObjectAddress || ''}
                            onChange={(e) => handleFormChange('otherObjectAddress', e.target.value)}
                            placeholder="Nhập địa chỉ..."
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="misa-form-row" style={{ marginTop: '12px' }}>
                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                      <label className="misa-label">Kho nhập <span className="required">*</span></label>
                      <Select
                        inputId="import-warehouseId"
                        options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                        value={warehouses.find(w => String(w.id) === String(form.warehouseId)) ? { value: form.warehouseId, label: `${warehouses.find(w => String(w.id) === String(form.warehouseId)).code} - ${warehouses.find(w => String(w.id) === String(form.warehouseId)).name}` } : null}
                        onChange={(selected) => {
                          const newWh = selected ? selected.value : '';
                          handleFormChange('warehouseId', newWh);
                          setItems(prev => prev.map(it => ({ ...it, warehouseId: newWh })));
                        }}
                        placeholder="Chọn kho"
                        isClearable
                        styles={customSelectStyles}
                      />
                    </div>
                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                      <label className="misa-label">
                        {importType === 'PURCHASE' && 'Nhân viên mua hàng'}
                        {importType === 'PRODUCTION' && 'Nhân viên phụ trách'}
                        {importType === 'RETURN' && 'Nhân viên nhận hàng'}
                        {importType === 'OTHER' && 'Nhân viên nhận hàng'}
                      </label>
                      <input
                        type="text"
                        className="misa-input"
                        value={users.find(u => String(u.id) === String(form.purchaser)) ? (users.find(u => String(u.id) === String(form.purchaser)).fullName || users.find(u => String(u.id) === String(form.purchaser)).username) : 'Đang tải...'}
                        readOnly
                        style={{ backgroundColor: '#f3f4f6' }}
                      />
                    </div>
                  </div>

                  {(importType === 'PURCHASE' || importType === 'PRODUCTION' || importType === 'OTHER') && (
                    <div className="misa-form-row" style={{ marginTop: '12px' }}>
                      <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                        <label className="misa-label">Người giao hàng</label>
                        <input
                          type="text"
                          className="misa-input"
                          value={form.deliverer || ''}
                          onChange={(e) => handleFormChange('deliverer', e.target.value)}
                          placeholder="Nhập người giao hàng..."
                        />
                      </div>
                      <div className="misa-form-group" style={{ flex: '0 0 50%' }}></div>
                    </div>
                  )}

                <div className="misa-form-group" style={{ marginTop: '12px' }}>
                  <label className="misa-label">Ghi chú</label>
                  <textarea className="misa-textarea" value={form.note} onChange={(e) => handleFormChange('note', e.target.value)} style={{ minHeight: '60px' }} />
                </div>

                <div className="misa-form-group" style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="misa-label" style={{ marginBottom: 0 }}>
                      Kèm theo chứng từ
                      {(importType === 'PURCHASE' || importType === 'RETURN') && <span className="required" style={{ marginLeft: '4px' }}>*</span>}
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
                  {form.referenceId && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                      <span className={styles.textBlue} style={{ fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="bi bi-file-earmark-text"></i>
                        {form.referenceCode}
                      </span>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => setForm(prev => ({ ...prev, referenceType: '', referenceId: '', referenceCode: '' }))}
                        title="Bỏ đính kèm"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    <i className={`bi bi-file-earmark-text ${styles.cardIcon}`}></i>
                    Thông tin chứng từ
                  </h2>
                </div>

                <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                  <label className="misa-label">Số phiếu</label>
                  <input className="misa-input" value={form.docCode} onChange={(e) => handleFormChange('docCode', e.target.value)} />
                </div>

                <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                  <label className="misa-label">Ngày nhập kho <span className="required">*</span></label>
                  <input id="import-docDate" type="date" className="misa-input" value={form.docDate} onChange={(e) => handleFormChange('docDate', e.target.value)} />
                </div>
              </div>
            </div>

            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
              <div className={styles.cardHeader} style={{ padding: '24px 24px 20px', margin: 0 }}>
                <h2 className={styles.cardTitle}>
                  <i className={`bi bi-box-seam ${styles.cardIcon}`}></i>
                  Bảng hàng hóa
                </h2>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '35px', textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
                      <th style={{ minWidth: '110px', width: '11%' }}>Mã hàng</th>
                      <th style={{ minWidth: '160px', width: '18%' }}>Tên hàng</th>
                      <th style={{ minWidth: '50px', width: '5%', whiteSpace: 'nowrap' }}>ĐVT</th>
                      <th style={{ minWidth: '70px', width: '7%', textAlign: 'right', whiteSpace: 'nowrap' }} title="Số lượng ghi trên Hóa đơn NCC">SL HĐ</th>
                      <th style={{ minWidth: '75px', width: '7%', textAlign: 'right', whiteSpace: 'nowrap' }} title="Số lượng thực tế dỡ vào kho">SL Nhận</th>
                      <th style={{ minWidth: '65px', width: '6%', textAlign: 'right', whiteSpace: 'nowrap' }} title="Số lượng hàng hỏng/móp méo từ chối nhận">SL Lỗi</th>
                      <th style={{ minWidth: '75px', width: '8%', textAlign: 'center', whiteSpace: 'nowrap' }}>Serial</th>
                      <th style={{ minWidth: '60px', width: '6%', textAlign: 'center', whiteSpace: 'nowrap' }}>BH (T)</th>
                      <th style={{ minWidth: '95px', width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>Đơn giá</th>
                      <th style={{ minWidth: '95px', width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>Thành tiền</th>
                      <th style={{ minWidth: '60px', width: '6%', textAlign: 'right', whiteSpace: 'nowrap' }}>% VAT</th>
                      <th style={{ minWidth: '110px', width: '12%', whiteSpace: 'nowrap' }}>Lý do chênh lệch</th>
                      <th style={{ width: '35px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const product = productById.get(String(item.variantId));
                      const isDiscrepant = (Number(item.expectedQuantity || item.quantity || 0) > Number(item.quantity || 0)) || Number(item.rejectedQuantity || 0) > 0;
                      return (
                        <tr key={item.localId} style={isDiscrepant ? { backgroundColor: '#fffbeb' } : {}}>
                          <td className={styles.textCenter}>{index + 1}</td>
                          <td>
                            <ProductGridSelect
                              id={`import-line-product-${index}`}
                              products={filteredProducts}
                              inventoryMap={inventoryMap}
                              value={item.variantId}
                              onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.id : '')}
                              onAddNew={() => { setQuickAddLineId(item.localId); setShowQuickAddProduct(true); }}
                              displayMode="code"
                              placeholder="Chọn mã"
                            />
                          </td>
                          <td>
                            <ProductGridSelect
                              products={filteredProducts}
                              inventoryMap={inventoryMap}
                              value={item.variantId}
                              onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.id : '')}
                              onAddNew={() => { setQuickAddLineId(item.localId); setShowQuickAddProduct(true); }}
                              displayMode="name"
                              placeholder="Chọn hàng"
                            />
                          </td>
                          <td>{product?.unitName || ''}</td>
                          <td align="right">
                            <input
                              type="number"
                              min="0"
                              className="misa-input"
                              style={{ height: '32px', padding: '0 6px', width: '55px', textAlign: 'right', fontSize: '13px', backgroundColor: '#f8fafc' }}
                              value={item.expectedQuantity !== undefined ? item.expectedQuantity : item.quantity}
                              onChange={(e) => handleItemChange(item.localId, 'expectedQuantity', e.target.value)}
                              title="Số lượng trên Hóa đơn NCC"
                            />
                          </td>
                          <td align="right">
                            <input
                              id={`import-line-qty-${index}`}
                              type="number"
                              min="0"
                              className="misa-input"
                              style={{ height: '32px', padding: '0 6px', width: '55px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: isDiscrepant ? '#d97706' : '#1e293b' }}
                              value={item.quantity}
                              onChange={(e) => handleItemChange(item.localId, 'quantity', e.target.value)}
                              title="Số lượng thực nhận vào kho"
                            />
                          </td>
                          <td align="right">
                            <input
                              type="number"
                              min="0"
                              className="misa-input"
                              style={{ height: '32px', padding: '0 6px', width: '50px', textAlign: 'right', fontSize: '13px', color: Number(item.rejectedQuantity || 0) > 0 ? '#dc2626' : '#64748b' }}
                              value={item.rejectedQuantity !== undefined ? item.rejectedQuantity : ''}
                              onChange={(e) => handleItemChange(item.localId, 'rejectedQuantity', e.target.value)}
                              placeholder="0"
                              title="Số lượng hàng lỗi/từ chối nhận"
                            />
                          </td>
                          <td align="center">
                            <div className={styles.serialCellContainer} style={{ justifyContent: 'center' }}>
                              {product?.trackSerial && (
                                <button
                                  type="button"
                                  className={(item.serialNumbers?.length || 0) === Number(item.quantity || 0) ? styles.serialBadgeSuccess : styles.serialBadgeWarning}
                                  onClick={() => setSerialModalItemId(item.localId)}
                                >
                                  <i className="bi bi-upc-scan"></i>
                                  {(item.serialNumbers?.length || 0)} / {Number(item.quantity || 0)}
                                </button>
                              )}
                            </div>
                          </td>
                          <td align="center">
                            <input id={`import-line-warranty-${index}`} type="number" min="0" className="misa-input text-center" style={{ height: '32px', padding: '0 6px', width: '50px', textAlign: 'center', fontSize: '13px' }} value={item.warrantyMonths !== undefined ? item.warrantyMonths : ''} onChange={(e) => handleItemChange(item.localId, 'warrantyMonths', e.target.value)} />
                          </td>
                          <td align="right">
                            <input id={`import-line-price-${index}`} type="text" className="misa-input" style={{ height: '32px', padding: '0 6px', width: '100%', maxWidth: '110px', textAlign: 'right', fontSize: '13px' }} value={item.price ? new Intl.NumberFormat('vi-VN').format(item.price) : ''} onChange={(e) => handleItemChange(item.localId, 'price', e.target.value.replace(/\D/g, ''))} />
                          </td>
                          <td align="right" className={`${styles.textBold} ${styles.textBlue}`}>
                            {money(Number(item.quantity || 0) * Number(item.price || 0))} đ
                          </td>
                          <td align="right">
                            <input id={`import-line-vat-${index}`} type="number" min="0" max="10" step="any" className="misa-input" style={{ height: '32px', padding: '0 6px', width: '50px', textAlign: 'right', fontSize: '13px' }} value={item.vatPercent !== undefined ? item.vatPercent : ''} onChange={(e) => handleItemChange(item.localId, 'vatPercent', e.target.value)} />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="misa-input"
                              style={{ height: '32px', padding: '0 6px', fontSize: '12px' }}
                              value={item.discrepancyReason || ''}
                              onChange={(e) => handleItemChange(item.localId, 'discrepancyReason', e.target.value)}
                              placeholder={isDiscrepant ? "Nhập lý do thiếu/lỗi..." : "—"}
                            />
                          </td>
                          <td><button className={styles.deleteBtn} onClick={() => removeItem(item.localId)}><i className="bi bi-trash"></i></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#f3f4f6', fontWeight: 'bold' }}>
                      <td style={{ borderRight: 'none' }}></td>
                      <td style={{ borderRight: 'none' }}></td>
                      <td style={{ borderRight: 'none' }}></td>
                      <td></td>
                      <td style={{ textAlign: 'right', padding: '12px' }}>{money(totalQuantity)}</td>
                      <td style={{ borderRight: 'none' }}></td>
                      <td style={{ borderRight: 'none' }}></td>
                      <td></td>
                      <td style={{ textAlign: 'right', padding: '12px' }}>{money(totalPrice)}</td>
                      <td style={{ borderRight: 'none' }}></td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', backgroundColor: '#fff', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                  <div style={{ color: '#4b5563', fontSize: '13px' }}>
                    Tổng số: <strong>{items.length}</strong> bản ghi
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={addItem} style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Thêm dòng</button>
                    <button type="button" onClick={() => setItems([{ ...emptyLine(form.warehouseId), isNew: false }])} style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Xóa hết dòng</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '350px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                    <SearchableSelect style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}>
                      <option>20 bản ghi trên 1 trang</option>
                    </SearchableSelect>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
                      <span style={{ cursor: 'pointer' }}>Trước</span>
                      <span style={{ fontWeight: 'bold', color: '#111827' }}>1</span>
                      <span style={{ cursor: 'pointer' }}>Sau</span>
                    </div>
                  </div>
                  <table style={{ width: '100%', fontSize: '13px' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Tổng tiền hàng</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold' }}>{money(totalPrice)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Thuế GTGT</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold' }}>{money(totalVat)}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 0', fontWeight: 'bold' }}>Tổng tiền thanh toán</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 'bold' }}>{money(grandTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        <div className={styles.stickyFooter}>
          <div className={styles.footerLeft}>
            <button className="btn-misa-cancel" onClick={() => navigate('/import-history')}>
              <i className="bi bi-x-circle"></i> Hủy bỏ
            </button>
          </div>
          <div className={styles.footerRight}>
            <button className="btn-misa-draft" disabled={saving || loading} onClick={() => submit('DRAFT')}>
              <i className="bi bi-save"></i> Lưu tạm
            </button>
            <button className="btn-misa-post" disabled={!isFormValid || saving || loading} onClick={() => setShowConfirm(true)}>
              <i className="bi bi-check-circle-fill"></i> Lưu và ghi sổ
            </button>
          </div>
        </div>
      </div>
      <ManageSerialModal
        isOpen={Boolean(serialModalItemId)}
        onClose={handleSerialModalClose}
        productName={variantLabel(selectedSerialProduct)}
        targetQuantity={Number(selectedSerialItem?.quantity || 0)}
        initialSerials={selectedSerialItem?.serialNumbers || []}
        warehouseId={selectedSerialItem?.warehouseId || form.warehouseId}
      />
      <QuickAddProductModal
        isOpen={showQuickAddProduct}
        onClose={() => { setShowQuickAddProduct(false); setQuickAddLineId(null); }}
        onSuccess={handleQuickAddProductSuccess}
        productType={importType === 'PRODUCTION' ? 'Thành phẩm' : 'Hàng hóa'}
        allowedProductTypes={['Hàng hóa', 'Thành phẩm']}
      />
      <CustomerModal
        isOpen={showCustomerDrawer}
        editData={null}
        onClose={() => setShowCustomerDrawer(false)}
        onSaved={handleSaveCustomer}
      />
      {showPartnerModal && (
        <SupplierModal
          isOpen={showPartnerModal}
          onClose={() => setShowPartnerModal(false)}
          onSave={handleSavePartner}
          onError={(msg) => showToast('error', msg)}
        />
      )}
      <AssemblyOrderSelectionModal
        isOpen={showAssemblyOrderModal}
        onClose={() => setShowAssemblyOrderModal(false)}
        assemblyOrders={assemblyOrders}
        onSelect={(order) => {
          setForm(prev => ({ ...prev, assemblyOrderId: order.id, assemblyOrderCode: order.orderCode }));
          setShowAssemblyOrderModal(false);
        }}
      />
      <ReferenceDocumentModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={(data) => {
          setForm(prev => ({ ...prev, referenceType: data.referenceType, referenceId: data.referenceId, referenceCode: data.docCode }));
          setShowReferenceModal(false);
        }}
      />
      <ConfirmModal
        isOpen={showConfirm}
        title="Xác nhận ghi sổ"
        message="Bạn có chắc chắn muốn lưu và ghi sổ phiếu nhập kho này không? Thao tác này không thể hoàn tác và sẽ cập nhật lại số lượng hàng hóa trong kho."
        onConfirm={() => {
          setShowConfirm(false);
          submit('DRAFT', true);
        }}
        onCancel={() => setShowConfirm(false)}
      />
      <SuccessPrintModal
        isOpen={showSuccessModal}
        title={savedSlip?.status === 'POSTED' || savedSlip?.statusCode === 'POSTED' ? 'Ghi sổ phiếu nhập kho thành công!' : 'Cập nhật phiếu nhập kho thành công!'}
        message="Phiếu nhập kho đã được lưu và cập nhật thành công. Bạn có thể chọn cách in phiếu dưới đây."
        docCode={savedSlip?.docCode || form.docCode}
        onPrintSummary={() => handlePrint('SUMMARY')}
        onPrintSplit={() => handlePrint('SPLIT_BY_WAREHOUSE')}
        onViewList={() => navigate('/import-history')}
        onClose={() => navigate('/import-history')}
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

export default UpdateImportSlipPage;
