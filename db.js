// db.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyBND1iUtwW9-D3wisl5-wO_-Sfahab0zmA",
  authDomain: "wing-system.firebaseapp.com",
  projectId: "wing-system",
  storageBucket: "wing-system.firebasestorage.app",
  messagingSenderId: "308022918518",
  appId: "1:308022918518:web:ebdfe5deb82fa32a3f4e57",
  measurementId: "G-806S4XB84E"
};

// Firebaseアプリの初期化
const app = initializeApp(firebaseConfig);

// Firestoreデータベースの取得
export const db = getFirestore(app);

// Firebase Authenticationの取得
export const auth = getAuth(app);

// onAuthStateChanged をエクスポート
export { onAuthStateChanged };
