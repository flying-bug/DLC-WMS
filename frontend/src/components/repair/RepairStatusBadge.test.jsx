import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RepairStatusBadge from './RepairStatusBadge';

describe('RepairStatusBadge', () => {
    it('renders correct label for CONFIRMED', () => {
        render(<RepairStatusBadge status="CONFIRMED" />);
        expect(screen.getByText('Đã xác nhận')).toBeInTheDocument();
    });

    it('renders correct label for DRAFT', () => {
        render(<RepairStatusBadge status="DRAFT" />);
        expect(screen.getByText('Nháp')).toBeInTheDocument();
    });

    it('renders fallback for unknown status', () => {
        render(<RepairStatusBadge status="UNKNOWN_STATUS" />);
        expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
    });
});
