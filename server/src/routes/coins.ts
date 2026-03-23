import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabase } from '../services/trapService';

const router = Router();

const COIN_PACK_PRODUCTS: Record<string, number> = {
  mindheist_coins_100: 100,
  mindheist_coins_500: 500,
  mindheist_coins_1500: 1500,
};

// GET /api/coins/balance
router.get('/balance', requireAuth, async (req: AuthRequest, res) => {
  const { data } = await supabase
    .from('users')
    .select('coin_balance')
    .eq('id', req.userId!)
    .single();
  res.json({ balance: data?.coin_balance ?? 0 });
});

// GET /api/coins/transactions
router.get('/transactions', requireAuth, async (req: AuthRequest, res) => {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('*')
    .eq('user_id', req.userId!)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data ?? []);
});

// POST /api/coins/purchase — called after RevenueCat purchase verification
router.post('/purchase', requireAuth, async (req: AuthRequest, res) => {
  const { product_id } = req.body;
  const amount = COIN_PACK_PRODUCTS[product_id];

  if (!amount) {
    res.status(400).json({ error: 'Unknown product' });
    return;
  }

  const { error } = await supabase.rpc('award_coins', {
    p_user_id: req.userId!,
    p_amount: amount,
    p_reason: 'purchase',
  });

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ awarded: amount });
});

export default router;
