// products.js
import { db, auth } from './db.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

// 商品の追加
export async function addProduct(productData) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('商品を追加するにはログインが必要です。');
      return;
    }

    const docRef = await addDoc(collection(db, 'products'), productData);
    return docRef.id;
  } catch (error) {
    console.error('商品の追加エラー:', error);
    throw error;
  }
}

// 商品の取得
export async function getProducts(parentCategoryId, subcategoryId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('商品データを取得するにはログインが必要です。');
      return [];
    }

    let q = collection(db, 'products');
    const conditions = [];
    if (parentCategoryId) {
      conditions.push(where('parentCategoryId', '==', parentCategoryId));
    }
    if (subcategoryId) {
      conditions.push(where('subcategoryId', '==', subcategoryId));
    }
    if (conditions.length > 0) {
      q = query(q, ...conditions);
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('商品の取得エラー:', error);
    throw error;
  }
}

// 商品名から商品を取得
export async function getProductByName(name) {
  try {
    const q = query(collection(db, 'products'), where('name', '==', name));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.error('商品名に対応する商品が見つかりません');
      return null;
    }
  } catch (error) {
    console.error('商品の取得エラー:', error);
    throw error;
  }
}


// 商品IDから商品情報を取得
export async function getProductById(productId) {
  try {
    const docRef = doc(db, 'products', productId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.error('商品が見つかりません');
      return null;
    }
  } catch (error) {
    console.error('商品の取得エラー:', error);
    throw error;
  }
}

// バーコードから商品を取得
export async function getProductByBarcode(barcode) {
  try {
    const q = query(collection(db, 'products'), where('barcode', '==', barcode));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.error('バーコードに対応する商品が見つかりません');
      return null;
    }
  } catch (error) {
    console.error('商品の取得エラー:', error);
    throw error;
  }
}

// すべての商品の取得
export async function getAllProducts() {
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('すべての商品の取得エラー:', error);
    throw error;
  }
}

// 商品の更新
export async function updateProduct(id, updatedData) {
  try {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, updatedData);
  } catch (error) {
    console.error('商品の更新エラー:', error);
    throw error;
  }
}

// 商品の削除
export async function deleteProduct(id) {
  try {
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('商品の削除エラー:', error);
    throw error;
  }
}


export async function updateProductQuantity(productId, newQuantity) {
  try {
    const productRef = doc(db, 'products', productId);
    const productDoc = await getDoc(productRef);

    if (!productDoc.exists()) {
      throw new Error('商品が見つかりません');
    }

    const oldQuantity = productDoc.data().quantity || 0;
    const changeAmount = newQuantity - oldQuantity;

    await updateDoc(productRef, { quantity: newQuantity });

    // 在庫変動履歴を記録
    await addDoc(collection(db, 'inventoryChanges'), {
      productId: productId,
      timestamp: new Date().toISOString(),
      changeAmount: changeAmount,
      newQuantity: newQuantity,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.email, // またはユーザー名
      reason: '在庫数の手動更新',
    });

    console.log('在庫数が更新され、在庫変動履歴が記録されました');

  } catch (error) {
    console.error('在庫数の更新に失敗しました:', error);
    throw error;
  }
}

