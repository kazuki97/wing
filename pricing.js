// pricing.js

import { db } from './db.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// 単価ルールの追加
export async function addPricingRule(subcategoryId, minQuantity, maxQuantity, unitPrice) {
  try {
    const docRef = await addDoc(collection(db, 'pricingRules'), {
      subcategoryId,
      minQuantity,
      maxQuantity,
      unitPrice,
    });
    return docRef.id;
  } catch (error) {
    console.error('単価ルールの追加エラー:', error);
    throw error;
  }
}

// 単価ルールの取得（サブカテゴリごと）
export async function getPricingRules(subcategoryId) {
  try {
    const q = query(
      collection(db, 'pricingRules'),
      where('subcategoryId', '==', subcategoryId)
    );
    const snapshot = await getDocs(q);
    const pricingRules = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    pricingRules.sort((a, b) => a.minQuantity - b.minQuantity);
    return pricingRules;
  } catch (error) {
    console.error('単価ルールの取得エラー:', error);
    throw error;
  }
}

export async function getPricingRuleById(id) {
  try {
    const docRef = doc(db, 'pricingRules', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    console.error('単価ルールの取得エラー:', error);
    throw error;
  }
}

export async function updatePricingRule(id, updatedData) {
  try {
    const docRef = doc(db, 'pricingRules', id);
    await updateDoc(docRef, updatedData);
  } catch (error) {
    console.error('単価ルールの更新エラー:', error);
    throw error;
  }
}

// 単価ルールの削除
export async function deletePricingRule(id) {
  try {
    const docRef = doc(db, 'pricingRules', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('単価ルールの削除エラー:', error);
    throw error;
  }
}

// 購入数量に応じた単価の取得
// 修正: defaultPrice パラメータを追加
export async function getUnitPrice(subcategoryId, totalQuantity, defaultPrice) {
  try {
    const pricingRules = await getPricingRules(subcategoryId);
    for (const rule of pricingRules) {
      if (totalQuantity >= rule.minQuantity && totalQuantity <= rule.maxQuantity) {
        return rule.unitPrice;
      }
    }
    // 適用可能なルールがない場合は defaultPrice を返す
    return defaultPrice;
  } catch (error) {
    console.error('単価の取得エラー:', error);
    throw error;
  }
}
