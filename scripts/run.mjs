// Starts Accountable with the settings in .env (R26, R55, R56), on any OS.
//
//   node scripts/run.mjs dev    backend and frontend dev servers, data in the local
//                               SQLite file, Supabase sign-in plus test sign-in,
//                               and the OpenRouter key for the Copilot
//   node scripts/run.mjs start  builds the frontend and runs the app the way Render
//                               does, against DATABASE_URL (Supabase's Postgres)
//
// .env is read with Node's own parser, so no package is needed. The backend never
// reads .env itself.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

const root = path.resolve(import.meta.dirname, '..');
const LOOPBACK = ['--host', '127.0.0.1', '--port', '8000'];
const SUPABASE = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'];
// The Copilot's settings (R72), for both modes.
const OPENROUTER = ['OPENROUTER_API_KEY', 'OPENROUTER_MODEL'];

function readDotEnv() {
  const file = path.join(root, '.env');
  return existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
}

function environment(mode) {
  const fromFile = readDotEnv();
  const env = { ...process.env };
  const shared = [...SUPABASE, ...OPENROUTER];
  const names = mode === 'start' ? [...shared, 'DATABASE_URL'] : shared;
  for (const name of names) {
    const value = fromFile[name] ?? process.env[name];
    if (value) env[name] = value;
  }
  // Test-only switches never reach the real app.
  delete env.ACCOUNTABLE_ALLOW_RESET;
  delete env.ACCOUNTABLE_TEST_SIGN_IN;
  // Only the end-to-end tests point the backend at a fake OpenRouter. A stray
  // shell variable must never send the real key to another address.
  delete env.OPENROUTER_BASE_URL;
  if (mode === 'dev') {
    // A development run must never change the team's data (decision 19).
    delete env.DATABASE_URL;
    // ui-check signs in this way. Safe, because the data is the local file (decision 20).
    env.ACCOUNTABLE_TEST_SIGN_IN = '1';
  }
  return env;
}

function run(command, env) {
  const child = spawn(command, { cwd: root, env, stdio: 'inherit', shell: true });
  child.on('exit', (code) => process.exit(code ?? 1));
}

const mode = process.argv[2];
const uvicorn = ['uv run -m uvicorn accountable.main:app', ...LOOPBACK].join(' ');

if (mode === 'dev') {
  const api = `${uvicorn} --reload --reload-dir backend/accountable`;
  run(
    `npx concurrently -n api,web -c blue,green "${api}" "npm run dev -w frontend"`,
    environment('dev'),
  );
} else if (mode === 'start') {
  const env = environment('start');
  const build = spawnSync('npm run build', { cwd: root, env, stdio: 'inherit', shell: true });
  if (build.status !== 0) process.exit(build.status ?? 1);
  console.log('Accountable is starting at http://127.0.0.1:8000');
  run(uvicorn, env);
} else {
  console.error('Usage: node scripts/run.mjs dev|start');
  process.exit(2);
}
