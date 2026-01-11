import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { stripeWebhookPlugin } from './vite-plugin-stripe-webhook';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      stripeWebhookPlugin()
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@core': path.resolve(__dirname, './src/2.core'),
        '@features': path.resolve(__dirname, './src/3.features'),
        '@app': path.resolve(__dirname, './src/1.app'),
        '@pages': path.resolve(__dirname, './src/4.pages'),
      }
    }
  };
});
