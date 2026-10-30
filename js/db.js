import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  getDocs,
  doc,
  serverTimestamp,
  orderBy,
  onSnapshot,
  writeBatch,
  query,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "./firebase-init.js";

const db = getFirestore(app);

// Collection References
const getLinksCol = (uid) => collection(db, `users/${uid}/links`);
const getCatsCol = (uid) => collection(db, `users/${uid}/categories`);
const getSharedCol = () => collection(db, "sharedStacks");

// --- Categories ---

// Docs created before the "order" field existed don't have it, and
// Firestore's orderBy() silently excludes documents missing the ordered
// field - so we always fetch by createdAt (every doc has that) and sort
// client-side with a fallback, see sortByOrder().
export const subscribeToCategories = (uid, onUpdate) => {
  const q = query(getCatsCol(uid), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    onUpdate(categories);
  });
};

export const addCategory = async (uid, name, icon, color, order = Date.now()) => {
  try {
    await addDoc(getCatsCol(uid), {
      name,
      icon: icon || null,
      color,
      order,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Error adding category: ", e);
    throw e;
  }
};

export const updateCategory = async (uid, catId, name, icon, color) => {
  try {
    const catRef = doc(db, `users/${uid}/categories/${catId}`);
    const updateData = { name, color };
    if (icon !== null) updateData.icon = icon;

    await updateDoc(catRef, updateData);
  } catch (e) {
    console.error("Error updating category: ", e);
    throw e;
  }
};

export const reorderCategories = async (uid, orderedIds) => {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, `users/${uid}/categories/${id}`), { order: index });
  });
  await batch.commit();
};

// --- Links ---

export const subscribeToLinks = (uid, onUpdate) => {
  const q = query(getLinksCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const links = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    onUpdate(links);
  });
};

// Sorts by the manual "order" field when present (drag & drop reordering),
// falling back to createdAt for legacy docs that predate that field.
export const sortByOrder = (a, b, desc = false) => {
  const ao = a.order, bo = b.order;
  if (ao != null && bo != null) return desc ? bo - ao : ao - bo;
  if (ao != null) return -1;
  if (bo != null) return 1;
  const at = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
  const bt = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
  return desc ? bt - at : at - bt;
};

export const addLink = async (uid, linkData) => {
  try {
    await addDoc(getLinksCol(uid), {
      ...linkData,
      order: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Error adding link: ", e);
    throw e;
  }
};

export const updateLink = async (uid, linkId, linkData) => {
  try {
    const linkRef = doc(db, `users/${uid}/links/${linkId}`);
    await updateDoc(linkRef, {
      ...linkData,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Error updating link: ", e);
    throw e;
  }
};

export const deleteLink = async (uid, linkId) => {
  try {
    await deleteDoc(doc(db, `users/${uid}/links/${linkId}`));
  } catch (e) {
    console.error("Error deleting link: ", e);
    throw e;
  }
};

export const toggleFavorite = async (uid, linkId, currentStatus) => {
  try {
    const linkRef = doc(db, `users/${uid}/links/${linkId}`);
    await updateDoc(linkRef, {
      favorite: !currentStatus,
    });
  } catch (e) {
    console.error("Error toggling favorite: ", e);
  }
};

export const reorderLinks = async (uid, orderedIds) => {
  const batch = writeBatch(db);
  const n = orderedIds.length;
  orderedIds.forEach((id, index) => {
    // Keep descending-order semantics (subscribeToLinks orders desc).
    batch.update(doc(db, `users/${uid}/links/${id}`), { order: n - index });
  });
  await batch.commit();
};

// --- Import / Export ---

export const exportUserData = async (uid) => {
  const [catsSnap, linksSnap] = await Promise.all([
    getDocs(getCatsCol(uid)),
    getDocs(getLinksCol(uid)),
  ]);

  const categories = catsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const links = linksSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { exportedAt: new Date().toISOString(), categories, links };
};

export const importData = async (uid, { categories = [], links = [] }) => {
  const batch = writeBatch(db);
  const idMap = {};

  categories.forEach((cat) => {
    const ref = doc(getCatsCol(uid));
    idMap[cat.id || cat.name] = ref.id;
    batch.set(ref, {
      name: cat.name || "Importado",
      icon: cat.icon || null,
      color: cat.color || "#15414A",
      order: cat.order ?? Date.now(),
      createdAt: serverTimestamp(),
    });
  });

  links.forEach((link) => {
    const ref = doc(getLinksCol(uid));
    const mappedCategoryId = link.categoryId ? idMap[link.categoryId] || null : null;
    batch.set(ref, {
      url: link.url,
      title: link.title || link.url,
      description: link.description || "",
      categoryId: mappedCategoryId,
      icon: link.icon || null,
      favicon: link.favicon || null,
      previewImage: link.previewImage || null,
      favorite: !!link.favorite,
      tags: link.tags || [],
      order: link.order ?? Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return { categoriesImported: categories.length, linksImported: links.length };
};

// --- Shared Stacks ---

export const createSharedStack = async (uid, ownerName, category, links) => {
  const shareId = `${uid.slice(0, 6)}-${Date.now().toString(36)}`;
  const ref = doc(getSharedCol(), shareId);
  await setDoc(ref, {
    ownerUid: uid,
    ownerName: ownerName || "Um utilizador",
    stackName: category.name,
    stackIcon: category.icon || null,
    stackColor: category.color || "#15414A",
    links: links.map((l) => ({
      title: l.title,
      url: l.url,
      description: l.description || "",
      icon: l.icon || null,
      favicon: l.favicon || null,
    })),
    createdAt: serverTimestamp(),
  });
  return shareId;
};

export const getSharedStack = async (shareId) => {
  const ref = doc(getSharedCol(), shareId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};
