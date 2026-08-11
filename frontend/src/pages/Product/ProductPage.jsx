import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import Toast from '../../components/ui/Toast/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal/ConfirmModal';
import PrintBarcodeModal from '../../components/ui/PrintBarcodeModal/PrintBarcodeModal';
import axiosClient from '../../api/axiosClient';
import styles from './ProductPage.module.css';
import { getVietnamTimestamp } from '../../utils/dateFormat';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import FilterPopover from '../../components/ui/FilterPopover/FilterPopover';
import Modal from '../../components/ui/Modal/Modal';
import ProductDetailModal from './components/ProductDetailModal';
import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';

const defaultFormData = {
    id: null,
    productCode: '',
    productName: '',
    productType: 'Hàng hóa',
    categoryId: '',
    brandId: '',
    unitId: '',
    salePrice: 0,
    description: '',
    imageUrl: '',
    trackSerial: false,
    trackLot: false,
    isAssembly: false,
    active: true,
    minStockQty: '',
    taxReductionStatus: 'NORMAL'
};

const DEFAULT_COLUMNS = {
    image: true,
    productCode: true,
    productName: true,
    productType: true,
    category: true,
    brand: true,
    unit: true,
    salePrice: true,
    stockQty: true
};

const defaultVariantData = {
    id: null,
    sku: '',
    variantName: '',
    costPrice: 0,
    salePrice: 0,
    manufacturerPartNumber: '',
    specsJson: '',
    active: true,
    warrantyMonths: ''
};

const getPageContent = (response) => {
    const payload = response.data?.data ?? response.data;
    return payload?.content ?? payload ?? [];
};

const normalizeText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

const isServiceType = (productType) => normalizeText(productType) === 'dich vu';
const isStockTrackedProduct = (product) => !isServiceType(product?.productType);

let globalSpecIdCounter = 1;

const getPredefinedBomLines = () => {
    return [{ componentVariantId: '', categoryId: '', quantity: '', note: '' }];
};

const SearchableCategoryDropdown = ({ categories, value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const [rect, setRect] = useState(null);

    const updateRect = () => {
        if (dropdownRef.current) {
            const elRect = dropdownRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - elRect.bottom;
            const spaceAbove = elRect.top;

            setRect({
                top: elRect.top,
                bottom: elRect.bottom,
                left: elRect.left,
                width: elRect.width,
                openUpwards: spaceBelow < 250 && spaceAbove > spaceBelow
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
                !(listRef.current && listRef.current.contains(event.target))) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            updateRect();
            window.addEventListener('scroll', updateRect, true);
            window.addEventListener('resize', updateRect);
            return () => {
                window.removeEventListener('scroll', updateRect, true);
                window.removeEventListener('resize', updateRect);
            };
        }
    }, [isOpen]);

    const selectedCat = categories.find(c => String(c.id) === String(value));

    const handleOpen = () => {
        setIsOpen(true);
        setSearchTerm(selectedCat ? selectedCat.name : '');
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const filteredCategories = categories.filter(cat =>
        (cat.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%', minWidth: '180px' }}>
            <div
                onClick={handleOpen}
                style={{
                    padding: '6px 8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '13px',
                    cursor: 'text',
                    backgroundColor: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: '32px'
                }}
            >
                {isOpen ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm danh mục..."
                        style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', padding: 0 }}
                    />
                ) : (
                    selectedCat ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                            <span style={{ fontWeight: 500, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedCat.name}</span>
                            {selectedCat.description && <span style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedCat.description}</span>}
                        </div>
                    ) : (
                        <span style={{ color: '#9ca3af' }}>Tìm kiếm danh mục</span>
                    )
                )}
                <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: '#9ca3af', fontSize: '10px', marginLeft: '8px', flexShrink: 0 }}></i>
            </div>

            {isOpen && rect && createPortal(
                <div ref={listRef} style={{
                    position: 'fixed',
                    top: rect.openUpwards ? rect.top - 4 : rect.bottom + 4,
                    left: rect.left,
                    width: rect.width,
                    zIndex: 9999999,
                    transform: rect.openUpwards ? 'translateY(-100%)' : 'none',
                    backgroundColor: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}>
                    {filteredCategories.length > 0 ? filteredCategories.map(cat => (
                        <div
                            key={cat.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange(cat.id);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '8px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                backgroundColor: String(cat.id) === String(value) ? '#eff6ff' : 'transparent'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = String(cat.id) === String(value) ? '#eff6ff' : 'transparent'}
                        >
                            <div style={{ fontWeight: 500, fontSize: '13px', color: '#111827' }}>
                                {cat.name}
                            </div>
                            {cat.description && (
                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {cat.description}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div style={{ padding: '8px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                            Không tìm thấy kết quả
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

const ProductPage = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [columns, setColumns] = useState(() => {
        const saved = localStorage.getItem('dlc_product_columns');
        return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    });
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const handleColumnChange = (colId) => {
        setColumns(prev => {
            const next = { ...prev, [colId]: !prev[colId] };
            localStorage.setItem('dlc_product_columns', JSON.stringify(next));
            return next;
        });
    };

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tempSearch, setTempSearch] = useState('');
    const [stockFilter, setStockFilter] = useState('ALL');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');
    const [unitFilter, setUnitFilter] = useState('');

    const [page, setPage] = useState(0);
    const [size, setSize] = useState(20);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    const [showModal, setShowModal] = useState(false);
    const [detailProduct, setDetailProduct] = useState(null);
    const [isEdit, setIsEdit] = useState(false);
    const [printBarcodeProduct, setPrintBarcodeProduct] = useState(null);
    const [formData, setFormData] = useState(defaultFormData);
    const [errorMsg, setErrorMsg] = useState('');
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, type: 'success', message: '' });

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', id: null, title: '', message: '' });

    const handleConfirmDelete = async () => {
        const { type, id } = confirmModal;
        setConfirmModal(prev => ({ ...prev, isOpen: false }));

        if (type === 'PRODUCT') {
            try {
                await axiosClient.delete(`/products/${id}`);
                fetchProducts();
                fetchAllVariants();
                showToast('success', 'Xóa sản phẩm thành công.');
            } catch (error) {
                console.error('Lỗi xóa sản phẩm:', error);
                showToast('error', getErrorMessage(error, 'Có lỗi xảy ra khi xóa sản phẩm.'));
            }
        } else if (type === 'SKU') {
            try {
                await axiosClient.delete(`/products/${selectedProduct.id}/variants/${id}`);
                showToast('success', 'Xóa SKU thành công.');
                await fetchVariants(selectedProduct.id);
            } catch (error) {
                showToast('error', getErrorMessage(error, 'Có lỗi xảy ra khi xóa SKU.'));
            }
        }
    };
    const [uploadingImage, setUploadingImage] = useState(false);
    const [showVariantModal, setShowVariantModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [variants, setVariants] = useState([]);
    const [variantForm, setVariantForm] = useState(defaultVariantData);
    const [variantError, setVariantError] = useState('');
    const [loadingVariants, setLoadingVariants] = useState(false);

    const [activeTab, setActiveTab] = useState('bom');
    const [bomLines, setBomLines] = useState([]);
    const [allVariants, setAllVariants] = useState([]);
    const [warrantyQty, setWarrantyQty] = useState('');
    const [warrantyUnit, setWarrantyUnit] = useState('Tháng');
    const [showTypeMenu, setShowTypeMenu] = useState(false);
    const [showQuickAddCat, setShowQuickAddCat] = useState(false);
    const [quickCatForm, setQuickCatForm] = useState({ name: '', description: '' });
    const [savingCat, setSavingCat] = useState(false);
    const [showQuickAddUnit, setShowQuickAddUnit] = useState(false);
    const [quickUnitForm, setQuickUnitForm] = useState({ name: '', description: '' });
    const [savingUnit, setSavingUnit] = useState(false);

    const [showQuickAddBrand, setShowQuickAddBrand] = useState(false);
    const [quickBrandForm, setQuickBrandForm] = useState({ name: '', description: '' });
    const [savingBrand, setSavingBrand] = useState(false);


    const [specList, setSpecList] = useState([{ id: 1, key: '', value: '' }]);
    const [useRawJson, setUseRawJson] = useState(false);

    const [outOfStockCount, setOutOfStockCount] = useState(0);
    const [lowStockCount, setLowStockCount] = useState(0);
    const [importing, setImporting] = useState(false);
    const [showExcelPreviewModal, setShowExcelPreviewModal] = useState(false);
    const [excelPreviewData, setExcelPreviewData] = useState([]);
    const [previewFilter, setPreviewFilter] = useState('ALL');
    const [isSavingExcel, setIsSavingExcel] = useState(false);
    const fileInputRef = useRef(null);

    const showToast = (type, message) => {
        setToast({ isVisible: true, type, message });
    };

    const handleDownloadTemplate = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Mau_Nhap_Hang_Hoa');

        worksheet.properties.defaultRowHeight = 22;

        worksheet.columns = [
            { key: 'code', width: 20 },
            { key: 'name', width: 45 },
            { key: 'type', width: 18 },
            { key: 'category', width: 25 },
            { key: 'brand', width: 20 },
            { key: 'unit', width: 15 },
            { key: 'price', width: 18 },
            { key: 'minStock', width: 20 },
            { key: 'warranty', width: 18 },
            { key: 'serial', width: 25 },
            { key: 'description', width: 50 }
        ];

        worksheet.mergeCells('A1:K1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'FILE MẪU DANH SÁCH HÀNG HÓA ĐỂ NHẬP VÀO HỆ THỐNG';
        titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF000000' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };

        worksheet.mergeCells('A2:K2');
        const inst1 = worksheet.getCell('A2');
        inst1.value = 'Hướng dẫn:';
        inst1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFD84315' } };
        inst1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };

        worksheet.mergeCells('A3:K3');
        const inst2 = worksheet.getCell('A3');
        inst2.value = '- Điền dữ liệu vào các cột tương ứng trên file này';
        inst2.font = { name: 'Arial', size: 11 };
        inst2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };

        worksheet.mergeCells('A4:K4');
        const inst3 = worksheet.getCell('A4');
        inst3.value = '- Các cột có dấu (*) là những cột bắt buộc';
        inst3.font = { name: 'Arial', size: 11 };
        inst3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };

        worksheet.mergeCells('A5:K5');
        const inst4 = worksheet.getCell('A5');
        inst4.value = '- Các dòng dữ liệu phía dưới chỉ là ví dụ minh họa, vui lòng xóa đi trước khi nhập';
        inst4.font = { name: 'Arial', size: 11 };
        inst4.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0B2' } };

        worksheet.mergeCells('A6:K6');

        const headerRow = worksheet.getRow(7);
        headerRow.values = [
            'Mã sản phẩm (*)', 'Tên sản phẩm (*)', 'Loại sản phẩm (*)', 'Danh mục (*)',
            'Thương hiệu (*)', 'Đơn vị tính (*)', 'Giá bán (VNĐ)', 'Cảnh báo hết hàng',
            'Bảo hành (tháng)', 'Quản lý Serial (Có/Không)', 'Mô tả'
        ];
        headerRow.height = 30;
        headerRow.eachCell((cell) => {
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF000000' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB3E5FC' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        });

        const sampleData = [
            ['SP000001', 'Dell OptiPlex 7010 SFF', 'Hàng hóa', 'Máy tính đồng bộ', 'Dell', 'Bộ', 12500000, 5, 24, 'Có', 'Máy tính đồng bộ Intel Core i5 12500, 16GB RAM, 512GB SSD'],
            ['SP000002', 'RAM Kingston Fury Beast 16GB DDR4 3200MHz', 'Hàng hóa', 'RAM', 'Kingston', 'Thanh', 950000, 10, 36, 'Không', 'Bộ nhớ RAM 16GB bus 3200MHz tản nhiệt đen']
        ];

        sampleData.forEach((dataRow, index) => {
            const row = worksheet.getRow(8 + index);
            row.values = dataRow;
            row.eachCell((cell, colNumber) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                cell.alignment = { vertical: 'middle', horizontal: colNumber >= 7 && colNumber <= 9 ? 'right' : 'left' };
                if (colNumber === 7) {
                    cell.numFmt = '#,##0';
                }
            });
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, 'DLC_WMS_Mau_Nhap_Hang_Hoa.xlsx');
    };

    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                setImporting(true);
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawArray = XLSX.utils.sheet_to_json(ws, { header: 1 });
                if (!rawArray || rawArray.length === 0) {
                    showToast('warning', 'File Excel không có dữ liệu');
                    setImporting(false);
                    return;
                }

                // Find header row (the row that has 'Tên sản phẩm')
                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(20, rawArray.length); i++) {
                    const rowStr = (rawArray[i] || []).join(' ').toLowerCase();
                    if (rowStr.includes('tên sản phẩm') || rowStr.includes('ten san pham') || rowStr.includes('mã sản phẩm')) {
                        headerRowIndex = i;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    showToast('error', 'Không tìm thấy dòng tiêu đề hợp lệ trong file Excel');
                    setImporting(false);
                    return;
                }

                const headers = rawArray[headerRowIndex].map(h => String(h || '').replace(/\(\*\)/g, '').trim());

                const rawData = [];
                for (let i = headerRowIndex + 1; i < rawArray.length; i++) {
                    const rowArr = rawArray[i];
                    if (!rowArr || rowArr.length === 0) continue;

                    // Skip completely empty rows
                    if (rowArr.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;

                    const rowObj = {
                        _excelRowNumber: i + 1 // i is 0-indexed, Excel rows are 1-indexed
                    };
                    headers.forEach((h, colIdx) => {
                        if (h) rowObj[h] = rowArr[colIdx];
                    });
                    rawData.push(rowObj);
                }

                if (rawData.length === 0) {
                    showToast('warning', 'Không có dữ liệu sản phẩm trong file');
                    setImporting(false);
                    return;
                }

                // Fetch current products list to check existing codes for Upsert
                let existingProductsList = products;
                try {
                    const allProdRes = await axiosClient.get('/products?page=0&size=5000');
                    existingProductsList = allProdRes.data?.content || products;
                } catch (err) {
                    console.warn('Không thể lấy danh sách sản phẩm để kiểm tra:', err);
                }

                const previewData = [];

                for (let i = 0; i < rawData.length; i++) {
                    const row = rawData[i];
                    const rowErrors = [];
                    let isValid = true;

                    const productName = String(row['Tên sản phẩm'] || row['Ten san pham'] || row['Name'] || row['Product Name'] || '').trim();
                    const productCode = String(row['Mã sản phẩm'] || row['Ma san pham'] || row['Code'] || '').trim();
                    const productTypeRaw = row['Loại sản phẩm'] || row['Loai san pham'] || 'Hàng hóa';
                    const categoryNameRaw = String(row['Danh mục'] || row['Danh muc'] || row['Category'] || '').trim();
                    const brandNameRaw = String(row['Thương hiệu'] || row['Thuong hieu'] || row['Brand'] || '').trim();
                    const unitNameRaw = String(row['Đơn vị tính'] || row['Don vi tinh'] || row['Unit'] || '').trim();
                    const salePrice = Number(row['Giá bán (VNĐ)'] || row['Giá bán'] || row['Price'] || 0);
                    const minStockQty = Number(row['Cảnh báo hết hàng'] || row['Tồn tối thiểu'] || 0);
                    const warrantyMonths = Number(row['Bảo hành (tháng)'] || row['Bảo hành'] || 0);
                    const trackSerialRaw = String(row['Quản lý Serial (Có/Không)'] || row['Quản lý Serial'] || row['Serial'] || '').toLowerCase();
                    const description = row['Mô tả'] || row['Mo ta'] || '';

                    if (!productName) {
                        isValid = false;
                        rowErrors.push('Thiếu Tên sản phẩm');
                    }

                    let productType = 'Hàng hóa';
                    if (String(productTypeRaw).includes('Thành phẩm')) productType = 'Thành phẩm';
                    if (String(productTypeRaw).includes('Dịch vụ')) productType = 'Dịch vụ';
                    const isService = isServiceType(productType);

                    const matchedCat = categories.find(c =>
                        (c.name && c.name.toLowerCase() === categoryNameRaw.toLowerCase()) ||
                        (c.code && c.code.toLowerCase() === categoryNameRaw.toLowerCase())
                    );
                    let categoryId = isService ? null : (matchedCat ? matchedCat.id : '');
                    if (!isService && categoryNameRaw && !matchedCat) {
                        isValid = false;
                        rowErrors.push(`Danh mục '${categoryNameRaw}' không tồn tại`);
                    } else if (!isService && !categoryNameRaw) {
                        isValid = false;
                        rowErrors.push('Thiếu Danh mục');
                    }

                    const matchedBrand = brands.find(b =>
                        (b.name && b.name.toLowerCase() === brandNameRaw.toLowerCase()) ||
                        (b.code && b.code.toLowerCase() === brandNameRaw.toLowerCase())
                    );
                    let brandId = isService ? null : (matchedBrand ? matchedBrand.id : '');
                    if (!isService && brandNameRaw && !matchedBrand) {
                        isValid = false;
                        rowErrors.push(`Thương hiệu '${brandNameRaw}' không tồn tại`);
                    } else if (!isService && !brandNameRaw) {
                        isValid = false;
                        rowErrors.push('Thiếu Thương hiệu');
                    }

                    const matchedUnit = units.find(u =>
                        (u.name && u.name.toLowerCase() === unitNameRaw.toLowerCase()) ||
                        (u.code && u.code.toLowerCase() === unitNameRaw.toLowerCase())
                    );
                    let unitId = matchedUnit ? matchedUnit.id : '';
                    if (unitNameRaw && !matchedUnit) {
                        isValid = false;
                        rowErrors.push(`Đơn vị tính '${unitNameRaw}' không tồn tại`);
                    } else if (!unitNameRaw) {
                        isValid = false;
                        rowErrors.push('Thiếu Đơn vị tính');
                    }

                    const trackSerial = trackSerialRaw.includes('có') || trackSerialRaw.includes('co') || trackSerialRaw === '1' || trackSerialRaw === 'true';
                    const existingProduct = productCode ? existingProductsList.find(p => p.productCode && p.productCode.toLowerCase() === productCode.toLowerCase()) : null;

                    const warnings = [];
                    if (productName) {
                        const normName = String(productName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                        if (normName.length > 3) {
                            const similarProduct = existingProductsList.find(p => {
                                if (!p.productName) return false;
                                if (productCode && p.productCode && p.productCode.toLowerCase() === productCode.toLowerCase()) return false;
                                const pNorm = String(p.productName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                                return pNorm === normName;
                            });

                            if (similarProduct) {
                                warnings.push(`Trùng tên với SP trên hệ thống: ${similarProduct.productCode}`);
                            } else {
                                const duplicateInExcel = previewData.find(r => {
                                    if (!r.productName) return false;
                                    const rNorm = String(r.productName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                                    return rNorm === normName;
                                });
                                if (duplicateInExcel) {
                                    warnings.push(`Trùng tên với Dòng ${duplicateInExcel.originalIndex} (trong file Excel)`);
                                }
                            }
                        }
                    }

                    previewData.push({
                        originalIndex: row._excelRowNumber,
                        productName,
                        productCode,
                        productType,
                        categoryId,
                        brandId,
                        unitId,
                        salePrice: salePrice >= 0 ? salePrice : 0,
                        minStockQty: isService ? 0 : (minStockQty >= 0 ? minStockQty : 0),
                        warrantyPeriodMonths: warrantyMonths >= 0 ? warrantyMonths : 0,
                        trackSerial: isService ? false : trackSerial,
                        description,
                        existingProduct,
                        isValid,
                        errors: rowErrors,
                        warnings: warnings
                    });
                }

                setExcelPreviewData(previewData);
                setShowExcelPreviewModal(true);

            } catch (err) {
                console.error('Lỗi đọc file Excel:', err);
                showToast('error', 'Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng file.');
            } finally {
                setImporting(false);
                if (e.target) e.target.value = null;
            }
        };
        reader.readAsBinaryString(file);
    };

    const handlePreviewEdit = (index, field, value) => {
        setExcelPreviewData(prevData => {
            const newData = [...prevData];
            const row = { ...newData[index], [field]: value };

            let isValid = true;
            const rowErrors = [];

            if (!row.productName || !String(row.productName).trim()) {
                isValid = false;
                rowErrors.push('Thiếu Tên sản phẩm');
            }

            const isService = isServiceType(row.productType);
            if (!isService && !row.categoryId) {
                isValid = false;
                rowErrors.push('Thiếu Danh mục');
            }
            if (!isService && !row.brandId) {
                isValid = false;
                rowErrors.push('Thiếu Thương hiệu');
            }
            if (!row.unitId) {
                isValid = false;
                rowErrors.push('Thiếu Đơn vị tính');
            }

            row.isValid = isValid;
            row.errors = rowErrors;

            if (field === 'productName' && row.productName) {
                row.warnings = [];
                const normName = String(row.productName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                if (normName.length > 3) {
                    const similarProduct = products.find(p => {
                        if (!p.productName) return false;
                        if (row.productCode && p.productCode && p.productCode.toLowerCase() === row.productCode.toLowerCase()) return false;
                        const pNorm = String(p.productName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                        return pNorm === normName;
                    });

                    if (similarProduct) {
                        row.warnings.push(`Trùng tên với SP trên hệ thống: ${similarProduct.productCode}`);
                    } else {
                        const duplicateInExcel = newData.find((r, i) => {
                            if (i === index) return false;
                            if (!r.productName) return false;
                            const rNorm = String(r.productName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
                            return rNorm === normName;
                        });
                        if (duplicateInExcel) {
                            row.warnings.push(`Trùng tên với Dòng ${duplicateInExcel.originalIndex} (trong file Excel)`);
                        }
                    }
                }
            }

            newData[index] = row;
            return newData;
        });
    };

    const handleQuickAddEntity = async (type, name) => {
        try {
            let endpoint = '';
            let fieldName = '';
            let updateStateFunc = null;

            if (type === 'category') {
                endpoint = '/product-categories';
                fieldName = 'categoryId';
                updateStateFunc = setCategories;
            } else if (type === 'brand') {
                endpoint = '/brands';
                fieldName = 'brandId';
                updateStateFunc = setBrands;
            } else if (type === 'unit') {
                endpoint = '/units';
                fieldName = 'unitId';
                updateStateFunc = setUnits;
            }

            const res = await axiosClient.post(endpoint, { name: name, status: 'APPROVED' });
            const newEntity = type === 'brand' ? res.data.data : res.data;

            updateStateFunc(prev => [...prev, newEntity]);

            setExcelPreviewData(prevData => {
                return prevData.map(row => {
                    const errorMsgToMatch = type === 'category' ? `Danh mục '${name}' không tồn tại`
                        : type === 'brand' ? `Thương hiệu '${name}' không tồn tại`
                            : `Đơn vị tính '${name}' không tồn tại`;

                    if (row.errors && row.errors.includes(errorMsgToMatch)) {
                        const newRow = { ...row };
                        newRow[fieldName] = newEntity.id;
                        newRow.errors = row.errors.filter(e => e !== errorMsgToMatch);
                        newRow.isValid = newRow.errors.length === 0;
                        return newRow;
                    }
                    return row;
                });
            });

            showToast('success', `Đã thêm nhanh ${name} thành công`);
        } catch (error) {
            console.error(error);
            showToast('error', `Thêm nhanh ${name} thất bại`);
        }
    };

    const handleSaveValidExcelRows = async () => {
        const validRows = excelPreviewData.filter(row => row.isValid);
        if (validRows.length === 0) {
            showToast('warning', 'Không có dòng dữ liệu nào hợp lệ để lưu.');
            return;
        }

        setIsSavingExcel(true);
        let createdCount = 0;
        let updatedCount = 0;
        let failCount = 0;

        for (const row of validRows) {
            const payload = {
                productCode: row.productCode || undefined,
                productName: row.productName,
                productType: row.productType,
                categoryId: row.categoryId,
                brandId: row.brandId,
                unitId: row.unitId,
                salePrice: row.salePrice,
                minStockQty: row.minStockQty,
                warrantyPeriodMonths: row.warrantyPeriodMonths,
                trackSerial: row.trackSerial,
                description: row.description,
                active: true
            };

            try {
                if (row.existingProduct) {
                    await axiosClient.put(`/products/${row.existingProduct.id}`, payload);
                    updatedCount++;
                } else {
                    await axiosClient.post('/products', payload);
                    createdCount++;
                }
            } catch (err) {
                failCount++;
                console.error(`Lỗi lưu dòng ${row.originalIndex}:`, err);
            }
        }

        setIsSavingExcel(false);
        setShowExcelPreviewModal(false);
        setExcelPreviewData([]);

        if (createdCount > 0 || updatedCount > 0) {
            showToast('success', `Thêm mới ${createdCount} sản phẩm, Cập nhật ${updatedCount} sản phẩm thành công!`);
            fetchProducts();
        }
        if (failCount > 0) {
            showToast('error', `Có ${failCount} sản phẩm lưu thất bại.`);
        }
    };


    const getErrorMessage = (error, fallback) => (
        error.response?.data?.userMessage ||
        error.response?.data?.message ||
        fallback
    );

    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchLookups = useCallback(async () => {
        const lookupRequests = [
            { key: 'units', label: 'đơn vị tính', request: axiosClient.get('/units?size=1000') },
            { key: 'categories', label: 'danh mục', request: axiosClient.get('/product-categories?size=1000') },
            { key: 'brands', label: 'thương hiệu', request: axiosClient.get('/brands?size=1000') }
        ];

        try {
            const [unitRes, categoryRes, brandRes] = await Promise.all(lookupRequests.map((item) => item.request));
            setUnits(getPageContent(unitRes));
            setCategories(getPageContent(categoryRes).filter((item) => item.status !== 'INACTIVE'));
            setBrands(getPageContent(brandRes).filter((item) => item.status !== 'INACTIVE'));
        } catch (error) {
            const results = await Promise.allSettled(lookupRequests.map((item) => item.request));
            const failedLabels = results
                .map((result, index) => result.status === 'rejected' ? lookupRequests[index].label : null)
                .filter(Boolean);
            console.error('Lỗi lấy dữ liệu danh mục sản phẩm:', error);
            showToast('error', failedLabels.length
                ? `Không thể tải ${failedLabels.join(', ')}. Vui lòng kiểm tra quyền xem.`
                : 'Không thể tải danh mục, thương hiệu hoặc đơn vị tính.');
        }
    }, []);


    const fetchAllVariants = useCallback(async () => {
        try {
            const res = await axiosClient.get('/products/variants?size=1000');
            const content = res.data?.data?.content || res.data?.content || [];
            setAllVariants(content);
        } catch (error) {
            console.error('Lỗi lấy danh sách SKU:', error);
        }
    }, []);

    useEffect(() => {
        fetchAllVariants();
    }, [fetchAllVariants]);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const searchQuery = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
            const categoryQuery = categoryFilter ? `&categoryId=${categoryFilter}` : '';
            const typeQuery = typeFilter ? `&productType=${encodeURIComponent(typeFilter)}` : '';
            const brandQuery = brandFilter ? `&brandId=${brandFilter}` : '';
            const unitQuery = unitFilter ? `&unitId=${unitFilter}` : '';

            const [productsResult, stockSummaryResult] = await Promise.allSettled([
                axiosClient.get(`/products?page=${page}&size=${size}${searchQuery}${categoryQuery}${typeQuery}${brandQuery}${unitQuery}`),
                axiosClient.get('/products/stock-alert-summary')
            ]);

            if (productsResult.status === 'rejected') throw productsResult.reason;

            const res = productsResult.value;
            const content = res.data.content || [];
            setProducts(content);
            setTotalPages(res.data.totalPages || 0);
            setTotalElements(res.data.totalElements || 0);

            if (stockSummaryResult.status === 'fulfilled') {
                const summary = stockSummaryResult.value.data || {};
                setLowStockCount(Number(summary.lowStockCount || 0));
                setOutOfStockCount(Number(summary.outOfStockCount || 0));
            } else {
                console.error('Lỗi lấy tổng hợp cảnh báo tồn kho:', stockSummaryResult.reason);
            }
        } catch (error) {
            console.error('Lỗi lấy danh sách hàng hóa:', error);
            showToast('error', 'Không thể tải danh sách sản phẩm.');
        } finally {
            setLoading(false);
            setStockFilter('ALL');
        }
    }, [page, size, searchTerm, categoryFilter, typeFilter, brandFilter, unitFilter]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            fetchLookups();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [fetchLookups]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            fetchProducts();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [fetchProducts]);

    const buildInitialFormData = (overrides = {}) => ({
        ...defaultFormData,
        categoryId: '',
        brandId: '',
        unitId: '',
        ...overrides
    });

    const handleSearch = (event) => {
        if (event.key === 'Enter') {
            setPage(0);
            setSearchTerm(tempSearch.trim());
        }
    };

    const handleSearchBtnClick = () => {
        setPage(0);
        setSearchTerm(tempSearch.trim());
    };

    const handleOpenAdd = () => {
        setIsEdit(false);
        setFormData(buildInitialFormData());
        setBomLines(getPredefinedBomLines(categories));
        setActiveTab('bom');
        setWarrantyQty('');
        setWarrantyUnit('Tháng');
        setErrorMsg('');
        setShowQuickAddCat(false);
        setShowQuickAddUnit(false);
        setShowQuickAddBrand(false);
        setShowModal(true);
    };

    const handleOpenEdit = async (product) => {
        setIsEdit(true);
        setFormData(buildInitialFormData({
            id: product.id,
            productCode: product.productCode || '',
            productName: product.productName || '',
            productType: product.productType || 'Hàng hóa',
            categoryId: product.categoryId || '',
            brandId: product.brandId || '',
            unitId: product.unitId || '',
            salePrice: Number(product.salePrice || 0),
            description: product.description || '',
            imageUrl: product.imageUrl || '',
            trackSerial: Boolean(product.trackSerial),
            trackLot: Boolean(product.trackLot),
            isAssembly: Boolean(product.isAssembly),
            active: product.active !== false,
            minStockQty: Number(product.minStockQty) || '',
            taxReductionStatus: product.taxReductionStatus || 'NORMAL'
        }));

        if (product.warrantyPeriod) {
            const parts = product.warrantyPeriod.split(' ');
            if (parts.length >= 2) {
                setWarrantyQty(Number(parts[0]) || 0);
                setWarrantyUnit(parts[1]);
            } else {
                setWarrantyQty(product.warrantyPeriodMonths || 0);
                setWarrantyUnit('Tháng');
            }
        } else {
            setWarrantyQty(product.warrantyPeriodMonths || 0);
            setWarrantyUnit('Tháng');
        }

        let loadedBomLines = product.bomLines || [];
        if (product.productType === 'Thành phẩm') {
            if (product.bomTemplate) {
                try {
                    loadedBomLines = JSON.parse(product.bomTemplate);
                } catch (e) {
                    console.error("Lỗi parse cấu hình khung", e);
                }
            }
        }

        if (loadedBomLines.length === 0) {
            loadedBomLines = getPredefinedBomLines(categories);
        }

        setBomLines(loadedBomLines);
        setErrorMsg('');
        setActiveTab(product.productType === 'Thành phẩm' ? 'bom' : 'units');
        setShowQuickAddCat(false);
        setShowQuickAddUnit(false);
        setShowQuickAddBrand(false);
        setShowModal(true);
        setOpenDropdownId(null);
    };

    const handleDuplicate = (product) => {
        setIsEdit(false);
        setFormData(buildInitialFormData({
            productCode: `${product.productCode}-CP`,
            productName: `${product.productName} - Copy`,
            productType: product.productType || 'Hàng hóa',
            categoryId: product.categoryId || '',
            brandId: product.brandId || '',
            unitId: product.unitId || '',
            salePrice: Number(product.salePrice || 0),
            description: product.description || '',
            imageUrl: product.imageUrl || '',
            trackSerial: Boolean(product.trackSerial),
            trackLot: Boolean(product.trackLot),
            isAssembly: Boolean(product.isAssembly),
            active: product.active !== false,
            taxReductionStatus: product.taxReductionStatus || 'NORMAL'
        }));

        if (product.warrantyPeriod) {
            const parts = product.warrantyPeriod.split(' ');
            if (parts.length >= 2) {
                setWarrantyQty(Number(parts[0]) || '');
                setWarrantyUnit(parts[1]);
            } else {
                setWarrantyQty(product.warrantyPeriodMonths || '');
                setWarrantyUnit('Tháng');
            }
        } else {
            setWarrantyQty(product.warrantyPeriodMonths || '');
            setWarrantyUnit('Tháng');
        }

        setErrorMsg('');
        setActiveTab(product.productType === 'Thành phẩm' ? 'bom' : 'units');
        setShowQuickAddCat(false);
        setShowQuickAddUnit(false);
        setShowQuickAddBrand(false);
        setShowModal(true);
        setOpenDropdownId(null);
    };

    const buildPayload = (data) => {
        const isService = isServiceType(data.productType);
        let finalBrandId = Number(data.brandId) || null;
        if (!finalBrandId && !isService) {
            const khacBrand = brands.find(b => b.name && b.name.trim().toLowerCase() === 'khác');
            finalBrandId = khacBrand ? Number(khacBrand.id) : null;
        }

        return {
            productCode: data.productCode.trim().toUpperCase(),
            productName: data.productName.trim(),
            productType: data.productType || 'Hàng hóa',
            categoryId: isService ? null : (Number(data.categoryId) || null),
            brandId: isService ? null : finalBrandId,
            unitId: Number(data.unitId),
            salePrice: Number(data.salePrice || 0),
            description: data.description?.trim() || '',
            imageUrl: data.imageUrl || '',
            active: data.active,
            trackSerial: isService ? false : Boolean(data.trackSerial),
            trackLot: isService ? false : Boolean(data.trackLot),
            taxReductionStatus: data.taxReductionStatus || 'NORMAL',
            isAssembly: data.productType === 'Thành phẩm',
            bomLines: data.productType === 'Thành phẩm' ? bomLines.filter(line => line.componentVariantId).map(line => ({
                componentVariantId: Number(line.componentVariantId),
                componentRole: line.componentRole,
                quantity: Number(line.quantity || 0),
                note: line.note || ''
            })) : [],
            minStockQty: isService ? 0 : Number(data.minStockQty || 0),
            warrantyPeriod: warrantyQty > 0 ? `${warrantyQty} ${warrantyUnit}` : null,
            warrantyPeriodMonths: warrantyQty > 0 ? (warrantyUnit === 'Năm' ? warrantyQty * 12 : warrantyQty) : 0
        };
    };

    const handleProductImageUpload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }

        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('folder', 'products');

        try {
            setUploadingImage(true);
            setErrorMsg('');
            const response = await axiosClient.post('/uploads/images', uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const imageUrl = response.data?.data?.secureUrl || response.data?.data?.url || '';
            setFormData((current) => ({ ...current, imageUrl }));
        } catch (error) {
            setErrorMsg(getErrorMessage(error, 'Không thể tải ảnh sản phẩm.'));
        } finally {
            setUploadingImage(false);
        }
    };

    const validateForm = () => {
        if (isEdit && !formData.productCode.trim()) return 'Mã sản phẩm không được để trống.';
        if (!formData.productName.trim()) return 'Tên sản phẩm không được để trống.';
        if (!formData.categoryId && formData.productType !== 'Dịch vụ') return 'Vui lòng chọn danh mục.';
        if (!formData.unitId) return 'Vui lòng chọn đơn vị tính.';
        if (formData.salePrice === '' || Number.isNaN(Number(formData.salePrice))) return 'Giá bán không hợp lệ.';
        if (Number(formData.salePrice) < 0) return 'Giá bán không được âm.';
        if (formData.productType === 'Thành phẩm') {
            const validBomLines = bomLines.filter(l => l.categoryId);
            if (validBomLines.length === 0) return 'Vui lòng chọn ít nhất một danh mục cho định mức cấu hình.';
        }
        return '';
    };

    const resetAddForm = () => {
        setFormData(buildInitialFormData());
        setIsEdit(false);
    };

    const handleSave = async (closeAfterSave = true) => {
        const validationMessage = validateForm();
        if (validationMessage) {
            setErrorMsg(validationMessage);
            return;
        }

        try {
            const payload = buildPayload(formData);
            if (payload.productType === 'Thành phẩm') {
                const validBomLines = bomLines.filter(l => l.categoryId || l.componentVariantId);
                if (validBomLines.length > 0) {
                    const linesPayload = validBomLines.map((l, idx) => {
                        const selectedCat = categories.find(c => String(c.id) === String(l.categoryId));
                        const roleName = selectedCat ? selectedCat.name : (l.componentRole || '');

                        return {
                            componentVariantId: l.componentVariantId ? Number(l.componentVariantId) : null,
                            componentRole: roleName,
                            quantity: l.quantity ? Number(l.quantity) : null,
                            categoryId: l.categoryId,
                            note: l.note || ''
                        };
                    });
                    payload.bomTemplate = JSON.stringify(linesPayload);
                } else {
                    payload.bomTemplate = null;
                }
            }

            let savedProductId = null;
            if (isEdit) {
                await axiosClient.put(`/products/${formData.id}`, payload);
                savedProductId = formData.id;
                showToast('success', 'Cập nhật sản phẩm thành công.');
            } else {
                const res = await axiosClient.post('/products', payload);
                savedProductId = res.data?.data?.id || res.data?.id;
                showToast('success', 'Thêm sản phẩm thành công.');
            }

            await fetchProducts();
            await fetchAllVariants();
            if (closeAfterSave) {
                setShowModal(false);
            } else {
                resetAddForm();
            }
        } catch (error) {
            const message = getErrorMessage(error, 'Có lỗi xảy ra khi lưu sản phẩm.');
            setErrorMsg(message);
            showToast('error', message);
        }
    };

    const handleToggleStatus = async (product) => {
        try {
            const payload = buildPayload({
                ...product,
                active: !product.active,
                salePrice: Number(product.salePrice || 0)
            });
            await axiosClient.put(`/products/${product.id}`, payload);
            fetchProducts();
            fetchAllVariants();
            showToast('success', product.active ? 'Đã ngừng sử dụng sản phẩm.' : 'Đã kích hoạt sản phẩm.');
        } catch (error) {
            console.error('Lỗi cập nhật trạng thái sản phẩm:', error);
            showToast('error', getErrorMessage(error, 'Có lỗi xảy ra khi cập nhật trạng thái sản phẩm.'));
        }
        setOpenDropdownId(null);
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            type: 'PRODUCT',
            id,
            title: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa sản phẩm này không?'
        });
        setOpenDropdownId(null);
    };

    const fetchVariants = async (productId) => {
        try {
            setLoadingVariants(true);
            const res = await axiosClient.get(`/products/${productId}/variants`);
            setVariants(res.data || []);
        } catch (error) {
            showToast('error', getErrorMessage(error, 'Không thể tải danh sách SKU.'));
        } finally {
            setLoadingVariants(false);
        }
    };

    const parseSpecsToList = (jsonStr) => {
        if (!jsonStr) return [{ id: globalSpecIdCounter++, key: '', value: '' }];
        try {
            const obj = JSON.parse(jsonStr);
            if (typeof obj === 'object' && obj !== null) {
                const entries = Object.entries(obj);
                if (entries.length > 0) {
                    return entries.map(([key, value]) => ({
                        id: globalSpecIdCounter++,
                        key,
                        value: String(value)
                    }));
                }
            }
        } catch (e) {
            console.error('Lỗi parse specs:', e);
        }
        return [{ id: globalSpecIdCounter++, key: '', value: '' }];
    };

    const buildSpecsJsonFromList = (list) => {
        const result = {};
        list.forEach(item => {
            if (item.key && item.key.trim()) {
                result[item.key.trim()] = item.value ? item.value.trim() : '';
            }
        });
        return Object.keys(result).length > 0 ? JSON.stringify(result) : '';
    };

    const handleAddSpecRow = () => {
        setSpecList(prev => [...prev, { id: globalSpecIdCounter++, key: '', value: '' }]);
    };

    const handleRemoveSpecRow = (id) => {
        setSpecList(prev => {
            const filtered = prev.filter(item => item.id !== id);
            return filtered.length > 0 ? filtered : [{ id: globalSpecIdCounter++, key: '', value: '' }];
        });
    };

    const handleSpecChange = (id, field, value) => {
        setSpecList(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const openVariantModal = async (product) => {
        setSelectedProduct(product);
        setVariantForm({
            ...defaultVariantData,
            sku: product.productCode || '',
            variantName: product.productName || '',
            salePrice: Number(product.salePrice || 0),
            warrantyMonths: Number(product.warrantyPeriodMonths) || ''
        });
        setSpecList([{ id: globalSpecIdCounter++, key: '', value: '' }]);
        setUseRawJson(false);
        setVariantError('');
        setShowVariantModal(true);
        setOpenDropdownId(null);
        await fetchVariants(product.id);
    };

    const editVariant = (variant) => {
        setVariantForm({
            id: variant.id,
            sku: variant.sku || '',
            variantName: variant.variantName || '',
            costPrice: Number(variant.costPrice || 0),
            salePrice: Number(variant.salePrice || 0),
            manufacturerPartNumber: variant.manufacturerPartNumber || '',
            specsJson: variant.specsJson || '',
            active: variant.active !== false,
            warrantyMonths: Number(variant.warrantyMonths) || ''
        });
        setSpecList(parseSpecsToList(variant.specsJson));
        setUseRawJson(false);
        setVariantError('');
    };

    const resetVariantForm = () => {
        setVariantForm({
            ...defaultVariantData,
            sku: selectedProduct?.productCode || '',
            variantName: selectedProduct?.productName || '',
            salePrice: Number(selectedProduct?.salePrice || 0),
            warrantyMonths: Number(selectedProduct?.warrantyPeriodMonths) || ''
        });
        setSpecList([{ id: globalSpecIdCounter++, key: '', value: '' }]);
        setUseRawJson(false);
        setVariantError('');
    };

    const validateVariantForm = () => {
        if (!variantForm.sku.trim()) return 'SKU không được để trống.';
        if (!variantForm.variantName.trim()) return 'Tên SKU không được để trống.';
        if (variantForm.salePrice === '' || Number.isNaN(Number(variantForm.salePrice))) return 'Giá bán không hợp lệ.';
        if (Number(variantForm.salePrice) < 0) return 'Giá bán không được âm.';
        if (Number(variantForm.costPrice || 0) < 0) return 'Giá vốn không được âm.';
        return '';
    };

    const saveVariant = async () => {
        const validationMessage = validateVariantForm();
        if (validationMessage) {
            setVariantError(validationMessage);
            return;
        }
        try {
            const specsJsonPayload = useRawJson
                ? (variantForm.specsJson?.trim() || '')
                : buildSpecsJsonFromList(specList);

            const payload = {
                sku: variantForm.sku.trim().toUpperCase(),
                variantName: variantForm.variantName.trim(),
                costPrice: Number(variantForm.costPrice || 0),
                salePrice: Number(variantForm.salePrice || 0),
                manufacturerPartNumber: variantForm.manufacturerPartNumber?.trim() || '',
                specsJson: specsJsonPayload,
                active: variantForm.active,
                warrantyMonths: Number(variantForm.warrantyMonths || 0)
            };
            if (variantForm.id) {
                await axiosClient.put(`/products/${selectedProduct.id}/variants/${variantForm.id}`, payload);
                showToast('success', 'Cập nhật SKU thành công.');
            } else {
                await axiosClient.post(`/products/${selectedProduct.id}/variants`, payload);
                showToast('success', 'Thêm SKU thành công.');
            }
            resetVariantForm();
            await fetchVariants(selectedProduct.id);
        } catch (error) {
            const message = getErrorMessage(error, 'Có lỗi xảy ra khi lưu SKU.');
            setVariantError(message);
            showToast('error', message);
        }
    };

    const deleteVariant = (variantId) => {
        setConfirmModal({
            isOpen: true,
            type: 'SKU',
            id: variantId,
            title: 'Xác nhận xóa',
            message: 'Bạn có chắc chắn muốn xóa SKU này không?'
        });
    };

    const buildTimestamp = () => {
        return getVietnamTimestamp();
    };

    const handleExportExcel = async () => {
        try {
            const res = await axiosClient.get('/products/export', {
                params: {
                    search: searchTerm || undefined,
                    categoryId: categoryFilter || undefined,
                    productType: typeFilter || undefined,
                    brandId: brandFilter || undefined,
                    unitId: unitFilter || undefined
                },
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `DLC_WMS_Danh_Sach_San_Pham_${buildTimestamp()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            showToast('success', 'Xuất Excel sản phẩm thành công.');
        } catch (error) {
            console.error('Lỗi xuất Excel sản phẩm:', error);
            showToast('error', getErrorMessage(error, 'Có lỗi xảy ra khi xuất Excel sản phẩm.'));
        }
    };

    const formatCurrency = (value) => {
        const amount = Number(value || 0);
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatQuantity = (value) => {
        if (value === undefined || value === null) return '0';
        return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4
        }).format(value);
    };

    const getFilteredProducts = () => {
        if (stockFilter === 'ALL') return products;
        return products.filter((product) => {
            if (!isStockTrackedProduct(product)) return false;

            const qty = Number(product.stockQty || 0);
            const minQty = Number(product.minStockQty || 0);
            if (stockFilter === 'OUT_OF_STOCK') return qty <= 0;
            if (stockFilter === 'LOW_STOCK') return qty > 0 && minQty > 0 && qty <= minQty;
            return true;
        });
    };

    const filteredProducts = getFilteredProducts();
    const showStockColumn = columns.stockQty && !isServiceType(typeFilter);

    return (
        <AdminLayout>
            <div className={styles.pageBody}>
                <div className={styles.pageTitleContainer}>
                    <h1 className={styles.pageTitle}>Hàng hóa, dịch vụ</h1>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept=".xlsx, .xls"
                            onChange={handleImportExcel}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                color: '#475569',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onClick={handleDownloadTemplate}
                            title="Tải file mẫu Excel (.xlsx) chuẩn cấu trúc để điền dữ liệu"
                        >
                            <i className="bi bi-file-earmark-arrow-down" style={{ color: '#16a34a' }}></i> Tải file mẫu Excel
                        </button>
                        <button
                            type="button"
                            disabled={importing}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                color: '#475569',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: importing ? 'not-allowed' : 'pointer',
                                opacity: importing ? 0.7 : 1,
                                transition: 'all 0.15s ease'
                            }}
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            title="Tải tệp Excel chứa danh sách hàng hóa để nhập số lượng lớn vào hệ thống"
                        >
                            {importing ? (
                                <>
                                    <i className="fas fa-spinner fa-spin" style={{ color: '#2563eb' }}></i> Đang nhập...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-file-earmark-arrow-up" style={{ color: '#2563eb' }}></i> Nhập từ Excel
                                </>
                            )}
                        </button>
                        <button className={styles.btnPrimary} onClick={handleOpenAdd}>
                            <i className="bi bi-plus"></i> Thêm mới
                        </button>
                    </div>
                </div>



                <div className={styles.summaryCards}>
                    <div
                        className={`${styles.summaryCard} ${stockFilter === 'LOW_STOCK' ? styles.activeCardWarning : ''}`}
                        onClick={() => { setStockFilter(stockFilter === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK'); setPage(0); }}
                    >
                        <div className={styles.iconWarning}>
                            <i className="bi bi-box-seam"></i>
                        </div>
                        <div className={styles.cardInfo}>
                            <h3>{lowStockCount}</h3>
                            <p>Sản phẩm sắp hết hàng</p>
                        </div>
                    </div>
                    <div
                        className={`${styles.summaryCard} ${stockFilter === 'OUT_OF_STOCK' ? styles.activeCardDanger : ''}`}
                        onClick={() => { setStockFilter(stockFilter === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK'); setPage(0); }}
                    >
                        <div className={styles.iconDanger}>
                            <i className="bi bi-exclamation-triangle-fill"></i>
                        </div>
                        <div className={styles.cardInfo}>
                            <h3>{outOfStockCount}</h3>
                            <p>Sản phẩm hết hàng</p>
                        </div>
                    </div>
                </div>

                <div className={styles.filterSection}>
                    <div className={styles.searchAndPopover}>
                        <div className={styles.searchBox}>
                            <i className="bi bi-search"></i>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Nhập từ khóa tìm kiếm mã hoặc tên sản phẩm..."
                                value={tempSearch}
                                onChange={(e) => setTempSearch(e.target.value)}
                                onKeyDown={handleSearch}
                            />
                            {tempSearch && (
                                <button className={styles.clearSearchBtn} onClick={() => { setTempSearch(''); setSearchTerm(''); setPage(0); }}>
                                    <i className="bi bi-x-circle-fill"></i>
                                </button>
                            )}
                        </div>

                        <FilterPopover
                            filters={{ issuePurpose: categoryFilter, type: typeFilter, brand: brandFilter, unit: unitFilter }}
                            onApply={(f) => {
                                setCategoryFilter(f.issuePurpose || '');
                                setTypeFilter(f.type || '');
                                setBrandFilter(f.brand || '');
                                setUnitFilter(f.unit || '');
                                setPage(0);
                            }}
                            onReset={() => {
                                setCategoryFilter('');
                                setTypeFilter('');
                                setBrandFilter('');
                                setUnitFilter('');
                                setPage(0);
                            }}
                            purposeOptions={categories.map(c => ({ value: String(c.id), label: c.name }))}
                            purposeLabel="Danh mục"
                            showDateRange={false}
                            customSelects={[
                                {
                                    name: 'type',
                                    label: 'Loại sản phẩm',
                                    options: [
                                        { value: 'Hàng hóa', label: 'Hàng hóa' },
                                        { value: 'Dịch vụ', label: 'Dịch vụ' },
                                        { value: 'Thành phẩm', label: 'Thành phẩm' }
                                    ]
                                },
                                {
                                    name: 'brand',
                                    label: 'Thương hiệu',
                                    options: brands.map(b => ({ value: String(b.id), label: b.name }))
                                },
                                {
                                    name: 'unit',
                                    label: 'Đơn vị tính',
                                    options: units.map(u => ({ value: String(u.id), label: u.name }))
                                }
                            ]}
                        />
                    </div>
                    <div className={styles.filterActions}>
                        <button
                            className={styles.iconBtn}
                            onClick={() => {
                                setTempSearch('');
                                setSearchTerm('');
                                setCategoryFilter('');
                                setTypeFilter('');
                                setBrandFilter('');
                                setUnitFilter('');
                                setStockFilter('ALL');
                                setPage(0);
                            }}
                            title="Đặt lại bộ lọc"
                        >
                            <i className="bi bi-arrow-clockwise"></i>
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={handleExportExcel}
                            title="Xuất tệp Excel"
                        >
                            <i className="bi bi-file-earmark-excel"></i>
                        </button>
                        <button
                            className={styles.iconBtn}
                            onClick={() => setShowSettingsModal(true)}
                            title="Cấu hình hiển thị cột"
                        >
                            <i className="bi bi-gear"></i>
                        </button>
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input type="checkbox" className={styles.checkbox} />
                                </th>
                                {columns.image && <th style={{ width: '100px', textAlign: 'center' }}>Hình ảnh</th>}
                                {columns.productCode && <th style={{ width: '140px', whiteSpace: 'nowrap' }}>Mã sản phẩm</th>}
                                {columns.productName && <th style={{ minWidth: '220px' }}>Tên sản phẩm</th>}
                                {columns.productType && <th style={{ width: '90px' }}>Loại</th>}
                                {columns.category && <th style={{ width: '110px' }}>Danh mục</th>}
                                {columns.brand && <th style={{ width: '110px' }}>Thương hiệu</th>}
                                {columns.unit && <th style={{ width: '90px' }}>Đơn vị tính</th>}
                                {columns.salePrice && <th className={styles.textRight} style={{ width: '110px' }}>Giá bán</th>}
                                {showStockColumn && <th className={styles.textRight} style={{ width: '90px' }}>Tồn kho</th>}
                                <th className={styles.textCenter} style={{ width: '130px' }}>Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="11">
                                        <div className={styles.emptyState}>
                                            <div className={styles.emptyText}>Đang tải dữ liệu...</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="11">
                                        <div className={styles.emptyState}>
                                            <i className={`bi bi-inbox ${styles.emptyIcon}`}></i>
                                            <div className={styles.emptyText}>Không tìm thấy sản phẩm nào</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((item) => (
                                    <tr
                                        key={item.id}
                                        className={!item.active ? styles.inactiveRow : ''}
                                        onClick={() => setDetailProduct(item)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td style={{ textAlign: 'center' }} onClick={(event) => event.stopPropagation()}>
                                            <input type="checkbox" className={styles.checkbox} />
                                        </td>
                                        {columns.image && (
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ width: '64px', height: '64px', margin: '0 auto', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {item.imageUrl ? (
                                                        <img src={item.imageUrl} alt={item.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <i className="bi bi-image" style={{ color: '#9ca3af', fontSize: '24px' }}></i>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        {columns.productCode && <td style={{ whiteSpace: 'nowrap' }}><span className={styles.link}>{item.productCode}</span></td>}
                                        {columns.productName && <td style={{ fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal', minWidth: '220px' }} title={item.productName}>{item.productName}</td>}
                                        {columns.productType && <td>{item.productType || '-'}</td>}
                                        {columns.category && <td>{item.categoryName || '-'}</td>}
                                        {columns.brand && <td>{item.brandName || '-'}</td>}
                                        {columns.unit && <td>{item.unitName || '-'}</td>}
                                        {columns.salePrice && <td className={`${styles.money} ${styles.textRight}`}>{formatCurrency(item.salePrice)}</td>}
                                        {showStockColumn && (
                                            <td className={styles.textRight}>
                                                {isStockTrackedProduct(item) ? formatQuantity(item.stockQty) : '-'}
                                            </td>
                                        )}
                                        <td className={styles.textCenter} style={{ whiteSpace: 'nowrap' }} onClick={(event) => event.stopPropagation()}>
                                            <i
                                                className="bi bi-pencil"
                                                style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px', marginRight: '12px' }}
                                                title="Sửa sản phẩm"
                                                onClick={() => handleOpenEdit(item)}
                                            ></i>
                                            <i
                                                className="bi bi-upc-scan"
                                                style={{ cursor: 'pointer', color: 'var(--color-primary)', fontSize: '16px', marginRight: '12px' }}
                                                title="In mã vạch"
                                                onClick={() => setPrintBarcodeProduct(item)}
                                            ></i>
                                            <i
                                                className="bi bi-gear"
                                                style={{ cursor: 'pointer', color: 'var(--color-text-muted-2)', fontSize: '16px', marginRight: '12px' }}
                                                title="Quản lý SKU"
                                                onClick={() => openVariantModal(item)}
                                            ></i>
                                            <i
                                                className={item.active ? "bi bi-slash-circle" : "bi bi-check2-circle"}
                                                style={{ cursor: 'pointer', color: item.active ? 'var(--color-text-muted-2)' : 'var(--color-success)', fontSize: '16px', marginRight: '12px' }}
                                                title={item.active ? "Ngừng sử dụng" : "Kích hoạt"}
                                                onClick={() => handleToggleStatus(item)}
                                            ></i>
                                            <i
                                                className="bi bi-trash"
                                                style={{ cursor: 'pointer', color: 'var(--color-danger)', fontSize: '16px' }}
                                                title="Xóa"
                                                onClick={() => handleDelete(item.id)}
                                            ></i>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={styles.pagination}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Hiển thị</span>
                        <SearchableSelect
                            className="misa-select"
                            style={{ width: '70px', height: '32px', padding: '0 8px' }}
                            value={size}
                            onChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </SearchableSelect>
                        <span>trên tổng số {totalElements} bản ghi</span>
                    </div>

                    {totalPages > 1 && (
                        <div className={styles.pageControls}>
                            <button
                                disabled={page === 0}
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                className={styles.pageBtn}
                            >
                                <i className="bi bi-chevron-left"></i>
                                <span>Trước</span>
                            </button>
                            <span className={styles.pageNumber} style={{ width: 'auto', padding: '0 8px', fontWeight: 'bold' }}>
                                Trang {page + 1} / {totalPages}
                            </span>
                            <button
                                disabled={page >= totalPages - 1}
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                className={styles.pageBtn}
                            >
                                <span>Sau</span>
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    )}
                </div>

                {showModal && (
                    <div className="misa-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
                        <div className="misa-modal" style={{ width: '750px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

                            {/* ── Modal Header ── */}
                            <div className="misa-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Thông tin vật tư, hàng hóa, dịch vụ</span>
                                    <div style={{ position: 'relative' }}>
                                        <span
                                            className={styles.productTypeBadge}
                                            onClick={(e) => { e.stopPropagation(); setShowTypeMenu(v => !v); }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <i className="fas fa-box" style={{ fontSize: '11px' }}></i> {formData.productType}
                                        </span>
                                        {showTypeMenu && (
                                            <div className={styles.typeMenu} onClick={(e) => e.stopPropagation()}>
                                                {['Hàng hóa', 'Thành phẩm', 'Dịch vụ'].map(type => (
                                                    <div
                                                        key={type}
                                                        className={styles.typeMenuItem + (formData.productType === type ? ' ' + styles.typeMenuItemActive : '')}
                                                        onClick={() => {
                                                            const isService = isServiceType(type);
                                                            setFormData(fd => ({
                                                                ...fd,
                                                                productType: type,
                                                                categoryId: isService ? '' : fd.categoryId,
                                                                brandId: isService ? '' : fd.brandId,
                                                                minStockQty: isService ? '' : fd.minStockQty,
                                                                trackLot: isService ? false : fd.trackLot,
                                                                // Bắt buộc trackSerial = true khi là Thành phẩm
                                                                trackSerial: isService ? false : (type === 'Thành phẩm' ? true : fd.trackSerial)
                                                            }));
                                                            setShowTypeMenu(false);
                                                            if (type === 'Thành phẩm') {
                                                                setActiveTab('bom');
                                                                if (bomLines.length === 0) {
                                                                    setBomLines(getPredefinedBomLines(categories));
                                                                }
                                                            } else if (type === 'Hàng hóa') {
                                                                setActiveTab('units');
                                                            }
                                                        }}
                                                    >
                                                        {type}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <i className="fas fa-question-circle" style={{ color: '#9ca3af', fontSize: '16px', cursor: 'pointer' }}></i>
                                    <i className="fas fa-times" onClick={() => setShowModal(false)} style={{ cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}></i>
                                </div>
                            </div>

                            {/* ── Modal Body ── */}
                            <div className="misa-modal-body" style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, backgroundColor: '#fff' }}>
                                {errorMsg && <div className={styles.modalError} style={{ marginBottom: 12 }}>{errorMsg}</div>}

                                <div style={{ display: 'flex', gap: '20px' }}>
                                    {/* ─── Left form section ─── */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {/* Row 1: Tên */}
                                        <div className={styles.formField}>
                                            <label className={styles.fieldLabel}>Tên <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                className={styles.fieldInput}
                                                value={formData.productName}
                                                onChange={(e) => setFormData(fd => ({ ...fd, productName: e.target.value }))}
                                                placeholder="Nhập tên vật tư, hàng hóa"
                                            />
                                        </div>

                                        {/* Row 2: Mã + (Danh mục OR Đơn vị tính chính for Dịch vụ) */}
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                            {isEdit && (
                                                <div className={styles.formField} style={{ width: '38%', flexShrink: 0 }}>
                                                    <label className={styles.fieldLabel}>Mã</label>
                                                    <input
                                                        type="text"
                                                        className={styles.fieldInput}
                                                        value={formData.productCode}
                                                        disabled={true}
                                                    />
                                                </div>
                                            )}

                                            {formData.productType !== 'Dịch vụ' ? (
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Danh mục</label>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <SearchableSelect
                                                            className={styles.fieldInput}
                                                            value={formData.categoryId}
                                                            onChange={(e) => setFormData(fd => ({ ...fd, categoryId: e.target.value }))}
                                                        >
                                                            <option value="">Chọn danh mục</option>
                                                            {categories.map(cat => (
                                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                            ))}
                                                        </SearchableSelect>
                                                        <button
                                                            className={styles.addInlineBtn}
                                                            title="Thêm nhanh danh mục"
                                                            type="button"
                                                            onClick={() => {
                                                                const nextState = !showQuickAddCat;
                                                                setShowQuickAddCat(nextState);
                                                                if (nextState) {
                                                                    setShowQuickAddUnit(false);
                                                                    setShowQuickAddBrand(false);
                                                                    setQuickCatForm({ name: '', description: '' });
                                                                }
                                                            }}
                                                        >+</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Đơn vị tính</label>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <SearchableSelect
                                                            className={styles.fieldInput}
                                                            value={formData.unitId}
                                                            onChange={(e) => setFormData(fd => ({ ...fd, unitId: e.target.value }))}
                                                        >
                                                            <option value="">Chọn đơn vị tính</option>
                                                            {units.map(u => (
                                                                <option key={u.id} value={u.id}>{u.name}</option>
                                                            ))}
                                                        </SearchableSelect>
                                                        <button className={styles.addInlineBtn} title="Thêm đơn vị tính mới" type="button" onClick={() => {
                                                            const nextState = !showQuickAddUnit;
                                                            setShowQuickAddUnit(nextState);
                                                            if (nextState) {
                                                                setShowQuickAddCat(false);
                                                                setShowQuickAddBrand(false);
                                                                setQuickUnitForm({ name: '', description: '' });
                                                            }
                                                        }}>+</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Quick Add Cat Panel (only relevant if not Dịch vụ) */}
                                        {formData.productType !== 'Dịch vụ' && showQuickAddCat && (
                                            <div className={styles.quickAddPanel}>
                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label className={styles.fieldLabel} style={{ fontSize: '11px' }}>Tên danh mục <span className="required">*</span></label>
                                                        <input
                                                            type="text"
                                                            className={styles.fieldInput}
                                                            style={{ fontSize: '12px', padding: '5px 8px' }}
                                                            value={quickCatForm.name}
                                                            onChange={(e) => setQuickCatForm(f => ({ ...f, name: e.target.value }))}
                                                            placeholder="Tên danh mục"
                                                            autoFocus
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (!quickCatForm.name.trim()) return;
                                                                    setSavingCat(true);
                                                                    try {
                                                                        const res = await axiosClient.post('/product-categories', { name: quickCatForm.name.trim(), description: quickCatForm.description?.trim() || '', status: 'ACTIVE' });
                                                                        const newCat = res.data?.data ?? res.data;
                                                                        setCategories(prev => [...prev, newCat]);
                                                                        setFormData(fd => ({ ...fd, categoryId: newCat.id }));
                                                                        setShowQuickAddCat(false);
                                                                        showToast('success', `Đã thêm danh mục "${newCat.name}"`);
                                                                    } catch (err) {
                                                                        showToast('error', err.response?.data?.userMessage || 'Không thể thêm danh mục.');
                                                                    } finally {
                                                                        setSavingCat(false);
                                                                    }
                                                                }
                                                                if (e.key === 'Escape') setShowQuickAddCat(false);
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 2 }}>
                                                        <label className={styles.fieldLabel} style={{ fontSize: '11px' }}>Mô tả</label>
                                                        <input
                                                            type="text"
                                                            className={styles.fieldInput}
                                                            style={{ fontSize: '12px', padding: '5px 8px' }}
                                                            value={quickCatForm.description}
                                                            onChange={(e) => setQuickCatForm(f => ({ ...f, description: e.target.value }))}
                                                            placeholder="Mô tả"
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (!quickCatForm.name.trim()) return;
                                                                    setSavingCat(true);
                                                                    try {
                                                                        const res = await axiosClient.post('/product-categories', { name: quickCatForm.name.trim(), description: quickCatForm.description?.trim() || '', status: 'ACTIVE' });
                                                                        const newCat = res.data?.data ?? res.data;
                                                                        setCategories(prev => [...prev, newCat]);
                                                                        setFormData(fd => ({ ...fd, categoryId: newCat.id }));
                                                                        setShowQuickAddCat(false);
                                                                        showToast('success', `Đã thêm danh mục "${newCat.name}"`);
                                                                    } catch (err) {
                                                                        showToast('error', err.response?.data?.userMessage || 'Không thể thêm danh mục.');
                                                                    } finally {
                                                                        setSavingCat(false);
                                                                    }
                                                                }
                                                                if (e.key === 'Escape') setShowQuickAddCat(false);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <button type="button" className={styles.quickCancelBtn} onClick={() => setShowQuickAddCat(false)}>Hủy</button>
                                                    <button type="button" className={styles.quickSaveBtn} disabled={savingCat || !quickCatForm.name.trim()} onClick={async () => {
                                                        if (!quickCatForm.name.trim()) return;
                                                        setSavingCat(true);
                                                        try {
                                                            const res = await axiosClient.post('/product-categories', { name: quickCatForm.name.trim(), description: quickCatForm.description?.trim() || '', status: 'ACTIVE' });
                                                            const newCat = res.data?.data ?? res.data;
                                                            setCategories(prev => [...prev, newCat]);
                                                            setFormData(fd => ({ ...fd, categoryId: newCat.id }));
                                                            setShowQuickAddCat(false);
                                                            showToast('success', `Đã thêm danh mục "${newCat.name}"`);
                                                        } catch (err) {
                                                            showToast('error', err.response?.data?.userMessage || 'Không thể thêm danh mục.');
                                                        } finally {
                                                            setSavingCat(false);
                                                        }
                                                    }}>
                                                        {savingCat ? <i className="fas fa-spinner fa-spin"></i> : 'Lưu'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Row 3: Hàng hóa -> Đơn vị tính + Thương hiệu, Thành phẩm -> Đơn vị tính + Bảo hành, Dịch vụ -> Bảo hành + Giá */}
                                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                            {/* Đơn vị tính chính cho Hàng hóa / Thành phẩm */}
                                            {formData.productType !== 'Dịch vụ' && (
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Đơn vị tính</label>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <SearchableSelect
                                                            className={styles.fieldInput}
                                                            value={formData.unitId}
                                                            onChange={(e) => setFormData(fd => ({ ...fd, unitId: e.target.value }))}
                                                        >
                                                            <option value="">Chọn đơn vị tính</option>
                                                            {units.map(u => (
                                                                <option key={u.id} value={u.id}>{u.name}</option>
                                                            ))}
                                                        </SearchableSelect>
                                                        <button className={styles.addInlineBtn} title="Thêm đơn vị tính mới" type="button" onClick={() => {
                                                            const nextState = !showQuickAddUnit;
                                                            setShowQuickAddUnit(nextState);
                                                            if (nextState) {
                                                                setShowQuickAddCat(false);
                                                                setShowQuickAddBrand(false);
                                                                setQuickUnitForm({ name: '', description: '' });
                                                            }
                                                        }}>+</button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Slot 2 of Row 3 */}
                                            {formData.productType === 'Hàng hóa' && (
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Thương hiệu</label>
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <SearchableSelect
                                                            className={styles.fieldInput}
                                                            value={formData.brandId}
                                                            onChange={(e) => setFormData(fd => ({ ...fd, brandId: e.target.value }))}
                                                        >
                                                            <option value="">Chọn thương hiệu</option>
                                                            {brands && brands.map(b => (
                                                                <option key={b.id} value={b.id}>{b.name}</option>
                                                            ))}
                                                        </SearchableSelect>
                                                        <button className={styles.addInlineBtn} title="Thêm nhanh thương hiệu" type="button" onClick={() => {
                                                            const nextState = !showQuickAddBrand;
                                                            setShowQuickAddBrand(nextState);
                                                            if (nextState) {
                                                                setShowQuickAddCat(false);
                                                                setShowQuickAddUnit(false);
                                                                setQuickBrandForm({ name: '', description: '' });
                                                            }
                                                        }}>+</button>
                                                    </div>
                                                </div>
                                            )}

                                            {formData.productType === 'Thành phẩm' && (
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Thời hạn bảo hành</label>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input
                                                            type="text" className={styles.fieldInput} style={{ width: '80px', flexShrink: 0 }}
                                                            value={warrantyQty} onChange={(e) => {
                                                                const val = e.target.value.replace(/\D/g, '');
                                                                setWarrantyQty(val ? Number(val) : '');
                                                            }}
                                                            placeholder="0"
                                                        />
                                                        <SearchableSelect
                                                            className={styles.fieldInput} style={{ width: '110px', flexShrink: 0 }}
                                                            value={warrantyUnit} onChange={(e) => setWarrantyUnit(e.target.value)}
                                                        >
                                                            <option value="Tháng">Tháng</option>
                                                            <option value="Năm">Năm</option>
                                                        </SearchableSelect>
                                                    </div>
                                                </div>
                                            )}

                                            {formData.productType === 'Dịch vụ' && (
                                                <>
                                                    <div className={styles.formField} style={{ flex: 1 }}>
                                                        <label className={styles.fieldLabel}>Thời hạn bảo hành</label>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <input
                                                                type="text" className={styles.fieldInput} style={{ width: '80px', flexShrink: 0 }}
                                                                value={warrantyQty} onChange={(e) => {
                                                                    const val = e.target.value.replace(/\D/g, '');
                                                                    setWarrantyQty(val ? Number(val) : '');
                                                                }}
                                                                placeholder="0"
                                                            />
                                                            <SearchableSelect
                                                                className={styles.fieldInput} style={{ width: '110px', flexShrink: 0 }}
                                                                value={warrantyUnit} onChange={(e) => setWarrantyUnit(e.target.value)}
                                                            >
                                                                <option value="Tháng">Tháng</option>
                                                                <option value="Năm">Năm</option>
                                                            </SearchableSelect>
                                                        </div>
                                                    </div>
                                                    <div className={styles.formField} style={{ flex: 1 }}>
                                                        <label className={styles.fieldLabel}>Giá dịch vụ</label>
                                                        <input
                                                            type="text" className={styles.fieldInput}
                                                            value={formData.salePrice ? new Intl.NumberFormat('vi-VN').format(formData.salePrice) : ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/\D/g, '');
                                                                setFormData(fd => ({ ...fd, salePrice: val ? parseInt(val, 10) : 0 }));
                                                            }}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>


                                        {/* Quick Add Unit Panel */}
                                        {showQuickAddUnit && (
                                            <div className={styles.quickAddPanel} style={{ marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label className={styles.fieldLabel} style={{ fontSize: '11px' }}>Tên ĐVT <span className="required">*</span></label>
                                                        <input type="text" className={styles.fieldInput} style={{ fontSize: '12px', padding: '5px 8px' }}
                                                            value={quickUnitForm.name} onChange={e => setQuickUnitForm(f => ({ ...f, name: e.target.value }))}
                                                            placeholder="Tên đơn vị tính" autoFocus
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (!quickUnitForm.name.trim()) return;
                                                                    setSavingUnit(true);
                                                                    try {
                                                                        const res = await axiosClient.post('/units', { name: quickUnitForm.name.trim(), description: quickUnitForm.description?.trim() || '', status: 'ACTIVE' });
                                                                        const newObj = res.data?.data ?? res.data;
                                                                        setUnits(prev => [...prev, newObj]);
                                                                        setFormData(fd => ({ ...fd, unitId: newObj.id }));
                                                                        setShowQuickAddUnit(false);
                                                                        showToast('success', `Đã thêm ĐVT "${newObj.name}"`);
                                                                    } catch (err) {
                                                                        showToast('error', err.response?.data?.userMessage || 'Không thể thêm ĐVT.');
                                                                    } finally { setSavingUnit(false); }
                                                                }
                                                                if (e.key === 'Escape') setShowQuickAddUnit(false);
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 2 }}>
                                                        <label className={styles.fieldLabel} style={{ fontSize: '11px' }}>Mô tả</label>
                                                        <input type="text" className={styles.fieldInput} style={{ fontSize: '12px', padding: '5px 8px' }}
                                                            value={quickUnitForm.description} onChange={e => setQuickUnitForm(f => ({ ...f, description: e.target.value }))}
                                                            placeholder="Mô tả"
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (!quickUnitForm.name.trim()) return;
                                                                    setSavingUnit(true);
                                                                    try {
                                                                        const res = await axiosClient.post('/units', { name: quickUnitForm.name.trim(), description: quickUnitForm.description?.trim() || '', status: 'ACTIVE' });
                                                                        const newObj = res.data?.data ?? res.data;
                                                                        setUnits(prev => [...prev, newObj]);
                                                                        setFormData(fd => ({ ...fd, unitId: newObj.id }));
                                                                        setShowQuickAddUnit(false);
                                                                        showToast('success', `Đã thêm ĐVT "${newObj.name}"`);
                                                                    } catch (err) {
                                                                        showToast('error', err.response?.data?.userMessage || 'Không thể thêm ĐVT.');
                                                                    } finally { setSavingUnit(false); }
                                                                }
                                                                if (e.key === 'Escape') setShowQuickAddUnit(false);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button type="button" className={styles.quickCancelBtn} onClick={() => setShowQuickAddUnit(false)}>Hủy</button>
                                                    <button type="button" className={styles.quickSaveBtn} disabled={savingUnit || !quickUnitForm.name.trim()}
                                                        onClick={async () => {
                                                            setSavingUnit(true);
                                                            try {
                                                                const res = await axiosClient.post('/units', { name: quickUnitForm.name.trim(), description: quickUnitForm.description?.trim() || '', status: 'ACTIVE' });
                                                                const newObj = res.data?.data ?? res.data;
                                                                setUnits(prev => [...prev, newObj]);
                                                                setFormData(fd => ({ ...fd, unitId: newObj.id }));
                                                                setShowQuickAddUnit(false);
                                                                showToast('success', `Đã thêm ĐVT "${newObj.name}"`);
                                                            } catch (err) {
                                                                showToast('error', err.response?.data?.userMessage || 'Không thể thêm ĐVT.');
                                                            } finally { setSavingUnit(false); }
                                                        }}>
                                                        {savingUnit ? <i className="fas fa-spinner fa-spin"></i> : 'Lưu'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Quick Add Brand Panel */}
                                        {showQuickAddBrand && (
                                            <div className={styles.quickAddPanel} style={{ marginBottom: '12px' }}>
                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label className={styles.fieldLabel} style={{ fontSize: '11px' }}>Tên thương hiệu <span className="required">*</span></label>
                                                        <input type="text" className={styles.fieldInput} style={{ fontSize: '12px', padding: '5px 8px' }}
                                                            value={quickBrandForm.name} onChange={e => setQuickBrandForm(f => ({ ...f, name: e.target.value }))}
                                                            placeholder="Tên thương hiệu" autoFocus
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (!quickBrandForm.name.trim()) return;
                                                                    setSavingBrand(true);
                                                                    try {
                                                                        const res = await axiosClient.post('/brands', { name: quickBrandForm.name.trim(), description: quickBrandForm.description?.trim() || '', status: 'ACTIVE' });
                                                                        const newObj = res.data?.data ?? res.data;
                                                                        setBrands(prev => [...prev, newObj]);
                                                                        setFormData(fd => ({ ...fd, brandId: newObj.id }));
                                                                        setShowQuickAddBrand(false);
                                                                        showToast('success', `Đã thêm thương hiệu "${newObj.name}"`);
                                                                    } catch (err) {
                                                                        showToast('error', err.response?.data?.userMessage || 'Không thể thêm thương hiệu.');
                                                                    } finally { setSavingBrand(false); }
                                                                }
                                                                if (e.key === 'Escape') setShowQuickAddBrand(false);
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 2 }}>
                                                        <label className={styles.fieldLabel} style={{ fontSize: '11px' }}>Mô tả</label>
                                                        <input type="text" className={styles.fieldInput} style={{ fontSize: '12px', padding: '5px 8px' }}
                                                            value={quickBrandForm.description} onChange={e => setQuickBrandForm(f => ({ ...f, description: e.target.value }))}
                                                            placeholder="Mô tả"
                                                            onKeyDown={async (e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    if (!quickBrandForm.name.trim()) return;
                                                                    setSavingBrand(true);
                                                                    try {
                                                                        const res = await axiosClient.post('/brands', { name: quickBrandForm.name.trim(), description: quickBrandForm.description?.trim() || '', status: 'ACTIVE' });
                                                                        const newObj = res.data?.data ?? res.data;
                                                                        setBrands(prev => [...prev, newObj]);
                                                                        setFormData(fd => ({ ...fd, brandId: newObj.id }));
                                                                        setShowQuickAddBrand(false);
                                                                        showToast('success', `Đã thêm thương hiệu "${newObj.name}"`);
                                                                    } catch (err) {
                                                                        showToast('error', err.response?.data?.userMessage || 'Không thể thêm thương hiệu.');
                                                                    } finally { setSavingBrand(false); }
                                                                }
                                                                if (e.key === 'Escape') setShowQuickAddBrand(false);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button type="button" className={styles.quickCancelBtn} onClick={() => setShowQuickAddBrand(false)}>Hủy</button>
                                                    <button type="button" className={styles.quickSaveBtn} disabled={savingBrand || !quickBrandForm.name.trim()}
                                                        onClick={async () => {
                                                            setSavingBrand(true);
                                                            try {
                                                                const res = await axiosClient.post('/brands', { name: quickBrandForm.name.trim(), description: quickBrandForm.description?.trim() || '', status: 'ACTIVE' });
                                                                const newObj = res.data?.data ?? res.data;
                                                                setBrands(prev => [...prev, newObj]);
                                                                setFormData(fd => ({ ...fd, brandId: newObj.id }));
                                                                setShowQuickAddBrand(false);
                                                                showToast('success', `Đã thêm thương hiệu "${newObj.name}"`);
                                                            } catch (err) {
                                                                showToast('error', err.response?.data?.userMessage || 'Không thể thêm thương hiệu.');
                                                            } finally { setSavingBrand(false); }
                                                        }}>
                                                        {savingBrand ? <i className="fas fa-spinner fa-spin"></i> : 'Lưu'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Row 4: Hàng hóa -> Tồn kho tối thiểu + Giá bán, Thành phẩm -> none, Dịch vụ -> none */}
                                        {formData.productType === 'Hàng hóa' && (
                                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Cảnh báo hết hàng</label>
                                                    <input
                                                        type="text" className={styles.fieldInput}
                                                        value={formData.minStockQty} onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '');
                                                            setFormData(fd => ({ ...fd, minStockQty: val ? Number(val) : '' }));
                                                        }}
                                                        placeholder="0"
                                                    />
                                                </div>

                                                <div className={styles.formField} style={{ flex: 1 }}>
                                                    <label className={styles.fieldLabel}>Giá bán</label>
                                                    <input
                                                        type="text" className={styles.fieldInput}
                                                        value={formData.salePrice ? new Intl.NumberFormat('vi-VN').format(formData.salePrice) : ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '');
                                                            setFormData(fd => ({ ...fd, salePrice: val ? parseInt(val, 10) : 0 }));
                                                        }}
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Row 5: Hàng hóa -> Thời hạn bảo hành */}
                                        {formData.productType === 'Hàng hóa' && (
                                            <div className={styles.formField} style={{ marginTop: '12px' }}>
                                                <label className={styles.fieldLabel}>Thời hạn bảo hành</label>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <input
                                                        type="text" className={styles.fieldInput} style={{ width: '80px', flexShrink: 0 }}
                                                        value={warrantyQty} onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '');
                                                            setWarrantyQty(val ? Number(val) : '');
                                                        }}
                                                    />
                                                    <SearchableSelect
                                                        className={styles.fieldInput} style={{ width: '110px', flexShrink: 0 }}
                                                        value={warrantyUnit} onChange={(e) => setWarrantyUnit(e.target.value)}
                                                    >
                                                        <option value="Tháng">Tháng</option>
                                                        <option value="Năm">Năm</option>
                                                    </SearchableSelect>
                                                </div>
                                            </div>
                                        )}

                                        {/* Mô tả */}
                                        <div className={styles.formField} style={{ marginTop: '12px' }}>
                                            <label className={styles.fieldLabel}>Mô tả</label>
                                            <textarea
                                                className={styles.fieldInput}
                                                style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: '90px' }}
                                                value={formData.description}
                                                onChange={(e) => setFormData(fd => ({ ...fd, description: e.target.value }))}
                                                placeholder="Nhập thông tin chi tiết về sản phẩm..."
                                                rows="4"
                                            />
                                        </div>

                                        {/* Checkboxes: Serial, Lot */}
                                        {formData.productType !== 'Dịch vụ' && (
                                            <div className={styles.checkboxGroup} style={{ marginTop: '16px', display: 'flex', gap: '20px' }}>
                                                <label className={styles.checkboxLabel} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: formData.productType === 'Thành phẩm' ? 'not-allowed' : 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.productType === 'Thành phẩm' ? true : formData.trackSerial}
                                                        disabled={formData.productType === 'Thành phẩm'}
                                                        onChange={(e) => setFormData(fd => ({ ...fd, trackSerial: e.target.checked }))}
                                                    />
                                                    <span>Quản lý theo Serial</span>
                                                    {formData.productType === 'Thành phẩm' && (
                                                        <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 500, marginLeft: '4px' }}>(Bắt buộc cho Thành phẩm)</span>
                                                    )}
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── Right image section ─── */}
                                    <div style={{ width: '160px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <label style={{ cursor: uploadingImage ? 'wait' : 'pointer', display: 'block', width: '100%' }}>
                                            <div className={styles.imageUploadBox}>
                                                {formData.imageUrl ? (
                                                    <img
                                                        src={formData.imageUrl}
                                                        alt="Ảnh sản phẩm"
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                                                    />
                                                ) : (
                                                    <div className={styles.imageUploadPlaceholder}>
                                                        <i className="fas fa-image" style={{ fontSize: '36px', color: '#d1d5db', marginBottom: '8px' }}></i>
                                                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Tải ảnh lên</span>
                                                        <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', marginTop: '4px', lineHeight: 1.4 }}>Dung lượng tối đa 2MB (JPG, PNG)</span>
                                                    </div>
                                                )}
                                                {uploadingImage && (
                                                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', color: '#3b82f6' }}></i>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp,image/gif"
                                                onChange={handleProductImageUpload}
                                                disabled={uploadingImage}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                            <label style={{ cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>
                                                <i className="fas fa-pencil-alt" style={{ fontSize: '15px' }}></i>
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp,image/gif"
                                                    onChange={handleProductImageUpload}
                                                    disabled={uploadingImage}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>
                                            <span style={{ color: '#d1d5db' }}>|</span>
                                            <i
                                                className="fas fa-trash-alt"
                                                style={{ fontSize: '15px', color: '#6b7280', cursor: 'pointer' }}
                                                onClick={() => setFormData(fd => ({ ...fd, imageUrl: '' }))}
                                            ></i>
                                        </div>
                                    </div>
                                </div>

                                {/* ─── Tabs Section (BOM) ─── */}
                                {formData.productType === 'Thành phẩm' && (
                                    <div style={{ marginTop: '24px', border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                            <button
                                                onClick={() => setActiveTab('bom')}
                                                style={{
                                                    padding: '9px 18px', fontSize: '13px', border: 'none', cursor: 'pointer', background: 'transparent',
                                                    borderBottom: activeTab === 'bom' ? '2px solid #2563eb' : '2px solid transparent',
                                                    color: activeTab === 'bom' ? '#2563eb' : '#6b7280', fontWeight: activeTab === 'bom' ? 600 : 400
                                                }}
                                            >
                                                Định mức cấu hình
                                            </button>
                                        </div>

                                        <div style={{ padding: '14px 16px', minHeight: '120px' }}>
                                            {activeTab === 'bom' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {bomLines.map((line, idx) => (
                                                        <div key={idx} style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            padding: '8px 12px', background: '#fff', border: '1px solid #e5e7eb',
                                                            borderRadius: '8px', transition: 'all 0.2s ease',
                                                            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                                        }}
                                                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}
                                                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; }}
                                                        >
                                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                <div style={{
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    width: '28px', height: '28px', borderRadius: '50%', background: '#f3f4f6',
                                                                    color: '#6b7280', fontSize: '12px', fontWeight: 600
                                                                }}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                    <div style={{ flex: 1 }}>
                                                                        <SearchableCategoryDropdown
                                                                            categories={categories}
                                                                            value={line.categoryId || ''}
                                                                            onChange={(newCatId) => {
                                                                                const a = [...bomLines];
                                                                                a[idx].categoryId = newCatId;
                                                                                a[idx].componentVariantId = '';
                                                                                setBomLines(a);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Ghi chú chi tiết (VD: Ổ chứa dữ liệu, Tản nhiệt nước...)"
                                                                        value={line.note || ''}
                                                                        onChange={(e) => {
                                                                            const a = [...bomLines];
                                                                            a[idx].note = e.target.value;
                                                                            setBomLines(a);
                                                                        }}
                                                                        style={{
                                                                            width: '100%', border: 'none', borderBottom: '1px dashed #cbd5e1',
                                                                            padding: '4px 6px', fontSize: '12px', outline: 'none',
                                                                            background: 'transparent', color: '#4b5563', transition: 'border-color 0.2s'
                                                                        }}
                                                                        onFocus={(e) => { e.target.style.borderBottom = '1px solid #3b82f6'; e.target.style.color = '#111827'; }}
                                                                        onBlur={(e) => { e.target.style.borderBottom = '1px dashed #cbd5e1'; e.target.style.color = '#4b5563'; }}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => { const a = [...bomLines]; a.splice(idx, 1); setBomLines(a); }}
                                                                style={{
                                                                    border: 'none', background: 'transparent', cursor: 'pointer',
                                                                    color: '#9ca3af', fontSize: '15px', padding: '8px',
                                                                    borderRadius: '6px', transition: 'all 0.2s', marginLeft: '8px'
                                                                }}
                                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fee2e2'; }}
                                                                onMouseLeave={(e) => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.background = 'transparent'; }}
                                                                title="Xóa danh mục"
                                                            >
                                                                <i className="bi bi-trash3"></i>
                                                            </button>
                                                        </div>
                                                    ))}

                                                    <button
                                                        onClick={() => setBomLines([...bomLines, { componentVariantId: '', categoryId: '', quantity: '', note: '' }])}
                                                        style={{
                                                            width: '100%', padding: '14px', border: '1px dashed #cbd5e1',
                                                            borderRadius: '8px', background: '#f8fafc', color: '#3b82f6',
                                                            fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                                                    >
                                                        <i className="bi bi-plus-circle" style={{ fontSize: '16px' }}></i> Thêm danh mục yêu cầu
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── Modal Footer ── */}
                            <div className="misa-modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
                                <button className="btn-misa-cancel" onClick={() => setShowModal(false)}>Hủy</button>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="btn-misa-draft" onClick={() => handleSave(false)}>
                                        <i className="fas fa-plus-circle" style={{ marginRight: '6px' }}></i>Lưu & Thêm tiếp
                                    </button>
                                    <button className="btn-misa-save" onClick={() => handleSave(true)}>Lưu</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showVariantModal && selectedProduct && (
                    <div className="misa-modal-overlay">
                        <div className="misa-modal" style={{ width: '900px', maxWidth: '95vw', maxHeight: '90vh' }}>
                            <div className="misa-modal-header">
                                <h3>Quản lý SKU - {selectedProduct.productCode}</h3>
                                <i className="fas fa-times" onClick={() => setShowVariantModal(false)} style={{ cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-light, #94a3b8)' }}></i>
                            </div>

                            <div className="misa-modal-body">
                                {variantError && <div className={styles.modalError}>{variantError}</div>}

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>SKU <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={variantForm.sku}
                                            onChange={(event) => setVariantForm({ ...variantForm, sku: event.target.value })}
                                            className="misa-input"
                                            placeholder="Ví dụ: DELL-5420-I5-8G"
                                        />
                                    </div>
                                    <div className="misa-form-group">
                                        <label>Tên SKU <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={variantForm.variantName}
                                            onChange={(event) => setVariantForm({ ...variantForm, variantName: event.target.value })}
                                            className="misa-input"
                                            placeholder="Ví dụ: i5 / 8GB / 256GB"
                                        />
                                    </div>
                                </div>

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>Giá vốn</label>
                                        <input
                                            type="text"
                                            value={variantForm.costPrice ? new Intl.NumberFormat('vi-VN').format(variantForm.costPrice) : ''}
                                            onChange={(event) => {
                                                const val = event.target.value.replace(/\D/g, '');
                                                setVariantForm({ ...variantForm, costPrice: val ? parseInt(val, 10) : 0 });
                                            }}
                                            className="misa-input"
                                        />
                                    </div>
                                    <div className="misa-form-group">
                                        <label>Giá bán <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={variantForm.salePrice ? new Intl.NumberFormat('vi-VN').format(variantForm.salePrice) : ''}
                                            onChange={(event) => {
                                                const val = event.target.value.replace(/\D/g, '');
                                                setVariantForm({ ...variantForm, salePrice: val ? parseInt(val, 10) : 0 });
                                            }}
                                            className="misa-input"
                                        />
                                    </div>
                                </div>

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>Mã nhà sản xuất / Part number</label>
                                        <input
                                            type="text"
                                            value={variantForm.manufacturerPartNumber}
                                            onChange={(event) => setVariantForm({ ...variantForm, manufacturerPartNumber: event.target.value })}
                                            className="misa-input"
                                        />
                                    </div>
                                    <div className="misa-form-group">
                                        <label>Thời hạn bảo hành (tháng)</label>
                                        <input
                                            type="text"
                                            value={variantForm.warrantyMonths}
                                            onChange={(event) => {
                                                const val = event.target.value.replace(/\D/g, '');
                                                setVariantForm({ ...variantForm, warrantyMonths: val ? Number(val) : '' });
                                            }}
                                            className="misa-input"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                <div className="misa-form-row">
                                    <div className="misa-form-group">
                                        <label>Trạng thái</label>
                                        <label className={styles.checkboxLabel} style={{ minHeight: 34 }}>
                                            <input
                                                type="checkbox"
                                                checked={variantForm.active}
                                                onChange={(event) => setVariantForm({ ...variantForm, active: event.target.checked })}
                                            />
                                            <span>Đang sử dụng</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="misa-form-group">
                                    <div className={styles.specHeader}>
                                        <label style={{ margin: 0 }}>Thông số kỹ thuật sản phẩm</label>
                                        <button
                                            type="button"
                                            className={styles.toggleJsonBtn}
                                            onClick={() => {
                                                if (!useRawJson) {
                                                    setVariantForm(prev => ({ ...prev, specsJson: buildSpecsJsonFromList(specList) }));
                                                } else {
                                                    setSpecList(parseSpecsToList(variantForm.specsJson));
                                                }
                                                setUseRawJson(!useRawJson);
                                            }}
                                        >
                                            {useRawJson ? 'Chuyển sang dạng Bảng nhập' : 'Chuyển sang nhập JSON trực tiếp'}
                                        </button>
                                    </div>

                                    {useRawJson ? (
                                        <textarea
                                            value={variantForm.specsJson}
                                            onChange={(event) => setVariantForm({ ...variantForm, specsJson: event.target.value })}
                                            rows="3"
                                            className="misa-input"
                                            placeholder='{"cpu":"i5","ram":"8GB","ssd":"256GB"}'
                                            style={{ fontFamily: 'inherit', resize: 'vertical' }}
                                        />
                                    ) : (
                                        <div className={styles.specRowContainer}>
                                            {specList.map((item) => (
                                                <div key={item.id} className={styles.specRow}>
                                                    <input
                                                        type="text"
                                                        className={`misa-input ${styles.specKeyInput}`}
                                                        placeholder="Tên thông số (Ví dụ: RAM, CPU, DPI...)"
                                                        value={item.key}
                                                        onChange={(e) => handleSpecChange(item.id, 'key', e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        className={`misa-input ${styles.specValueInput}`}
                                                        placeholder="Giá trị (Ví dụ: 16GB, Core i7, 16000 DPI...)"
                                                        value={item.value}
                                                        onChange={(e) => handleSpecChange(item.id, 'value', e.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className={styles.removeSpecBtn}
                                                        onClick={() => handleRemoveSpecRow(item.id)}
                                                        title="Xóa dòng"
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="button"
                                                className={styles.addSpecBtn}
                                                onClick={handleAddSpecRow}
                                            >
                                                <i className="fas fa-plus" style={{ marginRight: 6 }}></i> Thêm dòng thông số
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: 16 }}>
                                    <button className="btn-misa-cancel" type="button" onClick={resetVariantForm}>Nhập lại</button>
                                    <button className="btn-misa-save" type="button" onClick={saveVariant}>
                                        {variantForm.id ? 'Cập nhật SKU' : 'Thêm SKU'}
                                    </button>
                                </div>

                                <div className={styles.tableWrapper} style={{ minHeight: 0, border: '1px solid var(--color-border-soft)' }}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>SKU</th>
                                                <th>Tên SKU</th>
                                                <th style={{ textAlign: 'right' }}>Giá vốn</th>
                                                <th style={{ textAlign: 'right' }}>Giá bán</th>
                                                <th>Trạng thái</th>
                                                <th style={{ textAlign: 'center' }}>Chức năng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loadingVariants ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>Đang tải SKU...</td>
                                                </tr>
                                            ) : variants.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: 24 }}>Chưa có SKU.</td>
                                                </tr>
                                            ) : (
                                                variants.map((variant) => (
                                                    <tr key={variant.id}>
                                                        <td className={styles.codeCell}>{variant.sku}</td>
                                                        <td>{variant.variantName}</td>
                                                        <td style={{ textAlign: 'right' }}>{formatCurrency(variant.costPrice)}</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(variant.salePrice)}</td>
                                                        <td>{variant.active === false ? 'Ngừng sử dụng' : 'Đang sử dụng'}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className={styles.editLink} onClick={() => editVariant(variant)}>Sửa</span>
                                                            <span style={{ margin: '0 8px', color: 'var(--color-border-field)' }}>|</span>
                                                            <span className={styles.editLink} onClick={() => deleteVariant(variant.id)}>Xóa</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="misa-modal-footer">
                                <button className="btn-misa-cancel" onClick={() => setShowVariantModal(false)}>Đóng</button>
                            </div>
                        </div>
                    </div>
                )}
                <Modal
                    isOpen={showSettingsModal}
                    onClose={() => setShowSettingsModal(false)}
                    ariaLabel="Thiết lập cột hiển thị"
                >
                    <div className={styles.settingsModalHeader}>
                        <h3>Thiết lập cột hiển thị</h3>
                        <button className={styles.settingsModalCloseBtn} onClick={() => setShowSettingsModal(false)}>
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                    <div className={styles.settingsModalBody}>
                        <div className={styles.checkboxGrid}>
                            {[
                                { id: 'image', label: 'Hình ảnh' },
                                { id: 'productCode', label: 'Mã sản phẩm' },
                                { id: 'productName', label: 'Tên sản phẩm' },
                                { id: 'productType', label: 'Loại' },
                                { id: 'category', label: 'Danh mục' },
                                { id: 'brand', label: 'Thương hiệu' },
                                { id: 'unit', label: 'Đơn vị tính' },
                                { id: 'salePrice', label: 'Giá bán' },
                                { id: 'stockQty', label: 'Tồn kho' }
                            ].map(col => (
                                <label key={col.id} className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={columns[col.id]}
                                        onChange={() => handleColumnChange(col.id)}
                                    />
                                    <span className={styles.checkboxText}>{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className={styles.settingsModalFooter}>
                        <button className={styles.btnSecondary} onClick={() => {
                            setColumns(DEFAULT_COLUMNS);
                            localStorage.setItem('dlc_product_columns', JSON.stringify(DEFAULT_COLUMNS));
                        }}>
                            Đặt lại
                        </button>
                        <button className={styles.btnPrimary} onClick={() => setShowSettingsModal(false)}>
                            Hoàn tất
                        </button>
                    </div>
                </Modal>
            </div>

            <Toast
                isVisible={toast.isVisible}
                type={toast.type}
                message={toast.message}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                isDanger={true}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

            <PrintBarcodeModal
                isOpen={!!printBarcodeProduct}
                onClose={() => setPrintBarcodeProduct(null)}
                product={printBarcodeProduct}
            />

            <ProductDetailModal
                product={detailProduct}
                onClose={() => setDetailProduct(null)}
                onEdit={handleOpenEdit}
            />
            <Modal
                isOpen={showExcelPreviewModal}
                onClose={() => !isSavingExcel && setShowExcelPreviewModal(false)}
                ariaLabel="Xem trước dữ liệu nhập Excel"
                dialogStyle={{ maxWidth: '1400px', width: '95vw' }}
            >
                <div className={styles.settingsModalHeader}>
                    <h3>Xem trước dữ liệu nhập Excel</h3>
                    <button
                        className={styles.settingsModalCloseBtn}
                        onClick={() => setShowExcelPreviewModal(false)}
                        disabled={isSavingExcel}
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
                <div className={styles.settingsModalBody} style={{ padding: '24px', width: '100%', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: '24px', fontSize: '15px' }}>
                            <span style={{ color: '#475569' }}>Tổng số: <strong style={{ color: '#0f172a', fontSize: '16px' }}>{excelPreviewData.length}</strong> dòng</span>
                            <span style={{ color: '#16a34a' }}><i className="bi bi-check-circle-fill"></i> Hợp lệ: <strong style={{ fontSize: '16px' }}>{excelPreviewData.filter(r => r.isValid).length}</strong></span>
                            <span style={{ color: '#dc2626' }}><i className="bi bi-exclamation-circle-fill"></i> Lỗi: <strong style={{ fontSize: '16px' }}>{excelPreviewData.filter(r => !r.isValid).length}</strong></span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <SearchableSelect
                                className={styles.inlineSelect}
                                style={{ width: '160px', backgroundColor: '#f1f5f9', border: 'none', fontWeight: 500, padding: '8px 12px', cursor: 'pointer' }}
                                value={previewFilter}
                                onChange={e => setPreviewFilter(e.target.value)}
                            >
                                <option value="ALL">Hiển thị: Tất cả</option>
                                <option value="VALID">Hiển thị: Hợp lệ</option>
                                <option value="INVALID">Hiển thị: Bị lỗi</option>
                            </SearchableSelect>
                            <div style={{ fontSize: '14px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '8px 16px', borderRadius: '20px' }}>
                                <i className="bi bi-info-circle-fill" style={{ color: '#3b82f6', marginRight: '6px' }}></i>
                                Sửa các ô bị lỗi trực tiếp trên bảng dưới đây
                            </div>
                        </div>
                    </div>

                    <div className={styles.previewTableContainer} style={{ flex: 1, overflowY: 'auto' }}>
                        <table className={styles.previewTable}>
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>Dòng</th>
                                    <th style={{ width: '120px' }}>Trạng thái</th>
                                    <th>Mã sản phẩm (*)</th>
                                    <th>Tên sản phẩm (*)</th>
                                    <th>Loại sản phẩm (*)</th>
                                    <th>Danh mục (*)</th>
                                    <th>Thương hiệu (*)</th>
                                    <th>Đơn vị tính (*)</th>
                                    <th>Giá bán</th>
                                </tr>
                            </thead>
                            <tbody>
                                {excelPreviewData.map((row, idx) => {
                                    if (previewFilter === 'VALID' && !row.isValid) return null;
                                    if (previewFilter === 'INVALID' && row.isValid) return null;

                                    return (
                                        <Fragment key={idx}>
                                            <tr className={row.isValid ? styles.rowValid : styles.rowInvalidMain}>
                                                <td style={{ textAlign: 'center' }}>{row.originalIndex}</td>
                                                <td>
                                                    <span className={row.isValid ? styles.statusBadgeValid : styles.statusBadgeInvalid}>
                                                        {row.isValid ? 'Hợp lệ' : 'Lỗi'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className={styles.inlineInput}
                                                        value={row.productCode}
                                                        onChange={e => handlePreviewEdit(idx, 'productCode', e.target.value)}
                                                        disabled={isSavingExcel}
                                                    />
                                                    {row.existingProduct && <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: 4 }}><i className="bi bi-exclamation-triangle"></i> Sẽ ghi đè</div>}
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className={styles.inlineInput}
                                                        value={row.productName}
                                                        onChange={e => handlePreviewEdit(idx, 'productName', e.target.value)}
                                                        disabled={isSavingExcel}
                                                        style={{ borderColor: !row.productName ? '#ef4444' : '' }}
                                                    />
                                                    {row.warnings && row.warnings.length > 0 && (
                                                        <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: 4 }}>
                                                            {row.warnings.map((w, i) => <div key={i}><i className="bi bi-exclamation-triangle"></i> {w}</div>)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    <SearchableSelect
                                                        className={styles.inlineSelect}
                                                        value={row.productType}
                                                        onChange={e => handlePreviewEdit(idx, 'productType', e.target.value)}
                                                        disabled={isSavingExcel}
                                                    >
                                                        <option value="Hàng hóa">Hàng hóa</option>
                                                        <option value="Dịch vụ">Dịch vụ</option>
                                                        <option value="Thành phẩm">Thành phẩm</option>
                                                    </SearchableSelect>
                                                </td>
                                                <td>
                                                    <SearchableSelect
                                                        className={styles.inlineSelect}
                                                        value={row.categoryId || ''}
                                                        onChange={e => handlePreviewEdit(idx, 'categoryId', e.target.value)}
                                                        disabled={isSavingExcel || isServiceType(row.productType)}
                                                        style={{ borderColor: (!isServiceType(row.productType) && !row.categoryId) ? '#ef4444' : '' }}
                                                    >
                                                        <option value="">-- Chọn --</option>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </SearchableSelect>
                                                </td>
                                                <td>
                                                    <SearchableSelect
                                                        className={styles.inlineSelect}
                                                        value={row.brandId || ''}
                                                        onChange={e => handlePreviewEdit(idx, 'brandId', e.target.value)}
                                                        disabled={isSavingExcel || isServiceType(row.productType)}
                                                        style={{ borderColor: (!isServiceType(row.productType) && !row.brandId) ? '#ef4444' : '' }}
                                                    >
                                                        <option value="">-- Chọn --</option>
                                                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    </SearchableSelect>
                                                </td>
                                                <td>
                                                    <SearchableSelect
                                                        className={styles.inlineSelect}
                                                        value={row.unitId || ''}
                                                        onChange={e => handlePreviewEdit(idx, 'unitId', e.target.value)}
                                                        disabled={isSavingExcel}
                                                        style={{ borderColor: !row.unitId ? '#ef4444' : '' }}
                                                    >
                                                        <option value="">-- Chọn --</option>
                                                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                                    </SearchableSelect>
                                                </td>
                                                <td>{formatCurrency(row.salePrice)}</td>
                                            </tr>
                                            {!row.isValid && (
                                                <tr className={styles.rowInvalidError}>
                                                    <td colSpan={9} style={{ padding: '4px 12px 12px 12px', borderTop: 'none' }}>
                                                        <div className={styles.errorReasonInline}>
                                                            {row.errors.map((e, i) => {
                                                                let quickAddType = null;
                                                                let quickAddName = null;
                                                                const catMatch = e.match(/Danh mục '(.*)' không tồn tại/);
                                                                if (catMatch) { quickAddType = 'category'; quickAddName = catMatch[1]; }
                                                                else {
                                                                    const brandMatch = e.match(/Thương hiệu '(.*)' không tồn tại/);
                                                                    if (brandMatch) { quickAddType = 'brand'; quickAddName = brandMatch[1]; }
                                                                    else {
                                                                        const unitMatch = e.match(/Đơn vị tính '(.*)' không tồn tại/);
                                                                        if (unitMatch) { quickAddType = 'unit'; quickAddName = unitMatch[1]; }
                                                                    }
                                                                }

                                                                return (
                                                                    <span key={i} style={{ marginRight: '24px', display: 'inline-flex', alignItems: 'center' }}>
                                                                        <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: '4px' }}></i> {e}
                                                                        {quickAddType && (
                                                                            <button
                                                                                type="button"
                                                                                className={styles.quickAddBtn}
                                                                                onClick={() => handleQuickAddEntity(quickAddType, quickAddName)}
                                                                                title="Thêm nhanh vào hệ thống"
                                                                                disabled={isSavingExcel}
                                                                            >
                                                                                <i className="bi bi-plus-circle"></i> Thêm
                                                                            </button>
                                                                        )}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className={styles.settingsModalFooter}>
                    <button className={styles.btnSecondary} onClick={() => setShowExcelPreviewModal(false)} disabled={isSavingExcel}>
                        Hủy
                    </button>
                    <button
                        className={styles.btnPrimary}
                        onClick={handleSaveValidExcelRows}
                        disabled={isSavingExcel || excelPreviewData.filter(r => r.isValid).length === 0}
                    >
                        {isSavingExcel ? (
                            <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                        ) : (
                            <><i className="bi bi-save"></i> Chỉ lưu {excelPreviewData.filter(r => r.isValid).length} dòng hợp lệ</>
                        )}
                    </button>
                </div>
            </Modal>
        </AdminLayout>
    );
};

export default ProductPage;
