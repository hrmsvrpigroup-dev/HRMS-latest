import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL

export const redis =
  redisUrl && redisUrl.length > 0
    ? new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
      })
    : null

