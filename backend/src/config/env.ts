import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  DYNAMODB_TABLE_GAMES: z.string().default('chess-games'),
  DYNAMODB_TABLE_PLAYERS: z.string().default('chess-players'),
  DYNAMODB_ENDPOINT: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = {
  port: parseInt(parsed.data.PORT, 10),
  nodeEnv: parsed.data.NODE_ENV,
  aws: {
    region: parsed.data.AWS_REGION,
    accessKeyId: parsed.data.AWS_ACCESS_KEY_ID,
    secretAccessKey: parsed.data.AWS_SECRET_ACCESS_KEY,
  },
  dynamodb: {
    gamesTable: parsed.data.DYNAMODB_TABLE_GAMES,
    playersTable: parsed.data.DYNAMODB_TABLE_PLAYERS,
    endpoint: parsed.data.DYNAMODB_ENDPOINT,
  },
  frontendUrl: parsed.data.FRONTEND_URL,
};
