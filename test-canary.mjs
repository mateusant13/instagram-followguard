// IG FollowGuard — test-only network canary (never shipped).
// Loaded via bunfig.toml [test] preload BEFORE any test file evaluates, so it
// captures the true native fetch at process start and replaces globalThis.fetch
// with a wrapper that throws on any unstubbed call. Every fetch-branch test
// stubs globalThis.fetch itself, so a throw here always means a test reached
// for the real network — including an orphaned async loop that outlives its
// test and fires after a teardown restored fetch. Hits are recorded on
// globalThis.__IGF_CANARY_HITS__ (call order) and echoed to stderr.
'use strict';

const NATIVE_FETCH = globalThis.fetch.bind(globalThis);
const HITS = [];

async function canaryFetch(input, init) {
  // Explicit opt-in only; no test in this suite ever sets it.
  if (globalThis.__IGF_ALLOW_REAL_FETCH__ === true) {
    return NATIVE_FETCH(input, init);
  }
  const url = typeof input === 'string' ? input : input?.url ?? String(input);
  HITS.push(url);
  console.error(`[igf-canary] blocked real fetch: ${url}`);
  throw new Error(`CANARY: real fetch attempted ${url}`);
}

canaryFetch.__IGF_CANARY__ = true;
globalThis.__IGF_CANARY_HITS__ = HITS;
globalThis.fetch = canaryFetch;
