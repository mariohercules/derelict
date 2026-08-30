import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

// Build identity for the footer tag: git SHA when available (local builds),
// falling back to a UTC timestamp (Vercel's remote build has no .git).
let sha = '';
try {
  sha = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  // no git in the build environment
}
const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z';
const buildId = [sha, stamp].filter(Boolean).join(' · ');

export default defineConfig({
  plugins: [react()],
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  test: { css: { include: [/theme\.css/] } },
});
