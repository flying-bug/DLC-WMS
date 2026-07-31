import React from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';

const BarcodeLabel = ({ 
    product, 
    barcodeType, 
    labelSize, 
    showProductName, 
    showSKU, 
    showSerial, 
    serial,
    isPrinting = false 
}) => {
    // Determine physical dimensions based on labelSize (35x22 or 50x30)
    const [widthMm, heightMm] = labelSize.split('x').map(Number);
    
    // Scale mm to pixels (approx 3.78 px per mm for 96 DPI screen)
    // For print preview, we scale it a bit larger for visibility, but strictly mm for printing.
    const containerStyle = {
        width: isPrinting ? `${widthMm}mm` : `${widthMm * 3.78}px`,
        height: isPrinting ? `${heightMm}mm` : `${heightMm * 3.78}px`,
        backgroundColor: '#fff',
        border: isPrinting ? 'none' : '1px solid #ccc',
        boxSizing: 'border-box',
        padding: '1mm',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden',
        pageBreakInside: 'avoid',
        // Optional: center horizontally/vertically when printed in continuous rolls
        margin: isPrinting ? '0 auto' : '0',
        flexShrink: 0
    };

    // Text truncation style
    const textStyle = {
        fontSize: labelSize === '35x22' ? '8px' : '10px',
        fontWeight: 'bold',
        textAlign: 'center',
        width: '100%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        lineHeight: 1.2,
        marginBottom: '2px',
        color: '#000'
    };

    // The actual value to encode
    const encodeValue = (showSerial && serial) ? serial : (product?.productCode || 'N/A');

    return (
        <div style={containerStyle}>
            {showProductName && (
                <div style={textStyle}>
                    {product?.productName || 'Tên sản phẩm'}
                </div>
            )}
            
            {showSKU && (
                <div style={{...textStyle, fontSize: labelSize === '35x22' ? '7px' : '9px', fontWeight: 'normal'}}>
                    SKU: {product?.productCode || 'N/A'}
                </div>
            )}
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0 }}>
                {barcodeType === 'QRCODE' ? (
                    <QRCodeSVG 
                        value={encodeValue}
                        size={labelSize === '35x22' ? 35 : 50}
                        level="M"
                        includeMargin={false}
                    />
                ) : (
                    <Barcode 
                        value={encodeValue} 
                        format="CODE128"
                        width={labelSize === '35x22' ? 1.2 : 1.5}
                        height={labelSize === '35x22' ? 25 : 35}
                        displayValue={false}
                        margin={0}
                        background="#ffffff"
                        lineColor="#000000"
                    />
                )}
            </div>

            {/* Display the encoded value at the bottom if it's a barcode or if they want serial shown explicitly */}
            <div style={{...textStyle, marginTop: '2px', marginBottom: 0, fontSize: labelSize === '35x22' ? '7px' : '9px'}}>
                {encodeValue}
            </div>
        </div>
    );
};

export default BarcodeLabel;
