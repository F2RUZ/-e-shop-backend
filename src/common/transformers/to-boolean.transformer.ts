import { Transform } from 'class-transformer';

/**
 * URL query'da hamma narsa matn bo'lib keladi: ?isActive=true -> "true" (string).
 * Bu dekorator uni haqiqiy boolean'ga aylantiradi.
 */
export const ToBoolean = () =>
  Transform(({ value }) => {
    if (value === true || value === 'true' || value === 1 || value === '1') return true;
    if (value === false || value === 'false' || value === 0 || value === '0') return false;
    return value; // noto'g'ri qiymat bo'lsa — @IsBoolean() xatolik matnini qaytaradi
  });
