import "./firebase-init.js";
import { auth, onAuthStateChanged } from "./auth.js";
import { initUI } from "./ui.js";
import { Settings } from "./settings.js";
import { getShareIdFromLocation, fetchSharedStack } from "./share.js";
import { addCategory, addLink } from "./db.js";
import { ICONS } from "./icons.js";
import { showToast, getHostname, escapeHtml, safeHref } from "./utils.js";

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((registration) => {
        console.log("ServiceWorker registration successful, scope:", registration.scope);
      })
      .catch((err) => {
        console.log("ServiceWorker registration failed:", err);
      });
  });
}

console.log("Aroundwise app loading...");

// --- PWA Install Prompt ---
let deferredPrompt;
const installButton = document.createElement("button");
installButton.id = "install-btn";
installButton.className = "btn-icon install-prompt hidden";
installButton.title = "Instalar App";
installButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
`;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const actions = document.querySelector(".sidebar-actions");
  if (actions && !document.getElementById("install-btn")) {
    actions.prepend(installButton);
    installButton.classList.remove("hidden");
  }
});

installButton.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to install prompt: ${outcome}`);
  if (outcome === "accepted") installButton.classList.add("hidden");
  deferredPrompt = null;
});

window.addEventListener("appinstalled", () => {
  console.log("Aroundwise PWA was installed");
  installButton.classList.add("hidden");
});

// --- Public Share Route ---
// A /s/<id> link should work even for logged-out visitors, so this is
// resolved before the normal auth gate below.
const shareId = getShareIdFromLocation();

const renderShareScreen = async () => {
  const screen = document.getElementById("share-screen");
  screen.classList.remove("hidden");

  const stack = await fetchSharedStack(shareId);
  if (!stack) {
    document.getElementById("share-title").textContent = "Stack não encontrada";
    document.getElementById("share-owner").textContent = "Este link pode ter expirado.";
    return;
  }

  document.getElementById("share-owner").textContent = `Stack partilhada por ${stack.ownerName}`;
  document.getElementById("share-title").textContent = stack.stackName;
  const iconEl = document.getElementById("share-icon");
  iconEl.innerHTML = stack.stackIcon && ICONS[stack.stackIcon] ? ICONS[stack.stackIcon] : ICONS.folder;
  iconEl.style.color = stack.stackColor || "var(--accent-primary)";
  iconEl.style.background = `${stack.stackColor || "var(--accent-primary)"}1a`;

  const linksContainer = document.getElementById("share-links");
  linksContainer.innerHTML = (stack.links || [])
    .map(
      (link) => `
      <div class="link-card">
          <div class="card-header">
              <div class="globe-icon">${link.favicon ? `<img src="${escapeHtml(link.favicon)}" alt="">` : ICONS.globe}</div>
          </div>
          <div class="card-body">
              <div class="card-title">${escapeHtml(link.title)}</div>
              <p class="card-desc">${escapeHtml(link.description) || "Sem descrição"}</p>
              <div class="card-domain">${escapeHtml(getHostname(link.url))}</div>
          </div>
          <div class="card-footer">
              <div class="card-actions">
                  <a href="${escapeHtml(safeHref(link.url))}" target="_blank" rel="noopener" class="btn-open">Abrir</a>
              </div>
          </div>
      </div>`
    )
    .join("");

  onAuthStateChanged(auth, (user) => {
    const saveBtn = document.getElementById("share-save-btn");
    if (!user) {
      saveBtn.classList.add("hidden");
      return;
    }
    saveBtn.classList.remove("hidden");
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      try {
        await addCategory(user.uid, stack.stackName, stack.stackIcon, stack.stackColor);
        for (const link of stack.links || []) {
          await addLink(user.uid, {
            url: link.url,
            title: link.title,
            description: link.description || "",
            categoryId: null,
            icon: link.icon || null,
            favicon: link.favicon || null,
            previewImage: null,
            tags: [],
            favorite: false,
          });
        }
        showToast("Stack guardada na sua conta!");
      } catch (err) {
        console.error(err);
        showToast("Não foi possível guardar a stack.", "error");
      } finally {
        saveBtn.disabled = false;
      }
    };
  });
};

if (shareId) {
  renderShareScreen();
} else {
  // --- Normal Auth Flow ---
  onAuthStateChanged(auth, (user) => {
    const authScreen = document.getElementById("auth-screen");
    const mainApp = document.getElementById("main-app");

    if (user) {
      console.log("User authenticated:", user.uid);
      authScreen.classList.add("hidden");
      mainApp.classList.remove("hidden");
      initUI(user);
      new Settings();
    } else {
      console.log("User not authenticated");
      authScreen.classList.remove("hidden");
      mainApp.classList.add("hidden");
    }
  });
}
