import { db, auth } from './firebase-config.js';
import {
  collection, doc, getDocs, query, where, orderBy,
  addDoc, serverTimestamp, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const uid = () => auth.currentUser?.uid;

function mustUID() {
  const id = uid();
  if (!id) throw new Error('Sem sessão');
  return id;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  const s = document.getElementById('toast-text');
  if (!t || !s) return;
  s.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(()=>t.classList.add('hidden'), 3000);
}

// -------- CATEGORIES --------
export async function fetchCategories() {
  try {
    const q = query(collection(db, 'categories'),
      where('ownerId','==', mustUID()),
      orderBy('order','asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.error(e); showToast('Erro a ler categorias'); return []; }
}

export async function addCategory({ name, color = '#2563eb', icon='🔖', order=Date.now() }) {
  try {
    await addDoc(collection(db, 'categories'), {
      ownerId: mustUID(), name, color, icon, order, isArchived:false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    });
  } catch (e) { console.error(e); showToast('Erro a guardar categoria'); }
}

// -------- LINKS --------
export async function fetchLinks() {
  try {
    const q = query(collection(db, 'links'),
      where('ownerId','==', mustUID()),
      orderBy('createdAt','desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { console.error(e); showToast('Erro a ler links'); return []; }
}

export async function addLink({ url, title='', description='', categoryId=null, isFavorite=false, previewImage='' }) {
  try {
    await addDoc(collection(db, 'links'), {
      ownerId: mustUID(),
      url, title, description,
      previewImage,
      categoryIds: categoryId ? [categoryId] : [],
      tags: [],
      isFavorite, isArchived:false, isRead:false,
      popularity: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (e) { console.error(e); showToast('Erro a guardar link'); throw e; }
}

export async function toggleFavorite(linkId, value) {
  try {
    const ref = doc(db, 'links', linkId);
    await updateDoc(ref, { isFavorite: value, updatedAt: serverTimestamp() });
  } catch (e) { console.error(e); showToast('Erro a atualizar favorito'); }
}

export async function removeLink(linkId) {
  try {
    const ref = doc(db, 'links', linkId);
    await deleteDoc(ref);
  } catch (e) { console.error(e); showToast('Erro a apagar link'); }
}
