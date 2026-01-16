/**
 * Integrations API Service - Frontend API Client
 * Service for managing integration marketplace and configurations
 */

import { api } from './api.service';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Integration categories
 */
export type IntegrationCategory =
  | 'ACCOUNTING'
  | 'ERP'
  | 'COMMUNICATION'
  | 'HR'
  | 'PAYROLL'
  | 'BANKING';

/**
 * Integration status
 */
export type IntegrationStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'WARNING';

/**
 * Health status
 */
export type HealthStatus = 'HEALTHY' | 'WARNING' | 'ERROR' | 'INACTIVE';

/**
 * Available integration from the marketplace catalog
 */
export interface MarketplaceIntegration {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  category: IntegrationCategory;
  logo: string;
  version: string;
  developerName: string;
  websiteUrl: string;
  documentationUrl: string;
  installed: boolean;
  enabled: boolean;
  status: IntegrationStatus;
}

/**
 * Installed integration with configuration
 */
export interface Integration {
  id: string;
  slug: string;
  name: string;
  provider: string;
  enabled: boolean;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Configuration DTO for configuring an integration
 */
export interface ConfigureIntegrationDto {
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
  configData?: Record<string, unknown>;
  syncEnabled?: boolean;
  syncInterval?: number;
}

/**
 * Integration log entry
 */
export interface IntegrationLog {
  id: string;
  integrationId: string;
  action: string;
  status: string;
  message?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Test connection response
 */
export interface TestConnectionResponse {
  success: boolean;
  message: string;
  messageEn: string;
  timestamp: string;
  details: {
    latency?: number;
    integrationName?: string;
    status?: string;
    error?: string;
  };
}

/**
 * Health check response
 */
export interface IntegrationHealthResponse {
  status: HealthStatus;
  lastCheckAt: string;
  message: string;
  messageEn: string;
  details: {
    integrationName: string;
    enabled: boolean;
    configValid: boolean;
    provider: string;
  };
}

/**
 * Parameters for fetching logs
 */
export interface LogsParams {
  limit?: number;
  offset?: number;
}

// ============================================================================
// Service Class
// ============================================================================

const BASE_URL = '/integrations';

/**
 * Get all available integrations from the marketplace catalog
 */
export const getAvailableIntegrations = async (): Promise<MarketplaceIntegration[]> => {
  const response = await api.get<MarketplaceIntegration[] | { data: MarketplaceIntegration[] }>(BASE_URL);
  return (response as { data: MarketplaceIntegration[] }).data || (response as MarketplaceIntegration[]);
};

/**
 * Get installed integrations for the current company
 */
export const getInstalledIntegrations = async (): Promise<Integration[]> => {
  const response = await api.get<Integration[] | { data: Integration[] }>(`${BASE_URL}/installed`);
  return (response as { data: Integration[] }).data || (response as Integration[]);
};

/**
 * Get integration details by ID
 */
export const getIntegrationDetails = async (integrationId: string): Promise<Integration> => {
  const response = await api.get<Integration | { data: Integration }>(`${BASE_URL}/${integrationId}`);
  return (response as { data: Integration }).data || (response as Integration);
};

/**
 * Install an integration
 */
export const installIntegration = async (
  integrationId: string,
  config?: Record<string, unknown>
): Promise<Integration> => {
  const response = await api.post<Integration | { data: Integration }>(
    `${BASE_URL}/${integrationId}/install`,
    { config }
  );
  return (response as { data: Integration }).data || (response as Integration);
};

/**
 * Configure an integration
 */
export const configureIntegration = async (
  integrationId: string,
  config: ConfigureIntegrationDto
): Promise<Integration> => {
  const response = await api.patch<Integration | { data: Integration }>(
    `${BASE_URL}/${integrationId}/configure`,
    config
  );
  return (response as { data: Integration }).data || (response as Integration);
};

/**
 * Toggle integration enabled/disabled state
 */
export const toggleIntegration = async (
  integrationId: string,
  enabled: boolean
): Promise<Integration> => {
  const response = await api.patch<Integration | { data: Integration }>(
    `${BASE_URL}/${integrationId}/toggle`,
    { enabled }
  );
  return (response as { data: Integration }).data || (response as Integration);
};

/**
 * Uninstall an integration
 */
export const uninstallIntegration = async (integrationId: string): Promise<Integration> => {
  const response = await api.delete<Integration | { data: Integration }>(`${BASE_URL}/${integrationId}`);
  return (response as { data: Integration }).data || (response as Integration);
};

/**
 * Get integration activity logs
 */
export const getIntegrationLogs = async (
  integrationId: string,
  params?: LogsParams
): Promise<IntegrationLog[]> => {
  const response = await api.get<IntegrationLog[] | { data: IntegrationLog[] }>(
    `${BASE_URL}/${integrationId}/logs`,
    { params }
  );
  return (response as { data: IntegrationLog[] }).data || (response as IntegrationLog[]);
};

/**
 * Test integration connection
 */
export const testConnection = async (integrationId: string): Promise<TestConnectionResponse> => {
  const response = await api.post<TestConnectionResponse | { data: TestConnectionResponse }>(
    `${BASE_URL}/${integrationId}/test`
  );
  return (response as { data: TestConnectionResponse }).data || (response as TestConnectionResponse);
};

/**
 * Get integration health status
 */
export const getIntegrationHealth = async (
  integrationId: string
): Promise<IntegrationHealthResponse> => {
  const response = await api.get<IntegrationHealthResponse | { data: IntegrationHealthResponse }>(
    `${BASE_URL}/${integrationId}/health`
  );
  return (response as { data: IntegrationHealthResponse }).data || (response as IntegrationHealthResponse);
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  getAvailableIntegrations,
  getInstalledIntegrations,
  getIntegrationDetails,
  installIntegration,
  configureIntegration,
  toggleIntegration,
  uninstallIntegration,
  getIntegrationLogs,
  testConnection,
  getIntegrationHealth,
};
