import {
  db, auth,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
} from './firebase.js';


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

// **`updateProductQuantity` 関数を削除**（`inventoryManagement.js` に統一）
