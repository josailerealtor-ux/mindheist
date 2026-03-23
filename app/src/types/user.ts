export interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  traps_built: number;
  traps_escaped: number;
  is_pro: boolean;
  coin_balance: number;
  tip_total: number;
  subscription_expires_at: string | null;
  created_at: string;
}
