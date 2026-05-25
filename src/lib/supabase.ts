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

/**
 * Recursively strips large Base64 data strings (larger than 50KB) from any object/array
 * and replaces them with a small placeholder, keeping localStorage light.
 */
export function stripLargeBase64(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('data:') && obj.length > 50 * 1024) {
      return '[BASE64_STRIPPED]';
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => stripLargeBase64(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cleaned[key] = stripLargeBase64(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}



