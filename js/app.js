import "./firebase-init.js";
import { auth, onAuthStateChanged } from "./auth.js";
import { initUI } from "./ui.js";

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "ServiceWorker registration successful with scope: ",
          registration.scope
        );
      })
      .catch((err) => {
        console.log("ServiceWorker registration failed: ", err);
      });
  });
}

console.log("StackLink app loading...");

// PWA Install Prompt
let deferredPrompt;
const installButton = document.createElement("button");
installButton.id = "install-btn";
installButton.className = "btn btn-primary install-prompt hidden";
installButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    Instalar App
`;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show install button in header
  const header = document.querySelector(".app-header .user-profile");
  if (header && !document.getElementById("install-btn")) {
    const logoutBtn = document.getElementById("logout-btn");
    header.insertBefore(installButton, logoutBtn);
    installButton.classList.remove("hidden");
  }
});

installButton.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  console.log(`User response to install prompt: ${outcome}`);

  if (outcome === "accepted") {
    installButton.classList.add("hidden");
  }

  deferredPrompt = null;
});

window.addEventListener("appinstalled", () => {
  console.log("PWA was installed");
  installButton.classList.add("hidden");
});

// Global Auth State Observer
onAuthStateChanged(auth, (user) => {
  const authScreen = document.getElementById("auth-screen");
  const mainApp = document.getElementById("main-app");

  if (user) {
    // User is signed in
    console.log("User authenticated:", user.uid);
    authScreen.classList.add("hidden");
    mainApp.classList.remove("hidden");

    // Setup User Profile
    const userProfileDiv = document.querySelector(".user-profile");
    if (user.photoURL) {
      const logoutBtn = document.getElementById("logout-btn");
      // Check if img already exists
      let img = userProfileDiv.querySelector("img");
      if (!img) {
        img = document.createElement("img");
        img.style.width = "32px";
        img.style.height = "32px";
        img.style.borderRadius = "50%";
        img.style.marginRight = "10px";
        userProfileDiv.insertBefore(img, logoutBtn);
      }
      img.src = user.photoURL;
    }

    // Initialize UI with user context
    initUI(user);
  } else {
    // User is signed out
    console.log("User not authenticated");
    authScreen.classList.remove("hidden");
    mainApp.classList.add("hidden");
  }
});
