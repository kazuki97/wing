import { db } from './db.js'; // Firebaseの初期化をインポート
import { collection, getDocs, deleteDoc, doc, addDoc } from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

const consumablesCollection = collection(db, 'consumables');

// 消耗品リストの取得
export async function getConsumables() {
  try {
    const snapshot = await getDocs(consumablesCollection);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('消耗品の取得に失敗しました:', error);
    throw error;
  }
}

// 消耗品の追加フォームイベントリスナー
const addConsumableForm = document.getElementById('addConsumableForm');
addConsumableForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const consumableName = document.getElementById('consumableName').value.trim();
  const consumableCost = parseFloat(document.getElementById('consumableCost').value);

  if (!consumableName || isNaN(consumableCost) || consumableCost < 0) {
    showError('消耗品名と有効な原価を入力してください');
    return;
  }

  try {
    // Firestoreに新しい消耗品を追加
    await addDoc(consumablesCollection, {
      name: consumableName,
      cost: consumableCost,
    });
    console.log('消耗品が追加されました:', { consumableName, consumableCost });
    addConsumableForm.reset();
    await displayConsumables(); // 消耗品リストを再表示
  } catch (error) {
    console.error('消耗品の追加に失敗しました:', error);
    showError('消耗品の追加に失敗しました');
  }
});

// 消耗品一覧の表示
async function displayConsumables() {
  try {
    const snapshot = await getDocs(consumablesCollection);
    const consumableList = document.getElementById('consumableList').querySelector('tbody');
    consumableList.innerHTML = '';

    snapshot.forEach((doc) => {
      const consumable = { id: doc.id, ...doc.data() };
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${consumable.name}</td>
        <td>¥${Math.floor(consumable.cost)}</td> <!-- 小数点以下を切り捨てて表示 -->
        <td><button class="delete-consumable" data-id="${consumable.id}">削除</button></td>
      `;
      consumableList.appendChild(row);
    });

    // 削除ボタンのイベントリスナーを設定
    document.querySelectorAll('.delete-consumable').forEach((button) => {
      button.addEventListener('click', async (e) => {
        const consumableId = e.target.dataset.id;
        await deleteConsumable(consumableId);
      });
    });
  } catch (error) {
    console.error('消耗品の取得に失敗しました:', error);
    showError('消耗品の取得に失敗しました');
  }
}

// 消耗品を削除する関数
export async function deleteConsumable(consumableId) {
  try {
    await deleteDoc(doc(db, 'consumables', consumableId));
    console.log('消耗品が削除されました:', consumableId);
    await displayConsumables(); // 消耗品リストを再表示
  } catch (error) {
    console.error('消耗品の削除に失敗しました:', error);
    showError('消耗品の削除に失敗しました');
  }
}

// エラーメッセージ表示関数
function showError(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

// 初期化処理
window.addEventListener('DOMContentLoaded', async () => {
  await displayConsumables(); // ページロード時に消耗品リストを表示
});
