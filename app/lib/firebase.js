// ==========================================
// Firebase Configuration
// ==========================================
// This file initializes Firebase for the
// online presence tracking feature.
// ==========================================

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, onValue, onDisconnect, serverTimestamp } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB22bNTjzFbMVb-gWLIvo5EG22KpfLjhuY",
  authDomain: "indexing-checker-f79a2.firebaseapp.com",
  databaseURL: "https://indexing-checker-f79a2-default-rtdb.firebaseio.com",
  projectId: "indexing-checker-f79a2",
  storageBucket: "indexing-checker-f79a2.firebasestorage.app",
  messagingSenderId: "192567327518",
  appId: "1:192567327518:web:a3ae50b0c3212b45fa270f"
};

let app = null;
let database = null;

function getFirebaseApp() {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);
    } catch (error) {
      console.error('Firebase init error:', error);
    }
  }
  return { app, database };
}

// Generate a unique session ID for this browser tab
function getSessionId() {
  let sessionId = sessionStorage.getItem('gic_session_id');
  if (!sessionId) {
    sessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('gic_session_id', sessionId);
  }
  return sessionId;
}

// Mark user as online
export function setUserOnline(userName) {
  try {
    const { database } = getFirebaseApp();
    if (!database) return;

    const sessionId = getSessionId();
    const userRef = ref(database, `online/${sessionId}`);

    // Set user data
    set(userRef, {
      name: userName,
      timestamp: Date.now(),
    });

    // Auto-remove when disconnected (browser close, tab close, internet lost)
    onDisconnect(userRef).remove();
  } catch (error) {
    console.error('Firebase setUserOnline error:', error);
  }
}

// Mark user as offline (manual cleanup)
export function setUserOffline() {
  try {
    const { database } = getFirebaseApp();
    if (!database) return;

    const sessionId = getSessionId();
    const userRef = ref(database, `online/${sessionId}`);
    set(userRef, null);
  } catch (error) {
    console.error('Firebase setUserOffline error:', error);
  }
}

// Listen to online users in real-time
export function listenOnlineUsers(callback) {
  try {
    const { database } = getFirebaseApp();
    if (!database) {
      callback([]);
      return () => {};
    }

    const onlineRef = ref(database, 'online');

    const unsubscribe = onValue(onlineRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }

      const users = Object.entries(data).map(([id, userData]) => ({
        id,
        name: userData.name || 'Unknown',
        timestamp: userData.timestamp || 0,
      }));

      // Sort by most recent first
      users.sort((a, b) => b.timestamp - a.timestamp);

      callback(users);
    }, (error) => {
      console.error('Firebase listen error:', error);
      callback([]);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Firebase listenOnlineUsers error:', error);
    callback([]);
    return () => {};
  }
}
