import { supabase } from './trapService';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  // Expo push API accepts up to 100 per request
  const chunks = chunk(messages, 100);
  await Promise.all(
    chunks.map((batch) =>
      fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      })
    )
  );
}

export async function notifyChallengeSent(challengerId: string, targetId: string, trapTitle: string, trapId: string): Promise<void> {
  const token = await getPushToken(targetId);
  if (!token) return;

  const { data: challenger } = await supabase
    .from('users')
    .select('username')
    .eq('id', challengerId)
    .single();

  await sendPush([{
    to: token,
    title: '⚔️ New Challenge!',
    body: `@${challenger?.username ?? 'Someone'} challenged you to escape "${trapTitle}"`,
    data: { screen: 'challenge', trapId },
  }]);
}

export async function notifyTrapFail(creatorId: string, playerUsername: string, trapTitle: string, trapId: string): Promise<void> {
  const token = await getPushToken(creatorId);
  if (!token) return;

  await sendPush([{
    to: token,
    title: '😈 Another victim!',
    body: `@${playerUsername} failed your trap "${trapTitle}"`,
    data: { screen: 'replay', trapId },
  }]);
}

async function getPushToken(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', userId)
    .single();
  return data?.push_token ?? null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
