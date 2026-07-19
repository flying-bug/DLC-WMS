import { useState } from 'react';
import styles from '../../pages/Repair/RepairPage.module.css';

const fmtQty = (n) => Number(n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 4 });

function RepairLineTable({ lines = [], editable = false, onAdd, onDelete }) {
    const [adding, setAdding] = useState(false);
    const [form, setForm] = useState({
        componentVariantId: '',
        actionType: 'ADD',
        quantity: 1,
        unitPrice: 0,
        isFreeWarranty: false,
        serialNumberId: '',
        note: ''
    });

    const setField = (field, val) => setForm(p => ({ ...p, [field]: val }));

    const handleSaveLine = (e) => {
        e.preventDefault();
        onAdd?.({
            ...form,
            componentVariantId: Number(form.componentVariantId),
            quantity: Number(form.quantity),
            unitPrice: Number(form.unitPrice),
            serialNumberId: form.serialNumberId ? Number(form.serialNumberId) : null,
        });
        // reset and hide
        setForm({ componentVariantId: '', actionType: 'ADD', quantity: 1, unitPrice: 0, isFreeWarranty: false, serialNumberId: '', note: '' });
        setAdding(false);
    };

    return (
        <div>
            <table className={styles.o_list_view}>
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Product</th>
                        <th>Demand</th>
                        <th>Done</th>
                        <th>Unit of Measure</th>
                        <th style={{textAlign: 'center'}}>Used</th>
                        {editable && <th><i className="bi bi-sliders" style={{float: 'right', cursor: 'pointer'}}></i></th>}
                    </tr>
                </thead>
                <tbody>
                    {lines.map((line) => (
                        <tr key={line.id}>
                            <td>{line.actionType === 'ADD' ? 'Add' : 'Remove'}</td>
                            <td style={{color: '#017E84'}}>{`[VAR_${line.componentVariantId}] Component...`}</td>
                            <td>
                                {fmtQty(line.quantity)} 
                                <i className="bi bi-graph-down" style={{color: '#017E84', marginLeft: '8px', fontSize: '1.1rem'}}/>
                            </td>
                            <td>0.00</td>
                            <td>Units</td>
                            <td style={{textAlign: 'center'}}>
                                <input type="checkbox" disabled style={{accentColor: '#017E84'}} />
                            </td>
                            {editable && (
                                <td style={{ textAlign: 'right' }}>
                                    <i className="bi bi-list-ul" style={{color: '#017E84', marginRight: '16px', cursor: 'pointer'}}></i>
                                    <button 
                                        type="button" 
                                        className={styles.o_icon_btn} 
                                        onClick={() => onDelete?.(line.id)}
                                        title="Xóa"
                                    >
                                        <i className="bi bi-trash" />
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}

                    {editable && adding && (
                        <tr>
                            <td className={styles.o_field_cell}>
                                <select value={form.actionType} onChange={(e) => setField('actionType', e.target.value)}>
                                    <option value="ADD">Add</option>
                                    <option value="REMOVE">Remove</option>
                                </select>
                            </td>
                            <td className={styles.o_field_cell}>
                                <input 
                                    type="number" 
                                    placeholder="Variant ID" 
                                    value={form.componentVariantId} 
                                    onChange={(e) => setField('componentVariantId', e.target.value)}
                                />
                            </td>
                            <td className={styles.o_field_cell}>
                                <input 
                                    type="number" 
                                    min="0.0001" 
                                    step="0.0001" 
                                    value={form.quantity} 
                                    onChange={(e) => setField('quantity', e.target.value)}
                                    placeholder="Qty"
                                />
                            </td>
                            <td className={styles.o_field_cell}>
                                <input 
                                    type="number" 
                                    min="0" 
                                    value={form.unitPrice} 
                                    onChange={(e) => setField('unitPrice', e.target.value)}
                                    placeholder={form.isFreeWarranty ? "Miễn phí" : "Price"}
                                    disabled={form.isFreeWarranty}
                                    style={{width: '60px'}}
                                />
                            </td>
                            <td className={styles.o_field_cell}>Units</td>
                            <td className={styles.o_field_cell} style={{textAlign: 'center'}}>
                                <input type="checkbox" checked={form.isFreeWarranty} onChange={e => setField('isFreeWarranty', e.target.checked)} style={{accentColor: '#017E84'}}/>
                            </td>
                            <td style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button type="button" className={styles.o_icon_btn} style={{color: '#017E84'}} onClick={handleSaveLine}>
                                    <i className="bi bi-check-lg" />
                                </button>
                                <button type="button" className={styles.o_icon_btn} onClick={() => setAdding(false)}>
                                    <i className="bi bi-x-lg" />
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {editable && !adding && (
                <div className={styles.o_add_line}>
                    <a onClick={() => setAdding(true)}>Add</a>
                </div>
            )}
        </div>
    );
}

export default RepairLineTable;
