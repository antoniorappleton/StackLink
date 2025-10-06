// src/js/firebase-config.js
export let app = null;
export let db = null;
export let auth = null;
export let provider = null;
export let OFFLINE = false;

const cfg = {
  apiKey: "AIzaSyBnNTt4T56h1TterIPaeI7bF9mFN-ZZRbM",
  authDomain: "stacklink-9944f.firebaseapp.com",
  projectId: "stacklink-9944f",
  storageBucket: "stacklink-9944f.appspot.com",
  messagingSenderId: "567453238719",
  appId: "1:567453238719:web:621eb97684d81472314d0a"
};

export async function initFirebase() {
  try {
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js");
    const { getFirestore }  = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js");
    const { getAuth, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js");

    app = initializeApp(cfg);
    db = getFirestore(app);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();

    OFFLINE = false;
    console.log("✅ Firebase inicializado com sucesso!");
  } catch (e) {
    console.warn("⚠️ Erro ao inicializar Firebase, a usar DEV MODE:", e);
    OFFLINE = true;
  }
}
