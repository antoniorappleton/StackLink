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

// PWA Install Logic
let deferredPrompt;
const installBtn = document.getElementById("install-btn");

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI notify the user they can install the PWA
  if (installBtn) {
    installBtn.classList.remove("hidden");
    installBtn.addEventListener("click", async () => {
      // Hide the app provided install promotion
      installBtn.classList.add("hidden");
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again, throw it away
      deferredPrompt = null;
    });
  }
});

window.addEventListener("appinstalled", () => {
  // Hide the app-provided install promotion
  if (installBtn) installBtn.classList.add("hidden");
  // Clear the deferredPrompt so it can be garbage collected
  deferredPrompt = null;
  console.log("PWA was installed");
});

console.log("StackLink app loading...");

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
