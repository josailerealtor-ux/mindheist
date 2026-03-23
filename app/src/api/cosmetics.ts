import { apiFetch } from './client';

export interface Cosmetic {
  id: string;
  name: string;
  type: 'badge' | 'frame' | 'theme';
  price_cents: number;
  image_url: string | null;
}

export interface UserCosmetic {
  cosmetic_id: string;
  is_active: boolean;
  cosmetic: Cosmetic;
}

export const cosmeticsApi = {
  list: () => apiFetch<Cosmetic[]>('/cosmetics'),
  myCosmetics: () => apiFetch<UserCosmetic[]>('/cosmetics/mine'),
  setActive: (cosmeticId: string, type: string) =>
    apiFetch<void>(`/cosmetics/${cosmeticId}/activate`, { method: 'POST', body: JSON.stringify({ type }) }),
};
