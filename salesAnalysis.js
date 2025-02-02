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
    analysisForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      // ログインチェック
      if (!auth.currentUser) {
        alert('分析を行うにはログインが必要です。');
        return;
      }

      // ユーザーが選択した集計対象（日/month/year）・年・月を取得
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
        // 集計
        const summary = aggregateTransactions(transactions);
        // テーブルに表示
        displayAnalysisSummary(summary, period, year, month);
      } catch (error) {
        console.error(error);
        alert('売上分析の取得・集計に失敗しました。');
      }
    });
  }
});

/**
 * 集計対象（日/月/年）と選択された年・月から開始日・終了日を求める。
 * 例：
 *  - 「month」を選択し 2023年4月 なら、startDate=2023-04-01, endDate=2023-05-01
 *  - 「year」を選択し 2023年 なら、startDate=2023-01-01, endDate=2024-01-01
 */
function calculateStartAndEndDate(period, year, month) {
  let startDate, endDate;

  switch (period) {
    case 'day':
      // （必要があれば）日単位の集計を実装
      // 例として1日固定で計算する形
      // ※要件に応じて実装を変えてください
      if (!year || !month) return {};
      startDate = new Date(year, month - 1, 1, 0, 0, 0);
      endDate = new Date(year, month - 1, 1, 23, 59, 59);
      break;

    case 'month':
      // 月単位
      if (!year || !month) return {};
      startDate = new Date(year, month - 1, 1, 0, 0, 0); // 例えば2023年4月=2023-04-01
      endDate = new Date(year, month, 1, 0, 0, 0);       // 翌月の1日=2023-05-01
      break;

    case 'year':
      // 年単位
      if (!year) return {};
      startDate = new Date(year, 0, 1, 0, 0, 0);         // 2023-01-01
      endDate = new Date(year + 1, 0, 1, 0, 0, 0);       // 翌年の1月1日=2024-01-01
      break;

    default:
      return {};
  }

  return { startDate, endDate };
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

    // 割引
    if (t.discount && t.discount.amount) {
      totalDiscount += t.discount.amount;
    }

    // 商品数（取引内の items 配列で quantity を合計する例）
    if (Array.isArray(t.items)) {
      for (const item of t.items) {
        totalItems += item.quantity;
      }
    }

    // 支払方法別
    if (t.paymentMethodName === '現金') {
      cashSales += t.totalAmount || 0;
    } else {
      otherSales += t.totalAmount || 0;
    }
  }

  // 客単価 (平均売上)
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

  // テーブルの内容を一旦クリア
  tbody.innerHTML = '';

  // 表示用の期間ラベルを作成
  let periodLabel = '指定期間';
  if (period === 'month' && year && month) {
    periodLabel = `${year}年${month}月`;
  } else if (period === 'year' && year) {
    periodLabel = `${year}年`;
  }

  // テーブル行を作成
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
