import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InpatientStaysDashboard } from '../components/InpatientStaysDashboard';
import { StayHeader } from '../components/StayHeader';
import { StayTabs } from '../components/StayTabs';
import * as api from '../../../lib/api';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  }),
  useSearchParams: () => ({
    get: vi.fn()
  })
}));

// Mock API functions
vi.mock('../../../lib/api', () => ({
  getWards: vi.fn(),
  listInpatientStays: vi.fn(),
  getInpatientStay: vi.fn(),
  getPatient: vi.fn(),
  transferInpatient: vi.fn(),
  dischargeInpatient: vi.fn()
}));

const mockWards = [
  { id: 'ward-1', name: 'Ward A', accountId: 'account-1', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'ward-2', name: 'Ward B', accountId: 'account-1', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

const mockStays = [
  {
    id: 'stay-1',
    accountId: 'account-1',
    patientId: 'patient-1',
    ownerId: 'owner-1',
    encounterId: null,
    wardId: 'ward-1',
    bedId: 'bed-1',
    status: 'active' as const,
    admittedAt: new Date().toISOString(),
    dischargedAt: null,
    admittedByUserId: 'user-1',
    dischargedByUserId: null,
    chiefComplaint: 'Test complaint',
    reason: null,
    planSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('InpatientStaysDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getWards as any).mockResolvedValue({ data: mockWards, total: 2 });
    (api.listInpatientStays as any).mockResolvedValue({ data: mockStays, total: 1, page: 1, pageSize: 20 });
  });

  it('should render dashboard shell initially', async () => {
    render(<InpatientStaysDashboard />, { wrapper: createWrapper() });

    expect(screen.getByText(/Internações/i)).toBeTruthy();
    expect(screen.getByText(/Atualizar/i)).toBeTruthy();
  });

  it('should render stays list after loading', async () => {
    render(<InpatientStaysDashboard />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(api.listInpatientStays).toHaveBeenCalled();
    });
  });

  it('should render filter controls', async () => {
    render(<InpatientStaysDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByText(/^Status$/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Ala \/ Ward/i)).toBeTruthy();
    });
  });

  it('should toggle between list and kanban view', async () => {
    render(<InpatientStaysDashboard />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      const kanbanButton = screen.getByText(/Kanban/i);
      expect(kanbanButton).toBeTruthy();
    });
  });
});

describe('StayHeader', () => {
  const mockStay = mockStays[0];

  it('should render stay status badge', () => {
    render(
      <StayHeader stay={mockStay} />,
      { wrapper: createWrapper() }
    );
    
    expect(screen.getByText('Internado')).toBeTruthy();
  });

  it('should show copy ID functionality', () => {
    render(
      <StayHeader stay={mockStay} />,
      { wrapper: createWrapper() }
    );
    
    // Should show truncated stay ID
    expect(screen.getByText(/stay-1/i) || document.querySelector('[title]')).toBeTruthy();
  });

  it('should show transfer and discharge buttons for active stays', () => {
    const onTransfer = vi.fn();
    const onDischarge = vi.fn();
    
    render(
      <StayHeader 
        stay={mockStay} 
        onTransfer={onTransfer}
        onDischarge={onDischarge}
      />,
      { wrapper: createWrapper() }
    );
    
    expect(screen.getByText('Transferir')).toBeTruthy();
    expect(screen.getByText('Dar Alta')).toBeTruthy();
  });

  it('should not show action buttons for discharged stays', () => {
    const dischargedStay = { ...mockStay, status: 'discharged' as const };
    
    render(
      <StayHeader stay={dischargedStay} />,
      { wrapper: createWrapper() }
    );
    
    expect(screen.queryByText('Transferir')).toBeFalsy();
    expect(screen.queryByText('Dar Alta')).toBeFalsy();
  });
});

describe('StayTabs', () => {
  it('should render all tab options', () => {
    const onTabChange = vi.fn();
    
    render(
      <StayTabs activeTab="prescriptions" onTabChange={onTabChange} />,
      { wrapper: createWrapper() }
    );
    
    expect(screen.getByText('Prescrições')).toBeTruthy();
    expect(screen.getByText('Administrações')).toBeTruthy();
    expect(screen.getByText('Logs')).toBeTruthy();
    expect(screen.getByText('Care Plan')).toBeTruthy();
  });

  it('should highlight active tab', () => {
    const onTabChange = vi.fn();
    
    render(
      <StayTabs activeTab="administrations" onTabChange={onTabChange} />,
      { wrapper: createWrapper() }
    );
    
    const activeTab = screen.getByRole('tab', { selected: true });
    expect(activeTab).toBeTruthy();
  });

  it('should call onTabChange when tab is clicked', () => {
    const onTabChange = vi.fn();
    
    render(
      <StayTabs activeTab="prescriptions" onTabChange={onTabChange} />,
      { wrapper: createWrapper() }
    );
    
    fireEvent.click(screen.getByText('Logs'));
    expect(onTabChange).toHaveBeenCalledWith('logs');
  });
});

describe('Error States', () => {
  it('should show error state when API fails', async () => {
    (api.listInpatientStays as any).mockRejectedValue(new Error('API Error'));

    render(<InpatientStaysDashboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar internações/i)).toBeTruthy();
      expect(screen.getByText('API Error')).toBeTruthy();
    });
  });
});

describe('Empty States', () => {
  it('should show empty state when no stays found', async () => {
    (api.listInpatientStays as any).mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20 });
    
    render(<InpatientStaysDashboard />, { wrapper: createWrapper() });
    
    await waitFor(() => {
      expect(screen.getByText(/Nenhuma internação encontrada/i)).toBeTruthy();
    });
  });
});
