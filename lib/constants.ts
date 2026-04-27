export const STORAGE_KEYS = {
  TOKEN: 'pms_token',
  USER: 'pms_user',
  TENANT_ID: 'pms_tenant_id',
  PROPERTY_ID: 'pms_property_id',
} as const;

export const AUTH_KEYS = {
  TOKEN: 'pms_token',
  USER: 'pms_user',
} as const;

export const API_HEADERS = {
  TENANT_ID: 'x-tenant-id',
  PROPERTY_ID: 'x-property-id',
} as const;
