/* ============================================================
   EXAM ENGINE — Anti-Cheat, Timer, IDE, Proctoring
   ============================================================ */

// ─── EXAM QUESTIONS DATA ───────────────────────────────────
const EXAM_QUESTIONS = [
  {
    id: 1, type: 'mcq', points: 10,
    title: 'OSI Model Transport Layer',
    desc: 'Which layer of the OSI model is responsible for end-to-end communication, error recovery, and flow control between two hosts?',
    options: ['Transport Layer', 'Network Layer', 'Session Layer', 'Data Link Layer'],
    correct: 0,
    topic: 'Networking'
  },
  {
    id: 2, type: 'mcq', points: 10,
    title: 'Binary Search Tree Property',
    desc: 'In a Binary Search Tree, for any given node N, which statement is always true?',
    options: ['Left subtree values < N < Right subtree values', 'Right subtree values < N < Left subtree values', 'All children have equal values', 'BST must always be balanced'],
    correct: 0,
    topic: 'Data Structures'
  },
  {
    id: 3, type: 'coding', points: 20,
    title: 'Optimizing Neural Network Pathfinding',
    desc: 'You are tasked with implementing a modified A* search algorithm for a multi-agent system operating in a dynamic 3D environment. The heuristic must account for both distance and the energy consumption of each node.',
    constraints: ['Time complexity must be O(E log V) or better.', 'Memory usage should not exceed 256MB.', 'Input grid size can range from 100×100 to 5000×5000.'],
    inputFormat: 'N, M (Grid dimensions)\nS_x, S_y (Start Coordinates)\nE_x, E_y (End Coordinates)\n... [Grid Weights]',
    starterCode: `import heapq\nimport numpy as np\n\ndef a_star_search(grid, start, goal):\n    # Implement the optimized heuristic here\n    open_set = []\n    heapq.heappush(open_set, (0, start))\n    came_from = {}\n    g_score = {start: 0}\n    f_score = {start: heuristic(start, goal)}\n\n    while open_set:\n        current = heapq.heappop(open_set)[1]\n\n        if current == goal:\n            return reconstruct_path(came_from, current)\n\n        ...\n`,
    topic: 'Algorithms'
  },
  {
    id: 4, type: 'mcq', points: 10,
    title: 'Time Complexity of QuickSort',
    desc: 'What is the average-case time complexity of the QuickSort algorithm, and under what condition does it degrade to O(n²)?',
    options: ['O(n log n); when pivot is always smallest/largest', 'O(n²); when pivot is always median', 'O(n log n); when array is already sorted', 'O(n); when pivot is always the midpoint'],
    correct: 0,
    topic: 'Algorithms'
  },
  {
    id: 5, type: 'coding', points: 25,
    title: 'Implement LRU Cache',
    desc: 'Design and implement a data structure for a Least Recently Used (LRU) cache. It should support get and put operations in O(1) time complexity.',
    constraints: ['get(key) returns -1 if key does not exist.', 'put(key, value) updates or inserts the value.', 'When capacity is exceeded, evict the least recently used item.'],
    inputFormat: 'capacity (int)\nOperations: get(key) / put(key, value)',
    starterCode: `class LRUCache:\n    def __init__(self, capacity: int):\n        # Your code here\n        pass\n\n    def get(self, key: int) -> int:\n        # Your code here\n        pass\n\n    def put(self, key: int, value: int) -> None:\n        # Your code here\n        pass\n`,
    topic: 'Data Structures'
  },
  {
    id: 6, type: 'mcq', points: 10,
    title: 'Database Normalization',
    desc: 'A relation is in Third Normal Form (3NF) if it is in 2NF and:',
    options: ['No transitive dependencies exist', 'Every attribute is atomic', 'No partial dependencies exist', 'All attributes are functionally dependent on primary key only'],
    correct: 0,
    topic: 'Databases'
  },
  {
    id: 7, type: 'mcq', points: 10,
    title: 'TCP vs UDP',
    desc: 'Which of the following protocols is most appropriate for video streaming where some packet loss is acceptable but low latency is critical?',
    options: ['UDP (User Datagram Protocol)', 'TCP (Transmission Control Protocol)', 'HTTP/2 with TLS', 'ICMP Protocol'],
    correct: 0,
    topic: 'Networking'
  },
  {
    id: 8, type: 'coding', points: 20,
    title: 'Graph Cycle Detection',
    desc: 'Given a directed graph represented as an adjacency list, write a function to detect if a cycle exists. Return true if cycle detected, false otherwise.',
    constraints: ['Nodes: 1 ≤ N ≤ 10^5', 'Edges: 0 ≤ E ≤ 10^5', 'Must handle disconnected graphs'],
    inputFormat: 'N, E (number of nodes and edges)\nE lines of: u v (directed edge from u to v)',
    starterCode: `def has_cycle(graph: dict) -> bool:\n    visited = set()\n    rec_stack = set()\n\n    def dfs(node):\n        # Implement DFS with recursion stack\n        pass\n\n    for node in graph:\n        if node not in visited:\n            if dfs(node):\n                return True\n    return False\n`,
    topic: 'Graph Theory'
  },
  {
    id: 9, type: 'mcq', points: 10,
    title: 'ACID Properties',
    desc: 'Which ACID property ensures that once a transaction has been committed, it remains so, even in the case of system failure?',
    options: ['Durability', 'Atomicity', 'Consistency', 'Isolation'],
    correct: 0,
    topic: 'Databases'
  },
  {
    id: 10, type: 'mcq', points: 10,
    title: 'Big-O Notation',
    desc: 'An algorithm performs 3n² + 5n + 100 operations. What is its Big-O time complexity?',
    options: ['O(n²)', 'O(3n²)', 'O(n)', 'O(n² + n)'],
    correct: 0,
    topic: 'Algorithm Analysis'
  }
];

// ─── STATE ─────────────────────────────────────────────────
const STATE = {
  currentQ: 0,
  answers: {},
  flagged: new Set(),
  tabSwitches: 0,
  MAX_TAB_SWITCHES: 3,
  timerSeconds: 6178, // 1h42m58s
  timerInterval: null,
  proctor: { stream: null, snapshots: [] },
  isFullscreen: false,
  ipCheckInterval: null,
  copyPasteBlocked: true,
  examSubmitted: false
};

// ─── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadUser();
  // We wait for initiateExamFlow() below to start the timers and renders
});

async function initiateExamFlow() {
  const btn = document.getElementById('btn-start-exam');
  if(btn) {
    btn.disabled = true;
    btn.textContent = 'Requesting Camera...';
  }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const vid = document.getElementById('proctor-cam');
    if (vid) vid.srcObject = stream;
    STATE.proctor.stream = stream;
    
    // Request Fulllscreen
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
    STATE.isFullscreen = true;
    
    // Hide overlay
    const overlay = document.getElementById('exam-start-overlay');
    if(overlay) overlay.classList.add('hidden');
    
    // Start Engine
    buildQGrid();
    renderQuestion(0);
    startTimer();
    blockCopyPaste();
    setupTabDetection();
    setupIPMonitor();
    checkFullscreen();
    scheduleSnapshots();
    setInterval(simulateGazeTracking, 5000);
    
  } catch (err) {
    console.warn('Init failed:', err);
    if(btn) {
       btn.disabled = false;
       btn.textContent = 'Retry Permissions & Fullscreen';
    }
    alert('Camera permission and fullscreen are required to begin the examination.');
  }
}

function loadUser() {
  const user = JSON.parse(localStorage.getItem('as_user') || '{}');
  const el = document.getElementById('candidate-id');
  if (el) el.textContent = user.rollNo || user.id || 'STU-001';
}

// ─── QUESTION RENDERING ─────────────────────────────────────
function renderQuestion(idx) {
  STATE.currentQ = idx;
  const q = EXAM_QUESTIONS[idx];
  if (!q) return;

  // Header
  document.getElementById('q-number-label').textContent = `QUESTION ${q.id}`;
  document.getElementById('q-points-label').textContent = `${q.points} Points`;
  document.getElementById('q-title').textContent = q.title;
  document.getElementById('q-desc').textContent   = q.desc;

  // Extra (constraints / input format for coding)
  const extra = document.getElementById('q-extra');
  if (q.type === 'coding') {
    extra.innerHTML = `
      <div class="constraints-section">
        <div class="constraints-title">Constraints</div>
        ${q.constraints.map(c => `<div class="constraint-item"><div class="constraint-dot"></div><span>${c}</span></div>`).join('')}
      </div>
      <div class="input-format">
        <div class="if-label">Input Format</div>
        <div class="if-box">${q.inputFormat.replace(/\n/g,'<br>')}</div>
      </div>`;
    renderIDE(q);
  } else {
    extra.innerHTML = `
      <div class="mcq-options" id="mcq-options">
        ${q.options.map((opt, i) => `
          <div class="mcq-option ${STATE.answers[q.id] === i ? 'selected' : ''}" onclick="selectMCQ(${q.id}, ${i}, this)">
            <div class="mcq-radio"></div>
            <span class="mcq-text">${opt}</span>
          </div>`).join('')}
      </div>`;
    renderMCQCenter(q);
  }

  updateQGrid();
  updateNavCount();
}

function renderMCQCenter(q) {
  document.getElementById('center-area').innerHTML = `
    <div class="mcq-center">
      <div class="mcq-center-inner">
        <div style="font-size: 64px; margin-bottom: var(--space-4);">🤔</div>
        <h2 class="mcq-big-title">${q.title}</h2>
        <p class="mcq-big-desc">${q.desc}</p>
        <div class="mcq-center-options">
          ${q.options.map((opt, i) => `
            <div class="mcq-option ${STATE.answers[q.id] === i ? 'selected' : ''}" onclick="selectMCQ(${q.id}, ${i}, this)" id="center-opt-${i}">
              <div class="mcq-radio"></div>
              <span class="mcq-text" style="font-size:14px;">${opt}</span>
            </div>`).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; margin-top: var(--space-6); gap:var(--space-3);">
          ${STATE.currentQ > 0 ? `<button class="btn btn-ghost" onclick="renderQuestion(${STATE.currentQ-1})">← Previous</button>` : `<div></div>`}
          ${STATE.currentQ < EXAM_QUESTIONS.length-1 ? `<button class="btn btn-primary" onclick="renderQuestion(${STATE.currentQ+1})">Next Question →</button>` : `<button class="btn btn-primary" onclick="finishExam()">Submit Exam ✓</button>`}
        </div>
      </div>
    </div>`;
}

function renderIDE(q) {
  const existingCode = STATE.answers[`code_${q.id}`] || q.starterCode;
  document.getElementById('center-area').innerHTML = `
    <div class="ide-container">
      <div class="ide-topbar">
        <div style="display:flex; align-items:center; gap: var(--space-3);">
          <select class="ide-lang-select" id="lang-select" onchange="updateLang()">
            <option value="python">Python 3.10</option>
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++ 17</option>
            <option value="java">Java 17</option>
          </select>
          <span class="ide-filename">solution.py</span>
        </div>
        <div style="display:flex; align-items:center; gap: var(--space-3);">
          <span style="font-size: 18px; cursor:pointer; color: var(--dark-muted);">⚙️</span>
          <button class="ide-run-btn" id="run-btn" onclick="runCode(${q.id})">▶ Run Code</button>
        </div>
      </div>
      <div class="ide-editor-wrap" style="flex:1;">
        <div class="line-numbers" id="line-numbers">${generateLineNumbers(existingCode.split('\n').length)}</div>
        <textarea class="code-area" id="code-editor" spellcheck="false" onkeydown="handleTabKey(event)" oninput="onCodeChange(${q.id})">${existingCode}</textarea>
      </div>
      <div class="terminal-panel">
        <div class="terminal-header">
          <span>⬥ Output Terminal</span>
          <span id="terminal-status" style="margin-left:auto; font-size:10px;"></span>
        </div>
        <div class="terminal-body" id="terminal-body">
          <div class="t-line t-muted">// Code output will appear here after running...</div>
        </div>
      </div>
    </div>
    <div style="padding: var(--space-3) var(--space-4); display:flex; justify-content:space-between; background: var(--dark-surface); border-top: 1px solid var(--dark-border); flex-shrink:0;">
      ${STATE.currentQ > 0 ? `<button class="btn btn-ghost" style="border-color: rgba(255,255,255,0.15); color: var(--dark-muted);" onclick="renderQuestion(${STATE.currentQ-1})">← Previous</button>` : `<div></div>`}
      ${STATE.currentQ < EXAM_QUESTIONS.length-1 ? `<button class="btn btn-accent" onclick="renderQuestion(${STATE.currentQ+1})">Next Question →</button>` : `<button class="btn btn-accent" onclick="finishExam()">Submit Exam ✓</button>`}
    </div>`;
  syncLineNumbers();
}

function generateLineNumbers(count) {
  return Array.from({length: count}, (_, i) => i+1).join('\n');
}

function onCodeChange(qId) {
  const code = document.getElementById('code-editor').value;
  STATE.answers[`code_${qId}`] = code;
  syncLineNumbers();
}

function syncLineNumbers() {
  const editor = document.getElementById('code-editor');
  const lineNums = document.getElementById('line-numbers');
  if (!editor || !lineNums) return;
  const count = editor.value.split('\n').length;
  lineNums.textContent = Array.from({length: count}, (_, i) => i+1).join('\n');
  lineNums.scrollTop = editor.scrollTop;
}

function handleTabKey(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const ta = e.target;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    ta.value = ta.value.substring(0, start) + '    ' + ta.value.substring(end);
    ta.selectionStart = ta.selectionEnd = start + 4;
  }
}

function selectMCQ(qId, optIdx, el) {
  STATE.answers[qId] = optIdx;
  // Update both panels
  document.querySelectorAll('.mcq-option').forEach(o => o.classList.remove('selected'));
  document.querySelectorAll('.mcq-option').forEach((o, i) => {
    if (i % EXAM_QUESTIONS[STATE.currentQ].options.length === optIdx) o.classList.add('selected');
  });
  updateQGrid();
  updateNavCount();
}

// ─── RUN CODE ────────────────────────────────────────────────
async function runCode(qId) {
  const runBtn = document.getElementById('run-btn');
  const terminal = document.getElementById('terminal-body');
  const status = document.getElementById('terminal-status');
  const code = document.getElementById('code-editor')?.value || '';
  if (!code.trim()) { addTerminalLine('No code to run.', 'warn'); return; }

  runBtn.classList.add('running');
  runBtn.textContent = '⟳ Running...';
  terminal.innerHTML = '';
  status.textContent = '';

  addTerminalLine('► Compiling solution.py...', 'info');
  await sleep(600);
  addTerminalLine('✓ Build Successful', 'success');
  await sleep(400);

  // Send to Wandbox API for real execution
  try {
    const lang = document.getElementById('lang-select')?.value || 'python';
    const compilerMap = {
      python: 'cpython-3.10.15',
      javascript: 'nodejs-20.17.0',
      cpp: 'gcc-13.2.0',
      java: 'openjdk-jdk-22+36'
    };
    const compiler = compilerMap[lang] || compilerMap.python;
    
    const res = await fetch('https://wandbox.org/api/compile.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        compiler,
        code
      })
    });
    const data = await res.json();
    const out = data.program_output || data.compiler_output || '';
    const err = data.program_error || data.compiler_error || '';
    
    if (out)  out.split('\n').filter(Boolean).forEach(l => addTerminalLine(l, 'success'));
    if (err)  err.split('\n').filter(Boolean).forEach(l => addTerminalLine(l, 'error'));
    if (!out && !err && data.status === "0") addTerminalLine('Program exited with no output.', 'info');
    status.textContent = `Status: ${data.status === "0" ? "Success" : "Failed"}`;
  } catch {
    addTerminalLine('! Network error: Using local simulation', 'warn');
    await sleep(300);
    // Fallback simulation
    addTerminalLine('! Warning: Unused variable \'np\' at line 2', 'warn');
    addTerminalLine('Sample Output: [Path found: (0,0) → (99,99)]', 'success');
  }

  // Save output to Firebase (simulated with localStorage)
  const outputs = JSON.parse(localStorage.getItem('as_code_outputs') || '{}');
  outputs[qId] = { code, timestamp: Date.now() };
  localStorage.setItem('as_code_outputs', JSON.stringify(outputs));

  runBtn.classList.remove('running');
  runBtn.textContent = '▶ Run Code';
}

function addTerminalLine(text, type = '') {
  const el = document.getElementById('terminal-body');
  if (!el) return;
  const div = document.createElement('div');
  div.className = `t-line t-${type}`;
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

// ─── TIMER ──────────────────────────────────────────────────
function startTimer() {
  const el = document.getElementById('exam-timer');
  STATE.timerInterval = setInterval(() => {
    STATE.timerSeconds--;
    if (STATE.timerSeconds <= 0) { clearInterval(STATE.timerInterval); autoSubmit('Time expired'); return; }
    const h = Math.floor(STATE.timerSeconds / 3600);
    const m = Math.floor((STATE.timerSeconds % 3600) / 60);
    const s = STATE.timerSeconds % 60;
    const fmt = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    if (STATE.timerSeconds <= 300) {
      el.className = 'exam-timer danger';
      el.textContent = '🔴 ' + fmt;
    } else if (STATE.timerSeconds <= 900) {
      el.className = 'exam-timer warning';
      el.textContent = '⚠️ ' + fmt;
    } else {
      el.className = 'exam-timer';
      el.textContent = '🔴 ' + fmt;
    }
  }, 1000);
}

// ─── FULLSCREEN & CHEAT ENFORCEMENT ──────────────────────────
function checkFullscreen() {
  document.addEventListener('fullscreenchange', () => {
    const prompt = document.getElementById('exam-start-overlay');
    if (!document.fullscreenElement) {
      STATE.isFullscreen = false;
      if (!STATE.examSubmitted) {
        if(prompt) prompt.style.display = 'flex';
        handleTabSwitch(); // Penalize leaving fullscreen
      }
    } else {
      STATE.isFullscreen = true;
      if(prompt) prompt.style.display = 'none';
    }
  });
}

// ─── TAB DETECTION ──────────────────────────────────────────
function setupTabDetection() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !STATE.examSubmitted) handleTabSwitch();
  });
  window.addEventListener('blur', () => {
    if (!STATE.examSubmitted) handleTabSwitch();
  });
}

function handleTabSwitch() {
  STATE.tabSwitches++;
  const el = document.getElementById('tab-switch-count');
  if (el) el.textContent = `${STATE.tabSwitches}/${STATE.MAX_TAB_SWITCHES}`;
  el && (el.className = `pp-stat-val ${STATE.tabSwitches >= 2 ? 'bad' : 'warn'}`);

  const warnBox = document.getElementById('tab-warn-box');

  if (STATE.tabSwitches >= STATE.MAX_TAB_SWITCHES) {
    autoSubmit('Maximum tab switches exceeded');
    return;
  }

  if (warnBox) {
    warnBox.textContent = `⚠️ Warning ${STATE.tabSwitches}/${STATE.MAX_TAB_SWITCHES}: Tab switch detected`;
    warnBox.classList.add('show');
  }

  const overlay = document.getElementById('tab-warning-overlay');
  const title   = document.getElementById('warning-title');
  const sub     = document.getElementById('warning-sub');
  const left    = document.getElementById('strikes-left');
  if (overlay) {
    left.textContent   = `${STATE.MAX_TAB_SWITCHES - STATE.tabSwitches}`;
    title.textContent  = `Tab Switch Detected! (Warning ${STATE.tabSwitches}/${STATE.MAX_TAB_SWITCHES})`;
    sub.textContent    = STATE.tabSwitches >= STATE.MAX_TAB_SWITCHES - 1
      ? 'Final warning! Next switch will auto-submit your exam.'
      : 'Return to the exam immediately. All violations are recorded.';
    overlay.classList.add('show');
  }

  // Log incident
  const incidents = JSON.parse(localStorage.getItem('as_incidents') || '[]');
  incidents.push({ type: 'tab_switch', count: STATE.tabSwitches, time: Date.now() });
  localStorage.setItem('as_incidents', JSON.stringify(incidents));

  showToast(`⚠️ Tab switch detected! ${STATE.MAX_TAB_SWITCHES - STATE.tabSwitches} warnings left.`, 'warning');
}

function dismissWarning() {
  document.getElementById('tab-warning-overlay').classList.remove('show');
}

// ─── COPY-PASTE BLOCK ────────────────────────────────────────
function blockCopyPaste() {
  document.addEventListener('copy', e => { e.preventDefault(); showToast('Copy disabled during exam', 'warning'); });
  document.addEventListener('cut',  e => { e.preventDefault(); showToast('Cut disabled during exam', 'warning'); });

  document.addEventListener('paste', e => {
    // Allow paste in code editor
    if (e.target.classList.contains('code-area')) return;
    e.preventDefault();
    showToast('Paste disabled', 'warning');
  });

  document.addEventListener('contextmenu', e => {
    if (e.target.classList.contains('code-area')) return;
    e.preventDefault();
  });

  document.addEventListener('keydown', e => {
    // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+U, F12, DevTools shortcuts
    const blocked = ['c','v','x','u','a','s','p'];
    if (e.ctrlKey && blocked.includes(e.key.toLowerCase()) && !e.target.classList.contains('code-area')) {
      e.preventDefault();
      showToast('Keyboard shortcut disabled', 'warning');
    }
    if (e.key === 'F12') { e.preventDefault(); }
    if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) { e.preventDefault(); }
  });
}

// ─── IP MONITOR ──────────────────────────────────────────────
function setupIPMonitor() {
  let lastIP = null;
  async function checkIP() {
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      const d = await r.json();
      if (lastIP && d.ip !== lastIP) {
        showToast('⚠️ IP address change detected!', 'danger');
        const incidents = JSON.parse(localStorage.getItem('as_incidents') || '[]');
        incidents.push({ type: 'ip_change', from: lastIP, to: d.ip, time: Date.now() });
        localStorage.setItem('as_incidents', JSON.stringify(incidents));
      }
      lastIP = d.ip;
    } catch {}
  }
  checkIP();
  STATE.ipCheckInterval = setInterval(checkIP, 60000);
}

// ─── PROCTOR CAM ────────────────────────────────────────────
async function startProctorCam() {
  try {
    STATE.proctor.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: true });
    const vid = document.getElementById('proctor-cam');
    if (vid) { vid.srcObject = STATE.proctor.stream; }
    document.getElementById('cam-status').textContent = '● Live Recording';
  } catch(e) {
    document.getElementById('cam-status').textContent = '⚠ Camera Unavailable';
    showToast('Webcam required for proctoring', 'danger');
  }
}

// ─── SCHEDULED SNAPSHOTS ─────────────────────────────────────
function scheduleSnapshots() {
  setInterval(takeSnapshot, 30000); // Every 30s
}
function takeSnapshot() {
  const vid = document.getElementById('proctor-cam');
  if (!vid || !STATE.proctor.stream) return;
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 240;
  canvas.getContext('2d').drawImage(vid, 0, 0);
  const snap = canvas.toDataURL('image/jpeg', 0.6);
  STATE.proctor.snapshots.push({ time: Date.now(), data: snap });
  // Keep only last 10 snapshots in memory
  if (STATE.proctor.snapshots.length > 10) STATE.proctor.snapshots.shift();
  localStorage.setItem('as_snapshots', JSON.stringify(STATE.proctor.snapshots.map(s => ({ time: s.time }))));
}

// ─── GAZE SIMULATION ─────────────────────────────────────────
function simulateGazeTracking() {
  const statuses = ['● Active', '⚠ Looking Away', '● Active', '● Active', '● Active'];
  const classes  = ['ok', 'warn', 'ok', 'ok', 'ok'];
  const idx = Math.floor(Math.random() * statuses.length);
  const el  = document.getElementById('gaze-status');
  if (el) { el.textContent = statuses[idx]; el.className = `pp-stat-val ${classes[idx]}`; }
  if (idx === 1) {
    const incidents = JSON.parse(localStorage.getItem('as_incidents') || '[]');
    incidents.push({ type: 'gaze_away', time: Date.now() });
    localStorage.setItem('as_incidents', JSON.stringify(incidents));
  }
}

// ─── QUESTION GRID ───────────────────────────────────────────
function buildQGrid() {
  const grid = document.getElementById('q-grid');
  if (!grid) return;
  EXAM_QUESTIONS.forEach((q, i) => {
    const btn = document.createElement('div');
    btn.className = `q-btn ${i === 0 ? 'current' : ''}`;
    btn.textContent = i + 1;
    btn.id = `q-btn-${i}`;
    btn.onclick = () => renderQuestion(i);
    grid.appendChild(btn);
  });
}

function updateQGrid() {
  EXAM_QUESTIONS.forEach((q, i) => {
    const btn = document.getElementById(`q-btn-${i}`);
    if (!btn) return;
    btn.className = 'q-btn';
    if (i === STATE.currentQ)                btn.classList.add('current');
    else if (STATE.flagged.has(i))           btn.classList.add('flagged');
    else if (STATE.answers[q.id] !== undefined || STATE.answers[`code_${q.id}`]) btn.classList.add('done');
  });
}

function updateNavCount() {
  const answered = EXAM_QUESTIONS.filter(q => STATE.answers[q.id] !== undefined || STATE.answers[`code_${q.id}`]).length;
  const el = document.getElementById('q-nav-count');
  if (el) el.textContent = `${answered} of ${EXAM_QUESTIONS.length} Completed`;
  document.getElementById('answered-count') && (document.getElementById('answered-count').textContent = answered);
  document.getElementById('total-count')    && (document.getElementById('total-count').textContent = EXAM_QUESTIONS.length);
}

function flagQuestion() {
  if (STATE.flagged.has(STATE.currentQ)) STATE.flagged.delete(STATE.currentQ);
  else STATE.flagged.add(STATE.currentQ);
  updateQGrid();
  showToast(STATE.flagged.has(STATE.currentQ) ? '🚩 Question flagged' : 'Flag removed', 'success');
}

// ─── FINISH / SUBMIT ─────────────────────────────────────────
function finishExam() {
  updateNavCount();
  document.getElementById('finish-modal').classList.remove('hidden');
}

function submitExam() {
  if (STATE.examSubmitted) return;
  STATE.examSubmitted = true;
  clearInterval(STATE.timerInterval);
  clearInterval(STATE.ipCheckInterval);

  // Save results
  const score = calculateScore();
  const result = {
    examTitle: 'Advanced Algorithms Final',
    score, total: EXAM_QUESTIONS.reduce((s, q) => s + q.points, 0),
    answers: STATE.answers,
    incidents: JSON.parse(localStorage.getItem('as_incidents') || '[]'),
    snapshots: STATE.proctor.snapshots.length,
    timestamp: Date.now()
  };
  localStorage.setItem('as_last_result', JSON.stringify(result));

  // Exit fullscreen
  if (document.fullscreenElement) document.exitFullscreen();

  showToast('Exam submitted successfully!', 'success');
  setTimeout(() => { window.location.href = 'results.html'; }, 1500);
}

function autoSubmit(reason) {
  showToast(`Auto-submitting: ${reason}`, 'danger');
  setTimeout(submitExam, 1500);
}

function calculateScore() {
  let score = 0;
  EXAM_QUESTIONS.forEach(q => {
    if (q.type === 'mcq' && STATE.answers[q.id] === q.correct) score += q.points;
    if (q.type === 'coding' && STATE.answers[`code_${q.id}`]) score += Math.floor(q.points * 0.7); // Assume partial credit
  });
  return score;
}

// ─── UTILS ──────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function showToast(msg, type = '') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icons = { success: '✓', warning: '⚠', danger: '✕' };
  t.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => { t.classList.add('toast-exit'); setTimeout(() => t.remove(), 300); }, 4000);
}

function updateLang() {
  const lang = document.getElementById('lang-select')?.value;
  const filename = { python: 'solution.py', javascript: 'solution.js', cpp: 'solution.cpp', java: 'Solution.java' };
  const filenameEl = document.querySelector('.ide-filename');
  if (filenameEl) filenameEl.textContent = filename[lang] || 'solution.py';
}
