import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null; // SSR / build-time guard
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!_client) {
    _client = createClient(url, key);
  }
  return _client;
}

// Convenience proxy — always safe to import; will be null on server
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (client) {
      return (client as any)[prop];
    }

    // Fallback Mock Chainer to prevent Javascript TypeErrors when Supabase is uninitialized
    const createMockChainer = () => {
      const chainer: any = new Proxy(() => {}, {
        get(_t, childProp) {
          if (childProp === 'then') {
            return (onfulfilled: any) => Promise.resolve({ data: [], error: { message: 'Supabase not initialized' } }).then(onfulfilled);
          }
          return chainer;
        },
        apply() {
          return chainer;
        }
      });
      return chainer;
    };

    if (typeof prop === 'string' && ['from', 'auth', 'storage'].includes(prop)) {
      return createMockChainer();
    }

    return () => Promise.resolve({ data: null, error: { message: 'Supabase not initialized' } });
  },
});


