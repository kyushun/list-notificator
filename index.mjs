import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv'
import Redis from 'ioredis';
import dayjs from 'dayjs';
import fetch from 'node-fetch';

dotenv.config();

const redis = new Redis(process.env.REDIS_URL);

try {
  await redis.ping();
} catch (e) {
  throw new Error('Redis is not connected.');
}

const twitter = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const postToDiscord = (content) => 
  fetch(process.env.WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
    }),
  });

const checkTweets = async () => {
  console.log(dayjs().format());

  const checkedAt = await redis.get('checked-at');

  const lists = await twitter.v1.listStatuses({list_id: process.env.LIST_ID});

  if (checkedAt) {
    const tweets = lists.tweets.filter(tw => dayjs(tw.created_at).isAfter(checkedAt));
    console.log(tweets.map(tw => tw.id));

    Promise.all(tweets.map((tw) => postToDiscord(`https://twitter.com/_/status/${tw.id_str}`)));
  }

  await redis.set('checked-at', dayjs().format())
};

checkTweets();
setInterval(checkTweets, 5 * 60 * 1000);
