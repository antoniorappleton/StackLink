// Firebase modular (podes ligar mais tarde)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBnNTt4T56h1TterIPaeI7bF9mFN-ZZRbM",
  authDomain: "stacklink-9944f.firebaseapp.com",
  projectId: "stacklink-9944f",
  storageBucket: "stacklink-9944f.firebasestorage.app",
  messagingSenderId: "567453238719",
  appId: "1:567453238719:web:621eb97684d81472314d0a",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
