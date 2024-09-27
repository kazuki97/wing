// ui.js
import { 
    displayUnitPrices, 
    displayGlobalInventory, 
    populateInventoryProductSelect, 
    saveUnitPriceToDB,
    saveInventoryToDB
} from './inventory.js';
import { showErrorModal } from './errorHandling.js';

/**
 * UIの初期化を行う関数
 */
export function initializeUI() {
    // ナビゲーションメニューのリンクにイベントリスナーを追加
    setupNavigation();

    // 在庫管理セクションの初期化
    populateInventoryProductSelect(); // 商品選択セレクトボックスを設定
    displayUnitPrices();             // 単価一覧を表示
    displayGlobalInventory();        // 全体在庫を表示

    // 単価追加フォームのイベントリスナー設定
    const addUnitPriceButton = document.getElementById('add-unit-price');
    if (addUnitPriceButton) {
        addUnitPriceButton.addEventListener('click', handleAddUnitPrice);
    } else {
        console.error('add-unit-price ボタンが見つかりません。');
        showErrorModal('単価追加ボタンが見つかりません。');
    }

    // 在庫追加ボタンのイベントリスナー設定
    const addInventoryButton = document.getElementById('add-inventory-button');
    if (addInventoryButton) {
        addInventoryButton.addEventListener('click', handleAddInventory);
    } else {
        console.error('add-inventory-button が見つかりません。');
        showErrorModal('在庫追加ボタンが見つかりません。');
    }

    // 他のセクションの初期化も同様に追加
    // 例: category, product, sales, barcode
}

/**
 * ナビゲーションメニューのリンクにイベントリスナーを追加し、セクションの表示を切り替える関数
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('nav ul li a');

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const targetSectionId = link.id.replace('link-', '') + '-section';
            showSection(targetSectionId);
        });
    });
}

/**
 * 指定されたセクションを表示し、他のセクションを非表示にする関数
 * @param {string} sectionId - 表示するセクションのID
 */
function showSection(sectionId) {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.style.display = 'block';
            section.classList.add('active');
        } else {
            section.style.display = 'none';
            section.classList.remove('active');
        }
    });

    // 特定のセクションが表示されたときの追加処理
    if (sectionId === 'inventory-section') {
        displayGlobalInventory();
    } else if (sectionId === 'unit-price-section') {
        displayUnitPrices();
    }
    // 他のセクションに対する処理をここに追加
}

/**
 * 単価追加ボタンのイベントハンドラー
 */
async function handleAddUnitPrice() {
    const subcategorySelect = document.getElementById('unit-price-subcategory-select');
    const tierInput = document.getElementById('unit-price-tier');
    const priceInput = document.getElementById('unit-price-price');

    if (!subcategorySelect || !tierInput || !priceInput) {
        showErrorModal('単価追加フォームの要素が見つかりません。');
        return;
    }

    const subcategoryId = Number(subcategorySelect.value);
    const tier = Number(tierInput.value);
    const price = Number(priceInput.value);

    if (isNaN(subcategoryId) || isNaN(tier) || isNaN(price)) {
        alert('正しいサブカテゴリ、階層、価格を入力してください。');
        return;
    }

    const unitPrice = { subcategoryId, tier, price };

    try {
        await saveUnitPriceToDB(unitPrice);
        alert('単価が正常に追加されました。');
        // フォームをリセット
        subcategorySelect.value = '';
        tierInput.value = '';
        priceInput.value = '';
    } catch (error) {
        console.error('単価の追加に失敗しました:', error);
        showErrorModal('単価の追加に失敗しました。');
    }
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
