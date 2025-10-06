// src/js/data.js
import { db, auth, OFFLINE } from './firebase-config.js';
import { COL } from './config.js';

/* ---------------------------------- Local DEV ---------------------------------- */
const lsGet = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let mem = {
  categories: lsGet('sl_categories', []),
  links:      lsGet('sl_links', [])
};
const persist = () => { lsSet('sl_categories', mem.categories); lsSet('sl_links', mem.links); };

const devUid = 'dev-user';

async function dev_fetchCategories() {
  return [...mem.categories].sort((a,b)=>(a.order||0)-(b.order||0));
}
async function dev_fetchLinks() {
  return [...mem.links].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
}
async function dev_addCategory({ name, color = '#2563eb', icon = '🔖', order = Date.now() }) {
  const id = crypto.randomUUID();
  mem.categories.push({ id, ownerId: devUid, name, color, icon, order, isArchived: false, createdAt: Date.now(), updatedAt: Date.now() });
  persist();
}
async function dev_addLink({ url, title = '', description = '', categoryId = null, isFavorite = false, previewImage = '' }) {
  const id = crypto.randomUUID();
  mem.links.push({
    id, ownerId: devUid, url, title, description, previewImage,
    categoryIds: categoryId ? [categoryId] : [], tags: [],
    isFavorite, isArchived: false, isRead: false, popularity: 0,
    createdAt: Date.now(), updatedAt: Date.now()
  });
  persist();
}
async function dev_toggleFavorite(id, value) {
  const it = mem.links.find(l => l.id === id);
  if (it) { it.isFavorite = value; it.updatedAt = Date.now(); persist(); }
}
async function dev_removeLink(id) {
  mem.links = mem.links.filter(l => l.id !== id);
  persist();
}

/* -------------------------------- Firestore ------------------------------------ */
const tsMs = (v) => (typeof v === 'number') ? v : (v?.seconds ? v.seconds * 1000 : 0);
const uidOrThrow = () => {
  const u = auth?.currentUser?.uid;
  if (!u) throw new Error('Sem sessão');
  return u;
};

async function fs_fetchCategories() {
  const { collection, getDocs, query, where /*, orderBy*/ } =
    await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

  const q = query(
    collection(db, COL.categories),
    where('ownerId', '==', uidOrThrow())
    // , orderBy('order', 'asc')  // ativa quando o índice composto estiver criado
  );

  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // ordenar no cliente (funciona mesmo sem índice)
  rows.sort((a,b) => (a.order || 0) - (b.order || 0));
  return rows;
}

async function fs_fetchLinks() {
  const { collection, getDocs, query, where /*, orderBy*/ } =
    await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

  const q = query(
    collection(db, COL.links),
    where('ownerId', '==', uidOrThrow())
    // , orderBy('createdAt','desc') // ativa quando o índice composto estiver criado
  );

  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // ordenar no cliente por createdAt DESC
  rows.sort((a,b) => tsMs(b.createdAt) - tsMs(a.createdAt));
  return rows;
}

async function fs_addCategory({ name, color = '#2563eb', icon = '🔖', order = Date.now() }) {
  const { collection, addDoc, serverTimestamp } =
    await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

  await addDoc(collection(db, COL.categories), {
    ownerId: uidOrThrow(), name, color, icon, order, isArchived: false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
}

async function fs_addLink({ url, title = '', description = '', categoryId = null, isFavorite = false, previewImage = '' }) {
  const { collection, addDoc, serverTimestamp } =
    await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');

  await addDoc(collection(db, COL.links), {
    ownerId: uidOrThrow(), url, title, description, previewImage,
    categoryIds: categoryId ? [categoryId] : [], tags: [],
    isFavorite, isArchived: false, isRead: false, popularity: 0,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp()
  });
}

async function fs_toggleFavorite(id, value) {
  const { doc, updateDoc, serverTimestamp } =
    await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
  await updateDoc(doc(db, COL.links, id), { isFavorite: value, updatedAt: serverTimestamp() });
}

async function fs_removeLink(id) {
  const { doc, deleteDoc } =
    await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
  await deleteDoc(doc(db, COL.links, id));
}

/* ------------------------------ Public API ------------------------------------- */
export async function fetchCategories() { return OFFLINE ? dev_fetchCategories() : fs_fetchCategories(); }
export async function fetchLinks()      { return OFFLINE ? dev_fetchLinks()      : fs_fetchLinks(); }
export async function addCategory(p)    { return OFFLINE ? dev_addCategory(p)    : fs_addCategory(p); }
export async function addLink(p)        { return OFFLINE ? dev_addLink(p)        : fs_addLink(p); }
export async function toggleFavorite(id, val) { return OFFLINE ? dev_toggleFavorite(id, val) : fs_toggleFavorite(id, val); }
export async function removeLink(id)    { return OFFLINE ? dev_removeLink(id)    : fs_removeLink(id); }
