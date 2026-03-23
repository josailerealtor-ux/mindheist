import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../services/trapService';

const router = Router();

// GET /api/cosmetics — all available cosmetics
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('cosmetics')
    .select('*')
    .order('price_cents', { ascending: true });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// GET /api/cosmetics/mine — user's owned cosmetics
router.get('/mine', requireAuth, async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('user_cosmetics')
    .select('cosmetic_id, is_active, cosmetic:cosmetics(*)')
    .eq('user_id', req.userId!);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// POST /api/cosmetics/:id/activate — set a cosmetic as active (deactivates others of same type)
router.post('/:id/activate', requireAuth, async (req: AuthRequest, res) => {
  const cosmeticId = req.params.id as string;
  const { type } = req.body;

  // Verify user owns this cosmetic
  const { data: owned } = await supabase
    .from('user_cosmetics')
    .select('cosmetic_id')
    .eq('user_id', req.userId!)
    .eq('cosmetic_id', cosmeticId)
    .single();

  if (!owned) { res.status(403).json({ error: 'You do not own this cosmetic' }); return; }

  // Deactivate all cosmetics of same type first
  const { data: sameType } = await supabase
    .from('cosmetics')
    .select('id')
    .eq('type', type);

  const sameTypeIds = (sameType ?? []).map((c) => c.id);

  await supabase
    .from('user_cosmetics')
    .update({ is_active: false })
    .eq('user_id', req.userId!)
    .in('cosmetic_id', sameTypeIds);

  // Activate selected
  await supabase
    .from('user_cosmetics')
    .update({ is_active: true })
    .eq('user_id', req.userId!)
    .eq('cosmetic_id', cosmeticId);

  res.json({ success: true });
});

// POST /api/cosmetics/:id/unlock — called after successful RevenueCat purchase
router.post('/:id/unlock', requireAuth, async (req: AuthRequest, res) => {
  const cosmeticId = req.params.id as string;

  const { error } = await supabase
    .from('user_cosmetics')
    .upsert({ user_id: req.userId!, cosmetic_id: cosmeticId, is_active: false });

  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json({ success: true });
});

export default router;
