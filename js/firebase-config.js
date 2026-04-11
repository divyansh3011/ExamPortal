// ============================================================
// ACADEMIC SANCTUARY — Firebase Configuration
// ============================================================
// Replace the config below with your actual Firebase project values
// from https://console.firebase.google.com

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
  databaseURL:       "https://your-project-default-rtdb.firebaseio.com"
};

// ─── FIREBASE INIT ────────────────────────────────────────────
// Import and initialize via CDN (add to HTML head):
// <script type="module">
//   import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
//   import { getAuth }       from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
//   import { getFirestore }  from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
//   import { getDatabase }   from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-database.js';
//   import { getStorage }    from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';
// </script>

// MOCK FIREBASE LAYER (works without real credentials, uses localStorage)
// Swap this with real Firebase SDK when credentials are added.

window.FirebaseDB = {
  // ─── AUTH ─────────────────────────────────────────────────
  auth: {
    currentUser: null,
    
    signIn(email, password) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const user = { uid: 'user_' + Date.now(), email, displayName: email.split('@')[0] };
          window.FirebaseDB.auth.currentUser = user;
          localStorage.setItem('as_firebase_user', JSON.stringify(user));
          resolve({ user });
        }, 800);
      });
    },

    signOut() {
      window.FirebaseDB.auth.currentUser = null;
      localStorage.removeItem('as_firebase_user');
      localStorage.removeItem('as_user');
      return Promise.resolve();
    },

    onAuthStateChanged(callback) {
      const stored = localStorage.getItem('as_firebase_user');
      window.FirebaseDB.auth.currentUser = stored ? JSON.parse(stored) : null;
      callback(window.FirebaseDB.auth.currentUser);
    }
  },

  // ─── FIRESTORE (mocked with localStorage) ─────────────────
  firestore: {
    _getCollection(name) {
      return JSON.parse(localStorage.getItem(`fs_${name}`) || '[]');
    },
    _saveCollection(name, data) {
      localStorage.setItem(`fs_${name}`, JSON.stringify(data));
    },

    collection(name) {
      return {
        add(doc) {
          const col  = window.FirebaseDB.firestore._getCollection(name);
          const id   = 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          col.push({ id, ...doc, _createdAt: Date.now() });
          window.FirebaseDB.firestore._saveCollection(name, col);
          return Promise.resolve({ id });
        },
        get() {
          const col = window.FirebaseDB.firestore._getCollection(name);
          return Promise.resolve({ docs: col.map(d => ({ id: d.id, data: () => d })) });
        },
        doc(id) {
          return {
            get() {
              const col = window.FirebaseDB.firestore._getCollection(name);
              const doc = col.find(d => d.id === id);
              return Promise.resolve({ exists: !!doc, data: () => doc, id });
            },
            set(data) {
              const col = window.FirebaseDB.firestore._getCollection(name);
              const idx = col.findIndex(d => d.id === id);
              if (idx >= 0) col[idx] = { ...col[idx], ...data };
              else col.push({ id, ...data, _createdAt: Date.now() });
              window.FirebaseDB.firestore._saveCollection(name, col);
              return Promise.resolve();
            },
            update(data) {
              return this.set(data);
            },
            delete() {
              const col = window.FirebaseDB.firestore._getCollection(name).filter(d => d.id !== id);
              window.FirebaseDB.firestore._saveCollection(name, col);
              return Promise.resolve();
            }
          };
        },
        where(field, op, val) {
          return {
            get() {
              const col   = window.FirebaseDB.firestore._getCollection(name);
              const docs  = col.filter(d => {
                if (op === '==')  return d[field] === val;
                if (op === '!=')  return d[field] !== val;
                if (op === '>')   return d[field] >  val;
                if (op === '<')   return d[field] <  val;
                if (op === 'in')  return val.includes(d[field]);
                return true;
              });
              return Promise.resolve({ docs: docs.map(d => ({ id: d.id, data: () => d })) });
            }
          };
        }
      };
    }
  },

  // ─── REALTIME DATABASE ────────────────────────────────────
  database: {
    _data: JSON.parse(localStorage.getItem('as_rtdb') || '{}'),
    _listeners: {},

    ref(path) {
      return {
        set(value) {
          let obj = window.FirebaseDB.database._data;
          const parts = path.split('/').filter(Boolean);
          parts.slice(0,-1).forEach(p => { if (!obj[p]) obj[p] = {}; obj = obj[p]; });
          obj[parts[parts.length-1]] = value;
          localStorage.setItem('as_rtdb', JSON.stringify(window.FirebaseDB.database._data));
          return Promise.resolve();
        },
        push(value) {
          const id = 'push_' + Date.now();
          let obj = window.FirebaseDB.database._data;
          const parts = path.split('/').filter(Boolean);
          parts.forEach(p => { if (!obj[p]) obj[p] = {}; obj = obj[p]; });
          obj[id] = value;
          localStorage.setItem('as_rtdb', JSON.stringify(window.FirebaseDB.database._data));
          return Promise.resolve({ key: id });
        },
        on(event, callback) {
          let obj = window.FirebaseDB.database._data;
          path.split('/').filter(Boolean).forEach(p => { obj = obj?.[p]; });
          callback({ val: () => obj, exists: () => obj !== undefined });
          // Store listener for simulate
          window.FirebaseDB.database._listeners[path] = callback;
        },
        once(event) {
          let obj = window.FirebaseDB.database._data;
          path.split('/').filter(Boolean).forEach(p => { obj = obj?.[p]; });
          return Promise.resolve({ val: () => obj, exists: () => obj !== undefined });
        },
        off() {
          delete window.FirebaseDB.database._listeners[path];
        }
      };
    }
  },

  // ─── STORAGE (mocked with localStorage / base64) ──────────
  storage: {
    ref(path) {
      return {
        putString(base64Data, format) {
          try {
            localStorage.setItem(`storage_${path}`, base64Data);
          } catch(e) {
            console.warn('Storage quota exceeded, skipping snapshot save');
          }
          return Promise.resolve({ ref: { getDownloadURL: () => Promise.resolve('data:image/jpeg;base64,...') } });
        },
        getDownloadURL() {
          return Promise.resolve(localStorage.getItem(`storage_${path}`) || '');
        }
      };
    }
  }
};

// ─── HELPER FUNCTIONS ─────────────────────────────────────────

/**
 * Save exam result to Firestore
 * @param {Object} result - Exam result object
 */
async function saveExamResult(result) {
  try {
    const docRef = await window.FirebaseDB.firestore.collection('results').add({
      studentId:  result.studentId || 'unknown',
      examId:     result.examId    || 'unknown',
      examTitle:  result.examTitle || 'Exam',
      score:      result.score     || 0,
      total:      result.total     || 100,
      percentage: Math.round((result.score / result.total) * 100),
      answers:    result.answers   || {},
      incidents:  result.incidents || [],
      snapshots:  result.snapshots || 0,
      submittedAt: Date.now()
    });
    console.log('[Firebase] Result saved:', docRef.id);
    return docRef.id;
  } catch(e) {
    console.error('[Firebase] Error saving result:', e);
  }
}

/**
 * Log a cheating incident
 * @param {Object} incident - Incident data
 */
async function logIncident(incident) {
  try {
    await window.FirebaseDB.firestore.collection('incidents').add({
      studentId:  incident.studentId || 'unknown',
      examId:     incident.examId    || 'unknown',
      type:       incident.type,        // tab_switch | gaze_away | ip_change | copy_paste
      severity:   incident.severity || 'medium',
      details:    incident.details  || {},
      timestamp:  Date.now()
    });
  } catch(e) {
    console.error('[Firebase] Error logging incident:', e);
  }
}

/**
 * Upload webcam snapshot to storage
 * @param {string} studentId
 * @param {string} base64Data
 */
async function uploadSnapshot(studentId, base64Data) {
  const path = `snapshots/${studentId}/${Date.now()}.jpg`;
  try {
    const ref = window.FirebaseDB.storage.ref(path);
    await ref.putString(base64Data, 'data_url');
    const url = await ref.getDownloadURL();
    return url;
  } catch(e) {
    console.error('[Firebase] Error uploading snapshot:', e);
  }
}

/**
 * Get student streak from Firestore
 * @param {string} studentId
 */
async function getStreak(studentId) {
  try {
    const doc = await window.FirebaseDB.firestore.collection('streaks').doc(studentId).get();
    if (doc.exists) return doc.data().streak || 0;
    return parseInt(localStorage.getItem('as_streak') || '0');
  } catch {
    return parseInt(localStorage.getItem('as_streak') || '0');
  }
}

/**
 * Update streak for student
 * @param {string} studentId
 */
async function updateStreak(studentId) {
  const today     = new Date().toDateString();
  const lastDate  = localStorage.getItem(`as_last_practice_${studentId}`) || '';
  let   streak    = await getStreak(studentId);

  if (lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    streak = (lastDate === yesterday) ? streak + 1 : 1;
    localStorage.setItem(`as_last_practice_${studentId}`, today);
    localStorage.setItem('as_streak', streak);
    await window.FirebaseDB.firestore.collection('streaks').doc(studentId).set({ streak, lastDate: today });
  }
  return streak;
}

console.log('[Academic Sanctuary] Firebase config initialized (mock layer active)');
console.log('[Academic Sanctuary] Replace firebaseConfig with real credentials to enable cloud sync');
