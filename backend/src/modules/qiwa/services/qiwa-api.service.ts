import { Injectable, OnModuleInit, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  QiwaApiConfig,
  QiwaAuthResponse,
  QiwaContractRegistrationRequest,
  QiwaContractRegistrationResponse,
  QiwaContractStatusResponse,
  QiwaApiError,
  QiwaRateLimitInfo,
} from '../interfaces/qiwa-api.interface';

/**
 * QIWA API Client Service
 * Handles authentication and communication with Saudi Arabia's QIWA platform API
 */
@Injectable()
export class QiwaApiService implements OnModuleInit {
  private readonly logger = new Logger(QiwaApiService.name);
  private config: QiwaApiConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private refreshToken: string | null = null;
  private rateLimitInfo: QiwaRateLimitInfo | null = null;

  constructor(private configService: ConfigService) {
    this.config = {
      apiUrl: this.configService.get<string>('QIWA_API_URL') || '',
      clientId: this.configService.get<string>('QIWA_CLIENT_ID') || '',
      clientSecret: this.configService.get<string>('QIWA_CLIENT_SECRET') || '',
      establishmentId: this.configService.get<string>('QIWA_ESTABLISHMENT_ID') || '',
      timeout: this.configService.get<number>('QIWA_API_TIMEOUT') || 30000,
      retryAttempts: this.configService.get<number>('QIWA_RETRY_ATTEMPTS') || 3,
    };
  }

  async onModuleInit() {
    if (this.isConfigured()) {
      this.logger.log('QIWA API Service initialized');
      // Attempt initial authentication
      try {
        await this.authenticate();
      } catch (error) {
        this.logger.warn('Initial QIWA authentication failed - will retry on first request');
      }
    } else {
      this.logger.warn('QIWA API not configured - integration disabled');
    }
  }

  /**
   * Check if QIWA API is properly configured
   */
  isConfigured(): boolean {
    return !!(
      this.config.apiUrl &&
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.establishmentId
    );
  }

  /**
   * Authenticate with QIWA API using OAuth2 client credentials
   */
  async authenticate(): Promise<QiwaAuthResponse> {
    if (!this.isConfigured()) {
      throw new HttpException(
        'QIWA API is not configured',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      this.logger.log('Authenticating with QIWA API...');

      const response = await this.makeRequest<QiwaAuthResponse>(
        '/oauth2/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
          }).toString(),
        },
        false, // Don't require auth for auth endpoint
      );

      this.accessToken = response.access_token;
      this.tokenExpiresAt = new Date(Date.now() + response.expires_in * 1000);
      this.refreshToken = response.refresh_token || null;

      this.logger.log('Successfully authenticated with QIWA API');
      return response;
    } catch (error) {
      this.logger.error('QIWA authentication failed', error);
      throw new HttpException(
        'Failed to authenticate with QIWA API',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<QiwaAuthResponse> {
    if (!this.refreshToken) {
      return this.authenticate();
    }

    try {
      this.logger.log('Refreshing QIWA access token...');

      const response = await this.makeRequest<QiwaAuthResponse>(
        '/oauth2/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
          }).toString(),
        },
        false,
      );

      this.accessToken = response.access_token;
      this.tokenExpiresAt = new Date(Date.now() + response.expires_in * 1000);
      this.refreshToken = response.refresh_token || this.refreshToken;

      this.logger.log('Successfully refreshed QIWA access token');
      return response;
    } catch (error) {
      this.logger.error('Token refresh failed, re-authenticating', error);
      return this.authenticate();
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiresAt) {
      await this.authenticate();
      return;
    }

    // Refresh token if it expires in less than 5 minutes
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    if (this.tokenExpiresAt < fiveMinutesFromNow) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Register a contract with QIWA
   */
  async registerContract(
    request: QiwaContractRegistrationRequest,
  ): Promise<QiwaContractRegistrationResponse> {
    await this.ensureAuthenticated();

    try {
      this.logger.log(`Registering contract ${request.contractNumber} with QIWA`);

      const response = await this.makeRequest<QiwaContractRegistrationResponse>(
        '/v1/contracts/register',
        {
          method: 'POST',
          body: JSON.stringify({
            ...request,
            establishmentId: this.config.establishmentId,
          }),
        },
      );

      this.logger.log(`Contract ${request.contractNumber} registered successfully`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to register contract ${request.contractNumber}`, error);
      throw error;
    }
  }

  /**
   * Get contract status from QIWA
   */
  async getContractStatus(
    contractId: string,
  ): Promise<QiwaContractStatusResponse> {
    await this.ensureAuthenticated();

    try {
      this.logger.log(`Fetching status for QIWA contract ${contractId}`);

      const response = await this.makeRequest<QiwaContractStatusResponse>(
        `/v1/contracts/${contractId}/status`,
        {
          method: 'GET',
        },
      );

      this.logger.log(`Contract ${contractId} status: ${response.status}`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch status for contract ${contractId}`, error);
      throw error;
    }
  }

  /**
   * Update a contract in QIWA
   */
  async updateContract(
    contractId: string,
    request: Partial<QiwaContractRegistrationRequest>,
  ): Promise<QiwaContractRegistrationResponse> {
    await this.ensureAuthenticated();

    try {
      this.logger.log(`Updating QIWA contract ${contractId}`);

      const response = await this.makeRequest<QiwaContractRegistrationResponse>(
        `/v1/contracts/${contractId}`,
        {
          method: 'PUT',
          body: JSON.stringify(request),
        },
      );

      this.logger.log(`Contract ${contractId} updated successfully`);
      return response;
    } catch (error) {
      this.logger.error(`Failed to update contract ${contractId}`, error);
      throw error;
    }
  }

  /**
   * Cancel a contract in QIWA
   */
  async cancelContract(contractId: string, reason: string): Promise<void> {
    await this.ensureAuthenticated();

    try {
      this.logger.log(`Canceling QIWA contract ${contractId}`);

      await this.makeRequest(
        `/v1/contracts/${contractId}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        },
      );

      this.logger.log(`Contract ${contractId} canceled successfully`);
    } catch (error) {
      this.logger.error(`Failed to cancel contract ${contractId}`, error);
      throw error;
    }
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): QiwaRateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Make HTTP request to QIWA API with error handling and retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    requireAuth: boolean = true,
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= (this.config.retryAttempts || 3); attempt++) {
      try {
        // Check rate limits before making request
        if (this.rateLimitInfo && this.rateLimitInfo.remaining === 0) {
          const waitTime = this.rateLimitInfo.resetAt.getTime() - Date.now();
          if (waitTime > 0) {
            this.logger.warn(`Rate limit exceeded, waiting ${waitTime}ms`);
            await this.sleep(waitTime);
          }
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(options.headers as Record<string, string>),
        };

        if (requireAuth && this.accessToken) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const response = await fetch(url, {
          ...options,
          headers,
          signal: AbortSignal.timeout(this.config.timeout || 30000),
        });

        // Update rate limit info from headers
        this.updateRateLimitInfo(response);

        // Handle specific status codes
        if (response.status === 401 && requireAuth) {
          this.logger.warn('Received 401, re-authenticating...');
          await this.authenticate();
          continue; // Retry with new token
        }

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
          this.logger.warn(`Rate limited, waiting ${waitTime}ms before retry`);
          await this.sleep(waitTime);
          continue;
        }

        if (!response.ok) {
          const error = await this.parseError(response);
          throw new HttpException(
            error.message || 'QIWA API request failed',
            response.status,
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Request attempt ${attempt} failed: ${error.message}`);

        // Don't retry on client errors (4xx except 401, 429)
        if (error instanceof HttpException) {
          const status = error.getStatus();
          if (status >= 400 && status < 500 && status !== 401 && status !== 429) {
            throw error;
          }
        }

        // Wait before retrying (exponential backoff)
        if (attempt < (this.config.retryAttempts || 3)) {
          const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await this.sleep(backoffTime);
        }
      }
    }

    throw new HttpException(
      `QIWA API request failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(response: Response): void {
    const limit = response.headers.get('X-RateLimit-Limit');
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      this.rateLimitInfo = {
        limit: parseInt(limit),
        remaining: parseInt(remaining),
        resetAt: new Date(parseInt(reset) * 1000),
      };
    }
  }

  /**
   * Parse error response from QIWA API
   */
  private async parseError(response: Response): Promise<QiwaApiError> {
    try {
      const error = await response.json();
      return {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || response.statusText,
        details: error.details,
      };
    } catch {
      return {
        code: 'PARSE_ERROR',
        message: response.statusText || 'Unknown error',
      };
    }
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
