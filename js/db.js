import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "./firebase-init.js";

const db = getFirestore(app);

// Collection References
const getLinksCol = (uid) => collection(db, `users/${uid}/links`);
const getCatsCol = (uid) => collection(db, `users/${uid}/categories`);

// --- Categories ---

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

export const addCategory = async (uid, name, icon, color) => {
  try {
    await addDoc(getCatsCol(uid), {
      name,
      icon: icon || "📁",
      color,
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

// --- Links ---

export const subscribeToLinks = (uid, onUpdate) => {
  const q = query(getLinksCol(uid), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const links = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    onUpdate(links);
  });
};

export const addLink = async (uid, linkData) => {
  try {
    await addDoc(getLinksCol(uid), {
      ...linkData,
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
