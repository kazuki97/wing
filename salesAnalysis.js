// salesAnalysis.js

import { db, auth } from './db.js'; 
import { getSubcategoryById } from './categories.js';
import { 
  collection, query, where, orderBy, getDocs 
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

/**
 * ページの読み込みが完了したら、売上分析フォームにイベントリスナーを設定。
 * 送信時に、指定された期間（年・月）で取引を集計し、結果をテーブルに表示します。
 */
document.addEventListener('DOMContentLoaded', () => {
  const analysisForm = document.getElementById('analysisPeriodForm');
  if (analysisForm) {
    // 売上分析フォーム送信時の処理
    analysisForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      // ログインチェックなど省略
      const period = document.getElementById('analysisPeriod').value; // 'day' | 'month' | 'year'
      const year = parseInt(document.getElementById('analysisYear').value, 10);
      const month = parseInt(document.getElementById('analysisMonth').value, 10);

      // 開始日・終了日を計算
      const { startDate, endDate } = calculateStartAndEndDate(period, year, month);
      if (!startDate || !endDate) {
        console.warn('日付の指定に問題があります。');
        return;
      }

      try {
        // 期間内の取引データを取得
        const transactions = await getTransactionsByDateRange(startDate, endDate);
        if (period === 'day') {
          // 日別の場合：取得期間は月全体となっているので、日ごとにグループ化して集計
          const dailySummary = aggregateTransactionsByDay(transactions);
          displayAnalysisSummaryDaily(dailySummary);
        } else {
          // 月単位・年単位の場合は従来通り集計
          const summary = aggregateTransactions(transactions);
          displayAnalysisSummary(summary, period, year, month);
        }
      } catch (error) {
        console.error(error);
        alert('売上分析の取得・集計に失敗しました。');
      }
    }); // ← ここで submit イベントリスナーの閉じ
  } // ← ここで if (analysisForm) ブロックを閉じる
}); // ← ここで DOMContentLoaded のコールバックを閉じる

/**
 * 【修正①】calculateStartAndEndDate関数の「day」ケースを修正
 * 日別の場合は、1日だけではなく月全体を対象とする
 */
function calculateStartAndEndDate(period, year, month) {
  let startDate, endDate;

  switch (period) {
    case 'day':
      if (!year || !month) return {};
      // 修正：日別の場合、月初から翌月初日までを対象とする
      startDate = new Date(year, month - 1, 1, 0, 0, 0);
      endDate = new Date(year, month, 1, 0, 0, 0);
      break;
    case 'month':
      if (!year || !month) return {};
      startDate = new Date(year, month - 1, 1, 0, 0, 0);
      endDate = new Date(year, month, 1, 0, 0, 0);
      break;
    case 'year':
      if (!year) return {};
      startDate = new Date(year, 0, 1, 0, 0, 0);
      endDate = new Date(year + 1, 0, 1, 0, 0, 0);
      break;
    default:
      return {};
  }

  return { startDate, endDate };
}

/**
 * 【修正②】日別集計用の関数
 * 取得した取引データを日付（YYYY-MM-DD）ごとにグループ化して集計する
 */
function aggregateTransactionsByDay(transactions) {
  const groups = {};
  transactions.forEach(t => {
    if (!t.timestamp) {
      console.error("Missing timestamp in transaction:", t);
      return;
    }
    
    let date;
    if (typeof t.timestamp.toDate === 'function') {
      date = t.timestamp.toDate();
    } else {
      date = new Date(t.timestamp);
    }
    
    if (isNaN(date.getTime())) {
      console.error("Invalid date encountered:", t.timestamp);
      return;
    }
    
    let dayStr;
    try {
      dayStr = date.toISOString().slice(0, 10);
    } catch (err) {
      console.error("Error converting date to ISO string:", date, err);
      return;
    }
    
    // 初回の場合、グループオブジェクトに rawTransactions プロパティも追加
    if (!groups[dayStr]) {
      groups[dayStr] = {
        day: dayStr,
        totalAmount: 0,
        totalCost: 0,
        totalProfit: 0,
        totalCount: 0,
        totalItems: 0,
        totalDiscount: 0,
        cashSales: 0,
        otherSales: 0,
        transactions: [] // ここにその日の生データを格納
      };
    }
    // この取引を生データとして保存
    groups[dayStr].transactions.push(t);
    
    const group = groups[dayStr];
    group.totalAmount += t.totalAmount || 0;
    group.totalCost += t.cost || 0;
    group.totalProfit += (t.profit || 0);
    group.totalCount += 1;
    if (t.discount && t.discount.amount) {
      group.totalDiscount += t.discount.amount;
    }
    if (Array.isArray(t.items)) {
      for (const item of t.items) {
        group.totalItems += item.quantity;
      }
    }
    if (t.paymentMethodName === '現金') {
      group.cashSales += t.totalAmount || 0;
    } else {
      group.otherSales += t.totalAmount || 0;
    }
  });

  const result = Object.values(groups).sort((a, b) => a.day.localeCompare(b.day));
  result.forEach(group => {
    group.averageSalesPerCheck = group.totalCount > 0 ? Math.round(group.totalAmount / group.totalCount) : 0;
  });
  return result;
}


/**
 * 【修正③】日別集計結果をテーブルに表示する関数
 */
function displayAnalysisSummary(summary, period, year, month) {
  const tbody = document.querySelector('#salesSummaryTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let periodLabel = '指定期間';
  if (period === 'month' && year && month) {
    periodLabel = `${year}年${month}月`;
  } else if (period === 'year' && year) {
    periodLabel = `${year}年`;
  }

  // ここで、月別の場合、summary に生データ（その月の全取引）も含めるようにしておくか、
  // 後でフィルタして再集計するようにします。ここでは、summary.rawTransactions と仮定。
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${periodLabel}</td>
    <td>${summary.totalAmount}</td>
    <td>${summary.totalCost}</td>
    <td>${summary.totalProfit}</td>
    <td>${summary.totalCount}</td>
    <td>${summary.averageSalesPerCheck}</td>
    <td>${summary.totalItems}</td>
    <td>${summary.cashSales}</td>
    <td>${summary.otherSales}</td>
    <td>${summary.totalDiscount}</td>
    <td><button class="monthly-detail-btn">詳細</button></td>
  `;
  tbody.appendChild(tr);
  
  if (period === 'month') {
    // 月別の場合、summary.rawTransactions にその月の生データが格納されているとするか、
    // ここで、改めて getTransactionsByDateRange を呼んでデータを取得する
    // ここでは summary.rawTransactions を使う例とします
    const rawTransactions = summary.rawTransactions;
    document.querySelector('.monthly-detail-btn').addEventListener('click', () => {
      showMonthlyDetail(rawTransactions);
    });
  }
}
  
  // 詳細ボタンのイベント登録
  document.querySelectorAll('.daily-detail-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const day = e.target.dataset.day;
      // dailySummary から該当するグループを探す
      const group = dailySummary.find(g => g.day === day);
      if (group) {
        showDailyDetail(group);
      }
    });
  });
}


/**
 * 指定した開始日～終了日の範囲で、Firestore の "transactions" コレクションから
 * 取引データを取得する。
 */
async function getTransactionsByDateRange(startDate, endDate) {
  const ref = collection(db, 'transactions');
  const q = query(
    ref,
    where('timestamp', '>=', startDate),
    where('timestamp', '<', endDate),
    orderBy('timestamp', 'asc')
  );

  const snapshot = await getDocs(q);
  const transactions = [];
  snapshot.forEach(docSnap => {
    transactions.push({ id: docSnap.id, ...docSnap.data() });
  });
  return transactions;
}

/**
 * 取得した取引データを集計する。
 * （売上・原価・利益・会計数・商品数・割引合計、支払い方法別売上など）
 */
function aggregateTransactions(transactions) {
  let totalAmount = 0;       // 売上
  let totalCost = 0;         // 原価
  let totalProfit = 0;       // 利益
  let totalCount = 0;        // 会計数
  let totalItems = 0;        // 商品数
  let totalDiscount = 0;     // 割引額
  let cashSales = 0;         // 現金売上
  let otherSales = 0;        // その他の支払方法売上

  for (const t of transactions) {
    totalAmount += t.totalAmount || 0;
    totalCost += t.cost || 0;
    totalProfit += (t.profit || 0);
    totalCount += 1;

    if (t.discount && t.discount.amount) {
      totalDiscount += t.discount.amount;
    }

    if (Array.isArray(t.items)) {
      for (const item of t.items) {
        totalItems += item.quantity;
      }
    }

    if (t.paymentMethodName === '現金') {
      cashSales += t.totalAmount || 0;
    } else {
      otherSales += t.totalAmount || 0;
    }
  }

  let averageSalesPerCheck = 0;
  if (totalCount > 0) {
    averageSalesPerCheck = Math.round(totalAmount / totalCount);
  }

  return {
    totalAmount,
    totalCost,
    totalProfit,
    totalCount,
    totalItems,
    totalDiscount,
    cashSales,
    otherSales,
    averageSalesPerCheck,
  };
}

/**
 * 集計したデータを #salesSummaryTable に表示。
 * 期間（日/月/年）・年・月ごとに label を作り、1行で表示する例。
 */
function displayAnalysisSummary(summary, period, year, month) {
  const tbody = document.querySelector('#salesSummaryTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let periodLabel = '指定期間';
  if (period === 'month' && year && month) {
    periodLabel = `${year}年${month}月`;
  } else if (period === 'year' && year) {
    periodLabel = `${year}年`;
  }

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${periodLabel}</td>
    <td>${summary.totalAmount}</td>
    <td>${summary.totalCost}</td>
    <td>${summary.totalProfit}</td>
    <td>${summary.totalCount}</td>
    <td>${summary.averageSalesPerCheck}</td>
    <td>${summary.totalItems}</td>
    <td>${summary.cashSales}</td>
    <td>${summary.otherSales}</td>
    <td>${summary.totalDiscount}</td>
    <td><button>詳細</button></td>
  `;
  tbody.appendChild(tr);
}

// サブカテゴリごとに集計する関数
function aggregateBySubcategory(transactions) {
  const groups = {};
  transactions.forEach(t => {
    if (Array.isArray(t.items)) {
      t.items.forEach(item => {
        const subcatId = item.subcategoryId;
        if (!subcatId) return;
        if (!groups[subcatId]) {
          groups[subcatId] = {
            subcategoryId: subcatId,
            totalAmount: 0,
            items: {}
          };
        }
        groups[subcatId].totalAmount += item.subtotal || 0;
        const productName = item.productName;
        if (!groups[subcatId].items[productName]) {
          groups[subcatId].items[productName] = { productName: productName, quantity: 0, subtotal: 0 };
        }
        groups[subcatId].items[productName].quantity += item.quantity;
        groups[subcatId].items[productName].subtotal += item.subtotal || 0;
      });
    }
  });
  
  return Object.values(groups).map(group => {
    group.itemDetails = Object.values(group.items);
    delete group.items;
    return group;
  });
}

import { getSubcategoryById } from './categories.js'; // サブカテゴリ名取得用にインポート

async function showDailyDetail(dayGroup) {
  // 1. サブカテゴリごとに取引データを集計
  const subcategoryData = aggregateBySubcategory(dayGroup.transactions);
  
  // 2. 各グループごとにサブカテゴリ名を取得
  const updatedGroups = await Promise.all(
    subcategoryData.map(async group => {
      try {
        const subcat = await getSubcategoryById(group.subcategoryId);
        group.subcategoryName = (subcat && subcat.name) ? subcat.name : '不明なサブカテゴリ';
      } catch (e) {
        console.error("サブカテゴリの取得に失敗しました:", group.subcategoryId, e);
        group.subcategoryName = '不明なサブカテゴリ';
      }
      return group;
    })
  );
  
  // 3. 集計結果のテーブル HTML を作成
  let html = '<table class="daily-detail-table"><thead><tr><th>サブカテゴリ名</th><th>合計売上</th><th>詳細</th></tr></thead><tbody>';
  
  updatedGroups.forEach(group => {
    html += `<tr>
      <td>${group.subcategoryName}</td>
      <td>${group.totalAmount}</td>
      <td>
        <button class="expand-btn" data-subcat="${group.subcategoryId}">▼</button>
        <div class="subcat-detail" id="subcat-detail-${group.subcategoryId}" style="display:none; margin-top:5px;">`;
    group.itemDetails.forEach(item => {
      html += `<p>${item.productName}: ${item.quantity}個 (売上: ${item.subtotal})</p>`;
    });
    html += `</div>
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  
  // 4. ポップアップのコンテンツにセットして表示
  const contentDiv = document.getElementById('dailyDetailContent');
  contentDiv.innerHTML = html;
  
  // 5. 各「▼」ボタンのイベントを設定（クリックで詳細の展開・非表示）
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const subcatId = e.target.dataset.subcat;
      const detailDiv = document.getElementById('subcat-detail-' + subcatId);
      detailDiv.style.display = (detailDiv.style.display === 'none') ? 'block' : 'none';
    });
  });
  
  // 6. モーダルを表示
  document.getElementById('dailyDetailModal').style.display = 'block';
}
