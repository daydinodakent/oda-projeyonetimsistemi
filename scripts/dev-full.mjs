// `npm run dev` sadece Vite'ı başlatır — harita/CBS ve diğer tüm veriler artık
// bir yerel dosya veritabanı sunucusuna (server/index.js) bağlı olduğundan,
// bu script İKİSİNİ BİRDEN (API sunucusu + Vite) tek bir komutla başlatır.
// Ek bir bağımlılık (ör. concurrently) gerektirmez — sadece iki child process
// spawn edip çıktılarını birleştirir.
import { spawn } from 'node:child_process';

const children = [];

function run(name, command, args, opts = {}) {
  const child = spawn(command, args, { stdio: 'inherit', ...opts });
  children.push(child);
  child.on('exit', (code) => {
    console.log(`[dev-full] "${name}" kapandı (kod: ${code}) — diğer süreç de sonlandırılıyor.`);
    children.forEach((c) => { if (c !== child && !c.killed) c.kill(); });
    process.exit(code || 0);
  });
  return child;
}

// Node'un kendi çalıştırılabilir dosyası doğrudan (shell'siz) çağrılır —
// shell:true, boşluk içeren "C:\Program Files\nodejs\node.exe" gibi yollarda
// hatalı parçalanmaya yol açar.
run('api-server', process.execPath, ['server/index.js']);
// npm bir .cmd betiği olduğundan Windows'ta shell gerektirir.
run('vite', 'npm', ['run', 'dev'], { shell: true });

process.on('SIGINT', () => { children.forEach((c) => c.kill()); process.exit(0); });
process.on('SIGTERM', () => { children.forEach((c) => c.kill()); process.exit(0); });
