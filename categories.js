// categories.js
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

// 親カテゴリの追加
export async function addParentCategory(name) {
  try {
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
    const snapshot = await getDocs(collection(db, 'parentCategories'));
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('親カテゴリの取得エラー:', error);
    throw error;
  }
}

// モーダル要素の取得
const parentCategoryModal = document.getElementById('parentCategoryModal');
const subcategoryModal = document.getElementById('subcategoryModal');
const closeParentCategoryModal = document.getElementById('closeParentCategoryModal');
const closeSubcategoryModal = document.getElementById('closeSubcategoryModal');

// モーダルの開閉関数
function openModal(modal) {
  modal.style.display = 'block';
}

function closeModal(modal) {
  modal.style.display = 'none';
}

// 親カテゴリ追加ボタンのクリックでモーダルを開く
document.getElementById('addParentCategoryButton').addEventListener('click', () => {
  document.getElementById('parentCategoryModalTitle').textContent = '親カテゴリ追加';
  document.getElementById('parentCategoryInput').value = '';
  openModal(parentCategoryModal);
});

// サブカテゴリ追加ボタンのクリックでモーダルを開く
document.getElementById('addSubcategoryButton').addEventListener('click', () => {
  document.getElementById('subcategoryModalTitle').textContent = 'サブカテゴリ追加';
  document.getElementById('subcategoryInput').value = '';
  openModal(subcategoryModal);
});

// モーダルを閉じる
closeParentCategoryModal.addEventListener('click', () => closeModal(parentCategoryModal));
closeSubcategoryModal.addEventListener('click', () => closeModal(subcategoryModal));

// モーダル外のクリックで閉じる
window.addEventListener('click', (event) => {
  if (event.target === parentCategoryModal) {
    closeModal(parentCategoryModal);
  } else if (event.target === subcategoryModal) {
    closeModal(subcategoryModal);
  }
});

// 親カテゴリの編集
export async function updateParentCategory(id, newName) {
  try {
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
    const docRef = doc(db, 'subcategories', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('サブカテゴリの削除エラー:', error);
    throw error;
  }
}
