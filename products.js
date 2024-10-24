// products.js
import { db } from './db.js';
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

// バーコードから商品を取得（修正後）
export async function getProductByBarcode(barcode) {
  try {
    const productsRef = collection(db, 'products');
    const q = query(productsRef, where('barcode', '==', barcode));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.warn('該当する商品が見つかりません:', barcode);
      return null;
    }
    // 最初の一致する商品を返す
    const productDoc = snapshot.docs[0];
    return { id: productDoc.id, ...productDoc.data() };
  } catch (error) {
    console.error('getProductByBarcode エラー:', error);
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
