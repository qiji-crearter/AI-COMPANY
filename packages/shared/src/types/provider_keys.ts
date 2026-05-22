export interface ProviderKey {
  id: string;
  companyId: string;
  name: string;
  provider: string;
  status: string;
  baseUrlOpenai: string | null;
  baseUrlAnthropic: string | null;
  secretId: string;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderKeyWithSecret extends ProviderKey {
  /** The first few chars of the API key for display (never the full key) */
  keyPrefix: string | null;
}

export interface CreateProviderKeyRequest {
  name: string;
  provider: string;
  baseUrlOpenai?: string | null;
  baseUrlAnthropic?: string | null;
  /** The raw API key value — encrypted and stored via company_secrets */
  value: string;
}

export interface UpdateProviderKeyRequest {
  name?: string;
  status?: string;
  baseUrlOpenai?: string | null;
  baseUrlAnthropic?: string | null;
}

export interface TestProviderKeyResult {
  ok: boolean;
  message: string;
}
