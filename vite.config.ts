import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './', // ✅ مهم جداً للإنتاج
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    assetsDir: 'assets',
    sourcemap: process.env.NODE_ENV === 'development', // ✅ تفعيل sourcemap للتشخيص فقط في وضع التطوير
    minify: 'terser',
    target: 'esnext', // ✅ تحسين التوافق
    commonjsOptions: {
      ignoreTryCatch: false,
      include: [/node_modules/],
      exclude: ['core-js/**'],
    },
    rollupOptions: {
      external: [
        'electron',
        'node-machine-id',
        'crypto',
        'os',
        'electron-store',
        'child_process',
        'fs',
        'path',
        /^core-js/,
      ],
      output: {
        // ✅ تحسين تقسيم الملفات
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
          ],
          charts: ['recharts'],
          pdf: ['jspdf', 'html2canvas'],
          excel: ['exceljs'],
          qr: ['qrcode', 'jsbarcode'],
          utils: ['date-fns', 'zustand'],
        },
        // ✅ تحسين أسماء الملفات
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      onwarn(warning, warn) {
        // ✅ تجاهل التحذير فقط إذا كان بسبب GlobalSearch
        if (
          warning.code === 'UNRESOLVED_IMPORT' &&
          warning.source &&
          warning.source.includes('globalThis/GlobalSearch')
        ) {
          console.warn('⚠️ تم تجاهل الاستيراد غير الموجود: globalThis/GlobalSearch')
          return
        }

        // ✅ تجاهل تحذيرات أخرى معتادة
        if (warning.message.includes('core-js')) return
        if (warning.message.includes('define-globalThis-property')) return
        if (warning.message.includes('dynamic import will not move module into another chunk')) return

        // ⛔ التحذيرات الأخرى تُعرض
        warn(warning)
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: 'localhost', // ✅ تحديد المضيف بوضوح
  },
  define: {
    global: 'globalThis',
    // ✅ إضافة متغيرات بيئة مفيدة
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  // ✅ تحسين الأداء
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'date-fns',
    ],
    exclude: [
      'electron',
      'node-machine-id',
      'crypto',
      'os',
      'electron-store',
      'child_process',
      'fs',
      'path',
    ],
  },
})
