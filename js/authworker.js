// authworker.js — plays the ATTACKER against a stolen password table, using real hashing (WebCrypto) and real timing.
// Receives { mode, iterations, budgetMs }, answers with what it cracked and how fast it could guess.

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

// The victims. Six picked passwords people really use; two are strong.
const USERS = [
  ['ana', 'welcome1'], ['bo', 'welcome1'], ['cy', 'dragon123'], ['dee', 'sunshine!'],
  ['eli', 'qwerty123'], ['fay', 'k9$Vx!pQz2#m'], ['gus', 'iloveyou2024'], ['hal', 'correct horse battery'],
];
// The attacker's dictionary: common words × common endings (about 450 guesses, most popular first).
const BASES = ['password', 'welcome', 'letmein', 'dragon', 'sunshine', 'qwerty', 'iloveyou', 'monkey', 'football', 'master', 'shadow', 'baseball', 'superman', 'trustno', 'admin', 'login', 'princess', 'hello', 'freedom', 'whatever', 'michael', 'jessica', 'charlie', 'banana', 'summer', 'flower', 'starwars', 'batman', 'cookie', 'secret', 'computer', 'hunter', 'soccer', 'ginger', 'cheese', 'purple', 'orange', 'butter', 'maggie', 'thomas'];
const ENDS = ['', '1', '123', '!', '2024', '12', '1234', '2023', '!!', '99', '321'];
const WORDS = []; for (const e of ENDS) for (const b of BASES) WORDS.push(b + e);

async function sha(text) { return hex(await crypto.subtle.digest('SHA-256', enc.encode(text))); }
async function pbkdf2(pw, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations }, key, 256));
}

self.onmessage = async (e) => {
  const { mode, iterations, budgetMs } = e.data;
  const salted = mode !== 'unsalted';
  const hashWith = (pw, salt) => mode === 'pbkdf2' ? pbkdf2(pw, salt, iterations) : sha((salted ? salt : '') + pw);

  // 1) The site stores these (this is the "stolen database").
  const rows = [];
  for (const [name, pw] of USERS) {
    const salt = salted ? hex(crypto.getRandomValues(new Uint8Array(8))) : '';
    rows.push({ name, salt, hash: await hashWith(pw, salt), cracked: null });
  }

  // 2) The attacker works through the dictionary, most popular guess first, against every user.
  const start = performance.now();
  let hashes = 0, timedOut = false;
  if (mode === 'unsalted') {
    // No salt: hash every guess ONCE and look the hash up. One precomputed table cracks everybody.
    const table = new Map();
    for (const w of WORDS) { table.set(await sha(w), w); hashes++; if (performance.now() - start > budgetMs) { timedOut = true; break; } }
    for (const r of rows) r.cracked = table.get(r.hash) || null;
  } else {
    // Salted: the same guess hashes differently for each user, so the work repeats per user.
    outer: for (const w of WORDS) {
      for (const r of rows) {
        if (r.cracked) continue;
        hashes++;
        if (await hashWith(w, r.salt) === r.hash) r.cracked = w;
        if (performance.now() - start > budgetMs) { timedOut = true; break outer; }
      }
    }
  }
  const ms = performance.now() - start;
  self.postMessage({ rows, hashes, ms, timedOut, words: WORDS.length });
};
