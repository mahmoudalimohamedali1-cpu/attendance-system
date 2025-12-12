import { useEffect, useState } from 'react';
import { Alert, AlertTitle, Button, Box } from '@mui/material';
import { Refresh, CheckCircle, Error } from '@mui/icons-material';
import { getBackendStatus } from '@/utils/network-check';

export const BackendStatus = () => {
  const [status, setStatus] = useState<{
    online: boolean;
    message: string;
    checking: boolean;
  }>({ online: true, message: '', checking: true });

  const checkStatus = async () => {
    setStatus((prev) => ({ ...prev, checking: true }));
    const result = await getBackendStatus();
    setStatus({ ...result, checking: false });
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (status.online) {
    return null; // Don't show if online
  }

  return (
    <Alert
      severity="error"
      icon={<Error />}
      action={
        <Button
          color="inherit"
          size="small"
          onClick={checkStatus}
          disabled={status.checking}
          startIcon={status.checking ? <Refresh /> : <CheckCircle />}
        >
          {status.checking ? 'جاري التحقق...' : 'إعادة المحاولة'}
        </Button>
      }
      sx={{ mb: 2 }}
    >
      <AlertTitle>مشكلة في الاتصال</AlertTitle>
      {status.message}
      <Box component="div" sx={{ mt: 1, fontSize: '0.875rem' }}>
        <strong>الحل:</strong>
        <br />
        1. تأكد أن Backend يعمل: <code>cd backend && npm run start:dev</code>
        <br />
        2. تحقق من <code>http://localhost:3000/health</code>
        <br />
        3. أعد تحميل الصفحة
      </Box>
    </Alert>
  );
};

