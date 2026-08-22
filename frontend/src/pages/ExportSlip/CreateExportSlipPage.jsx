import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import AdminLayout from '../../components/layout/AdminLayout';
import * as exportApi from '../../api/inventoryExportApi';
import CustomerModal from '../Customer/components/CustomerModal';
import ReferenceDocumentModal from '../../components/ReferenceDocumentModal';
import * as stocktakeApi from '../../api/stocktakeApi';
import * as salesOrderApi from '../../api/salesOrderApi';
import AssemblyOrderSelectionModal from '../CreateImportSlip/components/AssemblyOrderSelectionModal';
import * as assemblyOrderApi from '../../api/assemblyOrderApi';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import SuccessPrintModal from '../../components/ui/SuccessPrintModal/SuccessPrintModal';
import { printExportSlip } from '../../utils/printExportSlip';
import ProductGridSelect from '../../components/ui/ProductGridSelect/ProductGridSelect';
import QuickAddProductModal from '../../components/ui/QuickAddProductModal/QuickAddProductModal';
import Select from 'react-select';
import axiosClient from '../../api/axiosClient';
import ManageSerialModal from '../CreateImportSlip/ManageSerialModal';
import styles from './CreateExportSlipPage.module.css';
import { getTodayIsoDate } from '../../utils/dateFormat';
import { focusField } from '../../utils/focusField';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';
import { findBestMatch } from '../../utils/fuzzyMatch';


const unwrap = (response) => response?.data?.data ?? response?.data;
const pageContent = (payload) => payload?.content ?? payload ?? [];
const today = getTodayIsoDate;
const money = (value) => Number(value || 0).toLocaleString('vi-VN');

const normalizeProductType = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const isServiceProduct = (item) => normalizeProductType(item?.productType) === 'dich vu';
const isWarehouseProduct = (item) => {
  if (!item) return false;
  const type = normalizeProductType(item?.productType);
  return type !== 'dich vu' && type !== 'service';
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

const emptyLine = (defaultWarehouseId = '') => ({
  localId: crypto.randomUUID(),
  variantId: '',
  warehouseId: defaultWarehouseId,
  serialNumbers: [],
  scannedCode: '',
  quantity: 1,
  price: 0,
  vatPercent: 0,
  note: '',
});

function CreateExportSlipPage({ mode: propMode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const assemblyData = location.state?.assemblyData || null;
  const stocktakeData = location.state?.stocktakeData || null;
  const soData = location.state?.soData || null;
  const returnUrl = location.state?.returnUrl || null;
  const voiceData = location.state?.voiceData || null;
  const initialType = propMode || searchParams.get('type')?.toUpperCase() || (stocktakeData ? 'OTHER' : 'SALE');

  const [exportMode, setExportMode] = useState(initialType);
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
  const [toast, setToast] = useState({ isVisible: false, type: 'error', message: '' });
  const [showConfirm, setShowConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [serialModalItemId, setSerialModalItemId] = useState(null);

  const [showAssemblyModal, setShowAssemblyModal] = useState(false);
  const [selectedAssemblyOrder, setSelectedAssemblyOrder] = useState(null);
  const [savedSlip, setSavedSlip] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [form, setForm] = useState(() => ({
    docCode: '',
    warehouseId: soData?.warehouseId || assemblyData?.warehouseId || stocktakeData?.warehouseId || '',
    partnerId: soData?.partnerId || '',
    salespersonId: soData?.salespersonId || '',
    customerAddress: soData?.partnerAddress || '',
    receiverName: soData?.partnerName || '',
    receiverPhone: soData?.partnerPhone || '',
    receiverAddress: soData?.partnerAddress || '',
    docDate: today(),
    note: soData?.note || (assemblyData ? `Xuất linh kiện phục vụ Lệnh lắp ráp/tháo dỡ ${assemblyData.code}` : stocktakeData ? stocktakeData.reason : ''),
    referenceType: soData ? 'SALES_ORDER' : (assemblyData ? 'ASSEMBLY_ORDER' : stocktakeData ? 'STOCKTAKE' : ''),
    referenceId: soData?.soId || (assemblyData ? assemblyData.id : stocktakeData ? stocktakeData.id : ''),
    referenceCode: soData?.soCode || (assemblyData ? assemblyData.code : stocktakeData ? stocktakeData.code : ''),
    attachedDocs: '',
  }));

  const [items, setItems] = useState(() => {
    if (soData && soData.lines && soData.lines.length > 0) {
      const soLines = filterWarehouseLines(soData.lines);
      return soLines.length > 0 ? soLines.map(l => ({
        ...emptyLine(String(soData.warehouseId || '')),
        variantId: String(l.variantId),
        warehouseId: String(l.warehouseId || soData.warehouseId || ''),
        quantity: l.quantity || 1,
        reservedQuantity: Number(l.quantity || 0),
        maxQuantity: Number(l.quantity || 0),
        price: l.price || 0,
        vatPercent: l.vatPercent || 0,
        warrantyMonths: l.warrantyMonths || 0,
        note: l.note || '',
      })) : [{ ...emptyLine(), isNew: false }];
    }
    if (assemblyData && assemblyData.lines && assemblyData.lines.length > 0) {
      const assemblyLines = filterWarehouseLines(assemblyData.lines);
      return assemblyLines.length > 0 ? assemblyLines.map(comp => ({
        ...emptyLine(String(assemblyData.warehouseId || '')),
        variantId: String(comp.variantId || comp.id),
        warehouseId: String(comp.warehouseId || assemblyData.warehouseId || ''),
        quantity: comp.quantity || 1,
        price: comp.price || 0,
        note: `Cấu hình cho Lệnh ${assemblyData.code}`,
      })) : [{ ...emptyLine(), isNew: false }];
    }
    if (stocktakeData && stocktakeData.lines && stocktakeData.lines.length > 0) {
      const stocktakeLines = filterWarehouseLines(stocktakeData.lines);
      return stocktakeLines.length > 0 ? stocktakeLines.map(line => ({
        ...emptyLine(String(stocktakeData.warehouseId || '')),
        variantId: String(line.variantId),
        warehouseId: String(line.warehouseId || stocktakeData.warehouseId || ''),
        quantity: line.quantity || 1,
        price: line.price || 0,
        note: line.note || `Hàng thiếu từ kiểm kê ${stocktakeData.code}`,
      })) : [{ ...emptyLine(), isNew: false }];
    }
    return [{ ...emptyLine(), isNew: false }];
  });
  const [inventoryBalances, setInventoryBalances] = useState([]);
  const [showReferenceModal, setShowReferenceModal] = useState(false);

  const showToast = (type, message) => setToast({ isVisible: true, type, message });
  const hideToast = () => setToast(prev => ({ ...prev, isVisible: false }));

  const handleSwitchMode = (newMode) => {
    setExportMode(newMode);
  };

  const loadAllInventoryBalances = () => {
    exportApi.getInventoryBalance({ size: 10000 })
      .then(res => setInventoryBalances(pageContent(unwrap(res))))
      .catch(err => console.error('Lỗi khi tải số dư tồn kho', err));
  };

  useEffect(() => {
    loadAllInventoryBalances();
  }, []);

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
        const selectedProduct = products.find(p => String(p.id) === String(value));
        return prev.map(item => item.localId === localId ? {
          ...item,
          variantId: String(value),
          serialNumbers: [],
          price: selectedProduct ? Number(selectedProduct.salePrice || 0) : 0,
          warrantyMonths: selectedProduct ? Number(selectedProduct.warrantyMonths || 0) : 0
        } : item);
      }
      return prev.map(item => item.localId === localId ? { ...item, [field]: value } : item);
    });
  };

  useEffect(() => {
    const loadLookups = async () => {
      exportApi.getNextCode()
        .then(res => {
          const code = unwrap(res);
          if (code) setForm(prev => ({ ...prev, docCode: prev.docCode || code }));
        })
        .catch(err => console.error('Failed to load next export docCode', err));

      const [warehouseRes, productRes, customerRes, userRes] = await Promise.allSettled([
        exportApi.getWarehouses({ size: 100 }),
        exportApi.getProducts({ size: 1000 }),
        exportApi.getCustomers({ status: 'APPROVED', size: 1000 }),
        exportApi.getUsers({ size: 1000 }).catch(() => null),
      ]);

      if (warehouseRes.status === 'fulfilled') {
        const data = pageContent(unwrap(warehouseRes.value));
        setWarehouses(data);
        setForm(prev => ({ ...prev, warehouseId: prev.warehouseId || data[0]?.id || '' }));
      }
      if (productRes.status === 'fulfilled') {
        const data = filterWarehouseProducts(pageContent(unwrap(productRes.value)));
        setProducts(data);
      }
      if (customerRes.status === 'fulfilled') {
        const data = pageContent(unwrap(customerRes.value)).filter(c => c.status === 'APPROVED');
        setCustomers(data);
      }
      if (userRes.status === 'fulfilled' && userRes.value) {
        setUsers(pageContent(unwrap(userRes.value)));
      }
      try {
        const meRes = await axiosClient.get('/users/me');
        const me = meRes.data?.data || meRes.data;
        if (me) {
          setCurrentUser(me);
          // Chỉ điền NV xuất hàng bằng user hiện tại nếu chưa có từ SO
          setForm(prev => ({ ...prev, salespersonId: prev.salespersonId || String(me.id) }));
        }
      } catch (err) {
        console.error('Failed to load me profile', err);
      }
    };

    loadLookups();
  }, []);

  // ── Voice Data auto-fill ──────────────────────────────────
  useEffect(() => {
    if (!voiceData) return;

    if (voiceData.exportMode) {
      setExportMode(voiceData.exportMode.toUpperCase());
    }

    // Auto-select warehouse
    if (voiceData.warehouseKeyword && warehouses.length > 0) {
      const matchWh = findBestMatch(warehouses, voiceData.warehouseKeyword, w => [w.name, w.code]);
      if (matchWh) {
        setForm(prev => ({ ...prev, warehouseId: String(matchWh.id) }));
      }
    }

    // Auto-select customer
    if (voiceData.customerKeyword && customers.length > 0) {
      const matchCust = findBestMatch(customers, voiceData.customerKeyword, c => [c.name, c.code, c.phone]);
      if (matchCust) {
        setForm(prev => ({
          ...prev,
          partnerId: String(matchCust.id),
          receiverName: matchCust.name || prev.receiverName,
          receiverPhone: matchCust.phone || prev.receiverPhone,
          customerAddress: matchCust.address || prev.customerAddress,
          receiverAddress: matchCust.address || prev.receiverAddress,
        }));
      }
    }

    // Auto-fill note
    if (voiceData.note) {
      setForm(prev => ({ ...prev, note: prev.note ? `${prev.note} - ${voiceData.note}` : voiceData.note }));
    }

    // Auto-add product line
    if (voiceData.productKeyword && products.length > 0) {
      const matchProd = findBestMatch(products, voiceData.productKeyword, p => [p.productName, p.variantName, p.sku]);
      if (matchProd) {
        const qty = Number(voiceData.quantity) || 1;
        const price = voiceData.unitPrice != null ? Number(voiceData.unitPrice) : (Number(matchProd.retailPrice || matchProd.price || 0));
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
  }, [voiceData, warehouses, customers, products]);

  const productById = useMemo(() => new Map(products.map(product => [String(product.id), product])), [products]);
  const userById = useMemo(() => new Map(users.map(user => [String(user.id), user])), [users]);
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

  const getStockForLine = (variantId, warehouseId, item) => {
    if (!variantId) return 0;
    const effectiveWh = warehouseId || form.warehouseId;
    let baseStock = 0;
    if (effectiveWh) {
      baseStock = inventoryMap.get(`${variantId}_${effectiveWh}`) || 0;
    } else {
      baseStock = inventoryMap.get(String(variantId)) || 0;
    }

    // Nếu phiếu xuất này được tạo cho một Đơn bán hàng (SO), cộng bù số lượng cố định đã giữ chỗ (reservedQuantity)
    const isSoExport = Boolean(soData || form.salesOrderId || form.referenceType === 'SALES_ORDER' || form.referenceType === 'SO');
    if (isSoExport && item && item.reservedQuantity !== undefined && item.reservedQuantity !== null) {
      return baseStock + Number(item.reservedQuantity);
    }
    return baseStock;
  };

  const warehouseScopedProducts = useMemo(() => {
    return products;
  }, [products]);

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
    (exportMode === 'SALE' ? (form.partnerId && form.referenceId)
      : exportMode === 'ASSEMBLY' ? form.referenceId
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
        }
      }
      return newForm;
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

  const handleSelectAssemblyOrder = async (orderSummary) => {
    try {
      const res = await assemblyOrderApi.getAssemblyOrderById(orderSummary.id);
      const order = res?.data?.data || res?.data || orderSummary;

      setSelectedAssemblyOrder(order);
      setForm(prev => ({
        ...prev,
        referenceType: 'ASSEMBLY_ORDER',
        referenceId: order.id,
        referenceCode: order.orderCode,
        note: `Xuất kho cho Lệnh ${order.orderCode}`,
      }));

      const isAssembly = order.orderType !== 'DISASSEMBLY';

      if (isAssembly) {
        if (order.lines && order.lines.length > 0) {
          const loadedItems = order.lines.map(comp => ({
            ...emptyLine(String(order.warehouseId || form.warehouseId || '')),
            variantId: String(comp.componentVariantId || comp.variantId || comp.id),
            warehouseId: String(comp.warehouseId || order.warehouseId || form.warehouseId || ''),
            quantity: comp.quantityNeeded || comp.quantityRequired || comp.quantity || 1,
            price: comp.price || 0,
            note: `Cấu hình cho Lắp ráp`,
          }));
          setItems(loadedItems);
          showToast('success', `Đã tải ${loadedItems.length} linh kiện từ Lệnh lắp ráp ${order.orderCode}`);
        } else {
          showToast('warning', `Lệnh lắp ráp ${order.orderCode} không có linh kiện nào.`);
        }
      } else {
        if (order.targetVariantId || order.targetSku) {
          setItems([{
            ...emptyLine(String(order.warehouseId || form.warehouseId || '')),
            variantId: String(order.targetVariantId || ''),
            warehouseId: String(order.warehouseId || form.warehouseId || ''),
            quantity: order.quantity || 1,
            price: order.targetPrice || 0,
            note: `Thành phẩm cần tháo dỡ`
          }]);
          showToast('success', `Đã tải thành phẩm từ Lệnh tháo dỡ ${order.orderCode}`);
        }
      }
    } catch(err) {
      console.error(err);
      showToast('error', 'Lỗi khi tải chi tiết lệnh lắp ráp');
    }
  };

  const handleSavePartner = async () => {
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
      setShowPartnerModal(false);
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, emptyLine(form.warehouseId || (warehouses[0]?.id ? String(warehouses[0]?.id) : ''))]);
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
      const scanResult = unwrap(response);
      if (isServiceProduct(scanResult)) {
        setError('Dịch vụ không áp dụng cho phiếu xuất kho.');
        return;
      }
      setProducts(prev => {
        if (prev.some(p => String(p.id) === String(scanResult.variantId))) return prev;
        return [...prev, {
          id: scanResult.variantId,
          productCode: scanResult.productCode,
          productName: scanResult.productName,
          sku: scanResult.sku || scanResult.code,
          unitName: scanResult.unitName || '',
          salePrice: scanResult.salePrice || 0,
          trackSerial: scanResult.trackSerial,
          productType: scanResult.productType || 'Hàng hóa',
        }];
      });

      setItems(prev => {
        const existingIndex = prev.findIndex(item => String(item.variantId) === String(scanResult.variantId) && String(item.warehouseId || form.warehouseId) === String(form.warehouseId));
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

        const basePrev = prev.filter(item => Boolean(item.variantId));

        return [
          ...basePrev,
          {
            ...emptyLine(form.warehouseId),
            variantId: scanResult.variantId,
            warehouseId: String(form.warehouseId),
            scannedCode: scanResult.code,
            quantity: 1,
            price: scanResult.salePrice || 0,
            warrantyMonths: scanResult.warrantyMonths || 0,
            serialNumbers: serial ? [serial] : []
          }
        ];
      });
      setScanCode('');
    } catch (err) {
      setError(err.response?.data?.userMessage || 'Không tìm thấy mã vừa quét.');
    } finally {
      setScanLoading(false);
    }
  };

  const removeItem = (localId) => {
    setItems(prev => prev.length > 1 ? prev.filter(item => item.localId !== localId) : [{ ...emptyLine(form.warehouseId), isNew: false }]);
  };

  const buildPayload = (status) => {
    return {
      docCode: form.docCode || undefined,
      issuePurpose: exportMode === 'SALE' ? 'SALES' : exportMode === 'USAGE' ? 'USAGE' : exportMode === 'ASSEMBLY' ? 'ASSEMBLY' : (form.referenceType === 'STOCKTAKE' ? 'INVENTORY_ADJUSTMENT' : 'USAGE'),
      warehouseId: Number(form.warehouseId),
      partnerId: form.partnerId ? Number(form.partnerId) : null,
      salespersonId: (!isNaN(Number(form.salespersonId)) && String(form.salespersonId).trim() !== '') ? Number(form.salespersonId) : null,
      customerAddress: form.customerAddress,
      recipientName: form.receiverName || 'Người nhận',
      receiverPhone: form.receiverPhone || '',
      recipientAddress: form.receiverAddress || form.customerAddress || '',
      docDate: form.docDate,
      status,
      note: form.note,
      createdBy: Number(sessionStorage.getItem('userId') || sessionStorage.getItem('id') || 1),
      lines: items.map(item => ({
        variantId: Number(item.variantId),
        warehouseId: Number(form.warehouseId),
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
      referenceType: form.referenceType || undefined,
      referenceId: form.referenceId || undefined,
      salesOrderId: form.salesOrderId ? Number(form.salesOrderId) : (form.referenceType === 'SALES_ORDER' || form.referenceType === 'SO' ? Number(form.referenceId) : (soData?.soId ? Number(soData.soId) : undefined)),
    };
  };

  const submit = async (status, shouldPost = false) => {
    if (!form.warehouseId) {
      focusField('export-warehouseId');
      return showToast('error', 'Vui lòng chọn kho xuất.');
    }
    if (exportMode === 'SALE' && !form.partnerId) {
      focusField('export-partnerId');
      return showToast('error', 'Vui lòng chọn khách hàng.');
    }
    if (exportMode === 'USAGE' && !form.receiverName) {
      focusField('export-receiverName');
      return showToast('error', 'Vui lòng nhập người nhận / đối tượng.');
    }
    if (exportMode === 'SALE' && !form.referenceId) {
      return showToast('error', 'Vui lòng chọn chứng từ tham chiếu.');
    }
    if (!form.docDate) {
      focusField('export-docDate');
      return showToast('error', 'Vui lòng chọn ngày lập phiếu.');
    }

    if (!items.length) {
      return showToast('error', 'Vui lòng thêm ít nhất 1 dòng hàng hóa.');
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
        focusField(`export-line-vat-${i}`);
        return showToast('error', `Dòng ${i + 1}: Thuế VAT không hợp lệ.`);
      }
      if (item.maxQuantity !== undefined && item.maxQuantity !== null && Number(item.quantity) > Number(item.maxQuantity)) {
        focusField(`export-line-qty-${i}`);
        const sku = product?.sku || '';
        return showToast('error', `Dòng ${i + 1}: Số lượng xuất (${item.quantity}) vượt quá số lượng còn lại trong đơn bán hàng (tối đa ${item.maxQuantity}) ${sku ? `cho SKU ${sku}` : ''}`);
      }
      if (product) {
        const lineWh = item.warehouseId || form.warehouseId;
        const balance = getStockForLine(product.id, lineWh, item);
        if (Number(item.quantity) > balance) {
          focusField(`export-line-qty-${i}`);
          return showToast('error', `Dòng ${i + 1}: Số lượng xuất (${item.quantity}) vượt quá tồn khả dụng (${balance}) tại kho đã chọn.`);
        }
      }
    }
    setSaving(true);
    try {
      const response = await exportApi.createExportSlip(buildPayload(status));
      const created = unwrap(response);
      const createdId = created?.id;
      if (shouldPost && createdId) {
        await exportApi.postExportSlip(createdId);
      }

      const fullSlipData = {
        ...created,
        docCode: created?.docCode || form.docCode,
        docDate: form.docDate,
        status: shouldPost ? 'POSTED' : status,
        warehouseId: form.warehouseId,
        lines: items.map(item => ({
          ...item,
          warehouseId: Number(item.warehouseId || form.warehouseId),
          warehouseName: warehouses.find(w => String(w.id) === String(item.warehouseId || form.warehouseId))?.name,
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
      showToast('error', err.response?.data?.userMessage || err.message || 'Không lưu được phiếu xuất kho');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (printMode = 'SUMMARY') => {
    if (!savedSlip) return;
    printExportSlip(savedSlip, {
      customer: customers.find(c => String(c.id) === String(savedSlip.partnerId || form.partnerId)),
      warehouseById: new Map(warehouses.map(w => [w.id, w])),
      productById,
      userById,
      printMode,
    });
  };

  return (
    <AdminLayout>
      <div className={styles.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <a href="#" className={styles.backLink} onClick={(e) => { e.preventDefault(); returnUrl ? navigate(returnUrl) : navigate('/export-slips'); }}>
            <i className="bi bi-arrow-left"></i> Quay lại
          </a>
          <span style={{ fontWeight: 600, fontSize: '18px' }}>Tạo phiếu xuất kho {form.docCode ? form.docCode : ''}</span>
          <span style={{ color: '#d1d5db', fontSize: '20px' }}>|</span>
          <div style={{ width: '280px' }}>
            <Select
              value={[
                { value: 'SALE', label: 'Xuất kho bán hàng' },
                { value: 'USAGE', label: 'Xuất kho cho sử dụng' },
                { value: 'ASSEMBLY', label: 'Xuất kho lắp ráp' },
                { value: 'OTHER', label: 'Khác' }
              ].find(o => o.value === exportMode)}
              options={[
                { value: 'SALE', label: 'Xuất kho bán hàng' },
                { value: 'USAGE', label: 'Xuất kho cho sử dụng' },
                { value: 'ASSEMBLY', label: 'Xuất kho lắp ráp' },
                { value: 'OTHER', label: 'Khác' }
              ]}
              onChange={(option) => handleSwitchMode(option.value)}
              styles={{
                ...customSelectStyles,
                control: (base, state) => ({ ...customSelectStyles.control(base, state), fontWeight: 'bold' })
              }}
              isSearchable={false}
            />
          </div>
        </div>
      </div>

      <div className={styles.pageBody}>
        {error && <div className={styles.errorCard}>{error}</div>}

        {soData && (
          <div style={{ marginBottom: '12px', padding: '10px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1d4ed8' }}>
            <i className="bi bi-link-45deg" style={{ fontSize: '16px' }} />
            <span>Phiếu xuất được tạo từ đơn hàng <b>{soData.soCode}</b>. Thông tin đã được tự điền — bạn có thể điều chỉnh trước khi lưu.</span>
          </div>
        )}

        <div className={styles.topSection}>
          {/* CARD 1: Thông tin chung */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-info-circle" style={{ fontSize: '16px', color: '#0075c0' }}></i> Thông tin chung
            </div>
            <div className={styles.cardBody}>

              {/* MODE 1: SALE (Xuất kho bán hàng) */}
              {exportMode === 'SALE' && (
                <>
                  <div className="misa-form-row">
                    <div className="misa-form-group" style={{ flex: '0 0 38%' }}>
                      <label className="misa-label">Mã khách hàng <span className="required">*</span></label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <Select
                            options={customers.map(c => ({ value: c.id, label: `${c.code || `KH#${c.id}`} - ${c.name || ''}`, codeOnly: c.code || `KH#${c.id}` }))}
                            value={customers.find(c => String(c.id) === String(form.partnerId)) ? { value: form.partnerId, label: `${customers.find(c => String(c.id) === String(form.partnerId)).code || `KH#${form.partnerId}`} - ${customers.find(c => String(c.id) === String(form.partnerId)).name || ''}`, codeOnly: customers.find(c => String(c.id) === String(form.partnerId)).code || `KH#${form.partnerId}` } : null}
                            onChange={(selected) => handleFormChange('partnerId', selected ? selected.value : '')}
                            formatOptionLabel={(option, { context }) => context === 'value' ? option.codeOnly : option.label}
                            placeholder="Tìm kiếm và chọn Mã Khách hàng"
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
                      <label className="misa-label">Tên khách hàng</label>
                      <input
                        type="text"
                        className="misa-input"
                        readOnly
                        value={customers.find(s => String(s.id) === String(form.partnerId))?.name || ''}
                        style={{ backgroundColor: '#f9fafb' }}
                        placeholder="Tìm kiếm và chọn Tên Khách hàng"
                      />
                    </div>
                  </div>

                  <div className="misa-form-group" style={{ marginTop: '12px' }}>
                    <label className="misa-label">Địa chỉ</label>
                    <input
                      type="text"
                      className="misa-input"
                      value={form.customerAddress || ''}
                      onChange={(e) => handleFormChange('customerAddress', e.target.value)}
                      placeholder="Nhập địa chỉ giao hàng (có thể tuỳ chỉnh)..."
                    />
                  </div>
                </>
              )}

              {/* MODE 2: USAGE (Xuất kho cho sử dụng) */}
              {exportMode === 'USAGE' && (
                <>
                  <div className="misa-form-row">
                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                      <label className="misa-label">Người nhận / Đối tượng <span className="required">*</span></label>
                      <input
                        type="text"
                        className="misa-input"
                        value={form.receiverName}
                        onChange={(e) => handleFormChange('receiverName', e.target.value)}
                        placeholder="Nhập tên người nhận"
                      />
                    </div>
                    <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                      <label className="misa-label">Bộ phận / Phòng ban sử dụng</label>
                      <input
                        type="text"
                        className="misa-input"
                        value={form.receiverAddress}
                        onChange={(e) => handleFormChange('receiverAddress', e.target.value)}
                        placeholder="Nhập tên phòng ban"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* MODE 3: ASSEMBLY (Xuất kho lắp ráp - Giống hệt Lệnh sản xuất bên Nhập kho) */}
              {exportMode === 'ASSEMBLY' && (
                <div className="misa-form-row">
                  <div className="misa-form-group" style={{ flex: '0 0 100%' }}>
                    <label className="misa-label">Lệnh sản xuất / Lệnh lắp ráp <span className="required">*</span></label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        className="misa-input"
                        readOnly
                        value={selectedAssemblyOrder?.orderCode || form.referenceCode || ''}
                        placeholder="Nhấn chọn lệnh"
                        style={{ flex: 1, backgroundColor: '#f3f4f6', cursor: 'pointer' }}
                        onClick={() => setShowAssemblyModal(true)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAssemblyModal(true)}
                        style={{ width: '32px', height: '32px', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <i className="bi bi-search" style={{ fontSize: '16px', color: 'var(--color-primary)' }}></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 4: OTHER (Khác) */}
              {exportMode === 'OTHER' && (
                <div className="misa-form-row">
                  <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                    <label className="misa-label">Người nhận / Đối tượng</label>
                    <input
                      type="text"
                      className="misa-input"
                      value={form.receiverName}
                      onChange={(e) => handleFormChange('receiverName', e.target.value)}
                      placeholder="Nhập đối tượng nhận / lý do..."
                    />
                  </div>
                  <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                    <label className="misa-label">Chứng từ tham chiếu</label>
                    <input
                      type="text"
                      className="misa-input"
                      readOnly
                      value={form.referenceCode || ''}
                      placeholder="Không có"
                      style={{ backgroundColor: '#f3f4f6' }}
                    />
                  </div>
                </div>
              )}

              {/* Shared Row: Kho xuất & Nhân viên phụ trách */}
              <div className="misa-form-row" style={{ marginTop: '12px' }}>
                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  <label className="misa-label">Kho xuất <span className="required">*</span></label>
                  <Select
                    inputId="export-warehouseId"
                    options={warehouses.map(w => ({ value: w.id, label: `${w.code} - ${w.name}` }))}
                    value={warehouses.find(w => String(w.id) === String(form.warehouseId)) ? { value: form.warehouseId, label: `${warehouses.find(w => String(w.id) === String(form.warehouseId)).code} - ${warehouses.find(w => String(w.id) === String(form.warehouseId)).name}` } : null}
                    onChange={(selected) => {
                      const newWh = selected ? selected.value : '';
                      handleFormChange('warehouseId', newWh);
                      setItems(prev => prev.map(it => ({ ...it, warehouseId: newWh })));
                    }}
                    placeholder="Chọn kho xuất"
                    isClearable
                    styles={customSelectStyles}
                  />
                </div>
                <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                  <label className="misa-label">Nhân viên xuất hàng</label>
                  <input
                    type="text"
                    className="misa-input"
                    value={currentUser ? (currentUser.fullName || currentUser.username) : 'Đang tải...'}
                    readOnly
                    style={{ backgroundColor: '#f3f4f6' }}
                  />
                </div>
              </div>

              {(exportMode === 'SALE' || exportMode === 'ASSEMBLY') && (
                <div className="misa-form-row" style={{ marginTop: '12px' }}>
                  <div className="misa-form-group" style={{ flex: '0 0 50%' }}>
                    <label className="misa-label">Người nhận hàng</label>
                    <input
                      type="text"
                      className="misa-input"
                      value={form.receiverName || ''}
                      onChange={(e) => handleFormChange('receiverName', e.target.value)}
                      placeholder="Nhập tên người nhận hàng"
                    />
                  </div>
                  <div className="misa-form-group" style={{ flex: '0 0 50%' }}></div>
                </div>
              )}

              {/* Ghi chú Field placed BEFORE Tham chiếu chứng từ (Matching Nhập Kho) */}
              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <label className="misa-label">Ghi chú</label>
                <textarea
                  className="misa-textarea"
                  value={form.note}
                  onChange={(e) => handleFormChange('note', e.target.value)}
                  style={{ minHeight: '60px' }}
                  placeholder="Nhập ghi chú"
                />
              </div>

              {/* Kèm theo chứng từ (Matching Nhập Kho + Hỗ trợ nhập số chứng từ đính kèm) */}
              <div className="misa-form-group" style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="misa-label" style={{ marginBottom: 0 }}>
                    Kèm theo chứng từ
                    {exportMode === 'SALE' && <span className="required" style={{ marginLeft: '4px' }}>*</span>}
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
                    <span style={{ color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer' }} onClick={() => setShowReferenceModal(true)}>
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
                  <input
                    type="text"
                    className="misa-input"
                    style={{ marginTop: '8px' }}
                    value={form.attachedDocs || ''}
                    onChange={(e) => handleFormChange('attachedDocs', e.target.value)}
                    placeholder="Số chứng từ đính kèm"
                  />
                )}
              </div>
            </div>
          </div>

          {/* CARD 2: Thông tin chứng từ (Matching Nhập Kho: Số phiếu trên, Ngày lập dưới) */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <i className="bi bi-file-earmark-text-fill" style={{ fontSize: '16px', color: '#0075c0' }}></i> Thông tin chứng từ
            </div>
            <div className={styles.cardBody}>
              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">Số phiếu</label>
                <input className="misa-input" placeholder="Để trống để hệ thống tự sinh" value={form.docCode} onChange={(event) => handleFormChange('docCode', event.target.value)} />
              </div>

              <div className="misa-form-group" style={{ marginBottom: '16px' }}>
                <label className="misa-label">Ngày lập phiếu <span className="required">*</span></label>
                <input id="export-docDate" type="date" className="misa-input" value={form.docDate} onChange={(event) => handleFormChange('docDate', event.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Item Table Card */}
        <div className={styles.card}>
          <div className={styles.scanPanel}>
            <div>
              <div className={styles.scanTitle}>Quét mã vạch / SKU hàng hóa</div>
              <div className={styles.scanHint}>Quét mã Barcode / Serial / SKU để tự động nạp mặt hàng xuất kho.</div>
            </div>
            <form className={styles.scanForm} onSubmit={handleScanSubmit}>
              <div className={styles.scanInputWrap}>
                <i className="bi bi-upc-scan"></i>
                <input
                  className="misa-input"
                  style={{ paddingLeft: '36px', height: '34px' }}
                  value={scanCode}
                  onChange={(event) => setScanCode(event.target.value)}
                  placeholder="Đặt con trỏ vào đây rồi quét mã"
                  disabled={scanLoading}
                />
              </div>
            </form>
          </div>

          <div className={styles.tableHeaderRow}>
            <div className={styles.tableTitle}>
              {exportMode === 'USAGE' ? 'Danh sách vật tư / hàng hóa xuất sử dụng' : exportMode === 'ASSEMBLY' ? 'Danh sách nguyên vật liệu / linh kiện xuất kho' : 'Bảng hàng hóa xuất kho'}
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center', whiteSpace: 'nowrap' }}>STT</th>
                  <th style={{ minWidth: '120px', width: '13%' }}>Mã hàng</th>
                  <th style={{ minWidth: '180px', width: '22%' }}>{exportMode === 'ASSEMBLY' ? 'Tên linh kiện' : 'Tên hàng'}</th>
                  <th style={{ minWidth: '60px', width: '7%', whiteSpace: 'nowrap' }}>ĐVT</th>
                  <th style={{ minWidth: '80px', width: '9%', whiteSpace: 'nowrap' }} className={styles.textCenter}>Tồn khả dụng</th>
                  <th style={{ minWidth: '65px', width: '7%', whiteSpace: 'nowrap' }} className={styles.textRight}>SL</th>
                  <th style={{ minWidth: '75px', width: '9%', textAlign: 'center', whiteSpace: 'nowrap' }}>Serial</th>
                  <th style={{ minWidth: '65px', width: '7%', textAlign: 'center', whiteSpace: 'nowrap' }}>BH (T)</th>
                  <th style={{ minWidth: '100px', width: '11%', whiteSpace: 'nowrap' }} className={styles.textRight}>Đơn giá</th>
                  <th style={{ minWidth: '100px', width: '11%', whiteSpace: 'nowrap' }} className={styles.textRight}>Thành tiền</th>
                  <th style={{ minWidth: '75px', width: '8%', whiteSpace: 'nowrap' }} className={styles.textRight}>Thuế GTGT</th>
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
                      <td>
                        <ProductGridSelect
                          products={warehouseScopedProducts}
                          inventoryMap={inventoryMap}
                          value={item.variantId}
                          onChange={(selected) => handleItemChange(item.localId, 'variantId', selected ? selected.id : '')}
                          onAddNew={() => { setQuickAddLineId(item.localId); setShowQuickAddProduct(true); }}
                          displayMode="name"
                          placeholder="Chọn hàng hóa / linh kiện"
                        />
                      </td>
                      <td>
                        {product?.unitName || 'Cái'}
                      </td>
                      <td className={styles.textCenter} style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                        {product ? getStockForLine(product.id, item.warehouseId || form.warehouseId, item) : ''}
                      </td>
                      <td className={styles.textRight}>
                        <input id={`export-line-qty-${index}`} type="number" min="1" className="misa-input text-right" style={{ height: '32px', padding: '0 8px', width: '100%', maxWidth: '100px', margin: '0 auto', textAlign: 'right', fontSize: '13px' }} value={item.quantity} onChange={(event) => handleItemChange(item.localId, 'quantity', event.target.value)} />
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
                        <button className={styles.iconBtnDanger} onClick={() => removeItem(item.localId)} title="Xóa dòng"><i className="bi bi-trash"></i></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className={styles.tableFooter}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ color: '#4b5563', fontSize: '13px' }}>Tổng số: <span style={{ fontWeight: 'bold', color: '#111827' }}>{items.length}</span> bản ghi</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" onClick={addItem} style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Thêm dòng</button>
                  <button type="button" onClick={() => setItems([{ ...emptyLine(form.warehouseId), isNew: false }])} style={{ padding: '6px 12px', border: '1px solid #d1d5db', backgroundColor: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Xóa hết dòng</button>
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
      </div>

      {/* Fixed Footer Bar (Identical Layout to Nhập Kho) */}
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

      <AssemblyOrderSelectionModal
        isOpen={showAssemblyModal}
        onClose={() => setShowAssemblyModal(false)}
        onSelect={handleSelectAssemblyOrder}
      />

      <ReferenceDocumentModal
        isOpen={showReferenceModal}
        onClose={() => setShowReferenceModal(false)}
        onSelect={async (data) => {
          setForm(prev => ({
            ...prev,
            referenceType: data.referenceType,
            referenceId: data.referenceId,
            referenceCode: data.docCode,
            salesOrderId: data.referenceType === 'SALES_ORDER' ? data.referenceId : prev.salesOrderId,
          }));
          if (data.referenceType === 'SALES_ORDER' && data.referenceId) {
            try {
              const res = await salesOrderApi.getSalesOrderDetail(data.referenceId);
              const so = res?.data?.data || res?.data;
              if (so) {
                setForm(prev => ({
                  ...prev,
                  salesOrderId: so.id,
                  warehouseId: so.warehouseId ? String(so.warehouseId) : prev.warehouseId,
                  partnerId: so.partnerId || so.customerId || prev.partnerId,
                  salespersonId: so.salespersonId || prev.salespersonId,
                  customerAddress: so.shippingAddress || so.partnerAddress || prev.customerAddress,
                  receiverName: so.partnerName || so.customerName || prev.receiverName,
                  receiverPhone: so.partnerPhone || so.customerPhone || prev.receiverPhone,
                  note: prev.note || `Xuất kho theo đơn hàng ${so.soCode}`,
                }));
                if (so.lines && so.lines.length > 0) {
                  setItems(so.lines.map(l => ({
                    ...emptyLine(String(so.warehouseId || form.warehouseId || '')),
                    variantId: String(l.variantId),
                    warehouseId: String(l.warehouseId || so.warehouseId || form.warehouseId || ''),
                    quantity: l.quantity || 1,
                    price: l.unitPrice || l.price || 0,
                    vatPercent: l.vatPercent || l.vatRate || 0,
                    warrantyMonths: l.warrantyMonths || 0,
                    note: l.note || '',
                    serialNumbers: [],
                  })));
                  showToast('success', `Đã tải ${so.lines.length} sản phẩm từ đơn bán hàng ${so.soCode}`);
                }
              }
            } catch (err) {
              console.error('Failed to load SO detail', err);
            }
          }
          if (data.referenceType === 'STOCKTAKE' && data.referenceId) {
            try {
              const res = await stocktakeApi.getStocktakeDetail(data.referenceId);
              const stData = res?.data?.data || res?.data;
              if (stData) {
                if (stData.warehouseId) {
                  setForm(prev => ({ ...prev, warehouseId: String(stData.warehouseId) }));
                }
                const diffLackLines = filterWarehouseLines(stData.lines || []).filter(l => Number(l.diffQty || 0) < 0);
                if (diffLackLines.length > 0) {
                  setItems(diffLackLines.map(l => {
                    const rawSerials = l.serials || [];
                    const missingSerials = rawSerials
                      .filter(s => s.scanStatus === 'MISSING' || !s.scanStatus)
                      .map(s => (typeof s === 'string' ? s : s.serialNumber))
                      .filter(Boolean);
                    const serialList = missingSerials.length > 0 ? missingSerials : rawSerials.map(s => (typeof s === 'string' ? s : s.serialNumber)).filter(Boolean);
                    return {
                      ...emptyLine(String(stData.warehouseId || '')),
                      variantId: String(l.variantId),
                      warehouseId: String(stData.warehouseId || ''),
                      quantity: Math.abs(Number(l.diffQty)) || 1,
                      price: 0,
                      serialNumbers: serialList,
                      note: `Hàng thiếu từ kiểm kê ${stData.stocktakeCode}`
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

      {serialModalItemId && selectedSerialProduct && (
        <ManageSerialModal
          isOpen={true}
          onClose={handleSerialModalClose}
          productName={selectedSerialProduct.variantName || selectedSerialProduct.productName}
          targetQuantity={Number(selectedSerialItem.quantity || 0)}
          initialSerials={selectedSerialItem.serialNumbers || []}
          mode="export"
          warehouseId={selectedSerialItem.warehouseId || form.warehouseId}
          variantId={selectedSerialProduct.id}
          onValidateSerial={async (serialValue) => {
            try {
              const response = await exportApi.resolveScan({
                code: serialValue,
                warehouseId: selectedSerialItem.warehouseId || form.warehouseId,
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

      <ConfirmModal
        isOpen={showConfirm}
        title="Xác nhận ghi sổ"
        message="Bạn có chắc chắn muốn lưu và ghi sổ phiếu xuất kho này không? Thao tác này sẽ tự động cập nhật số lượng tồn kho."
        onConfirm={() => {
          setShowConfirm(false);
          submit('DRAFT', true);
        }}
        onCancel={() => setShowConfirm(false)}
      />

      <SuccessPrintModal
        isOpen={showSuccessModal}
        title={savedSlip?.status === 'POSTED' || savedSlip?.statusCode === 'POSTED' ? 'Lưu & ghi sổ phiếu xuất kho thành công!' : 'Lưu tạm phiếu xuất kho thành công!'}
        message="Phiếu xuất kho đã được ghi nhận vào hệ thống thành công. Bạn có thể chọn cách in phiếu dưới đây."
        docCode={savedSlip?.docCode}
        onPrintSummary={() => handlePrint('SUMMARY')}
        onPrintSplit={() => handlePrint('SPLIT_BY_WAREHOUSE')}
        onViewList={() => navigate(returnUrl || '/export-slips')}
        onCreateNew={() => window.location.reload()}
        onClose={() => navigate(returnUrl || '/export-slips')}
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

export default CreateExportSlipPage;
