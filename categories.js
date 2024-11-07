// categories.js
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

// 親カテゴリの追加
export async function addParentCategory(name) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('操作を行うにはログインが必要です。');
      return;
    }

    const docRef = await addDoc(collection(db, 'parentCategories'), {
      name,
    });
    return docRef.id;
  } catch (error) {
    console.error('親カテゴリの追加エラー:', error);
    throw error;
  }
}

// 親カテゴリの取得
export async function getParentCategories() {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('データを取得するにはログインが必要です。');
      return [];
    }

    const snapshot = await getDocs(collection(db, 'parentCategories'));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('親カテゴリの取得エラー:', error);
    throw error;
  }
}

// 親カテゴリの編集
export async function updateParentCategory(id, newName) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('操作を行うにはログインが必要です。');
      return;
    }

    const docRef = doc(db, 'parentCategories', id);
    await updateDoc(docRef, { name: newName });
  } catch (error) {
    console.error('親カテゴリの更新エラー:', error);
    throw error;
  }
}

// 親カテゴリの削除
export async function deleteParentCategory(id) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('操作を行うにはログインが必要です。');
      return;
    }

    const docRef = doc(db, 'parentCategories', id);
    await deleteDoc(docRef);
    // 対応するサブカテゴリも削除
    const subcategories = await getSubcategories(id);
    for (const subcategory of subcategories) {
      await deleteSubcategory(subcategory.id);
    }
  } catch (error) {
    console.error('親カテゴリの削除エラー:', error);
    throw error;
  }
}

// サブカテゴリの追加
export async function addSubcategory(name, parentCategoryId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('操作を行うにはログインが必要です。');
      return;
    }

    const docRef = await addDoc(collection(db, 'subcategories'), {
      name,
      parentCategoryId,
    });
    return docRef.id;
  } catch (error) {
    console.error('サブカテゴリの追加エラー:', error);
    throw error;
  }
}

// サブカテゴリの取得
export async function getSubcategories(parentCategoryId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('データを取得するにはログインが必要です。');
      return [];
    }

    const q = query(
      collection(db, 'subcategories'),
      where('parentCategoryId', '==', parentCategoryId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('サブカテゴリの取得エラー:', error);
    throw error;
  }
}

// サブカテゴリIDからサブカテゴリ情報を取得
export async function getSubcategoryById(subcategoryId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('データを取得するにはログインが必要です。');
      return null;
    }

    const docRef = doc(db, 'subcategories', subcategoryId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.error('サブカテゴリが見つかりません');
      return null;
    }
  } catch (error) {
    console.error('サブカテゴリの取得エラー:', error);
    throw error;
  }
}

// サブカテゴリの編集
export async function updateSubcategory(id, newName) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('操作を行うにはログインが必要です。');
      return;
    }

    const docRef = doc(db, 'subcategories', id);
    await updateDoc(docRef, { name: newName });
  } catch (error) {
    console.error('サブカテゴリの更新エラー:', error);
    throw error;
  }
}

// サブカテゴリの削除
export async function deleteSubcategory(id) {
  try {
    const user = auth.currentUser;
    if (!user) {
      alert('操作を行うにはログインが必要です。');
      return;
    }

    const docRef = doc(db, 'subcategories', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('サブカテゴリの削除エラー:', error);
    throw error;
  }
}
