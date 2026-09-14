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

// API sunucusunun portu, ön uç PORT'undan (harness/launch.json'ın atadığı,
// her worktree/oturumda farklı olan port) türetilir — sabit 4001 birden
// fazla worktree/oturum AYNI ANDA `npm run dev:full` çalıştırdığında
// (bu depo paylaşılan bir git worktree ortamında yaygın) EADDRINUSE'a yol
// açıyordu. process.env.ODA_API_PORT zaten ayarlanmışsa (elle override)
// o korunur; vite.config.ts da aynı değişkeni proxy hedefi için okur.
const fePort = process.env.PORT ? Number(process.env.PORT) : 3000;
const apiPort = process.env.ODA_API_PORT ? Number(process.env.ODA_API_PORT) : fePort + 1;
const childEnv = { ...process.env, ODA_API_PORT: String(apiPort) };

// Node'un kendi çalıştırılabilir dosyası doğrudan (shell'siz) çağrılır —
// shell:true, boşluk içeren "C:\Program Files\nodejs\node.exe" gibi yollarda
// hatalı parçalanmaya yol açar.
run('api-server', process.execPath, ['server/index.js'], { env: childEnv });
// npm bir .cmd betiği olduğundan Windows'ta shell gerektirir.
run('vite', 'npm', ['run', 'dev'], { shell: true, env: childEnv });

process.on('SIGINT', () => { children.forEach((c) => c.kill()); process.exit(0); });
process.on('SIGTERM', () => { children.forEach((c) => c.kill()); process.exit(0); });
