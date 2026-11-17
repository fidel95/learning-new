// gitsim.js — a small, honest simulation of a shell + Git, for practising safely.
//
// It has NO browser code in it, so it can be tested on its own. It keeps the same three places
// real Git keeps data:
//   work   = your working folder (the files you see and edit)
//   index  = the staging area (what the NEXT commit will contain)
//   commits = the repository: snapshots, each pointing to its parent(s)
// One folder only (no sub-folders) and no remotes: the goal is the mental model, not every flag.

// ---------- small helpers ----------
function tokenize(line) {
  const tokens = []; let cur = ''; let quote = null; let has = false;
  for (const ch of line) {
    if (quote) { if (ch === quote) quote = null; else cur += ch; }
    else if (ch === '"' || ch === "'") { quote = ch; has = true; }
    else if (/\s/.test(ch)) { if (cur || has) { tokens.push(cur); cur = ''; has = false; } }
    else { cur += ch; has = true; }
  }
  if (quote) return null;                       // an opening quote was never closed
  if (cur || has) tokens.push(cur);
  return tokens;
}

function hash(text) {                           // tiny deterministic hash -> 7 hex characters (like a short commit id)
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0').slice(0, 7);
}

function diffLines(a, b) {                      // classic longest-common-subsequence line diff
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push('  ' + a[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push('- ' + a[i++]);
    else out.push('+ ' + b[j++]);
  }
  while (i < n) out.push('- ' + a[i++]);
  while (j < m) out.push('+ ' + b[j++]);
  return out;
}

const clone = (o) => ({ ...o });
const names = (...objs) => [...new Set(objs.flatMap((o) => Object.keys(o)))].sort();

const UNSUPPORTED = {
  push: 'sends your commits to another copy of the repository (like GitHub)',
  pull: 'downloads and merges commits from another copy (like GitHub)',
  fetch: 'downloads commits from another copy without merging',
  clone: 'copies a whole repository from somewhere else',
  remote: 'manages the other copies your repository knows about',
  stash: 'shelves uncommitted changes for later',
  rebase: 'replays your commits on top of another branch',
  tag: 'puts a permanent name on a commit',
  'cherry-pick': 'copies one commit onto another branch',
};

export class Sim {
  constructor(preset = 'empty') { this.reset(preset); }

  reset(preset = 'empty') {
    this.work = {}; this.index = {};
    this.commits = {}; this.order = [];         // order = commit ids in creation order
    this.branches = {};
    this.head = { branch: 'main', detached: null };
    this.inited = false; this.merging = null; this.reflog = []; this.history = [];
    this.counter = 0;
    if (preset === 'conflict') this._seedConflict();
  }

  // ---------- internals ----------
  _headId() { return this.head.detached || this.branches[this.head.branch] || null; }
  _tree(id) { return id ? this.commits[id].tree : {}; }
  _makeCommit(tree, message, parents) {
    const id = hash(this.counter++ + '|' + parents.join(',') + '|' + message + '|' + JSON.stringify(tree));
    this.commits[id] = { id, parents, message, tree: clone(tree) };
    this.order.push(id);
    return id;
  }
  _move(id) {                                   // move whatever HEAD points at (branch or detached) to id
    if (this.head.detached) this.head.detached = id; else this.branches[this.head.branch] = id;
  }
  _log(action) { const id = this._headId(); if (id) this.reflog.unshift({ id, action }); }
  _ancestors(id) {
    const seen = new Set(); const stack = [id];
    while (stack.length) { const c = stack.pop(); if (!c || seen.has(c)) continue; seen.add(c); stack.push(...this.commits[c].parents); }
    return seen;
  }
  isAncestor(maybeAncestor, of) { return this._ancestors(of).has(maybeAncestor); }
  _mergeBase(a, b) {
    const A = this._ancestors(a); const common = [...this._ancestors(b)].filter((c) => A.has(c));
    return common.sort((x, y) => this.order.indexOf(y) - this.order.indexOf(x))[0] || null;
  }
  _resolveRef(ref) {                            // HEAD, HEAD~2, HEAD^, branch name, or (prefix of) a commit id
    let m = /^HEAD(?:~(\d+)|(\^+))?$/.exec(ref);
    if (m) {
      let id = this._headId(); const steps = m[1] !== undefined ? Number(m[1]) : m[2] ? m[2].length : 0;
      for (let i = 0; i < steps && id; i++) id = this.commits[id].parents[0] || null;
      return id;
    }
    if (this.branches[ref]) return this.branches[ref];
    if (ref.length >= 4) { const hits = this.order.filter((c) => c.startsWith(ref)); if (hits.length === 1) return hits[0]; }
    return null;
  }
  _merge3(base, ours, theirs) {                 // returns { tree, conflicts }
    const tree = {}; const conflicts = [];
    for (const f of names(base, ours, theirs)) {
      const b = base[f], o = ours[f], t = theirs[f];
      let v;
      if (o === t) v = o; else if (o === b) v = t; else if (t === b) v = o; else { conflicts.push(f); v = o; }
      if (v !== undefined) tree[f] = v;
    }
    return { tree, conflicts };
  }
  _dirty() {                                    // uncommitted changes to files Git already tracks?
    const head = this._tree(this._headId());
    return names(head, this.index).some((f) => this.index[f] !== head[f] || (f in this.index && this.work[f] !== this.index[f]));
  }
  _seedConflict() {
    this.inited = true;
    const c1 = this._makeCommit({ 'menu.txt': 'pizza' }, 'Add menu', []);
    this.branches.main = c1; this.branches.feature = c1;
    const c2 = this._makeCommit({ 'menu.txt': 'pizza with hot sauce' }, 'Add hot sauce', [c1]);
    this.branches.feature = c2;
    const c3 = this._makeCommit({ 'menu.txt': 'pizza with cheese' }, 'Add cheese', [c1]);
    this.branches.main = c3;
    this.work = { 'menu.txt': 'pizza with cheese' }; this.index = clone(this.work);
    this.reflog = [{ id: c3, action: 'commit: Add cheese' }];
  }
  _setTree(tree) { this.work = clone(tree); this.index = clone(tree); }
  _short(id) { return id.slice(0, 7); }
  _decor(id) {
    const tags = [];
    const h = this._headId();
    for (const [b, tip] of Object.entries(this.branches)) if (tip === id) tags.push(!this.head.detached && this.head.branch === b ? 'HEAD -> ' + b : b);
    if (this.head.detached === id) tags.unshift('HEAD');
    return tags.length ? ' (' + tags.join(', ') + ')' : '';
  }

  // ---------- read-only views used by the screen and by the lesson's checks ----------
  status() {
    const head = this._tree(this._headId());
    const staged = [], unstaged = [], untracked = [], unmerged = [];
    const conflicted = this.merging ? this.merging.conflicted : [];
    for (const f of names(head, this.index)) {
      if (conflicted.includes(f)) continue;
      if (head[f] === undefined) staged.push({ file: f, kind: 'new file' });
      else if (this.index[f] === undefined) staged.push({ file: f, kind: 'deleted' });
      else if (head[f] !== this.index[f]) staged.push({ file: f, kind: 'modified' });
    }
    for (const f of Object.keys(this.index)) {
      if (conflicted.includes(f)) continue;
      if (this.work[f] === undefined) unstaged.push({ file: f, kind: 'deleted' });
      else if (this.work[f] !== this.index[f]) unstaged.push({ file: f, kind: 'modified' });
    }
    for (const f of Object.keys(this.work)) if (!(f in this.index) && !conflicted.includes(f)) untracked.push(f);
    for (const f of conflicted) unmerged.push(f);
    return { staged, unstaged, untracked: untracked.sort(), unmerged };
  }
  branchLine(id) { return this.commits[id].message; }
  tip(branch = this.head.branch) { return this.branches[branch] || null; }
  reachable(branch) { const t = this.branches[branch]; return t ? this._ancestors(t) : new Set(); }

  // ---------- running a command line ----------
  run(line) {
    const lines = [];
    const out = (t = '') => lines.push({ text: t }); const err = (t) => lines.push({ text: t, err: true });
    const trimmed = line.trim();
    if (!trimmed) return { lines };
    this.history.push(trimmed);
    const tokens = tokenize(trimmed);
    if (!tokens) { err('Oops: a quote was opened but never closed.'); return { lines }; }
    const [cmd, ...args] = tokens;
    try {
      if (cmd === 'git') this._git(args, out, err);
      else this._shell(cmd, args, out, err);
    } catch (e) { err('internal error: ' + e.message); }
    if (cmd === 'clear') return { lines: [], clear: true };
    return { lines };
  }

  // ---------- plain shell commands ----------
  _shell(cmd, args, out, err) {
    switch (cmd) {
      case 'help':
        out('Shell:  pwd  ls  cat FILE  echo "text" > FILE  echo "text" >> FILE  touch FILE  rm FILE  clear');
        out('Git:    git init | status | add | commit -m | log [--oneline] | diff [--staged]');
        out('        git branch [name] | switch [-c] name | merge name | restore | reset | revert | reflog');
        out('Tip:    inside quotes, \\n makes a new line.  Up/Down arrows bring back earlier commands.');
        return;
      case 'clear': return;
      case 'pwd': out('/home/you/project'); return;
      case 'ls': out(Object.keys(this.work).sort().join('  ')); return;
      case 'cat': {
        if (!args[0]) return err('usage: cat FILE');
        if (this.work[args[0]] === undefined) return err('cat: ' + args[0] + ': No such file or directory');
        this.work[args[0]].split('\n').forEach((l) => out(l)); return;
      }
      case 'touch': {
        if (!args[0]) return err('usage: touch FILE');
        if (this.work[args[0]] === undefined) this.work[args[0]] = '';
        return;
      }
      case 'rm': {
        if (!args[0]) return err('usage: rm FILE');
        if (this.work[args[0]] === undefined) return err('rm: ' + args[0] + ': No such file or directory');
        delete this.work[args[0]]; return;
      }
      case 'echo': {
        const at = args.findIndex((a) => a === '>' || a === '>>');
        const text = (at < 0 ? args : args.slice(0, at)).join(' ').replace(/\\n/g, '\n');
        if (at < 0) { text.split('\n').forEach((l) => out(l)); return; }
        const file = args[at + 1];
        if (!file) return err('echo: missing file name after ' + args[at]);
        if (file.includes('/')) return err('This practice terminal has a single folder, so file names cannot contain "/".');
        this.work[file] = args[at] === '>>' && this.work[file] !== undefined && this.work[file] !== '' ? this.work[file] + '\n' + text : text;
        return;
      }
      case 'cd': return err('This practice terminal has just one folder, so there is nowhere to cd to.');
      default: err(cmd + ': command not found. Type help.');
    }
  }

  // ---------- git ----------
  _git(args, out, err) {
    const sub = args[0];
    if (!sub) return out('usage: git <command>. Try: git init, git status, git add, git commit. (Type help)');
    if (sub in UNSUPPORTED) return err("git " + sub + " is not part of this practice terminal. It " + UNSUPPORTED[sub] + '.');
    if (sub === 'init') {
      if (this.inited) return out('Reinitialized existing Git repository in /home/you/project/.git/');
      this.inited = true; return out('Initialized empty Git repository in /home/you/project/.git/');
    }
    if (!this.inited) return err('fatal: not a git repository (or any of the parent directories): .git');
    const rest = args.slice(1);
    const fn = { status: this._status, add: this._add, commit: this._commit, log: this._logCmd, diff: this._diff,
      branch: this._branch, switch: this._switch, checkout: this._switch, merge: this._mergeCmd,
      restore: this._restore, reset: this._reset, revert: this._revert, reflog: this._reflogCmd }[sub];
    if (!fn) return err("git: '" + sub + "' is not a git command in this practice terminal. Type help.");
    fn.call(this, rest, out, err, sub);
  }

  _status(args, out) {
    const s = this.status();
    out(this.head.detached ? 'HEAD detached at ' + this._short(this.head.detached) : 'On branch ' + this.head.branch);
    if (!this._headId()) out('\nNo commits yet');
    if (this.merging) {
      if (s.unmerged.length) out('\nYou have unmerged paths.\n  (fix conflicts, then "git add" each file and run "git commit")');
      else out('\nAll conflicts fixed but you are still merging.\n  (use "git commit" to conclude the merge)');
    }
    if (s.unmerged.length) { out('\nUnmerged paths:'); s.unmerged.forEach((f) => out('\tboth modified:   ' + f)); }
    if (s.staged.length) { out('\nChanges to be committed:'); s.staged.forEach((x) => out('\t' + (x.kind + ':').padEnd(12) + x.file)); }
    if (s.unstaged.length) { out('\nChanges not staged for commit:'); s.unstaged.forEach((x) => out('\t' + (x.kind + ':').padEnd(12) + x.file)); }
    if (s.untracked.length) { out('\nUntracked files:'); s.untracked.forEach((f) => out('\t' + f)); }
    if (!s.staged.length && !s.unstaged.length && !s.untracked.length && !s.unmerged.length)
      out(this._headId() ? '\nnothing to commit, working tree clean' : '\nnothing to commit (create/copy files and use "git add" to track)');
  }

  _add(args, out, err) {
    if (!args.length) return err('Nothing specified, nothing added. Try: git add FILE   or   git add .');
    const targets = args.includes('.') || args.includes('-A') ? names(this.work, this.index) : args;
    for (const f of targets) {
      if (this.work[f] === undefined && !(f in this.index)) return err("fatal: pathspec '" + f + "' did not match any files");
      if (this.work[f] === undefined) delete this.index[f]; else this.index[f] = this.work[f];
      if (this.merging) this.merging.conflicted = this.merging.conflicted.filter((c) => c !== f);
    }
  }

  _commit(args, out, err) {
    let message = null; let all = false;
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '-m') message = args[++i];
      else if (a === '-am' || a === '-ma') { all = true; message = args[++i]; }
      else if (a === '-a') all = true;
      else return err('error: unknown option ' + a + ". Use: git commit -m \"message\"");
    }
    if (all) for (const f of Object.keys(this.index)) { if (this.work[f] === undefined) delete this.index[f]; else this.index[f] = this.work[f]; }
    if (this.merging && this.merging.conflicted.length) return err('error: Committing is not possible because you have unmerged files.\nhint: Fix them up, "git add" each one, then commit.');
    const head = this._headId(); const headTree = this._tree(head);
    if (!this.merging) {
      const changed = names(headTree, this.index).filter((f) => headTree[f] !== this.index[f]);
      if (!changed.length) {
        const s = this.status();
        return out(s.unstaged.length || s.untracked.length ? 'no changes added to commit (use "git add" and/or "git commit -a")' : 'nothing to commit, working tree clean');
      }
    }
    if (message === null || message === undefined || message.trim() === '') {
      if (!this.merging) return err('Aborting commit: empty message. Use:  git commit -m "what changed and why"');
      message = "Merge branch '" + this.merging.branch + "'";
    }
    const parents = head ? [head] : []; if (this.merging) parents.push(this.merging.theirs);
    const id = this._makeCommit(this.index, message, parents);
    this._move(id);
    const files = names(headTree, this.index).filter((f) => headTree[f] !== this.index[f]).length;
    out('[' + (this.head.detached ? 'detached HEAD' : this.head.branch) + (head ? '' : ' (root-commit)') + ' ' + this._short(id) + '] ' + message);
    out(' ' + files + ' file' + (files === 1 ? '' : 's') + ' changed');
    this.merging = null;
    this._log('commit: ' + message);
  }

  _logCmd(args, out, err) {
    const head = this._headId();
    if (!head) return err("fatal: your current branch '" + this.head.branch + "' does not have any commits yet");
    const one = args.includes('--oneline');
    const ids = [...this._ancestors(head)].sort((a, b) => this.order.indexOf(b) - this.order.indexOf(a));
    ids.forEach((id, i) => {
      const c = this.commits[id];
      if (one) out(this._short(id) + this._decor(id) + ' ' + c.message);
      else {
        out('commit ' + id + this._decor(id));
        if (c.parents.length > 1) out('Merge: ' + c.parents.map((p) => this._short(p)).join(' '));
        out(''); out('    ' + c.message); if (i < ids.length - 1) out('');
      }
    });
  }

  _diff(args, out) {
    const staged = args.includes('--staged') || args.includes('--cached');
    const from = staged ? this._tree(this._headId()) : this.index;
    const to = staged ? this.index : this.work;
    let any = false;
    for (const f of names(from, to)) {
      if (!staged && !(f in this.index)) continue;       // untracked files are not part of git diff
      if (from[f] === to[f]) continue;
      any = true;
      out('diff --git a/' + f + ' b/' + f);
      out(from[f] === undefined ? 'new file' : to[f] === undefined ? 'deleted file' : '--- a/' + f);
      const lines = diffLines(from[f] === undefined ? [] : from[f].split('\n'), to[f] === undefined ? [] : to[f].split('\n'));
      lines.forEach((l) => out(l));
    }
    if (!any) out('(no differences)');
  }

  _branch(args, out, err) {
    const del = args.find((a) => a === '-d' || a === '-D');
    const rest = args.filter((a) => !a.startsWith('-'));
    if (del) {
      const b = rest[0];
      if (!this.branches[b]) return err("error: branch '" + b + "' not found.");
      if (!this.head.detached && this.head.branch === b) return err("error: cannot delete branch '" + b + "' while you are on it. Switch away first.");
      const cur = this._headId();
      if (del === '-d' && !(cur && this.isAncestor(this.branches[b], cur))) return err("error: the branch '" + b + "' is not fully merged.\nIf you are sure, use: git branch -D " + b);
      const was = this._short(this.branches[b]); delete this.branches[b];
      return out('Deleted branch ' + b + ' (was ' + was + ').');
    }
    if (!rest.length) {
      const list = Object.keys(this.branches);
      if (!this.head.detached && !this.branches[this.head.branch]) list.push(this.head.branch);
      list.sort().forEach((b) => out((!this.head.detached && this.head.branch === b ? '* ' : '  ') + b));
      return;
    }
    const name = rest[0];
    if (!/^[\w./-]+$/.test(name)) return err("fatal: '" + name + "' is not a valid branch name");
    if (this.branches[name]) return err("fatal: a branch named '" + name + "' already exists");
    const head = this._headId();
    if (!head) return err("fatal: not a valid object name: '" + this.head.branch + "' (make a commit first)");
    this.branches[name] = head;
  }

  _switch(args, out, err, sub) {
    const create = args.find((a) => a === '-c' || a === '-b' || a === '-C');
    const rest = args.filter((a) => !a.startsWith('-') || a === '--');
    if (sub === 'checkout' && rest[0] === '--') return this._restore(rest.slice(1), out, err);
    const name = rest[0];
    if (!name) return err('usage: git switch BRANCH   (or  git switch -c NEWBRANCH)');
    const head = this._headId();
    if (create) {
      if (this.branches[name]) return err("fatal: a branch named '" + name + "' already exists");
      if (!/^[\w./-]+$/.test(name)) return err("fatal: '" + name + "' is not a valid branch name");
      if (head) this.branches[name] = head;
      this.head = { branch: name, detached: null };
      return out("Switched to a new branch '" + name + "'");
    }
    let target = this.branches[name];
    let detach = null;
    if (!target) {
      const id = this._resolveRef(name);
      if (id) { target = id; detach = id; }
      else if (sub === 'checkout' && (this.work[name] !== undefined || name in this.index)) return this._restore([name], out, err);
      else return err(sub === 'checkout' ? "error: pathspec '" + name + "' did not match any file(s) known to git" : "fatal: invalid reference: " + name);
    }
    if (!detach && !this.head.detached && this.head.branch === name) return out("Already on '" + name + "'");
    const oldT = this._tree(head), newT = this._tree(target);
    const blocked = names(oldT, newT).filter((f) => oldT[f] !== newT[f] && (this.work[f] !== oldT[f] || this.index[f] !== oldT[f]));
    if (blocked.length) return err('error: Your local changes to ' + blocked.join(', ') + ' would be overwritten by the switch.\nCommit your changes first (or restore them), then try again.');
    for (const f of names(oldT, newT)) {
      if (oldT[f] === newT[f]) continue;
      if (newT[f] === undefined) { delete this.work[f]; delete this.index[f]; } else { this.work[f] = newT[f]; this.index[f] = newT[f]; }
    }
    this.merging = null;
    this.head = detach ? { branch: this.head.branch, detached: detach } : { branch: name, detached: null };
    out(detach ? 'Note: switching to ' + this._short(detach) + ' (detached HEAD: new commits here belong to no branch).' : "Switched to branch '" + name + "'");
    this.reflog.unshift({ id: target, action: 'checkout: moving to ' + name });
  }

  _mergeCmd(args, out, err) {
    if (args.includes('--abort')) {
      if (!this.merging) return err('fatal: There is no merge to abort.');
      this._setTree(this._tree(this._headId())); this.merging = null;
      return out('Merge aborted. Back to where you were before the merge.');
    }
    const name = args.find((a) => !a.startsWith('-'));
    if (!name) return err('usage: git merge BRANCH');
    if (this.merging) return err('fatal: you are in the middle of a merge. Finish it (git commit) or cancel it (git merge --abort).');
    const target = this.branches[name];
    if (!target) return err('merge: ' + name + ' - not something we can merge');
    const head = this._headId();
    if (!head) return err('fatal: you have no commits yet.');
    if (this._dirty()) return err('error: You have uncommitted changes. Commit them (or restore them) before merging.');
    if (this.isAncestor(target, head)) return out('Already up to date.');
    if (this.isAncestor(head, target)) {
      out('Updating ' + this._short(head) + '..' + this._short(target)); out('Fast-forward');
      this._setTree(this._tree(target)); this._move(target); this._log('merge ' + name + ': Fast-forward');
      return;
    }
    const base = this._mergeBase(head, target);
    const { tree, conflicts } = this._merge3(this._tree(base), this._tree(head), this._tree(target));
    const theirs = this._tree(target);
    if (!conflicts.length) {
      const id = this._makeCommit(tree, "Merge branch '" + name + "'", [head, target]);
      this._move(id); this._setTree(tree); this._log("merge " + name + ': Merge made by the ort strategy.');
      out("Merge made by the 'ort' strategy.");
      return;
    }
    // Conflict: write both versions into the file between markers, exactly as Git does.
    this.work = clone(tree); this.index = clone(tree);
    for (const f of conflicts) {
      this.work[f] = '<<<<<<< HEAD\n' + (this._tree(head)[f] ?? '') + '\n=======\n' + (theirs[f] ?? '') + '\n>>>>>>> ' + name;
      out('Auto-merging ' + f); out('CONFLICT (content): Merge conflict in ' + f);
    }
    out('Automatic merge failed; fix conflicts and then commit the result.');
    this.merging = { theirs: target, branch: name, conflicted: conflicts };
  }

  _restore(args, out, err) {
    const staged = args.includes('--staged');
    const files = args.filter((a) => !a.startsWith('-'));
    if (!files.length) return err('fatal: you must specify which path to restore (try: git restore FILE)');
    const targets = files.includes('.') ? names(this.work, this.index) : files;
    const head = this._tree(this._headId());
    for (const f of targets) {
      if (staged) { if (head[f] === undefined) delete this.index[f]; else this.index[f] = head[f]; }
      else {
        if (!(f in this.index)) return err("error: pathspec '" + f + "' did not match any file(s) known to git");
        if (this.index[f] === undefined) delete this.work[f]; else this.work[f] = this.index[f];
      }
    }
  }

  _reset(args, out, err) {
    const mode = args.includes('--hard') ? 'hard' : args.includes('--soft') ? 'soft' : 'mixed';
    const rest = args.filter((a) => !a.startsWith('-'));
    const head = this._headId(); const headTree = this._tree(head);
    if (rest.length && !this._resolveRef(rest[0])) {
      if (mode === 'mixed' && (this.work[rest[0]] !== undefined || rest[0] in this.index)) {     // git reset FILE = unstage
        for (const f of rest) { if (headTree[f] === undefined) delete this.index[f]; else this.index[f] = headTree[f]; }
        return;
      }
      return err("fatal: ambiguous argument '" + rest[0] + "': unknown revision or path");
    }
    const id = rest.length ? this._resolveRef(rest[0]) : head;
    if (!id) return err('fatal: you do not have any commits yet.');
    const oldIndexAndHead = names(headTree, this.index);
    this._move(id); this.merging = null;
    const newTree = this._tree(id);
    if (mode !== 'soft') this.index = clone(newTree);
    if (mode === 'hard') {
      for (const f of oldIndexAndHead) if (newTree[f] === undefined) delete this.work[f];
      for (const f of Object.keys(newTree)) this.work[f] = newTree[f];
    }
    this._log('reset: moving to ' + (rest[0] || 'HEAD'));
    if (mode === 'hard') out('HEAD is now at ' + this._short(id) + ' ' + this.commits[id].message);
    else if (mode === 'mixed') { const s = this.status(); if (s.unstaged.length) { out('Unstaged changes after reset:'); s.unstaged.forEach((x) => out(x.kind[0].toUpperCase() + '\t' + x.file)); } }
  }

  _revert(args, out, err) {
    const ref = args.find((a) => !a.startsWith('-')) || 'HEAD';
    const id = this._resolveRef(ref);
    if (!id) return err("fatal: bad revision '" + ref + "'");
    if (this._dirty()) return err('error: You have uncommitted changes. Commit or restore them before reverting.');
    const c = this.commits[id];
    if (c.parents.length !== 1) return err('error: this practice terminal can only revert ordinary commits (one parent).');
    const head = this._headId();
    const { tree, conflicts } = this._merge3(c.tree, this._tree(head), this._tree(c.parents[0]));
    if (conflicts.length) return err('error: could not revert ' + this._short(id) + ': conflict in ' + conflicts.join(', ') + ' (not supported here)');
    const msg = 'Revert "' + c.message + '"';
    const nid = this._makeCommit(tree, msg, [head]);
    this._move(nid); this._setTree(tree); this._log('revert: ' + c.message);
    out('[' + this.head.branch + ' ' + this._short(nid) + '] ' + msg);
  }

  _reflogCmd(args, out, err) {
    if (!this.reflog.length) return err('fatal: no history yet.');
    this.reflog.forEach((r, i) => out(this._short(r.id) + ' HEAD@{' + i + '}: ' + r.action));
  }
}
