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
    console.log(`addPricingRule called with subcategoryId: ${subcategoryId}, minQuantity: ${minQuantity}, maxQuantity: ${maxQuantity}, unitPrice: ${unitPrice}`);
    const docRef = await addDoc(collection(db, 'pricingRules'), {
      subcategoryId,
      minQuantity,
      maxQuantity,
      unitPrice,
    });
    console.log(`addPricingRule success: docId = ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('単価ルールの追加エラー:', error);
    throw error;
  }
}

// 単価ルールの取得（サブカテゴリごと）
export async function getPricingRules(subcategoryId) {
  try {
    console.log(`getPricingRules called with subcategoryId: ${subcategoryId}`);
    const q = query(
      collection(db, 'pricingRules'),
      where('subcategoryId', '==', subcategoryId)
    );
    const snapshot = await getDocs(q);
    const pricingRules = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    pricingRules.sort((a, b) => a.minQuantity - b.minQuantity);
    console.log(`getPricingRules found ${pricingRules.length} rules for subcategoryId: ${subcategoryId}`);
    return pricingRules;
  } catch (error) {
    console.error('単価ルールの取得エラー:', error);
    throw error;
  }
}

// サブカテゴリID一覧から複数のルールを一括取得
export async function fetchPricingRulesForSubcats(subcategoryIds) {
  try {
    if (!Array.isArray(subcategoryIds) || subcategoryIds.length === 0) {
      return [];
    }
    console.log(`fetchPricingRulesForSubcats called with ${subcategoryIds.length} IDs`);
    // Firestore の where-in クエリで一度に取得
    const q = query(
      collection(db, 'pricingRules'),
      where('subcategoryId', 'in', subcategoryIds)
    );
    const snapshot = await getDocs(q);
    const rules = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    console.log(`fetchPricingRulesForSubcats: retrieved ${rules.length} rules`);
    return rules;
  } catch (error) {
    console.error('fetchPricingRulesForSubcats エラー:', error);
    throw error;
  }
}

export async function getPricingRuleById(id) {
  try {
    console.log(`getPricingRuleById called with id: ${id}`);
    const docRef = doc(db, 'pricingRules', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log('getPricingRuleById: rule found', docSnap.data());
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log('getPricingRuleById: rule not found');
      return null;
    }
  } catch (error) {
    console.error('単価ルールの取得エラー:', error);
    throw error;
  }
}

export async function updatePricingRule(id, updatedData) {
  try {
    console.log(`updatePricingRule called with id: ${id}, updatedData:`, updatedData);
    const docRef = doc(db, 'pricingRules', id);
    await updateDoc(docRef, updatedData);
    console.log('updatePricingRule success');
  } catch (error) {
    console.error('単価ルールの更新エラー:', error);
    throw error;
  }
}

// 単価ルールの削除
export async function deletePricingRule(id) {
  try {
    console.log(`deletePricingRule called with id: ${id}`);
    const docRef = doc(db, 'pricingRules', id);
    await deleteDoc(docRef);
    console.log('deletePricingRule success');
  } catch (error) {
    console.error('単価ルールの削除エラー:', error);
    throw error;
  }
}

// 購入数量に応じた単価の取得
// 修正: defaultPrice パラメータを追加
export async function getUnitPrice(subcategoryId, totalQuantity, defaultPrice) {
  try {
    console.log(`getUnitPrice called with subcategoryId: ${subcategoryId}, totalQuantity: ${totalQuantity}, defaultPrice: ${defaultPrice}`);
    const pricingRules = await getPricingRules(subcategoryId);
    console.log(`getUnitPrice: pricingRules length = ${pricingRules.length}`);
    for (const rule of pricingRules) {
      console.log(`Checking rule: minQuantity = ${rule.minQuantity}, maxQuantity = ${rule.maxQuantity}, unitPrice = ${rule.unitPrice}`);
      if (totalQuantity >= rule.minQuantity && totalQuantity <= rule.maxQuantity) {
        console.log(`getUnitPrice: matched rule, returning unitPrice = ${rule.unitPrice}`);
        return rule.unitPrice;
      }
    }
    // 適用可能なルールがない場合は defaultPrice を返す
    console.log(`getUnitPrice: no matching rule, returning defaultPrice = ${defaultPrice}`);
    return defaultPrice;
  } catch (error) {
    console.error('単価の取得エラー:', error);
    throw error;
  }
}
