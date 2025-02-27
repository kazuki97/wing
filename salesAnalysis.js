// salesAnalysis.js

import { db, auth } from './db.js'; 
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
    // timestamp が存在しない場合はスキップ
    if (!t.timestamp) {
      console.error("Missing timestamp in transaction:", t);
      return;
    }
    
    let date;
    // Firestore の Timestamp オブジェクトの場合は toDate() を利用
    if (typeof t.timestamp.toDate === 'function') {
      date = t.timestamp.toDate();
    } else {
      date = new Date(t.timestamp);
    }
    
    // 変換した日付が有効かチェック
    if (isNaN(date.getTime())) {
      console.error("Invalid date encountered:", t.timestamp);
      return; // このループはスキップ
    }
    
    // 日付を ISO 文字列に変換し、YYYY-MM-DD 部分を抽出
    let dayStr;
    try {
      dayStr = date.toISOString().slice(0, 10); // "YYYY-MM-DD"
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
        otherSales: 0
      };
    }
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
function displayAnalysisSummaryDaily(dailySummary) {
  const tbody = document.querySelector('#salesSummaryTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  dailySummary.forEach(dayData => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dayData.day}</td>
      <td>${dayData.totalAmount}</td>
      <td>${dayData.totalCost}</td>
      <td>${dayData.totalProfit}</td>
      <td>${dayData.totalCount}</td>
      <td>${dayData.averageSalesPerCheck}</td>
      <td>${dayData.totalItems}</td>
      <td>${dayData.cashSales}</td>
      <td>${dayData.otherSales}</td>
      <td>${dayData.totalDiscount}</td>
      <td><button>詳細</button></td>
    `;
    tbody.appendChild(tr);
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
