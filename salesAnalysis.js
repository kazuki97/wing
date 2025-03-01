// salesAnalysis.js

import { db, auth } from './db.js'; 
import { getSubcategoryById } from './categories.js';
import { 
  collection, query, where, orderBy, getDocs 
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

/**
 * DOMContentLoaded 時に売上分析フォームの送信処理を設定
 */
// 分析フォームの送信イベント（修正後の一部抜粋）
document.addEventListener('DOMContentLoaded', () => {
  const analysisForm = document.getElementById('analysisPeriodForm');
  if (analysisForm) {
    analysisForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const period = document.getElementById('analysisPeriod').value; // 'day' | 'month' | 'year'
      const year = parseInt(document.getElementById('analysisYear').value, 10);
      const month = parseInt(document.getElementById('analysisMonth').value, 10);

      const { startDate, endDate } = calculateStartAndEndDate(period, year, month);
      if (!startDate || !endDate) {
        console.warn('日付の指定に問題があります。');
        return;
      }

      try {
        const transactions = await getTransactionsByDateRange(startDate, endDate);
        if (period === 'day') {
          const dailySummary = aggregateTransactionsByDay(transactions);
          displayAnalysisSummaryDaily(dailySummary);
        } else {
          const summary = aggregateTransactions(transactions);
          // 修正後：月別詳細表示のために transactions を summary にセット
          summary.transactions = transactions;
          displayAnalysisSummary(summary, period, year, month);
        }
      } catch (error) {
        console.error(error);
        alert('売上分析の取得・集計に失敗しました。');
      }
    });
  }
});

/**
 * calculateStartAndEndDate関数
 */
function calculateStartAndEndDate(period, year, month) {
  let startDate, endDate;
  switch (period) {
    case 'day':
      if (!year || !month) return {};
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
 * 日別集計用の関数
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
        transactions: []
      };
    }
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
 * 日別集計結果をテーブルに表示する関数（詳細ボタン付き）
 */
function displayAnalysisSummaryDaily(dailySummary) {
  const tbody = document.querySelector('#salesSummaryTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  dailySummary.forEach(group => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${group.day}</td>
      <td>${group.totalAmount}</td>
      <td>${group.totalCost}</td>
      <td>${group.totalProfit}</td>
      <td>${group.totalCount}</td>
      <td>${group.averageSalesPerCheck}</td>
      <td>${group.totalItems}</td>
      <td>${group.cashSales}</td>
      <td>${group.otherSales}</td>
      <td>${group.totalDiscount}</td>
      <td><button class="daily-detail-btn" data-day="${group.day}">詳細</button></td>
    `;
    tbody.appendChild(tr);
  });
  
  // 詳細ボタンのイベント登録
  document.querySelectorAll('.daily-detail-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const day = e.target.dataset.day;
      const group = dailySummary.find(g => g.day === day);
      if (group) {
        showDailyDetail(group);
      }
    });
  });
}

/**
 * サブカテゴリごとに集計する関数
 */
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

/**
 * 日別詳細を表示する関数
 */
async function showDailyDetail(dayGroup) {
  const subcategoryData = aggregateBySubcategory(dayGroup.transactions);
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
  
  const contentDiv = document.getElementById('dailyDetailContent');
  contentDiv.innerHTML = html;
  
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const subcatId = e.target.dataset.subcat;
      const detailDiv = document.getElementById('subcat-detail-' + subcatId);
      detailDiv.style.display = (detailDiv.style.display === 'none') ? 'block' : 'none';
    });
  });
  
  document.getElementById('dailyDetailModal').style.display = 'block';
}

/**
 * Firestore の "transactions" コレクションから
 * 取引データを取得する関数
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
 * 取得した取引データを集計する関数
 */
function aggregateTransactions(transactions) {
  let totalAmount = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let totalFee = 0;
  let totalShippingFee = 0;
  let totalCount = 0;
  let totalItems = 0;
  let totalDiscount = 0;
  let cashSales = 0;
  let otherSales = 0;

  for (const t of transactions) {
    totalAmount += t.totalAmount || 0;
    totalCost += t.cost || 0;
    totalProfit += (t.profit || 0);
    totalFee += t.feeAmount || 0;
    totalShippingFee += t.shippingFee || 0;
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

  let averageSalesPerCheck = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;

  return {
    totalAmount,
    totalCost,
    totalProfit,
    totalFee,         // ← 手数料の合計
    totalShippingFee, // ← 送料の合計
    totalCount,
    totalItems,
    totalDiscount,
    cashSales,
    otherSales,
    averageSalesPerCheck,
  };
}


/**
 * 集計したデータを #salesSummaryTable に表示する関数
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

  // ヘッダーに手数料と送料の列が必要であれば、HTML側の <th> も更新してください
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${periodLabel}</td>
    <td>${summary.totalAmount}</td>
    <td>${summary.totalCost}</td>
    <td>${summary.totalFee}</td>
    <td>${summary.totalShippingFee}</td>
    <td>${summary.totalProfit}</td>
    <td>${summary.totalCount}</td>
    <td>${summary.averageSalesPerCheck}</td>
    <td>${summary.totalItems}</td>
    <td>${summary.cashSales}</td>
    <td>${summary.otherSales}</td>
    <td>${summary.totalDiscount}</td>
    <td><button class="monthly-detail-btn" data-year="${year}" data-month="${month}">詳細</button></td>
  `;
  tbody.appendChild(tr);

  // 詳細ボタンのイベント登録
  const detailBtn = tr.querySelector('.monthly-detail-btn');
  detailBtn.addEventListener('click', () => {
    showMonthlyDetail(summary, year, month);
  });
}


// 月別詳細を日別詳細と同様にサブカテゴリごとに展開する関数（修正後）
async function showMonthlyDetail(summary, year, month) {
  // summary.transactions に対象の取引データが含まれている前提
  if (!summary.transactions) {
    console.error('Monthly transactions data is missing in summary.');
    return;
  }
  
  // サブカテゴリごとに集計する（既存の aggregateBySubcategory を再利用）
  const subcategoryData = aggregateBySubcategory(summary.transactions);
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
  
  // 日別詳細と同様のテーブル形式で表示
  let html = `<h3>${year}年${month}月の詳細</h3>`;
  html += '<table class="monthly-detail-table"><thead><tr><th>サブカテゴリ名</th><th>合計売上</th><th>詳細</th></tr></thead><tbody>';
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
  
  const contentDiv = document.getElementById('monthlyDetailContent');
  if (contentDiv) {
    contentDiv.innerHTML = html;
  }
  
  const modal = document.getElementById('monthlyDetailModal');
  if (modal) {
    modal.style.display = 'block';
  }
  
  // ▼ボタンのクリックで詳細の表示／非表示を切り替え
  document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const subcatId = e.target.dataset.subcat;
      const detailDiv = document.getElementById('subcat-detail-' + subcatId);
      if (detailDiv) {
        detailDiv.style.display = (detailDiv.style.display === 'none') ? 'block' : 'none';
      }
    });
  });
}



