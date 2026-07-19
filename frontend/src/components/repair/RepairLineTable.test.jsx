import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RepairLineTable from './RepairLineTable';

describe('RepairLineTable', () => {
    const mockLines = [
        {
            id: 1,
            actionType: 'ADD',
            componentVariantId: 101,
            quantity: 2,
            unitPrice: 500000,
            isFreeWarranty: false,
        },
        {
            id: 2,
            actionType: 'REMOVE',
            componentVariantId: 102,
            quantity: 1,
            unitPrice: 0,
            isFreeWarranty: true,
        }
    ];

    it('renders empty state when no lines provided', () => {
        render(<RepairLineTable lines={[]} />);
        expect(screen.getByText('Chưa có linh kiện nào.')).toBeInTheDocument();
    });

    it('renders lines correctly', () => {
        render(<RepairLineTable lines={mockLines} />);
        expect(screen.getByText('101')).toBeInTheDocument();
        expect(screen.getByText('102')).toBeInTheDocument();
        expect(screen.getByText('Lắp thêm')).toBeInTheDocument();
        expect(screen.getByText('Thu hồi')).toBeInTheDocument();
    });

    it('shows delete button when editable and calls onDelete', () => {
        const onDeleteMock = vi.fn();
        render(<RepairLineTable lines={mockLines} editable={true} onDelete={onDeleteMock} />);
        
        const deleteButtons = screen.getAllByRole('button');
        expect(deleteButtons).toHaveLength(2);
        
        fireEvent.click(deleteButtons[0]);
        expect(onDeleteMock).toHaveBeenCalledWith(1);
    });
});
