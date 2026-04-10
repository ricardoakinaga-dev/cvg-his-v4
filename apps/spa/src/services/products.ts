import { apiRequest } from './api';

export interface ProductSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly code: string | null;
  readonly description: string | null;
  readonly basePrice: number;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface ProductsListResponse {
  items: readonly ProductSummary[];
}

export interface CreateProductPayload {
  name: string;
  code?: string | null;
  description?: string | null;
  basePrice: number;
  active?: boolean;
}

export interface UpdateProductPayload {
  name?: string;
  code?: string | null;
  description?: string | null;
  basePrice?: number;
  active?: boolean;
}

export const productsService = {
  async list(search?: string): Promise<ProductSummary[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await apiRequest<ProductsListResponse>(`/products${params}`);
    return [...(response.items ?? [])];
  },

  async getById(productId: string): Promise<ProductSummary> {
    return apiRequest<ProductSummary>(`/products/${productId}`);
  },

  async create(payload: CreateProductPayload): Promise<ProductSummary> {
    return apiRequest<ProductSummary>('/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(productId: string, payload: UpdateProductPayload): Promise<ProductSummary> {
    return apiRequest<ProductSummary>(`/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};