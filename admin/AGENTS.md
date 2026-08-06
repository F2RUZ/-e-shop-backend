# ⛔ RANG VA SHRIFTNI QOTIB YOZISH QAT'IY TAQIQLANADI

Panelda 4 tema bor va foydalanuvchi shrift turi/o'lchamini o'zi tanlaydi.
Komponentga qotib yozilgan har bir rang — buzilgan tema.

## Yagona manba

`src/theme/tokens.ts` (+ undan hosil bo'lgan CSS o'zgaruvchilari `src/theme/cssVars.tsx`).
Boshqa hech qayerda hex yozilmaydi.

## ❌ Hech qachon yozma

```tsx
sx={{ color: '#4ade80' }}
sx={{ bgcolor: '#17212b' }}
style={{ fontFamily: 'Montserrat' }}
sx={{ boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}
const cfg = { light: '#d97706', dark: '#fbbf24' }
```

## ✅ Buning o'rniga

| Maqsad | Token |
|---|---|
| Asosiy urg'u, havola, faol | `primary` / `var(--primary)` |
| Muvaffaqiyat | `success` / `var(--success)` |
| Kutish, ogohlantirish | `warning` / `var(--warning)` |
| Xato, o'chirish | `destructive` / `var(--destructive)` |
| Ma'lumot | `info` / `var(--info)` |
| Qo'shimcha ajratuvchi | `violet` / `var(--violet)` |
| Ikkilamchi matn | `text.secondary` / `var(--muted-foreground)` |
| Fon / panel | `background.default` / `background.paper` |
| Chegara | `divider` / `var(--border)` |
| Shrift | hech narsa (`body` allaqachon oladi) |
| Raqam/jadval shrifti | `var(--font-mono)` yoki `className="tabular"` |
| Radius | `var(--radius-sm/md/lg/xl/2xl/pill)` |

Shaffoflik kerak bo'lsa:

```tsx
sx={{ bgcolor: 'color-mix(in oklab, var(--success) 15%, transparent)' }}
sx={(t) => ({ bgcolor: alpha(t.palette.success.main, 0.15) })}
```

## Shisha qatlamlari

| Daraja | Variant | Qayerda |
|---|---|---|
| 1 | `<Paper variant="glass">` | Asosiy panel, karta |
| 2 | `<Paper variant="glassSoft">` | Panel **ichidagi** toolbar, filtr |
| 3 | `<Paper variant="glassChrome">` | Sidebar, topbar |
| 4 | `<Paper variant="glassSolid">` | Dialog, menyu, tooltip |

⚠️ `glass` ichida yana `glass` bo'lmaydi. Bir ekranda ≤ 4 blur qatlami.
Ro'yxat qatorlariga blur berilmaydi.

## Matn qoidasi

Komponentda qotib yozilgan foydalanuvchi matni ham taqiqlanadi — faqat i18n
kaliti (`t('products.title')`). Panel uz/ru tillarida ishlaydi.

Xaritalarda matn saqlanmaydi:

```ts
// ❌
const STATUS = { active: { label: 'Faol', color: 'success' } };
// ✅
const STATUS = { active: { color: 'var(--success)', i18nKey: 'status.active' } };
```

## Ro'yxat qoidasi

Har qanday ro'yxat/jadval shu uchlik bilan o'raladi:

```tsx
<CollapsibleSection titleKey="…" count={rows.length}>
  <TableToolbar … />
  <PagedList items={rows} pageSize={useAutoPageSize()} empty={<EmptyState … />}>
    {(pageRows) => <Table>…</Table>}
  </PagedList>
</CollapsibleSection>
```

Cheksiz uzayadigan jadval qoldirilmaydi. Qator soni **ekran balandligidan**
hisoblanadi — qat'iy «10 tadan» yozilmaydi.

## Uzun matnga chidamlilik (uz → ru 15–30% uzun)

- Tugmaga qat'iy `width` berilmaydi, faqat `minWidth` + `padding`
- Flex bolalarga `minWidth: 0`
- Bir qatorli matn: `noWrap` + `title` bilan to'liq matn
- Jadval ustunlari `%` yoki `minmax()` — `px` emas
- `textTransform: 'uppercase'` taqiqlanadi (faqat `caption` darajasida)

## Bitta komponent qoidasi

Bir vaqtda BITTA komponent qilinadi → to'xtaladi → egasi ko'radi → keyingisi.

## Tekshirish (0 chiqishi kerak)

```bash
grep -rE '#[0-9a-fA-F]{3,6}\b' src --include='*.tsx' --include='*.ts' \
  | grep -v 'tokens.ts' | grep -v '://'
```
