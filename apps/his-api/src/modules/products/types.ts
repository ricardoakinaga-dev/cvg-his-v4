import {
  createProductBodySchema,
  listProductsQuerySchema,
  productIdParamSchema,
  productResponseSchema,
  updateProductBodySchema,
  type CreateProductBody,
  type ListProductsQuery,
  type ProductIdParam,
  type ProductResponse,
  type UpdateProductBody
} from '@cvg-his/contracts';

export {
  createProductBodySchema,
  listProductsQuerySchema,
  productIdParamSchema,
  productResponseSchema,
  updateProductBodySchema
};

export type { CreateProductBody, ListProductsQuery, ProductIdParam, ProductResponse, UpdateProductBody };

export type ProductRecord = {
  id: string;
  accountId: string;
  name: string;
  code: string | null;
  description: string | null;
  basePrice: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
