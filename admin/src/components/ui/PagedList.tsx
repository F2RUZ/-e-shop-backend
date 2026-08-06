import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { PaginationBar } from './PaginationBar';

interface Props<T> {
  items: T[];
  pageSize: number;
  children: (pageItems: T[]) => ReactNode;
  empty?: ReactNode;
  /** Filtr o'zgarganda sahifa 1 ga qaytishi uchun (TZ §7A.3) */
  resetKey?: string | number;
}

/**
 * Mijoz tomonidagi sahifalash (TZ §7.3, §7A.4).
 *
 * - Qator soni `useAutoPageSize` dan keladi — qat'iy son yozilmaydi.
 * - `pageSize` o'zgarsa yoki ro'yxat qisqarsa — joriy sahifa qayta hisoblanadi.
 * - Bitta sahifa bo'lsa pagination UMUMAN ko'rsatilmaydi.
 */
export function PagedList<T>({ items, pageSize, children, empty, resetKey }: Props<T>) {
  const [page, setPage] = useState(1);

  const pages = Math.max(1, Math.ceil(items.length / pageSize));

  // Filtr/qidiruv o'zgarganda 1-sahifaga qaytamiz
  useEffect(() => setPage(1), [resetKey]);

  // Mavjud bo'lmagan sahifada qolib ketmasin
  useEffect(() => {
    setPage((p) => Math.min(p, pages));
  }, [pages]);

  const current = Math.min(page, pages);
  const from = (current - 1) * pageSize;

  const pageItems = useMemo(() => items.slice(from, from + pageSize), [items, from, pageSize]);

  if (items.length === 0) return <>{empty}</>;

  return (
    <>
      {children(pageItems)}

      {pages > 1 && (
        <PaginationBar
          page={current}
          pages={pages}
          from={from + 1}
          to={Math.min(from + pageSize, items.length)}
          total={items.length}
          onChange={setPage}
        />
      )}
    </>
  );
}
