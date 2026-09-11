import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@terra-draw/core': path.resolve(__dirname, 'node_modules/terra-draw'),
        '@terra-draw/maplibre-adapter': path.resolve(__dirname, 'node_modules/terra-draw-maplibre-gl-adapter'),
        '@terra-draw/polygon-mode': path.resolve(__dirname, 'node_modules/terra-draw'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // ÖNEMLİ: server/data/ (yerel veritabanı dosyası, bkz. server/db.js) izlemeden
      // HARİÇ TUTULUR — aksi halde haritada bir obje her taşındığında/kaydedildiğinde
      // arka uç bu dosyaya yazar, Vite bunu bir kaynak kodu değişikliği sanıp sayfayı
      // tam yeniler (full reload) ve kullanıcı o an bulunduğu sekmeden/görünümden
      // (ör. Harita > Editör) App.tsx'in başlangıç durumuna geri fırlatılır.
      watch: process.env.DISABLE_HMR === 'true' ? null : { ignored: ['**/server/data/**'] },
      // src/services/api.ts artık bir yerel dosya veritabanı sunucusuna
      // (server/index.js, bkz. server/db.js) '/api/...' üzerinden bağlanır —
      // bu proxy sayesinde tarayıcı aynı origin'den (localhost:3000) çağırır,
      // CORS/port bilmeye gerek kalmaz.
      proxy: {
        '/api': {
          target: 'http://localhost:4001',
          changeOrigin: true,
        },
      },
    },
  };
});
