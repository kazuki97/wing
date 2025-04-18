import { db } from './db.js'; // Firebaseの初期化をインポート
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  getDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

const consumablesCollection = collection(db, 'consumables');

// 消耗品をIDで取得する関数
export async function getConsumableById(consumableId) {
  try {
    const docRef = doc(db, 'consumables', consumableId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('消耗品の取得に失敗しました:', error);
    throw error;
  }
}

// 消耗品使用量をIDで取得する関数
export async function getConsumableUsageById(usageId) {
  try {
    const docRef = doc(db, 'consumableUsage', usageId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('消耗品使用量の取得に失敗しました:', error);
    throw error;
  }
}


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

// 消耗品の使用量を取得する関数
export async function getConsumableUsage(year, month) {
  try {
    const consumableUsageCollection = collection(db, 'consumableUsage');
    const snapshot = await getDocs(consumableUsageCollection);

    // 特定の年と月でフィルタリング
    const filteredUsage = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((usage) => {
        const usageDate = new Date(usage.timestamp);
        return usageDate.getFullYear() === year && usageDate.getMonth() + 1 === month;
      });

    return filteredUsage;
  } catch (error) {
    console.error('消耗品使用量の取得に失敗しました:', error);
    throw error;
  }
}

// DOMContentLoaded 後にイベント登録を実施（修正後）
document.addEventListener('DOMContentLoaded', () => {
  const addConsumableForm = document.getElementById('addConsumableForm');
  if (addConsumableForm) {  // 要素が存在する場合のみイベントリスナーを登録
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
  }
});


// 消耗品一覧の表示
export async function displayConsumables() {
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

// 消耗品の更新関数
export async function updateConsumable(consumableId, updatedData) {
  try {
    await updateDoc(doc(db, 'consumables', consumableId), updatedData);
    console.log('消耗品が更新されました:', consumableId);
  } catch (error) {
    console.error('消耗品の更新に失敗しました:', error);
    throw error;
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

// 消耗品使用量の更新関数
export async function updateConsumableUsage(usageId, updatedData) {
  try {
    await updateDoc(doc(db, 'consumableUsage', usageId), updatedData);
    console.log('消耗品使用量が更新されました:', usageId);
  } catch (error) {
    console.error('消耗品使用量の更新に失敗しました:', error);
    throw error;
  }
}

// 消耗品使用量の削除関数
export async function deleteConsumableUsage(usageId) {
  try {
    await deleteDoc(doc(db, 'consumableUsage', usageId));
    console.log('消耗品使用量が削除されました:', usageId);
  } catch (error) {
    console.error('消耗品使用量の削除に失敗しました:', error);
    throw error;
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
