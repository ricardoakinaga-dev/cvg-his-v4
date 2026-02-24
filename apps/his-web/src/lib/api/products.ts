/**
 * Products API Client
 * 
 * Provides functions for interacting with the products API endpoints
 */

import { apiClient } from './client';

// Types
export type Product = {
  id: string;
  accountId: string;
  sku: string;
  name: string;
  category: string | null;
  uom: string | null;
  cost: string;
  price: string;
  isControlled: boolean;
  trackLot: boolean;
  trackExpiry: boolean;
  minStock: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductCreateInput = {
  sku: string;
  name: string;
  category?: string | null;
  uom?: string | null;
  cost?: number;
  price?: number;
  isControlled?: boolean;
  trackLot?: boolean;
  trackExpiry?: boolean;
  minStock?: number;
  active?: boolean;
};

export type ProductUpdateInput = Partial<ProductCreateInput>;

export type ListProductsParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  active?: boolean;
  category?: string;
};

export type ListProductsResponse = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * List products with pagination and filters
 */
export async function listProducts(params: ListProductsParams = {}): Promise<ListProductsResponse> {
  return apiClient<ListProductsResponse>('/stock/products', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      q: params.q,
      active: params.active,
      category: params.category
    }
  });
}

/**
 * Get a product by ID
 */
export async function getProduct(id: string): Promise<Product> {
  return apiClient<Product>(`/stock/products/${id}`);
}

/**
 * Create a new product
 */
export async function createProduct(input: ProductCreateInput): Promise<Product> {
  return apiClient<Product>('/stock/products', { method: 'POST', body: input });
}

/**
 * Update a product
 */
export async function updateProduct(id: string, input: ProductUpdateInput): Promise<Product> {
  return apiClient<Product>(`/stock/products/${id}`, { method: 'PUT', body: input });
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<void> {
  return apiClient<void>(`/stock/products/${id}`, { method: 'DELETE' });
}
