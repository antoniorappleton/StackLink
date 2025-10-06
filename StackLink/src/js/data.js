import { db, auth } from './firebase-config.js';
import {
  collection, doc, getDocs, query, where, orderBy, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/* Helpers */
const uid = () => auth.currentUser?.uid;

export async function fetchCategories() {
  if (!uid()) return [];
  const q = query(collection(db, 'categories'), where('ownerId','==', uid()), orderBy('order','asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchLinks() {
  if (!uid()) return [];
  const q = query(collection(db, 'links'), where('ownerId','==', uid()), orderBy('createdAt','desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addCategory({ name, color = '#2563eb', icon='🔖', order=Date.now() }) {
  if (!uid()) throw new Error('Sem sessão');
  await addDoc(collection(db, 'categories'), {
    ownerId: uid(), name, color, icon, order, isArchived:false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
}

export async function addLink({ url, title='', description='', categoryId=null, isFavorite=false, previewImage='' }) {
  if (!uid()) throw new Error('Sem sessão');
  const payload = {
    ownerId: uid(),
    url, title, description,
    previewImage,
    categoryIds: categoryId ? [categoryId] : [],
    tags: [],
    isFavorite, isArchived:false, isRead:false,
    popularity: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await addDoc(collection(db, 'links'), payload);
}
import { updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function toggleFavorite(linkId, value) {
  const ref = doc(db, 'links', linkId);
  await updateDoc(ref, { isFavorite: value, updatedAt: serverTimestamp() });
}

export async function removeLink(linkId) {
  const ref = doc(db, 'links', linkId);
  await deleteDoc(ref);
}
