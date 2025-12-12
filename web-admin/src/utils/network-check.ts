/**
 * Network Check Utility
 * Check if backend is accessible before making requests
 */

export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch('http://localhost:3000/health', {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return true;
    }
    return false;
  } catch (error) {
    console.error('Backend connection check failed:', error);
    return false;
  }
};

export const getBackendStatus = async (): Promise<{
  online: boolean;
  message: string;
}> => {
  const isOnline = await checkBackendConnection();

  if (isOnline) {
    return {
      online: true,
      message: 'متصل بالخادم',
    };
  }

  return {
    online: false,
    message: 'لا يمكن الاتصال بالخادم. تأكد أن Backend يعمل على http://localhost:3000',
  };
};

