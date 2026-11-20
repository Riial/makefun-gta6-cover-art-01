// Golden Heist — serves app/ on localhost for trying it in a desktop
// browser and for the screenshot render script. No network beyond the
// loopback; every file comes from app/. Usage: node serve.ts [port]
// (PORT env also works). Open http://localhost:8080 after starting.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const port = parseInt(process.argv[2] ?? process.env.PORT ?? '8080', 10);

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = join(here, 'app', path === '/' ? 'index.html' : path);
  if (!file.startsWith(join(here, 'app')) || !existsSync(file)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(500);
    res.end('error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Golden Heist serving app/ at http://127.0.0.1:${port}/`);
});
