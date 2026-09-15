import type { Plugin } from 'vite';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';

/** Local development telemetry. Fixed checks only; never accepts a command from the browser. */
export function medicineLabPlugin(): Plugin {
  return {
    name: 'medicine-expansion-lab',
    apply: 'serve',
    configureServer(server) {
      let child: ChildProcess | undefined;
      const state = { state: 'idle', startedAt: null as string | null, finishedAt: null as string | null,
        check: null as string | null, exitCode: null as number | null,
        runs: [] as { check: string; state: string; finishedAt: string; exitCode: number | null }[],
        logs: [] as { at: string; text: string; stream: string }[] };
      const commands: Record<string, string[]> = {
        content: ['scripts/check-medicine-expansion.mjs'],
        types: ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'tsconfig.app.json'],
        tests: ['node_modules/vitest/vitest.mjs', 'run', 'src/interview/medicine-content/__tests__/expansion.test.ts',
          'src/interview/medicine-content/__tests__/circuit.test.ts', 'src/interview/medicine-content/__tests__/data.test.ts', 'src/interview/subjects/medicine/__tests__', 'src/interview/engine/__tests__', 'src/interview/bank/__tests__/select.test.ts', 'src/hooks/__tests__', 'src/components/medicine-dashboard/__tests__/medicine-ui.test.tsx'],
      };
      const log = (text: string, stream = 'system') => {
        state.logs.push({ at: new Date().toISOString(), text: text.replace(/\x1b\[[0-9;]*m/g, ''), stream });
        if (state.logs.length > 350) state.logs.splice(0, state.logs.length - 350);
      };
      server.middlewares.use('/__medicine-lab', (req, res, next) => {
        const pathname = req.url?.split('?')[0];
        if (pathname !== '/status' && pathname !== '/run') return next();
        const remote = req.socket.remoteAddress ?? '';
        const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote);
        const hostname = (req.headers.host ?? '').split(':')[0];
        const localHost = ['127.0.0.1', 'localhost', '['].includes(hostname);
        const send = (code: number, value: unknown) => {
          res.statusCode = code; res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(value));
        };
        if (!loopback || !localHost) return send(403, { error: 'Local development access only.' });
        if (pathname === '/status' && req.method === 'GET') return send(200, state);
        if (pathname !== '/run' || req.method !== 'POST') return send(405, { error: 'Method not allowed.' });
        if (req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`)
          return send(403, { error: 'Same-origin request required.' });
        if (req.headers['content-type'] !== 'application/json') return send(415, { error: 'JSON required.' });
        if (child) return send(409, { error: 'A check is already running.' });
        let body = '';
        req.on('data', (chunk) => { body += chunk; if (body.length > 256) req.destroy(); });
        req.on('end', () => {
          let check: string;
          try { check = JSON.parse(body).check; } catch { return send(400, { error: 'Invalid request.' }); }
          if (!Object.hasOwn(commands, check)) return send(400, { error: 'Unknown check.' });
          if (child) return send(409, { error: 'A check is already running.' });
          Object.assign(state, { state: 'running', startedAt: new Date().toISOString(), finishedAt: null, check, exitCode: null });
          log(`Starting ${check}: node ${commands[check].join(' ')}`);
          child = spawn(process.execPath, commands[check], { cwd: path.resolve(server.config.root), windowsHide: true,
            env: { ...process.env, NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
          child.stdout?.on('data', (data) => log(String(data), 'stdout'));
          child.stderr?.on('data', (data) => log(String(data), 'stderr'));
          child.on('error', (error) => log(error.message, 'stderr'));
          child.on('close', (code) => {
            state.state = code === 0 ? 'passed' : 'failed'; state.finishedAt = new Date().toISOString(); state.exitCode = code;
            state.runs.push({ check, state: state.state, finishedAt: state.finishedAt, exitCode: code });
            state.runs = state.runs.slice(-30);
            log(`${check} ${state.state}. Exit code: ${code ?? 'unavailable'}.`); child = undefined;
          });
          send(202, { started: check });
        });
      });
      server.httpServer?.once('close', () => child?.kill());
    },
  };
}
