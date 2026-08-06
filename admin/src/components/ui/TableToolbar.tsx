import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface FilterSelect {
  value: string;
  onChange: (v: string) => void;
  labelKey: string;
  options: { value: string; labelKey: string }[];
  width?: number;
}

interface Props {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholderKey: string;
  filters?: FilterSelect[];
  extra?: ReactNode;
}

/** Panel ICHIDAGI blok -> `glassSoft` (TZ §4.1, 2-daraja). */
export function TableToolbar({ search, onSearch, searchPlaceholderKey, filters, extra }: Props) {
  const { t } = useTranslation();

  return (
    <Paper variant="glassSoft" sx={{ p: 1.25, mb: 1.5 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'center' }}>
        <TextField
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t(searchPlaceholderKey)}
          sx={{ flex: 1, minWidth: 0 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: 18, color: 'var(--muted-foreground)' }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => onSearch('')} aria-label={t('common.clear')}>
                    <ClearRoundedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        {filters?.map((f) => (
          <TextField
            key={f.labelKey}
            select
            label={t(f.labelKey)}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            sx={{ width: { xs: '100%', md: f.width ?? 170 }, flexShrink: 0 }}
          >
            {f.options.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {t(o.labelKey)}
              </MenuItem>
            ))}
          </TextField>
        ))}

        {extra}
      </Stack>
    </Paper>
  );
}
