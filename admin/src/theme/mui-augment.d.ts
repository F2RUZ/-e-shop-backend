import '@mui/material/Paper';
import '@mui/material/Button';

/** Paper'ga 4 ta shisha variantini qo'shamiz (TZ §5.5). */
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    glass: true;
    glassSoft: true;
    glassChrome: true;
    glassSolid: true;
  }
}

/** Tugmaga "yumshoq" variant — status rangi 15% fon bilan. */
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    soft: true;
  }
}
