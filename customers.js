// customers.js
import { db } from './db.js';
import {
  collection,
  doc,
  getDoc,           // ← これを追加
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// ────────── CRUD 基本 ──────────
export async function fetchCustomers() {
  const snapshot = await getDocs(collection(db, 'customers'));
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createCustomer(customerData) {
  const ts = serverTimestamp();
  await addDoc(collection(db, 'customers'), {
    ...customerData,
    createdAt: ts,
    updatedAt: ts,
  });
}

export async function updateCustomer(customerId, customerData) {
  await updateDoc(doc(db, 'customers', customerId), {
    ...customerData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCustomer(customerId) {
  await deleteDoc(doc(db, 'customers', customerId));
}

// ────────── 一覧描画（ここを全面改修）──────────
export async function displayCustomers() {
  const list = document.getElementById('customerListItems');
  if (!list) return;

  list.innerHTML = '';                       // いったんクリア
  const customers = await fetchCustomers();  // Firestore → 配列

  customers.forEach(cust => {
    // ── 顧客名行 ──
    const wrapper = document.createElement('li');
    wrapper.classList.add('customer-item');

    const title  = document.createElement('div');
    title.classList.add('customer-title');
    title.textContent =
      `${cust.name}${cust.note ? `（${cust.note}）` : ''}`;
    wrapper.appendChild(title);

    // ── 特別単価テーブル（あれば） ──
    if (Array.isArray(cust.pricingRules) && cust.pricingRules.length) {
      const table = document.createElement('table');
      table.classList.add('customer-pricing-table');
      table.innerHTML = `
        <thead>
          <tr>
            <th>親カテゴリ</th>
            <th>サブカテゴリ</th>
            <th>最小数量</th>
            <th>最大数量</th>
            <th>単価</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector('tbody');
      cust.pricingRules.forEach(rule => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${rule.parentCategoryName ?? '―'}</td>
          <td>${rule.subcategoryName      ?? '―'}</td>
          <td>${rule.minQuantity ?? '―'}</td>
          <td>${rule.maxQuantity ?? '―'}</td>
          <td>¥${Number(rule.unitPrice).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
      });

      wrapper.appendChild(table);
    }

    list.appendChild(wrapper);
  });
}

// ────────── 顧客IDから情報取得 ──────────
export async function getCustomerById(customerId) {
  try {
    const ref = doc(db, 'customers', customerId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('顧客情報の取得に失敗:', error);
    return null;
  }
}
