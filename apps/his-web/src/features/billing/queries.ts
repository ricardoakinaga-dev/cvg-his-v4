import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Types
export type BillingItemStatus = 'draft' | 'confirmed' | 'cancelled';

export interface BillingItem {
  id: string;
  encounterId: string;
  serviceId: string | null;
  description: string;
  qty: string;
  unitPrice: string;
  totalPrice: string;
  status: BillingItemStatus;
  service?: {
    id: string;
    code: string;
    name: string;
    group: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingItemsListResponse {
  items: BillingItem[];
  total: string;
  itemCount: number;
}

export interface CreateBillingItemInput {
  serviceId?: string | null;
  description: string;
  qty: number;
  unitPrice: number;
}

export interface UpdateBillingItemInput {
  serviceId?: string | null;
  description?: string;
  qty?: number;
  unitPrice?: number;
  status?: BillingItemStatus;
}

// Query keys
export const billingKeys = {
  all: ['billing'] as const,
  items: (encounterId: string) => [...billingKeys.all, 'items', encounterId] as const,
};

// Fetch billing items for an encounter
export function useBillingItems(encounterId: string) {
  return useQuery({
    queryKey: billingKeys.items(encounterId),
    queryFn: async (): Promise<BillingItemsListResponse> => {
      const response = await api.get(`/encounters/${encounterId}/billing-items`);
      return response.data;
    },
    enabled: !!encounterId,
  });
}

// Create billing item mutation
export function useCreateBillingItem(encounterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateBillingItemInput): Promise<BillingItem> => {
      const response = await api.post(`/encounters/${encounterId}/billing-items`, input);
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingKeys.items(encounterId) });
    },
  });
}

// Update billing item mutation
export function useUpdateBillingItem(encounterId: string, billingItemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateBillingItemInput): Promise<BillingItem> => {
      const response = await api.put(
        `/encounters/${encounterId}/billing-items/${billingItemId}`,
        input
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingKeys.items(encounterId) });
    },
  });
}

// Delete billing item mutation
export function useDeleteBillingItem(encounterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billingItemId: string): Promise<void> => {
      await api.delete(`/encounters/${encounterId}/billing-items/${billingItemId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingKeys.items(encounterId) });
    },
  });
}

// Confirm all billing items mutation
export function useConfirmAllBillingItems(encounterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ confirmedCount: number }> => {
      const response = await api.post(
        `/encounters/${encounterId}/billing-items/confirm-all`
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingKeys.items(encounterId) });
    },
  });
}

// Close encounter mutation (with billing)
export function useCloseEncounter(encounterId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reason?: string): Promise<{
      encounter: { id: string; status: string };
      billingItemCount: number;
      billingTotal: string;
    }> => {
      const response = await api.post(`/encounters/${encounterId}/close`, { reason });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: billingKeys.items(encounterId) });
      // Also invalidate encounter queries
      void queryClient.invalidateQueries({ queryKey: ['encounter', encounterId] });
    },
  });
}
