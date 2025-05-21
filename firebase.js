// firebase.js（追加修正版）
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js';
import { 
  getFirestore, collection, addDoc, serverTimestamp, query, orderBy, getDocs,
  doc, getDoc, setDoc, updateDoc, deleteDoc, runTransaction, where
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';
import { 
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyBND1iUtwW9-D3wisl5-wO_-Sfahab0zmA",
  authDomain: "wing-system.firebaseapp.com",
  projectId: "wing-system",
  storageBucket: "wing-system.appspot.com",
  messagingSenderId: "308022918518",
  appId: "1:308022918518:web:ebdfe5deb82fa32a3f4e57",
  measurementId: "G-806S4XB84E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export {
  db,
  auth,
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
  where,
  onAuthStateChanged,           // ← 追加（✅）
  signInWithEmailAndPassword,   // ← 追加（✅）
  signOut                       // ← 追加（✅）
};
