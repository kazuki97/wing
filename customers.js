// customers.js

import { db } from './db.js';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// 顧客一覧を取得（既存）
export async function fetchCustomers() {
  const snapshot = await getDocs(collection(db, 'customers'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 顧客を新規作成（既存）
export async function createCustomer(customerData) {
  const timestamp = serverTimestamp();
  await addDoc(collection(db, 'customers'), {
    ...customerData,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

// 顧客情報を更新（既存）
export async function updateCustomer(customerId, customerData) {
  const ref = doc(db, 'customers', customerId);
  await updateDoc(ref, {
    ...customerData,
    updatedAt: serverTimestamp(),
  });
}

// 顧客を削除（既存）
export async function deleteCustomer(customerId) {
  await deleteDoc(doc(db, 'customers', customerId));
}

// ──────────────── ここから追加 ────────────────

// 画面上に顧客一覧を描画する関数
export async function displayCustomers() {
  const list = document.getElementById('customerListItems');
  if (!list) return;
  list.innerHTML = '';  // いったんクリア

  const customers = await fetchCustomers();
  customers.forEach(c => {
    const li = document.createElement('li');
    // 顧客名＋備考を表示
    li.textContent = c.name + (c.note ? `（${c.note}）` : '');
    list.appendChild(li);
  });
}
