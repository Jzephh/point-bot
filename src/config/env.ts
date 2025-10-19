import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

const envSchema = z.object({
  // Whop API Configuration
  WHOP_API_KEY: z.string().min(1, 'WHOP_API_KEY is required'),
  NEXT_PUBLIC_WHOP_APP_ID: z.string().min(1, 'NEXT_PUBLIC_WHOP_APP_ID is required'),
  NEXT_PUBLIC_WHOP_AGENT_USER_ID: z.string().min(1, 'NEXT_PUBLIC_WHOP_AGENT_USER_ID is required'),
  NEXT_PUBLIC_WHOP_COMPANY_ID: z.string().min(1, 'NEXT_PUBLIC_WHOP_COMPANY_ID is required'),
  
  // Server Configuration
  PORT: z.string().default('3001'),
  APP_BASE_URL: z.string().default('http://localhost:3001'),
  
  // Database Configuration
  MONGO_URI: z.string().default('mongodb://localhost:27017'),
  MONGO_DB: z.string().default('image_points_bot'),
  
  // Redis Configuration
  
  // Bot Configuration
  POINTS_PER_IMAGE: z.string().default('1').transform(Number),
  POLLING_INTERVAL: z.string().default('5000').transform(Number),
});

export function loadEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Environment validation error:', error);
    process.exit(1);
  }
}
