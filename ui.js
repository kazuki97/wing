// ui.js
import { 
    displayUnitPrices, 
    displayGlobalInventory, 
    populateInventoryProductSelect, 
    saveInventoryToDB 
} from './inventory.js';
import { showErrorModal } from './errorHandling.js';

/**
 * UIの初期化を行う関数
 */
export function initializeUI() {
    // 在庫管理セクションの初期化
    populateInventoryProductSelect(); // 商品選択セレクトボックスを設定
    displayUnitPrices();             // 単価一覧を表示
    displayGlobalInventory();        // 全体在庫を表示

    // 在庫追加フォームのイベントリスナー設定
    const addInventoryButton = document.getElementById('add-inventory-button');
    if (addInventoryButton) {
        addInventoryButton.addEventListener('click', handleAddInventory);
    } else {
        console.error('add-inventory-button が見つかりません。');
        showErrorModal('在庫追加ボタンが見つかりません。');
    }

    // 必要に応じて他のUI初期化処理をここに追加
}

/**
 * 在庫追加ボタンのイベントハンドラー
 */
async function handleAddInventory() {
    const productSelect = document.getElementById('inventory-product-select');
    const quantityInput = document.getElementById('inventory-quantity');

    if (!productSelect || !quantityInput) {
        showErrorModal('在庫追加フォームの要素が見つかりません。');
        return;
    }

    const productId = Number(productSelect.value);
    const quantity = Number(quantityInput.value);

    if (isNaN(productId) || isNaN(quantity) || quantity < 0) {
        alert('正しい商品と数量を選択してください。');
        return;
    }

    const inventoryItem = { productId, quantity };

    try {
        await saveInventoryToDB(inventoryItem);
        alert('在庫が正常に追加されました。');
        // フォームをリセット
        productSelect.value = '';
        quantityInput.value = '';
    } catch (error) {
        console.error('在庫の追加に失敗しました:', error);
        showErrorModal('在庫の追加に失敗しました。');
    }
}
