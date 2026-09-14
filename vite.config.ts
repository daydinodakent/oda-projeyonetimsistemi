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
      // Harness'ın atadığı port varsa onu kullanır (bkz. .claude/launch.json
      // "autoPort": true) — aksi halde (elle `npm run dev` ile) 3000'de çalışır.
      port: process.env.PORT ? Number(process.env.PORT) : 3000,
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
          // scripts/dev-full.mjs ile aynı mantık: API sunucusunun portu
          // ODA_API_PORT ile türetilir (sabit 4001, paralel worktree/
          // oturumlarda EADDRINUSE'a yol açıyordu).
          target: 'http://localhost:' + (process.env.ODA_API_PORT || 4001),
          changeOrigin: true,
        },
      },
    },
  };
});
