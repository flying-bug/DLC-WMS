import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import * as importApi from '../../api/inventoryImportApi';
import { scanImportSlipOcr } from '../../api/inventoryImportApi';
import OcrUploadModal from './components/OcrUploadModal';
import OcrResultPreviewModal from './components/OcrResultPreviewModal';
import * as customerApi from '../../api/customerApi';
import * as assemblyOrderApi from '../../api/assemblyOrderApi';
import * as exportApi from '../../api/inventoryExportApi';
import SupplierModal from '../Supplier/components/SupplierModal';
import CustomerModal from '../Customer/components/CustomerModal';
import AssemblyOrderSelectionModal from './components/AssemblyOrderSelectionModal';
import * as stocktakeApi from '../../api/stocktakeApi';
import ReferenceDocumentModal from '../../components/ReferenceDocumentModal';
import Toast from '../../components/ui/Toast/Toast';
import ManageSerialModal from './ManageSerialModal';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import SuccessPrintModal from '../../components/ui/SuccessPrintModal/SuccessPrintModal';
import { printImportSlip } from '../../utils/printImportSlip';
import ProductGridSelect from '../../components/ui/ProductGridSelect/ProductGridSelect';
import QuickAddProductModal from '../../components/ui/QuickAddProductModal/QuickAddProductModal';
import Select from 'react-select';
import axiosClient from '../../api/axiosClient';
import { useAiFeature } from '../../contexts/AiFeatureContext';
import styles from './CreateImportSlipPage.module.css';
import { getTodayIsoDate } from '../../utils/dateFormat';
import { focusField } from '../../utils/focusField';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import { findBestMatch } from '../../utils/fuzzyMatch';


const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = getTodayIsoDate;
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
  const type = normalizeProductType(item?.productType);
  return type === 'hang hoa' || type === 'thanh pham';
};

const isWarehouseLine = (line) => !line?.productType || isWarehouseProduct(line);
const filterWarehouseProducts = (items) => (items || []).filter(isWarehouseProduct);
const filterWarehouseLines = (lines) => (lines || []).filter(isWarehouseLine);

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
  quantity: 1,
  price: 0,
  vatPercent: 0,
  note: '',
  isNew: true,
});

function CreateImportSlipPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { aiEnabled } = useAiFeature();
  const voiceData = location.state?.voiceData || null;
  const assemblyData = location.state?.assemblyData || null;
  const stocktakeData = location.state?.stocktakeData || null;
  const poData = location.state?.poData || null;
  const returnUrl = location.state?.returnUrl || null;
  const searchParams = new URLSearchParams(location.search);
  const initialType = searchParams.get('type')?.toUpperCase() || (stocktakeData ? 'OTHER' : (poData ? 'PURCHASE' : 'PURCHASE'));

  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showQuickAddProduct, setShowQuickAddProduct] = useState(false);
  const [quickAddLineId, setQuickAddLineId] = useState(null);
  const [toast, setToast] = useState({ isVisible: false, type: 'error', message: '' });
  const [saving, setSaving] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [serialModalItemId, setSerialModalItemId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [savedSlip, setSavedSlip] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrPreviewData, setOcrPreviewData] = useState(null);
  const [ocrQuickAddPreviewIndex, setOcrQuickAddPreviewIndex] = useState(null);
  const [ocrQuickAddProductName, setOcrQuickAddProductName] = useState('');
  const [ocrQuickAddUnitName, setOcrQuickAddUnitName] = useState('');
  const [ocrQuickAddCategoryName, setOcrQuickAddCategoryName] = useState('');
  const [ocrQuickAddWarrantyMonths, setOcrQuickAddWarrantyMonths] = useState('');

  const handleOcrPreviewQuickAdd = (index, rawProductName, unit, category, warrantyMonths) => {
    setOcrQuickAddPreviewIndex(index);
    setOcrQuickAddProductName(rawProductName);
    setOcrQuickAddUnitName(unit || '');
    setOcrQuickAddCategoryName(category || '');
    setOcrQuickAddWarrantyMonths(warrantyMonths !== null && warrantyMonths !== undefined ? String(warrantyMonths) : '');
    setShowQuickAddProduct(true);
  };

  const handleOcrSuccess = (data) => {
    setShowOcrModal(false);
    setOcrPreviewData(data);
  };

  const handleOcrFile = async (file) => {
    setOcrLoading(true);
    try {
      const res = await scanImportSlipOcr(file);
      const data = res?.data?.data ?? res?.data;
      if (!data) {
        showToast('error', 'Không nhận được dữ liệu từ AI');
        return;
      }
      handleOcrSuccess(data);
    } catch (err) {
      console.error('OCR scan error:', err);
      showToast('error', err.response?.data?.userMessage || 'Không thể trích xuất dữ liệu từ chứng từ');
    } finally {
      setOcrLoading(false);
    }
  };

  const confirmOcrPreview = () => {
    if (!ocrPreviewData) return;
    const data = ocrPreviewData;
    
    // Auto-fill supplier
    if (data.matchedSupplierId) {
      setForm(prev => ({
        ...prev,
        partnerId: String(data.matchedSupplierId),
        partnerName: data.matchedSupplierName || '',
      }));
      setImportType('PURCHASE');
    }
    // Auto-fill product lines
    if (data.items && data.items.length > 0) {
      const ocrLines = data.items.map(item => {
        const variantId = item.matchedVariantId ? String(item.matchedVariantId) : '';
        const product = variantId ? products.find(p => String(p.id) === variantId) : null;
        return {
          ...emptyLine(),
          variantId,
          quantity: Number(item.quantity) || 1,
          price: Number(item.unitPrice) || 0,
          note: item.rawProductName || '',
          serialNumbers: item.serialNumbers || [],
          warrantyMonths: product ? Number(product.warrantyMonths || 0) : 0,
          vatPercent: item.vatPercent !== null && item.vatPercent !== undefined ? Number(item.vatPercent) : 0,
          isNew: false,
          _ocrConfidence: item.matchConfidence,
          _ocrRawName: item.rawProductName,
          _ocrSuggestions: item.alternativeSuggestions,
        };
      });
      setItems(ocrLines);
    }
    // Auto-fill invoice info
    if (data.invoiceCode) {
      setForm(prev => ({
        ...prev,
        attachedDoc: data.invoiceCode,
        note: prev.note || `Nhập từ hóa đơn ${data.invoiceCode}`,
      }));
    }
    
    setOcrPreviewData(null);
    showToast('success', `Đã điền ${data.items?.length || 0} dòng sản phẩm vào phiếu nhập!`);
  };

  const [form, setForm] = useState(() => ({
    docCode: '',
    warehouseId: assemblyData?.warehouseId || stocktakeData?.warehouseId || '',
    partnerId: poData?.partnerId || '',
    partnerName: poData?.partnerName || '',
    customerId: '',
    customerName: '',
    assemblyOrderId: assemblyData?.id || '',
    deliverer: '',
    purchaser: '',
    attachedDoc: poData ? `PO: ${poData.poCode}` : '',
    docDate: today(),
    note: assemblyData ? `Nhập thành phẩm phục vụ Lệnh lắp ráp/tháo dỡ ${assemblyData.code}` : stocktakeData ? stocktakeData.reason : (poData ? `Nhập hàng cho Đơn mua hàng ${poData.poCode}` : ''),
    status: 'DRAFT',
    referenceType: assemblyData ? 'ASSEMBLY_ORDER' : stocktakeData ? 'STOCKTAKE' : (poData ? 'PURCHASE_ORDER' : ''),
    referenceId: assemblyData ? assemblyData.id : stocktakeData ? stocktakeData.id : (poData ? poData.id : ''),
    referenceCode: assemblyData ? assemblyData.code : stocktakeData ? stocktakeData.code : (poData ? poData.poCode : ''),
    purchaseOrderId: poData ? poData.id : '',
  }));
  const [items, setItems] = useState(() => {
    if (poData && poData.lines && poData.lines.length > 0) {
      const poLines = filterWarehouseLines(poData.lines);
      return poLines.length > 0 ? poLines.map(line => ({
        ...emptyLine(),
        variantId: String(line.variantId),
        quantity: Number(line.quantity) || 1,
        price: Number(line.unitPrice) || 0,
        vatPercent: Number(line.vatRate) || 0,
        note: line.note || '',
        isNew: false
      })) : [{ ...emptyLine(), isNew: false }];
    }
    if (assemblyData && assemblyData.lines && assemblyData.lines.length > 0) {
      const assemblyLines = filterWarehouseLines(assemblyData.lines);
      return assemblyLines.length > 0 ? assemblyLines.map(comp => ({
        ...emptyLine(),
        variantId: String(comp.variantId || comp.id),
        quantity: comp.quantity || 1,
        price: comp.price || 0,
        note: `Cấu hình cho Lệnh ${assemblyData.code}`,
        isNew: false
      })) : [{ ...emptyLine(), isNew: false }];
    }
    if (stocktakeData && stocktakeData.lines && stocktakeData.lines.length > 0) {
      const stocktakeLines = filterWarehouseLines(stocktakeData.lines);
      return stocktakeLines.length > 0 ? stocktakeLines.map(line => ({
        ...emptyLine(),
        variantId: String(line.variantId),
        quantity: line.quantity || 1,
        price: line.price || 0,
        serialNumbers: line.serialNumbers || line.serials || [],
        note: line.note || `Hàng thừa từ kiểm kê ${stocktakeData.code}`,
        isNew: false
      })) : [{ ...emptyLine(), isNew: false }];
    }
    return [{ ...emptyLine(), isNew: false }];
  });
  const [importType, setImportType] = useState(initialType);
  const [customers, setCustomers] = useState([]);
  const [assemblyOrders, setAssemblyOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false);
  const [showAssemblyOrderModal, setShowAssemblyOrderModal] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [inventoryMap, setInventoryMap] = useState(new Map());

  useEffect(() => {
    if (!form.warehouseId) {
      setInventoryMap(new Map());
      return;
    }
    exportApi.getInventoryBalance({ warehouseId: form.warehouseId })
      .then(res => {
        const list = pageContent(unwrap(res));
        const invMap = new Map();
        list.forEach(b => {
          const totalQuantity = Number(b.totalQuantity ?? b.quantityOnHand ?? 0);
          const totalReserved = Number(b.totalReserved ?? b.quantityReserved ?? 0);
          const availableQuantity = Number(b.availableQuantity ?? (totalQuantity - totalReserved));
          const stock = Math.max(0, availableQuantity);
          if (b.variantId) invMap.set(String(b.variantId), stock);
          else if (b.itemId) invMap.set(String(b.itemId), stock);
        });
        setInventoryMap(invMap);
      })
      .catch(err => {
        console.error('Failed to load inventory balance', err);
        setInventoryMap(new Map());
      });
  }, [form.warehouseId]);

  useEffect(() => {
    const loadLookups = async () => {
      importApi.getNextCode()
        .then(res => {
          const code = unwrap(res);
          if (code) setForm(prev => ({ ...prev, docCode: prev.docCode || code }));
        })
        .catch(err => console.error('Failed to load next import docCode', err));

      const [warehouseRes, supplierRes, productRes, customerRes, assemblyOrderRes, userRes] = await Promise.allSettled([
        importApi.getWarehouses({ size: 100 }),
        importApi.getSuppliers({ status: 'APPROVED' }),
        importApi.getProducts({ size: 1000 }),
        customerApi.searchCustomers('', 'APPROVED', '', 0, 1000),
        assemblyOrderApi.getAssemblyOrders({ size: 100 }),
        exportApi.getUsers({ size: 1000 })
      ]);
      if (warehouseRes.status === 'fulfilled') {
        const data = pageContent(unwrap(warehouseRes.value));
        setWarehouses(data);
        setForm(prev => ({ ...prev, warehouseId: prev.warehouseId || '' }));
      }
      if (supplierRes.status === 'fulfilled') {
        const data = pageContent(unwrap(supplierRes.value)).filter(s => s.status === 'APPROVED');
        setSuppliers(data);
      }
      if (productRes.status === 'fulfilled') {
        const data = filterWarehouseProducts(pageContent(unwrap(productRes.value)));
        setProducts(data);
      }
      if (customerRes.status === 'fulfilled') {
        const data = pageContent(unwrap(customerRes.value));
        setCustomers(data);
      }
      if (assemblyOrderRes.status === 'fulfilled') {
        const data = pageContent(unwrap(assemblyOrderRes.value));
        setAssemblyOrders(data);
      }
      if (userRes.status === 'fulfilled') {
        const data = pageContent(unwrap(userRes.value));
        setUsers(data);
      }
      try {
        const meRes = await axiosClient.get('/users/me');
        const me = meRes.data?.data || meRes.data;
        if (me) {
          setCurrentUser(me);
          setForm(prev => ({ ...prev, purchaser: String(me.id) }));
        }
      } catch (err) {
        console.error('Failed to load me profile', err);
      }
    };
    loadLookups();
  }, []);

  const userById = useMemo(() => new Map(users.map(user => [String(user.id), user])), [users]);

  // ── Voice Data auto-fill ──────────────────────────────────
  useEffect(() => {
    if (!voiceData) return;

    // Auto-select warehouse by keyword
    if (voiceData.warehouseKeyword && warehouses.length > 0) {
      const matchWh = findBestMatch(warehouses, voiceData.warehouseKeyword, w => [w.name, w.code]);
      if (matchWh) {
        setForm(prev => ({ ...prev, warehouseId: String(matchWh.id) }));
      }
    }

    // Auto-select supplier by keyword
    if (voiceData.supplierKeyword && suppliers.length > 0) {
      const matchSupp = findBestMatch(suppliers, voiceData.supplierKeyword, s => [s.name, s.code, s.phone]);
      if (matchSupp) {
        setForm(prev => ({ ...prev, partnerId: matchSupp.id, partnerName: matchSupp.name }));
      }
    }

    // Auto-fill note
    if (voiceData.note) {
      setForm(prev => ({ ...prev, note: prev.note ? `${prev.note} - ${voiceData.note}` : voiceData.note }));
    }

    // Auto-add product line by keyword
    if (voiceData.productKeyword && products.length > 0) {
      const matchProd = findBestMatch(products, voiceData.productKeyword, p => [p.productName, p.variantName, p.sku]);
      if (matchProd) {
        const qty = Number(voiceData.quantity) || 1;
        const price = voiceData.unitPrice != null ? Number(voiceData.unitPrice) : (Number(matchProd.importPrice || matchProd.costPrice || matchProd.price || 0));
        setItems([{
          ...emptyLine(),
          variantId: String(matchProd.id),
          quantity: qty,
          price: price,
          vatPercent: matchProd.vatPercent != null ? Number(matchProd.vatPercent) : 0,
          warrantyMonths: matchProd.warrantyMonths != null ? Number(matchProd.warrantyMonths) : 0,
          isNew: false,
        }]);
      }
    }
  }, [voiceData, warehouses, suppliers, products]);

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
          : true) && // OTHER type has no required partner field
    items.length && items.every(isLineValid)
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
          showToast('info', 'Sản phẩm đã tồn tại trong danh sách, đã tự động tăng số lượng.');
          return newItems.filter(item => item.localId !== localId);
        }
        const product = products.find(p => String(p.id) === String(value));
        return prev.map(item => item.localId === localId ? {
          ...item,
          [field]: value,
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
      } else if (createdVariant && ocrQuickAddPreviewIndex !== null) {
        setOcrPreviewData(prev => {
          if (!prev) return prev;
          const newData = { ...prev };
          newData.items = [...prev.items];
          newData.items[ocrQuickAddPreviewIndex] = {
            ...newData.items[ocrQuickAddPreviewIndex],
            matchedVariantId: createdVariant.id,
            matchedVariantName: createdVariant.variantName,
            matchedProductName: createdVariant.productName,
          };
          return newData;
        });
        showToast('success', `Đã thêm và chọn sản phẩm ${createdVariant.productName || ''}`.trim());
      } else {
        showToast('warning', 'Đã thêm sản phẩm nhưng chưa tìm thấy biến thể mặc định để chọn.');
      }
    } catch (err) {
      showToast('error', 'Thêm sản phẩm thành công nhưng không tải lại được danh sách hàng hóa.');
    } finally {
      setShowQuickAddProduct(false);
      setQuickAddLineId(null);
      setOcrQuickAddPreviewIndex(null);
      setOcrQuickAddProductName('');
      setOcrQuickAddUnitName('');
      setOcrQuickAddCategoryName('');
      setOcrQuickAddWarrantyMonths('');
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, emptyLine()]);
  };

  const removeItem = (localId) => {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.localId !== localId) : [{ ...emptyLine(), isNew: false }]);
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

  const buildPayload = (status) => ({
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
      quantityIn: Number(item.quantity),
      quantityOut: 0,
      unitCost: Number(item.price),
      unitPrice: Number(item.price),
      vatPercent: Number(item.vatPercent || 0),
      warrantyMonths: Number(item.warrantyMonths || 0),
      serialNumbers: item.serialNumbers || [],
      note: item.note,
    })),
    issuePurpose: importType,
    recipientName: importType === 'OTHER' ? form.otherObjectName : form.deliverer,
    salespersonId: (!isNaN(Number(form.purchaser)) && String(form.purchaser).trim() !== '') ? Number(form.purchaser) : null,
    referenceType: (importType === 'PRODUCTION' || importType === 'SCRAP') && form.assemblyOrderId ? 'ASSEMBLY_ORDER' : (form.referenceType || undefined),
    referenceId: (importType === 'PRODUCTION' || importType === 'SCRAP') && form.assemblyOrderId ? Number(form.assemblyOrderId) : (form.referenceId ? Number(form.referenceId) : undefined),
    purchaseOrderId: form.purchaseOrderId ? Number(form.purchaseOrderId) : undefined,
  });

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
      showToast('success', 'Thêm mới khách hàng thành công!');
    } catch (err) {
      console.error(err);
    } finally {
      if (!isContinue) {
        setShowCustomerDrawer(false);
      }
    }
  };

  const submit = async (status, shouldPost = false) => {
    if (!form.warehouseId) {
      focusField('import-warehouseId');
      return showToast('error', 'Vui lòng chọn kho nhập.');
    }
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
    if (!form.docDate) {
      focusField('import-docDate');
      return showToast('error', 'Vui lòng chọn ngày nhập kho.');
    }

    if (!items.length) {
      return showToast('error', 'Vui lòng thêm ít nhất 1 dòng hàng hóa.');
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
      const product = productById.get(String(item.variantId));
      if (product?.trackSerial) {
        const serialCount = item.serialNumbers ? item.serialNumbers.length : 0;
        if (serialCount !== qty) {
          setSerialModalItemId(item.localId);
          return showToast('error', `Dòng ${i + 1}: Vui lòng quét đủ ${qty} mã serial (hiện có ${serialCount}).`);
        }
      }
      const vat = item.vatPercent !== undefined && item.vatPercent !== '' ? Number(item.vatPercent) : 0;
      if (isNaN(vat) || vat < 0 || vat > 10) {
        focusField(`import-line-vat-${i}`);
        return showToast('error', `Dòng ${i + 1}: Thuế VAT phải nằm trong khoảng từ 0% đến 10%.`);
      }
      if (item.maxQuantity !== undefined && item.maxQuantity !== null && Number(item.quantity) > Number(item.maxQuantity)) {
        focusField(`import-line-qty-${i}`);
        const sku = product?.sku || '';
        return showToast('error', `Dòng ${i + 1}: Số lượng nhập (${item.quantity}) vượt quá số lượng còn lại trong đơn mua hàng (tối đa ${item.maxQuantity}) ${sku ? `cho SKU ${sku}` : ''}`);
      }
    }
    setSaving(true);
    let createdId = null;
    try {
      const response = await importApi.createImportSlip(buildPayload(status));
      const created = unwrap(response);
      createdId = created?.id;
      if (shouldPost && createdId) {
        await importApi.postImportSlip(createdId);
      }
      
      // Trigger AI Learning for OCR
      if (form.partnerId) {
        items.forEach(item => {
          if (item._ocrRawName && item.variantId) {
            importApi.confirmOcrMapping(form.partnerId, item._ocrRawName, item.variantId)
              .catch(e => console.warn('Lỗi lưu OCR mapping:', e));
          }
        });
      }
      const fullSlipData = {
        ...created,
        docCode: created?.docCode || form.docCode,
        docDate: form.docDate,
        status: shouldPost ? 'POSTED' : status,
        lines: items.map(item => ({
          ...item,
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
      if (createdId) {
        navigate('/import-history', { state: { toastMessage: 'Đã tạo phiếu nhưng Ghi sổ thất bại: ' + (err.response?.data?.userMessage || err.message), toastType: 'warning' } });
      } else {
        showToast('error', err.response?.data?.userMessage || err.response?.data?.devMessage || 'Không lưu được phiếu nhập kho');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); returnUrl ? navigate(returnUrl) : navigate('/import-history'); }}>
            <i className="bi bi-arrow-left"></i> Quay lại
          </a>
          <span style={{ fontWeight: 600, fontSize: '18px' }}>Tạo phiếu nhập kho {form.docCode ? form.docCode : ''}</span>
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
        {aiEnabled && (
          <button
            type="button"
            onClick={() => setShowOcrModal(true)}
            style={{
              padding: '7px 16px', borderRadius: '8px', border: 'none',
              background: 'var(--brand-gradient, linear-gradient(135deg, var(--color-primary, #059669) 0%, var(--color-primary-accent, #10b981) 100%))',
              color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
            }}
          >
            🤖 Quét AI (OCR)
          </button>
        )}
      </div>

      <div className={styles.pageBody}>
        <div className={styles.topGrid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-info-circle text-gray-500"></i>
              <h3 className={styles.cardTitle}>Thông tin chung</h3>
            </div>

            {importType === 'PURCHASE' && (
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
                        placeholder="Chọn Mã nhà cung cấp..."
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
                  <input
                    type="text"
                    className="misa-input"
                    value={form.partnerName !== undefined ? form.partnerName : (suppliers.find(s => String(s.id) === String(form.partnerId))?.name || '')}
                    onChange={(e) => handleFormChange('partnerName', e.target.value)}
                    placeholder="Nhập tên nhà cung cấp..."
                    readOnly={!!form.partnerId}
                    style={{ backgroundColor: form.partnerId ? '#f9fafb' : '#fff' }}
                  />
                </div>
              </div>
            )}

            {(importType === 'PRODUCTION' || importType === 'SCRAP') && (
              <div className="misa-form-row">
                <div className="misa-form-group" style={{ flex: '0 0 100%' }}>
                  <label className="misa-label">Lệnh sản xuất <span className="required">*</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="import-assemblyOrderId"
                      type="text"
                      className="misa-input"
                      readOnly
                      value={assemblyOrders.find(o => String(o.id) === String(form.assemblyOrderId))?.orderCode || form.referenceCode || ''}
                      placeholder="Nhấn biểu tượng bên cạnh để chọn lệnh..."
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
                  onChange={(selected) => handleFormChange('warehouseId', selected ? selected.value : '')}
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
                  value={currentUser ? (currentUser.fullName || currentUser.username) : 'Đang tải...'}
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
                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                </div>
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
                <input type="text" className="misa-input" style={{ marginTop: '8px' }} value={form.attachedDoc} onChange={(e) => handleFormChange('attachedDoc', e.target.value)} placeholder="Số chứng từ đính kèm..." />
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-file-earmark-text text-gray-500"></i>
              <h3 className={styles.cardTitle}>Thông tin chứng từ</h3>
            </div>

            <div className="misa-form-group" style={{ marginBottom: '16px' }}>
              <label className="misa-label">Số phiếu</label>
              <input className="misa-input" placeholder="Để trống để hệ thống tự sinh" value={form.docCode} onChange={(e) => handleFormChange('docCode', e.target.value)} />
            </div>

            <div className="misa-form-group" style={{ marginBottom: '16px' }}>
              <label className="misa-label">Ngày nhập kho <span className="required">*</span></label>
              <input id="import-docDate" type="date" className="misa-input" value={form.docDate} onChange={(e) => handleFormChange('docDate', e.target.value)} />
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <i className="bi bi-box-seam text-gray-500"></i>
            <h3 className={styles.cardTitle}>Bảng hàng hóa</h3>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
                  <th style={{ minWidth: '130px', width: '13%' }}>Mã hàng</th>
                  <th style={{ minWidth: '200px', width: '29%' }}>Tên hàng</th>
                  <th style={{ minWidth: '70px', width: '7%', whiteSpace: 'nowrap' }}>ĐVT</th>
                  <th style={{ minWidth: '70px', width: '7%', textAlign: 'right', whiteSpace: 'nowrap' }}>SL</th>
                  <th style={{ minWidth: '80px', width: '9%', textAlign: 'center', whiteSpace: 'nowrap' }}>Serial</th>
                  <th style={{ minWidth: '70px', width: '7%', textAlign: 'center', whiteSpace: 'nowrap' }}>BH (T)</th>
                  <th style={{ minWidth: '110px', width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>Đơn giá</th>
                  <th style={{ minWidth: '110px', width: '10%', textAlign: 'right', whiteSpace: 'nowrap' }}>Thành tiền</th>
                  <th style={{ minWidth: '90px', width: '8%', textAlign: 'right', whiteSpace: 'nowrap' }}>% thuế GTGT</th>
                  <th style={{ width: '40px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  const product = productById.get(String(item.variantId));
                  return (
                    <tr key={item.localId}>
                      <td>{index + 1}</td>
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
                        <input id={`import-line-qty-${index}`} type="number" min="0" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '60px', textAlign: 'right', fontSize: '13px' }} value={item.quantity} onChange={(e) => handleItemChange(item.localId, 'quantity', e.target.value)} />
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
                        <input id={`import-line-warranty-${index}`} type="number" min="0" className="misa-input text-center" style={{ height: '32px', padding: '0 8px', width: '60px', textAlign: 'center', fontSize: '13px' }} value={item.warrantyMonths !== undefined ? item.warrantyMonths : ''} onChange={(e) => handleItemChange(item.localId, 'warrantyMonths', e.target.value)} />
                      </td>
                      <td align="right">
                        <input id={`import-line-price-${index}`} type="text" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '100%', maxWidth: '130px', textAlign: 'right', fontSize: '13px' }} value={item.price ? new Intl.NumberFormat('vi-VN').format(item.price) : ''} onChange={(e) => handleItemChange(item.localId, 'price', e.target.value.replace(/\D/g, ''))} />
                      </td>
                      <td align="right" className={`${styles.textBold} ${styles.textBlue}`}>
                        {money(Number(item.quantity || 0) * Number(item.price || 0))} đ
                      </td>
                      <td align="right">
                        <input type="number" min="0" max="10" step="any" className="misa-input" style={{ height: '32px', padding: '0 8px', width: '60px', textAlign: 'right', fontSize: '13px' }} value={item.vatPercent !== undefined ? item.vatPercent : ''} onChange={(e) => handleItemChange(item.localId, 'vatPercent', e.target.value)} />
                      </td>
                      <td>
                        <button className={styles.iconBtnDanger} onClick={() => removeItem(item.localId)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
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
                <button type="button" onClick={() => setItems([emptyLine()])} style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Xóa hết dòng</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '350px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                <SearchableSelect style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', fontSize: '13px' }}>
                  <option>5 bản ghi trên 1 trang</option>
                  <option>10 bản ghi trên 1 trang</option>
                  <option>20 bản ghi trên 1 trang</option>
                  <option>50 bản ghi trên 1 trang</option>
                </SearchableSelect>
                <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
      </div>

      <div className={styles.fixedFooter}>
        <div className={styles.footerLeft}>
          <button className="btn-misa-cancel" onClick={() => navigate('/import-history')}>
            <i className="bi bi-x-circle"></i> Hủy bỏ
          </button>
        </div>
        <div className={styles.footerRight}>
          <button className="btn-misa-draft" disabled={saving} onClick={() => submit('DRAFT')}>
            <i className="bi bi-save"></i> Lưu tạm
          </button>
          <button className="btn-misa-post" disabled={!isFormValid || saving} onClick={() => setShowConfirm(true)}>
            <i className="bi bi-check-circle-fill"></i> Lưu và ghi sổ
          </button>
        </div>
      </div>

      <ManageSerialModal
        isOpen={Boolean(serialModalItemId)}
        onClose={handleSerialModalClose}
        productName={variantLabel(selectedSerialProduct)}
        targetQuantity={Number(selectedSerialItem?.quantity || 0)}
        initialSerials={selectedSerialItem?.serialNumbers || []}
      />
      <QuickAddProductModal
        isOpen={showQuickAddProduct}
        onClose={() => { 
          setShowQuickAddProduct(false); 
          setQuickAddLineId(null); 
          setOcrQuickAddPreviewIndex(null); 
          setOcrQuickAddProductName('');
          setOcrQuickAddUnitName('');
          setOcrQuickAddCategoryName('');
          setOcrQuickAddWarrantyMonths('');
        }}
        onSuccess={handleQuickAddProductSuccess}
        productType={importType === 'PRODUCTION' ? 'Thành phẩm' : 'Hàng hóa'}
        allowedProductTypes={['Hàng hóa', 'Thành phẩm']}
        initialProductName={ocrQuickAddProductName}
        initialUnitName={ocrQuickAddUnitName}
        initialCategoryName={ocrQuickAddCategoryName}
        initialWarrantyMonths={ocrQuickAddWarrantyMonths}
      />
      {showPartnerModal && (
        <SupplierModal
          isOpen={showPartnerModal}
          onClose={() => setShowPartnerModal(false)}
          onSave={handleSavePartner}
          onError={(msg) => showToast('error', msg)}
        />
      )}
      <CustomerModal
        isOpen={showCustomerDrawer}
        editData={null}
        onClose={() => setShowCustomerDrawer(false)}
        onSaved={handleSaveCustomer}
      />
      <AssemblyOrderSelectionModal
        isOpen={showAssemblyOrderModal}
        onClose={() => setShowAssemblyOrderModal(false)}
        onSelect={async (assemblyOrderSummary) => {
          try {
            const res = await assemblyOrderApi.getAssemblyOrderById(assemblyOrderSummary.id);
            const order = res?.data?.data || res?.data || assemblyOrderSummary;
            setForm(prev => ({
              ...prev,
              assemblyOrderId: order.id,
              referenceType: 'ASSEMBLY_ORDER',
              referenceId: order.id,
              referenceCode: order.orderCode,
              note: `Nhập kho từ lệnh ${order.orderCode}`
            }));

            const isAssembly = order.orderType !== 'DISASSEMBLY';

            if (importType === 'PRODUCTION' && isAssembly) {
              if (order.targetVariantId || order.targetSku) {
                setItems([{
                  ...emptyLine(),
                  variantId: String(order.targetVariantId || ''),
                  quantity: order.quantity || 1,
                  price: order.targetPrice || 0,
                  isNew: false
                }]);
                showToast('success', `Đã tải thành phẩm từ lệnh ${order.orderCode}`);
              }
            } else if (importType === 'SCRAP' && !isAssembly) {
              if (order.lines && order.lines.length > 0) {
                setItems(order.lines.map(line => ({
                  ...emptyLine(),
                  variantId: String(line.componentVariantId || line.variantId || line.id),
                  quantity: line.quantity || 1,
                  price: line.price || 0,
                  isNew: false
                })));
                showToast('success', `Đã tải ${order.lines.length} linh kiện tháo dỡ từ lệnh ${order.orderCode}`);
              }
            }
          } catch (err) {
            console.error(err);
            showToast('error', 'Lỗi khi tải chi tiết lệnh');
          }
          setShowAssemblyOrderModal(false);
        }}
        assemblyOrders={assemblyOrders}
      />
      <ReferenceDocumentModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={async (data) => {
          setForm(prev => ({
            ...prev,
            referenceType: data.referenceType,
            referenceId: data.referenceId,
            referenceCode: data.docCode
          }));
          if (data.referenceType === 'STOCKTAKE' && data.referenceId) {
            try {
              const res = await stocktakeApi.getStocktakeDetail(data.referenceId);
              const stData = res?.data?.data || res?.data;
              if (stData) {
                if (stData.warehouseId) {
                  setForm(prev => ({ ...prev, warehouseId: String(stData.warehouseId) }));
                }
                const diffSurplusLines = filterWarehouseLines(stData.lines || []).filter(l => Number(l.diffQty || 0) > 0);
                if (diffSurplusLines.length > 0) {
                  setItems(diffSurplusLines.map(l => {
                    const rawSerials = l.serials || [];
                    const surplusSerials = rawSerials
                      .filter(s => s.scanStatus === 'UNEXPECTED' || !s.scanStatus)
                      .map(s => (typeof s === 'string' ? s : s.serialNumber))
                      .filter(Boolean);
                    const serialList = surplusSerials.length > 0 ? surplusSerials : rawSerials.map(s => (typeof s === 'string' ? s : s.serialNumber)).filter(Boolean);
                    return {
                      ...emptyLine(),
                      variantId: String(l.variantId),
                      quantity: Number(l.diffQty) || 1,
                      price: 0,
                      serialNumbers: serialList,
                      note: `Hàng thừa từ kiểm kê ${stData.stocktakeCode}`,
                      isNew: false
                    };
                  }));
                }
              }
            } catch (err) {
              console.error('Failed to load stocktake reference detail', err);
            }
          }
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
        title={savedSlip?.status === 'POSTED' || savedSlip?.statusCode === 'POSTED' ? 'Lưu & ghi sổ phiếu nhập kho thành công!' : 'Lưu tạm phiếu nhập kho thành công!'}
        message="Phiếu nhập kho đã được ghi nhận vào hệ thống thành công. Bạn có thể in phiếu ngay bây giờ."
        docCode={savedSlip?.docCode || form.docCode}
        printBtnText="In phiếu nhập kho"
        onPrint={() => {
          const supplier = suppliers.find(s => String(s.id) === String(savedSlip?.partnerId || form.partnerId)) || {};
          const customer = customers.find(c => String(c.id) === String(savedSlip?.partnerId || form.partnerId)) || {};
          const warehouse = warehouses.find(w => String(w.id) === String(savedSlip?.warehouseId || form.warehouseId)) || {};
          const productById = new Map(products.map(p => [p.id, p]));
          const userById = new Map(users.map(u => [u.id, u]));
          const supplierById = new Map(suppliers.map(s => [s.id, s]));
          const warehouseById = new Map(warehouses.map(w => [w.id, w]));
          const customerById = new Map(customers.map(c => [c.id, c]));
          const assemblyOrderById = new Map(assemblyOrders.map(a => [a.id, a]));

          printImportSlip(savedSlip || form || {}, {
            supplier,
            customer,
            warehouseName: warehouse.name || '',
            supplierById,
            customerById,
            warehouseById,
            assemblyOrderById,
            productById,
            userById,
            isImport: true
          });
        }}
        onViewList={() => navigate(returnUrl || '/import-history')}
        onCreateNew={() => window.location.reload()}
        onClose={() => navigate(returnUrl || '/import-history')}
      />

      <OcrUploadModal
        open={showOcrModal}
        onClose={() => setShowOcrModal(false)}
        onFileSelected={handleOcrFile}
        onOcrSuccess={handleOcrSuccess}
        loading={ocrLoading}
      />
      <OcrResultPreviewModal
        open={!!ocrPreviewData}
        data={ocrPreviewData}
        onConfirm={confirmOcrPreview}
        onCancel={() => setOcrPreviewData(null)}
        onQuickAdd={handleOcrPreviewQuickAdd}
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

export default CreateImportSlipPage;
