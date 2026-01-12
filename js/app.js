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
