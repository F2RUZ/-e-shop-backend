import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

type Severity = 'success' | 'error' | 'warning' | 'info';

interface ToastValue {
  /** Backend xabarlari allaqachon o'zbekcha — ularni o'zgartirmasdan ko'rsatamiz */
  toast: (message: string, severity?: Severity) => void;
}

const Ctx = createContext<ToastValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<Severity>('success');

  const toast = useCallback((msg: string, sev: Severity = 'success') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={severity === 'error' ? 8000 : 4000}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={severity}
          variant="standard"
          sx={{
            maxWidth: 460,
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: 'var(--panel-shadow)',
          }}
          // Skrinrider xabarni o'qishi uchun
          role="status"
          aria-live="polite"
        >
          {message}
        </Alert>
      </Snackbar>
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(Ctx);
