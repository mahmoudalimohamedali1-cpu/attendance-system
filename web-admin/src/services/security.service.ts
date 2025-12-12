/**
 * Security Service
 * Advanced security utilities for encryption, token management, and validation
 */

import CryptoJS from 'crypto-js';
import Cookies from 'js-cookie';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'attendance-system-secret-key-2024';
const TOKEN_COOKIE_NAME = 'attendance_token';
const REFRESH_TOKEN_COOKIE_NAME = 'attendance_refresh_token';
const COOKIE_OPTIONS = {
  secure: true, // HTTPS only
  sameSite: 'strict' as const,
  httpOnly: false, // We'll handle httpOnly via backend
  expires: 7, // 7 days
};

/**
 * Encrypt sensitive data
 */
export const encrypt = (data: string): string => {
  try {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return data;
  }
};

/**
 * Decrypt sensitive data
 */
export const decrypt = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedData;
  }
};

/**
 * Hash password (for local validation)
 */
export const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

/**
 * Generate secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Token Management
 */
export const tokenService = {
  /**
   * Store access token securely
   */
  setAccessToken: (token: string): void => {
    // Encrypt token before storing
    const encrypted = encrypt(token);
    Cookies.set(TOKEN_COOKIE_NAME, encrypted, COOKIE_OPTIONS);
    
    // Also store in sessionStorage as backup (encrypted)
    try {
      sessionStorage.setItem(TOKEN_COOKIE_NAME, encrypted);
    } catch (error) {
      console.error('SessionStorage error:', error);
    }
  },

  /**
   * Get access token
   */
  getAccessToken: (): string | null => {
    // Try cookie first
    const cookieToken = Cookies.get(TOKEN_COOKIE_NAME);
    if (cookieToken) {
      try {
        return decrypt(cookieToken);
      } catch (error) {
        console.error('Token decryption error:', error);
      }
    }
    
    // Fallback to sessionStorage
    try {
      const sessionToken = sessionStorage.getItem(TOKEN_COOKIE_NAME);
      if (sessionToken) {
        return decrypt(sessionToken);
      }
    } catch (error) {
      console.error('SessionStorage read error:', error);
    }
    
    return null;
  },

  /**
   * Store refresh token
   */
  setRefreshToken: (token: string): void => {
    const encrypted = encrypt(token);
    Cookies.set(REFRESH_TOKEN_COOKIE_NAME, encrypted, {
      ...COOKIE_OPTIONS,
      expires: 30, // 30 days for refresh token
    });
  },

  /**
   * Get refresh token
   */
  getRefreshToken: (): string | null => {
    const cookieToken = Cookies.get(REFRESH_TOKEN_COOKIE_NAME);
    if (cookieToken) {
      try {
        return decrypt(cookieToken);
      } catch (error) {
        console.error('Refresh token decryption error:', error);
      }
    }
    return null;
  },

  /**
   * Clear all tokens
   */
  clearTokens: (): void => {
    Cookies.remove(TOKEN_COOKIE_NAME);
    Cookies.remove(REFRESH_TOKEN_COOKIE_NAME);
    try {
      sessionStorage.removeItem(TOKEN_COOKIE_NAME);
      sessionStorage.removeItem(REFRESH_TOKEN_COOKIE_NAME);
    } catch (error) {
      console.error('SessionStorage clear error:', error);
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return !!tokenService.getAccessToken();
  },
};

/**
 * XSS Protection - Sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * CSRF Protection - Generate and validate CSRF tokens
 */
export const csrfService = {
  generateToken: (): string => {
    return generateSecureToken(32);
  },

  validateToken: (token: string, storedToken: string): boolean => {
    return token === storedToken && token.length > 0;
  },

  storeToken: (token: string): void => {
    try {
      sessionStorage.setItem('csrf_token', encrypt(token));
    } catch (error) {
      console.error('CSRF token storage error:', error);
    }
  },

  getToken: (): string | null => {
    try {
      const stored = sessionStorage.getItem('csrf_token');
      if (stored) {
        return decrypt(stored);
      }
    } catch (error) {
      console.error('CSRF token retrieval error:', error);
    }
    return null;
  },
};

/**
 * Rate Limiting - Prevent brute force attacks
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly maxAttempts: number = 5;
  private readonly windowMs: number = 15 * 60 * 1000; // 15 minutes

  checkLimit(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      // Reset or create new record
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetAt: now + this.windowMs,
      };
    }

    if (record.count >= this.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetTime,
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: this.maxAttempts - record.count,
      resetAt: record.resetTime,
    };
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Validate JWT token structure (basic validation)
 */
export const validateTokenStructure = (token: string): boolean => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Decode payload (without verification)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Security Headers Helper
 */
export const securityHeaders = {
  getHeaders: () => ({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  }),
};

