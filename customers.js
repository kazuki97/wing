// customers.js

import { db } from './db.js';
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// 顧客一覧を取得
export async function fetchCustomers() {
  const snapshot = await getDocs(collection(db, 'customers'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 顧客を新規作成
export async function createCustomer(customerData) {
  const timestamp = serverTimestamp();
  await addDoc(collection(db, 'customers'), {
    ...customerData,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

// 顧客情報を更新
export async function updateCustomer(customerId, customerData) {
  const ref = doc(db, 'customers', customerId);
  await updateDoc(ref, {
    ...customerData,
    updatedAt: serverTimestamp(),
  });
}

// 顧客を削除
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
    // <li>要素を作成
    const li = document.createElement('li');
    li.style.marginBottom = '1rem';

    // 顧客名＋備考
    const header = document.createElement('div');
    header.textContent = c.name + (c.note ? `（${c.note}）` : '');
    header.style.fontWeight = 'bold';
    li.appendChild(header);

    // 特別単価があればテーブルで表示
    if (Array.isArray(c.pricingRules) && c.pricingRules.length > 0) {
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.innerHTML = `
        <thead>
          <tr>
            <th style="border:1px solid #ccc; padding:4px;">親カテゴリ</th>
            <th style="border:1px solid #ccc; padding:4px;">サブカテゴリ</th>
            <th style="border:1px solid #ccc; padding:4px;">最小数量</th>
            <th style="border:1px solid #ccc; padding:4px;">最大数量</th>
            <th style="border:1px solid #ccc; padding:4px;">単価</th>
          </tr>
        </thead>
        <tbody>
          ${c.pricingRules.map(r => `
            <tr>
              <td style="border:1px solid #ccc; padding:4px;">${r.parentCategoryName}</td>
              <td style="border:1px solid #ccc; padding:4px;">${r.subcategoryName}</td>
              <td style="border:1px solid #ccc; padding:4px; text-align:right;">${r.minQuantity}</td>
              <td style="border:1px solid #ccc; padding:4px; text-align:right;">${r.maxQuantity}</td>
              <td style="border:1px solid #ccc; padding:4px; text-align:right;">¥${r.unitPrice}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
      li.appendChild(table);
    }

    list.appendChild(li);
  });
}
