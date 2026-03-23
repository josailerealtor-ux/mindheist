export interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  traps_built: number;
  traps_escaped: number;
  created_at: string;
}
