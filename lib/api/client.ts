import { createClient } from '../utils/supabase/client';

/**
 * Shared Supabase client instance for the API layer.
 * This replaces the previous axios-based apiClient.
 */
export const supabase = createClient();

// For backward compatibility during migration, we could keep a fake apiClient
// but since I've already updated the main API files, I'll export supabase as the primary.
export const apiClient = {
  // Add shim if needed, or just let components migrate to 'supabase'
};
