import { db } from './firebase.js';

// 消耗品をFirestoreに追加する関数
async function addConsumable(event) {
  event.preventDefault();

  const name = document.getElementById('consumableName').value;
  const cost = parseFloat(document.getElementById('consumableCost').value);

  try {
    await db.collection('consumables').add({
      name,
      cost,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('消耗品を登録しました。');
    document.getElementById('addConsumableForm').reset();
    displayConsumables(); // 登録後、一覧を再表示
  } catch (error) {
    alert('エラーが発生しました: ' + error.message);
  }
}

// 消耗品一覧を表示する関数
async function displayConsumables() {
  const tbody = document.querySelector('#consumableList tbody');
  tbody.innerHTML = '';

  const snapshot = await db.collection('consumables').orderBy('createdAt', 'desc').get();

  snapshot.forEach(doc => {
    const consumable = doc.data();
    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${consumable.name}</td>
      <td>${consumable.cost}円</td>
      <td>
        <button onclick="editConsumable('${doc.id}', '${consumable.name}', ${consumable.cost})">編集</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// 編集用関数の仮作成（次のステップで具体化）
window.editConsumable = (id, name, cost) => {
  alert(`消耗品の編集: ${name}（${cost}円）`);
};

// ページ読み込み時の初期設定
document.addEventListener('DOMContentLoaded', () => {
  const addConsumableForm = document.getElementById('addConsumableForm');
  addConsumableForm.addEventListener('submit', addConsumable);

  displayConsumables(); // 読み込み時に一覧を表示
});
