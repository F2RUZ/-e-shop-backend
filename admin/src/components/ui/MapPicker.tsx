import { useEffect, useMemo, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../../api/client';
import { pickupPointsApi } from '../../api/endpoints';
import type { GeocodeResult } from '../../api/types';

/**
 * Xaritadan nuqta tanlash.
 *
 * Nega Leaflet + OpenStreetMap: **API kaliti ham, pullik akkaunt ham kerak emas**.
 * Google Maps yoki Yandex kalit talab qiladi.
 *
 * Nega `react-leaflet` emas, to'g'ridan-to'g'ri Leaflet: bu yerda bitta marker
 * va bitta bosish hodisasi bor — o'rovchi kutubxona qo'shimcha qatlamdan boshqa
 * hech narsa bermaydi.
 */

/** Toshkent markazi — koordinata hali tanlanmaganda shu yer ko'rsatiladi */
const DEFAULT_CENTER: [number, number] = [41.311081, 69.240562];
const DEFAULT_ZOOM = 12;
const PICKED_ZOOM = 16;

interface Props {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
  /**
   * Nuqta belgilangach backend aniqlagan manzil shu yerga keladi.
   * Forma uni olib shahar/manzil maydonlarini to'ldiradi.
   */
  onResolved?: (result: GeocodeResult) => void;
  /** Manzil qatoriga yozilgan matn — qidiruvga sukut qiymat bo'ladi */
  addressHint?: string;
}

export function MapPicker({ latitude, longitude, onChange, onResolved, addressHint }: Props) {
  const { t } = useTranslation();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // `onChange` har renderda yangi funksiya bo'ladi — xarita hodisasi
  // eskisini ushlab qolmasligi uchun ref orqali o'qiymiz
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  const resolvedRef = useRef(onResolved);
  resolvedRef.current = onResolved;

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [locationError, setLocationError] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<string | null>(null);

  const icon = useMemo(
    () =>
      L.divIcon({
        className: '',
        html:
          '<div style="width:18px;height:18px;border-radius:50%;' +
          'background:var(--primary);border:3px solid #fff;' +
          // Bu soya XARITA ustida turadi. Xarita plitkalari har doim OCH
          // rangda (OpenStreetMap), shuning uchun bu yerda mavzu tokeni
          // ishlatilmaydi — TZ §4.1 dan ataylab chekinish.
          'box-shadow:0 0 0 2px var(--primary),0 2px 8px rgba(0,0,0,.45)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    [],
  );

  // ── Xaritani bir marta quramiz ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, { attributionControl: true }).setView(
      latitude != null && longitude != null ? [latitude, longitude] : DEFAULT_CENTER,
      latitude != null ? PICKED_ZOOM : DEFAULT_ZOOM,
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map);

    map.on('click', (event: L.LeafletMouseEvent) => {
      const { lat, lng } = event.latlng;
      changeRef.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
    });

    mapRef.current = map;

    // Dialog ochilish animatsiyasi tugagach o'lchamni qayta hisoblash kerak,
    // aks holda xarita yarim kulrang bo'lib qoladi
    const timer = setTimeout(() => map.invalidateSize(), 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Koordinata paydo bo'lsa — «topilmadi» xabari o'z-o'zidan yo'qoladi.
  // Foydalanuvchi joyni boshqa yo'l bilan (xaritadan bosib yoki
  // «joylashuvim» tugmasi bilan) topgan bo'lsa, eski xato turishi mantiqsiz.
  useEffect(() => {
    if (latitude == null || longitude == null) {
      setResolved(null);
      return;
    }

    setNotFound(false);

    // Nuqta belgilandi — manzilini backenddan so'raymiz.
    // `cancelled` kerak: foydalanuvchi tez-tez bosaversa, eskirgan javob
    // yangisining ustiga yozilib qolmasin.
    let cancelled = false;
    setResolving(true);

    pickupPointsApi
      .geocode(latitude, longitude)
      .then((result) => {
        if (cancelled) return;
        setResolved(result.displayName);
        resolvedRef.current?.(result);
      })
      .catch(() => {
        // Manzil topilmasa xarita baribir ishlaydi — koordinata saqlanadi
        if (!cancelled) setResolved(null);
      })
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  // ── Marker koordinataga ergashadi ───────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (latitude == null || longitude == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const position: [number, number] = [latitude, longitude];

    if (markerRef.current) {
      markerRef.current.setLatLng(position);
    } else {
      markerRef.current = L.marker(position, { icon, draggable: true })
        .addTo(map)
        .on('dragend', (event) => {
          const { lat, lng } = (event.target as L.Marker).getLatLng();
          changeRef.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
        });
    }

    map.setView(position, Math.max(map.getZoom(), PICKED_ZOOM));
  }, [latitude, longitude, icon]);

  // ── Manzil bo'yicha qidirish (Nominatim — bepul, kalitsiz) ──────
  const search = async () => {
    const text = (query || addressHint || '').trim();
    if (!text) return;

    setSearching(true);
    setNotFound(false);

    try {
      // Qidiruv ham backend orqali — o'sha navbat va o'sha kesh
      const result = await pickupPointsApi.geocodeSearch(text);

      onChange(result.latitude, result.longitude);
      setResolved(result.displayName);
      resolvedRef.current?.(result);
    } catch (error) {
      setNotFound(true);
      setSearchError(errorMessage(error, ''));
    } finally {
      setSearching(false);
    }
  };

  // ── Brauzerdan joylashuv ────────────────────────────────────────
  const useMyLocation = () => {
    setNotFound(false);
    setLocationError(false);

    if (!navigator.geolocation) {
      setLocationError(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        onChange(
          Number(position.coords.latitude.toFixed(6)),
          Number(position.coords.longitude.toFixed(6)),
        ),
      // Ruxsat berilmasa yoki GPS topolmasa — foydalanuvchi sababini bilsin,
      // aks holda tugma «ishlamayapti» degan taassurot qoladi
      () => setLocationError(true),
    );
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder={addressHint || t('pickupPoints.mapSearchPlaceholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setNotFound(false);
            setSearchError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void search();
            }
          }}
          error={notFound}
          helperText={notFound ? searchError || t('pickupPoints.mapNotFound') : ' '}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searching ? (
                <InputAdornment position="end">
                  <CircularProgress size={16} />
                </InputAdornment>
              ) : null,
            },
          }}
        />

        <Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => void search()}
            disabled={searching}
            sx={{ height: 40 }}
          >
            {t('pickupPoints.mapSearch')}
          </Button>
        </Box>

        <Box>
          <IconButton
            onClick={useMyLocation}
            aria-label={t('pickupPoints.mapMyLocation')}
            title={t('pickupPoints.mapMyLocation')}
            sx={{ height: 40, width: 40 }}
          >
            <MyLocationRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Stack>

      <Box
        ref={containerRef}
        sx={{
          height: 260,
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          // Leaflet o'z boshqaruv tugmalarini oq fonda chizadi —
          // to'q mavzuda ular ajralib turmasin
          // Leaflet yozuvi ham xarita ustida — yuqoridagi bilan bir xil sabab
          '& .leaflet-control-attribution': {
            background: 'rgba(255,255,255,.75)',
            fontSize: 10,
          },
        }}
      />

      {locationError && (
        <Typography variant="caption" sx={{ color: 'var(--warning)' }}>
          {t('pickupPoints.mapLocationError')}
        </Typography>
      )}

      {(resolving || resolved) && (
        <Stack direction="row" alignItems="center" spacing={0.75}>
          {resolving && <CircularProgress size={12} />}
          <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1, minWidth: 0 }}>
            {resolving ? t('pickupPoints.mapResolving') : resolved}
          </Typography>
        </Stack>
      )}

      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography
          variant="caption"
          className="tabular"
          sx={{ color: 'text.secondary', flex: 1 }}
        >
          {latitude != null && longitude != null
            ? `${latitude}, ${longitude}`
            : t('pickupPoints.mapPickHint')}
        </Typography>

        {latitude != null && (
          <Button
            size="small"
            startIcon={<ClearRoundedIcon />}
            onClick={() => onChange(null, null)}
            sx={{ color: 'text.secondary' }}
          >
            {t('pickupPoints.mapClear')}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
