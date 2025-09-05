// server/src/cache.js
// Cache TTL simples em memória (FIFO) com helper wrap().

export class TTLCache {
  constructor({ max = 1000 } = {}) {
    this.max = max;
    this.map = new Map(); // key -> { val, exp }
  }

  _isExpired(entry) {
    return entry.exp !== 0 && Date.now() > entry.exp;
  }

  get(key) {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (this._isExpired(e)) {
      this.map.delete(key);
      return undefined;
    }
    return e.val;
  }

  set(key, val, ttlMs = 0) {
    const exp = ttlMs > 0 ? Date.now() + ttlMs : 0;
    this.map.set(key, { val, exp });

    // Evita crescer sem limite (remove o mais antigo)
    if (this.map.size > this.max) {
      const firstKey = this.map.keys().next().value;
      this.map.delete(firstKey);
    }
  }

  async wrap(key, ttlMs, fetcher) {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const val = await fetcher();
    this.set(key, val, ttlMs);
    return val;
  }

  clearPrefix(prefix) {
    for (const k of this.map.keys()) {
      if (String(k).startsWith(prefix)) this.map.delete(k);
    }
  }

  clearAll() {
    this.map.clear();
  }
}

// Singleton para o app
const cache = new TTLCache({ max: 2000 });
export default cache;
