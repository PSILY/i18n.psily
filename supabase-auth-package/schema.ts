// Supabase Users table for authentication
export interface User {
  id: number;
  user_email: string;
  first_name: string;
  last_name: string;
  password: string;
  sub_type: number;
  created_at: Date;
}

// Handoff Tokens table for secure cross-subdomain SSO
export interface HandoffToken {
  id: number;
  code_hash: string;
  user_id: number;
  expires_at: Date;
  redeemed_at: Date | null;
  created_at: Date;
  ip_address: string | null;
}
