'use strict';

const { execFileSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');

// Capture only public version metadata, never Git paths, remotes or environment values.
function createTestEvidence() {
  const startedAt = new Date().toISOString();
  const codeVersion = { commit: null, dirty: null, exactCommit: false };
  try {
    const options = { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true, timeout: 5000 };
    const commit = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], options).trim();
    if (/^[a-f0-9]{40,64}$/.test(commit)) {
      codeVersion.commit = commit;
      codeVersion.dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], options).trim().length > 0;
      codeVersion.exactCommit = !codeVersion.dirty;
    }
  } catch {
    // A missing Git checkout must not prevent an isolated test run.
  }
  codeVersion.description = codeVersion.dirty === false ? 'Committed source snapshot' : codeVersion.dirty === true ? 'Working tree with uncommitted changes; commit is a reference only' : 'Source version unavailable';
  return { fecha: startedAt.slice(0, 10), startedAt, executionId: randomUUID(), codeVersion };
}

module.exports = { createTestEvidence };
