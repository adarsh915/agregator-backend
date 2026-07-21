// Simple in-memory cache with TTL
// For production, replace with Redis

class PermissionCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 60 * 1000; // 60 seconds
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key, value, options = {}) {
    const ttl = options.ttl ? options.ttl * 1000 : this.ttl;
    
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  deleteByPattern(pattern) {
    // L-1 fix: use simple string-prefix matching instead of building a regex
    // from the pattern string, which could allow ReDoS if the pattern ever
    // came from external input.
    const prefix = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  // Cleanup expired entries periodically
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          this.cache.delete(key);
        }
      }
    }, 30000); // Every 30 seconds
  }
}

// Singleton instance
const cacheInstance = new PermissionCache();
cacheInstance.startCleanup();

module.exports = { cache: cacheInstance };
