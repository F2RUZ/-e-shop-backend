import { ValueTransformer } from 'typeorm';

/**
 * PostgreSQL'ning "numeric" turi TypeORM'da matn (string) bo'lib qaytadi: "1500000.00".
 * Bu transformer uni JSON'da oddiy son qilib qaytarish uchun kerak: 1500000
 */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
