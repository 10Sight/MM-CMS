import Redis from "ioredis";
import ENV from "./env.config.js";

let redisClient;

const createRedisClient = () => {
  try {
    const config = {
      host: ENV.REDIS_HOST,
      port: ENV.REDIS_PORT,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      maxRetriesPerRequest: 0, // No retries
      lazyConnect: true,
      connectTimeout: 2000, // Short timeout
      commandTimeout: 2000,
      enableOfflineQueue: false, // Don't queue commands when offline
      autoResubscribe: false, // Don't auto-resubscribe
      autoResendUnfulfilledCommands: false, // Don't resend commands
    };

    // Add password if provided
    if (ENV.REDIS_PASSWORD) {
      config.password = ENV.REDIS_PASSWORD;
    }

    redisClient = new Redis(config);

    redisClient.on("connect", () => {
      console.log("✅ Redis connected successfully");
    });

    redisClient.on("error", (error) => {
      console.warn("⚠️ Redis connection error:", error.message);
      console.log("💡 App will continue without Redis caching");
    });

    redisClient.on("reconnecting", () => {
      console.log("🔄 Redis reconnecting...");
    });

    redisClient.on("ready", () => {
      console.log("🚀 Redis is ready to accept commands");
    });

    return redisClient;
  } catch (error) {
    console.warn("⚠️ Failed to create Redis client:", error.message);
    console.log("💡 App will continue without Redis");
    return null;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.disconnect();
    console.log("Redis disconnected");
  }
};

export { getRedisClient, disconnectRedis };
export default getRedisClient;
