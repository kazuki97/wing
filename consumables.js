// consumables.js

let consumables = [];

// 消耗品の追加
const addConsumableForm = document.getElementById('addConsumableForm');
addConsumableForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const consumableName = document.getElementById('consumableName').value.trim();
  const consumableCost = parseFloat(document.getElementById('consumableCost').value);

  if (!consumableName || isNaN(consumableCost) || consumableCost < 0) {
    showError('消耗品名と有効な原価を入力してください');
    return;
  }

  const newConsumable = {
    id: generateUniqueId(),
    name: consumableName,
    cost: consumableCost,
  };

  consumables.push(newConsumable);
  displayConsumables();
  addConsumableForm.reset();
});

// 消耗品一覧の表示
function displayConsumables() {
  const consumableList = document.getElementById('consumableList').querySelector('tbody');
  consumableList.innerHTML = '';

  consumables.forEach((consumable) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${consumable.name}</td>
      <td>¥${consumable.cost.toFixed(2)}</td>
      <td><button class="delete-consumable" data-id="${consumable.id}">削除</button></td>
    `;
    consumableList.appendChild(row);
  });

  // 削除ボタンのイベントリスナーを追加
  document.querySelectorAll('.delete-consumable').forEach((button) => {
    button.addEventListener('click', (e) => {
      const consumableId = e.target.dataset.id;
      deleteConsumable(consumableId);
    });
  });
}

// 消耗品を削除する関数
export async function deleteConsumable(consumableId) {
  consumables = consumables.filter((c) => c.id !== consumableId);
  console.log('消耗品が削除されました:', consumableId);
  displayConsumables();
}

// 消耗品を追加する関数
export async function addConsumable(name, cost) {
  const newConsumable = {
    id: generateUniqueId(),
    name,
    cost,
  };
  consumables.push(newConsumable);
  console.log('消耗品が追加されました:', { name, cost });
  displayConsumables();
}

// 消耗品リストを取得する関数
export async function getConsumables() {
  return consumables;
}

// ユニークなIDを生成するヘルパー関数
function generateUniqueId() {
  return '_' + Math.random().toString(36).substr(2, 9);
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
window.addEventListener('DOMContentLoaded', () => {
  displayConsumables();
});
