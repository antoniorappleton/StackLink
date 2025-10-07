import { db, auth, OFFLINE } from "./firebase-config.js";
import { COL } from "./config.js";

const lsGet = (k, f) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? f;
  } catch {
    return f;
  }
};
const lsSet = (k, v) => localStorage.setItem(k, JSON.stringify(v));

const devUid = "dev-user";
const mem = {
  categories: lsGet("sl_categories", []),
  links: lsGet("sl_links", []),
};
const persist = () => {
  lsSet("sl_categories", mem.categories);
  lsSet("sl_links", mem.links);
};
const rid = () =>
  crypto?.randomUUID?.() ?? "id_" + Math.random().toString(36).slice(2, 10);

async function dev_fetchCategories() {
  return [...mem.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
}
async function dev_fetchLinks() {
  return [...mem.links]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .reverse();
}
async function dev_addCategory({
  name,
  color = "#2563eb",
  icon = "🔖",
  order = Date.now(),
}) {
  mem.categories.push({
    id: rid(),
    ownerId: devUid,
    name,
    color,
    icon,
    order,
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  persist();
}
async function dev_addLink({
  url,
  title = "",
  description = "",
  categoryId = null,
  isFavorite = false,
  previewImage = "",
}) {
  mem.links.push({
    id: rid(),
    ownerId: devUid,
    url,
    title,
    description,
    previewImage,
    categoryIds: categoryId ? [categoryId] : [],
    tags: [],
    isFavorite,
    isArchived: false,
    isRead: false,
    popularity: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  persist();
}
async function dev_toggleFavorite(id, val) {
  const it = mem.links.find((l) => l.id === id);
  if (it) {
    it.isFavorite = val;
    it.updatedAt = Date.now();
    persist();
  }
}
async function dev_removeLink(id) {
  mem.links = mem.links.filter((l) => l.id !== id);
  persist();
}

const uid = () => auth.currentUser?.uid || null;

async function fs_fetchCategories() {
  const { collection, getDocs, query, where } = await import(
    "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js"
  );
  const userId = uid();
  if (!userId) return [];
  const snap = await getDocs(
    query(collection(db, COL.categories), where("ownerId", "==", userId))
  );
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.sort((a, b) => (a.order || 0) - (b.order || 0));
}
async function fs_fetchLinks() {
  const { collection, getDocs, query, where } = await import(
    "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js"
  );
  const userId = uid();
  if (!userId) return [];
  const snap = await getDocs(
    query(collection(db, COL.links), where("ownerId", "==", userId))
  );
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.sort(
    (a, b) =>
      (b.createdAt?.seconds || b.createdAt || 0) -
      (a.createdAt?.seconds || a.createdAt || 0)
  );
}
async function fs_addCategory({
  name,
  color = "#2563eb",
  icon = "🔖",
  order = Date.now(),
}) {
  const { collection, addDoc, serverTimestamp } = await import(
    "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js"
  );
  await addDoc(collection(db, COL.categories), {
    ownerId: uid(),
    name,
    color,
    icon,
    order,
    isArchived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
async function fs_addLink({
  url,
  title = "",
  description = "",
  categoryId = null,
  isFavorite = false,
  previewImage = "",
}) {
  const { collection, addDoc, serverTimestamp } = await import(
    "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js"
  );
  await addDoc(collection(db, COL.links), {
    ownerId: uid(),
    url,
    title,
    description,
    previewImage,
    categoryIds: categoryId ? [categoryId] : [],
    tags: [],
    isFavorite,
    isArchived: false,
    isRead: false,
    popularity: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
async function fs_toggleFavorite(id, val) {
  const { doc, updateDoc, serverTimestamp } = await import(
    "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js"
  );
  await updateDoc(doc(db, COL.links, id), {
    isFavorite: val,
    updatedAt: serverTimestamp(),
  });
}
async function fs_removeLink(id) {
  const { doc, deleteDoc } = await import(
    "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js"
  );
  await deleteDoc(doc(db, COL.links, id));
}

export async function fetchCategories() {
  return OFFLINE ? dev_fetchCategories() : fs_fetchCategories();
}
export async function fetchLinks() {
  return OFFLINE ? dev_fetchLinks() : fs_fetchLinks();
}
export async function addCategory(p) {
  return OFFLINE ? dev_addCategory(p) : fs_addCategory(p);
}
export async function addLink(p) {
  return OFFLINE ? dev_addLink(p) : fs_addLink(p);
}
export async function toggleFavorite(id, val) {
  return OFFLINE ? dev_toggleFavorite(id, val) : fs_toggleFavorite(id, val);
}
export async function removeLink(id) {
  return OFFLINE ? dev_removeLink(id) : fs_removeLink(id);
}
// DEV (local)
async function dev_updateLink(id, patch){
  const it = mem.links.find(l => l.id === id);
  if (it){ Object.assign(it, patch); persist(); }
}

// FIRESTORE
async function fs_updateLink(id, patch){
  const { doc, updateDoc, serverTimestamp } =
    await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
  await updateDoc(doc(db, COL.links, id), { ...patch, updatedAt: serverTimestamp() });
}

// export
export async function updateLink(id, patch){
  return OFFLINE ? dev_updateLink(id, patch) : fs_updateLink(id, patch);
}
