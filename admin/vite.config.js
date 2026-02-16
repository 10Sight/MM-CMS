import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from "path"
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // Remove React DevTools in production
      babel: {
        plugins: process.env.NODE_ENV === 'production' ? ['babel-plugin-react-remove-properties'] : []
      }
    }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Audit Management System',
        short_name: 'AuditSys',
        description: 'Comprehensive Audit Management System',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Development server optimizations
  server: {
    port: 5174,
    host: true,
    hmr: {
      overlay: false,
    },
    // Optimize dependency pre-bundling
    fs: {
      strict: false
    }
  },
  // Build optimizations
  build: {
    // Generate smaller bundles
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Optimize chunk size
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for large libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // UI libraries chunk
          ui: ['@radix-ui/react-avatar', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          // Utility libraries
          utils: ['axios', 'date-fns', 'clsx', 'tailwind-merge'],
          // Animation libraries
          animation: ['framer-motion'],
          // Chart libraries
          charts: ['recharts'],
        },
      },
    },
    // Set appropriate chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable source maps for debugging (disable in production)
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'framer-motion',
      'lucide-react',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
    ],
    exclude: ['@react-three/fiber', '@react-three/drei'], // Heavy 3D libraries
  },
  // CSS optimizations
  css: {
    devSourcemap: process.env.NODE_ENV !== 'production',
  },
});
