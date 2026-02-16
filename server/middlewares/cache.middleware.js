import { getRedisClient } from "../config/redis.config.js";

const redisClient = getRedisClient();

// Generic cache middleware
const cache = (duration = 300) => {
  return async (req, res, next) => {
    try {
      // Skip caching if Redis is not available
      if (!redisClient || redisClient.status !== 'ready') {
        return next();
      }

      // Create cache key from route and query parameters
      const cacheKey = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;
      
      // Try to get cached data
      const cachedData = await redisClient.get(cacheKey);
      
      if (cachedData) {
        console.log(`🎯 Cache hit for: ${cacheKey}`);
        return res.json({
          ...JSON.parse(cachedData),
          fromCache: true,
          cacheTimestamp: new Date().toISOString()
        });
      }
      
      console.log(`❌ Cache miss for: ${cacheKey}`);
      
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to cache the response
      res.json = (data) => {
        // Cache the response data
        redisClient.setex(cacheKey, duration, JSON.stringify(data));
        console.log(`💾 Cached data for: ${cacheKey} (${duration}s)`);
        
        // Send the response
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error("Cache middleware error:", error.message);
      next(); // Continue without caching if Redis fails
    }
  };
};

// Cache invalidation for specific patterns
const invalidateCache = async (pattern) => {
  try {
    // Skip if Redis is not available
    if (!redisClient || redisClient.status !== 'ready') {
      return;
    }

    const keys = await redisClient.keys(`cache:*${pattern}*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`🗑️  Invalidated ${keys.length} cache entries for pattern: ${pattern}`);
    }
  } catch (error) {
    console.error("Cache invalidation error:", error.message);
  }
};

// Cache invalidation middleware for POST/PUT/DELETE operations
const invalidateCacheMiddleware = (patterns = []) => {
  return async (req, res, next) => {
    try {
      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to invalidate cache after successful operations
      res.json = async (data) => {
        // Only invalidate cache for successful operations (status < 400)
        if (res.statusCode < 400) {
          for (const pattern of patterns) {
            await invalidateCache(pattern);
          }
        }
        
        return originalJson(data);
      };
      
      next();
    } catch (error) {
      console.error("Cache invalidation middleware error:", error.message);
      next();
    }
  };
};

// Specific cache configurations
const cacheConfig = {
  short: 60,      // 1 minute
  medium: 300,    // 5 minutes
  long: 900,      // 15 minutes
  veryLong: 3600  // 1 hour
};

export { cache, invalidateCache, invalidateCacheMiddleware, cacheConfig };
export default cache;
