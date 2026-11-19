import {
  subscribeToCategories,
  addCategory,
  updateCategory,
  reorderCategories,
  subscribeToLinks,
  addLink,
  updateLink,
  deleteLink,
  toggleFavorite,
  reorderLinks,
  sortByOrder,
} from "./db.js";
import { ICONS } from "./icons.js";
import { fetchLinkPreview } from "./preview.js";
import { shareStack } from "./share.js";
import { exportAsJson, exportAsBookmarksHtml, importFromFile } from "./importExport.js";
import { showToast, getHostname, escapeHtml, safeHref } from "./utils.js";
import { APP_VERSION } from "./version.js";

// State
let currentUser = null;
let categories = [];
let links = [];
let activeView = "all"; // 'all' | 'favorites' | categoryId
// Card layout: "grid" (cartões em grelha) or "list" (cartões em linha).
// Migrates the old compact/expanded toggle value.
let cardLayout =
  localStorage.getItem("aroundwise_layout") ||
  (localStorage.getItem("aroundwise_view_mode") === "compact" ? "list" : "grid");
// Theme ordering in the sidebar: manual | az | za | most | least
let stacksSort = localStorage.getItem("aroundwise_stacks_sort") || "manual";

// Suggested theme names ("temas / gavetas / arquivos") with a matching icon.
const THEME_PRESETS = [
  { group: "Sistema", items: [
    { name: "Caixa de Entrada", icon: "archive" },
    { name: "Por Ler", icon: "bookmark" },
    { name: "Arquivo", icon: "archive" },
    { name: "Gaveta", icon: "folder" },
    { name: "Documentos", icon: "fileText" },
    { name: "Transferências", icon: "cloud" },
    { name: "Rascunhos", icon: "file" },
    { name: "Partilhados", icon: "messageCircle" },
    { name: "Temporário", icon: "clock" },
    { name: "Importante", icon: "star" },
  ]},
  { group: "Trabalho & Estudo", items: [
    { name: "Trabalho", icon: "briefcase" },
    { name: "Projetos", icon: "folder" },
    { name: "Estudos", icon: "graduation" },
    { name: "Cursos", icon: "book" },
    { name: "Referências", icon: "book" },
    { name: "Ferramentas", icon: "tool" },
    { name: "Desenvolvimento", icon: "code" },
    { name: "Design", icon: "palette" },
    { name: "Finanças", icon: "dollarSign" },
    { name: "Agenda", icon: "calendar" },
  ]},
  { group: "Pessoal", items: [
    { name: "Casa", icon: "home" },
    { name: "Saúde", icon: "heart" },
    { name: "Receitas", icon: "coffee" },
    { name: "Viagens", icon: "map" },
    { name: "Compras", icon: "shoppingCart" },
    { name: "Notícias", icon: "newspaper" },
    { name: "Vídeos", icon: "video" },
    { name: "Música", icon: "music" },
    { name: "Jogos", icon: "gamepad" },
    { name: "Redes Sociais", icon: "twitter" },
  ]},
];

let editingLinkId = null;
let editingCategoryId = null;
let currentPreview = { favicon: null, previewImage: null };

// DOM Elements
const stacksList = document.getElementById("stacks-list");
const linksView = document.getElementById("links-view");
const searchInput = document.getElementById("search-input");

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebar-overlay");

const viewIcon = document.getElementById("view-icon");
const viewTitle = document.getElementById("view-title");
const shareStackBtn = document.getElementById("share-stack-btn");
const editStackBtn = document.getElementById("edit-stack-btn");

// Dialogs
const linkDialog = document.getElementById("link-dialog");
const categoryDialog = document.getElementById("category-dialog");
const linkForm = document.getElementById("link-form");
const categoryForm = document.getElementById("category-form");

// Link preview block
const linkPreviewBlock = document.getElementById("link-preview");
const linkPreviewImg = document.getElementById("link-preview-img");
const linkPreviewTitle = document.getElementById("link-preview-title");
const linkPreviewDomain = document.getElementById("link-preview-domain");

// Buttons
const addLinkBtn = document.getElementById("add-link-btn");
const addCategoryBtn = document.getElementById("add-category-btn");
const stacksSortSelect = document.getElementById("stacks-sort");

// --- Initialization ---

export const initUI = (user) => {
  currentUser = user;
  if (!currentUser) return;

  updateUserChip();

  subscribeToCategories(user.uid, (newCategories) => {
    categories = newCategories;
    renderSidebar();
    renderMainView();
    updateCategorySelect();
  });

  subscribeToLinks(user.uid, (newLinks) => {
    links = newLinks;
    renderSidebar();
    renderMainView();
  });

  setupEventListeners();
  populateIconSelects();
  initTheme();
  populateThemePresets();
  renderSidebar();
  renderMainView();
  applyCardLayout();

  const versionEl = document.getElementById("app-version");
  if (versionEl) versionEl.textContent = `Aroundwise v${APP_VERSION}`;
};

const updateUserChip = () => {
  const nameEl = document.getElementById("user-chip-name");
  const chip = document.getElementById("user-chip");
  if (nameEl) nameEl.textContent = currentUser.displayName || currentUser.email || "A minha conta";
  if (chip && currentUser.photoURL && !chip.querySelector("img")) {
    const img = document.createElement("img");
    img.src = currentUser.photoURL;
    img.alt = "";
    chip.prepend(img);
  }
};

// --- Event Wiring ---

const setupEventListeners = () => {
  document.querySelectorAll(".view-switch-btn").forEach((btn) =>
    btn.addEventListener("click", () => setCardLayout(btn.dataset.layout))
  );

  if (stacksSortSelect) {
    stacksSortSelect.value = stacksSort;
    stacksSortSelect.addEventListener("change", () => {
      stacksSort = stacksSortSelect.value;
      localStorage.setItem("aroundwise_stacks_sort", stacksSort);
      renderSidebar();
    });
  }

  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  if (themeToggleBtn) themeToggleBtn.addEventListener("click", handleThemeToggle);

  addLinkBtn.addEventListener("click", () => openLinkDialog());
  addCategoryBtn.addEventListener("click", () => openCategoryDialog());

  linkForm.addEventListener("submit", handleLinkSubmit);
  categoryForm.addEventListener("submit", handleCategorySubmit);

  searchInput.addEventListener("input", renderLinksGrid);

  document.getElementById("link-url").addEventListener("blur", handleUrlPreview);

  shareStackBtn.addEventListener("click", handleShareStack);
  editStackBtn.addEventListener("click", handleEditStack);

  // Sidebar nav (all / favorites)
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.id));
  });

  // Stacks list: selection + drag reorder
  stacksList.addEventListener("click", (e) => {
    const item = e.target.closest(".stack-nav-item");
    if (item) setActiveView(item.dataset.id);
  });
  makeSortable(stacksList, ".stack-nav-item", async (orderedIds) => {
    await reorderCategories(currentUser.uid, orderedIds);
  });

  // Links grid: actions + drag reorder
  linksView.addEventListener("click", handleLinkActions);
  // img "error" doesn't bubble, so listen on the capture phase to catch
  // broken favicons anywhere in the grid and fall back to the globe icon.
  linksView.addEventListener(
    "error",
    (e) => {
      if (e.target.tagName === "IMG" && e.target.closest(".globe-icon")) {
        e.target.closest(".globe-icon").innerHTML = ICONS.globe;
      }
    },
    true
  );
  makeSortable(linksView, ".link-card", async (orderedIds) => {
    await reorderLinks(currentUser.uid, orderedIds);
  });

  // Mobile sidebar drawer
  document.getElementById("sidebar-toggle-btn")?.addEventListener("click", openSidebar);
  document.getElementById("sidebar-close-btn")?.addEventListener("click", closeSidebar);
  sidebarOverlay.addEventListener("click", closeSidebar);

  // Data import/export
  document.getElementById("export-json-btn")?.addEventListener("click", () =>
    exportAsJson(currentUser.uid).then(() => showToast("Exportação JSON concluída."))
  );
  document.getElementById("export-html-btn")?.addEventListener("click", () =>
    exportAsBookmarksHtml(currentUser.uid).then(() => showToast("Exportação de marcadores concluída."))
  );
  document.getElementById("import-file-input")?.addEventListener("change", handleImportFile);
};

// --- Mobile Sidebar ---

const openSidebar = () => {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("open");
};

const closeSidebar = () => {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
};

// --- Drag & Drop (generic) ---

function makeSortable(container, itemSelector, onReorder) {
  let draggedEl = null;

  container.addEventListener("dragstart", (e) => {
    const item = e.target.closest(itemSelector);
    if (!item) return;
    draggedEl = item;
    requestAnimationFrame(() => item.classList.add("dragging"));
  });

  container.addEventListener("dragend", () => {
    draggedEl?.classList.remove("dragging");
    container.querySelectorAll(itemSelector).forEach((el) => el.classList.remove("drag-over"));
    draggedEl = null;
  });

  container.addEventListener("dragover", (e) => {
    if (!draggedEl) return;
    e.preventDefault();
    const item = e.target.closest(itemSelector);
    if (!item || item === draggedEl) return;
    container.querySelectorAll(itemSelector).forEach((el) => el.classList.remove("drag-over"));
    item.classList.add("drag-over");
  });

  container.addEventListener("drop", (e) => {
    if (!draggedEl) return;
    e.preventDefault();
    const item = e.target.closest(itemSelector);
    if (!item || item === draggedEl) return;
    item.classList.remove("drag-over");

    const items = Array.from(container.querySelectorAll(itemSelector));
    const fromIndex = items.indexOf(draggedEl);
    const toIndex = items.indexOf(item);
    if (fromIndex < toIndex) item.after(draggedEl);
    else item.before(draggedEl);

    const orderedIds = Array.from(container.querySelectorAll(itemSelector)).map((el) => el.dataset.id);
    onReorder(orderedIds);
  });
}

// --- Navigation / View State ---

const setActiveView = (id) => {
  activeView = id;
  closeSidebar();
  renderSidebar();
  renderMainView();
};

const renderSidebar = () => {
  const counts = computeCounts(links);

  document.getElementById("count-all").textContent = counts.all || 0;
  document.getElementById("count-favorites").textContent = counts.favorites || 0;

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.id === activeView);
    const iconSlot = btn.querySelector(".nav-item-icon");
    iconSlot.innerHTML = btn.dataset.id === "favorites" ? ICONS.star : ICONS.globe;
  });

  const sortedCats = sortCategories(categories, counts);
  const isManual = stacksSort === "manual";
  stacksList.classList.toggle("is-sorted", !isManual);

  stacksList.innerHTML = sortedCats
    .map((cat) => {
      const count = counts[cat.id] || 0;
      const active = cat.id === activeView;
      return `
        <div class="stack-nav-item${active ? " active" : ""}" draggable="${isManual}" data-id="${cat.id}" style="--cat-accent: ${cat.color || "var(--accent-primary)"}">
            <span class="stack-dot"></span>
            <span class="nav-item-label">${escapeHtml(cat.name)}</span>
            <span class="nav-item-count">${count}</span>
        </div>`;
    })
    .join("");
};

const byName = (a, b) => (a.name || "").localeCompare(b.name || "", "pt", { sensitivity: "base" });

const sortCategories = (cats, counts) => {
  const list = [...cats];
  switch (stacksSort) {
    case "az":
      return list.sort(byName);
    case "za":
      return list.sort((a, b) => byName(b, a));
    case "most":
      return list.sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || byName(a, b));
    case "least":
      return list.sort((a, b) => (counts[a.id] || 0) - (counts[b.id] || 0) || byName(a, b));
    default:
      return list.sort((a, b) => sortByOrder(a, b, false));
  }
};

const renderMainView = () => {
  let title = "Tema";
  let iconHtml = ICONS.globe;
  let color = "var(--accent-primary)";
  const isCustomStack = activeView !== "all" && activeView !== "favorites";

  if (activeView === "all") {
    title = "Todos os Links";
    iconHtml = ICONS.globe;
  } else if (activeView === "favorites") {
    title = "Favoritos";
    iconHtml = ICONS.star;
    color = "var(--accent-gold)";
  } else {
    const cat = categories.find((c) => c.id === activeView);
    if (cat) {
      title = cat.name;
      iconHtml = cat.icon && ICONS[cat.icon] ? ICONS[cat.icon] : ICONS.folder;
      color = cat.color || color;
    }
  }

  viewTitle.textContent = title;
  viewIcon.innerHTML = iconHtml;
  viewIcon.style.color = color;
  viewIcon.style.background = isCustomStack ? `${color}1a` : "var(--accent-soft)";

  shareStackBtn.classList.toggle("hidden", !isCustomStack);
  editStackBtn.classList.toggle("hidden", !isCustomStack);

  renderLinksGrid();
};

const computeCounts = (allLinks) => {
  return allLinks.reduce(
    (acc, link) => {
      acc.all = (acc.all || 0) + 1;
      if (link.favorite) acc.favorites = (acc.favorites || 0) + 1;
      if (link.categoryId) acc[link.categoryId] = (acc[link.categoryId] || 0) + 1;
      return acc;
    },
    { all: 0, favorites: 0 }
  );
};

const getFilteredLinks = () => {
  const searchTerm = searchInput.value.toLowerCase().trim();
  return links
    .filter((link) => {
      if (activeView === "favorites" && !link.favorite) return false;
      if (activeView !== "all" && activeView !== "favorites" && link.categoryId !== activeView) return false;
      if (searchTerm) {
        return (
          link.title?.toLowerCase().includes(searchTerm) ||
          link.url?.toLowerCase().includes(searchTerm)
        );
      }
      return true;
    })
    .sort((a, b) => sortByOrder(a, b, true));
};

const renderLinksGrid = () => {
  const filtered = getFilteredLinks();
  const count = activeView === "all" || activeView === "favorites" || categories.some((c) => c.id === activeView)
    ? filtered.length
    : 0;
  document.getElementById("view-count").textContent = `${count} ${count === 1 ? "item" : "itens"}`;

  if (filtered.length === 0) {
    linksView.innerHTML = `
      <div class="empty-state">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <p>Ainda não há links aqui.</p>
      </div>`;
    return;
  }

  linksView.innerHTML = filtered.map(renderLinkCard).join("");
};

const renderLinkCard = (link) => {
  const hostname = getHostname(link.url);
  const customIcon = link.icon && ICONS[link.icon] ? ICONS[link.icon] : null;
  const iconInner = link.favicon
    ? `<img src="${escapeHtml(link.favicon)}" alt="" loading="lazy">`
    : customIcon || ICONS.globe;

  const starIcon = link.favorite
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    : ICONS.star;

  const href = safeHref(link.url);

  return `
    <div class="link-card" draggable="true" data-id="${link.id}" data-url="${escapeHtml(href)}">
        <div class="card-header">
            <div class="globe-icon">${iconInner}</div>
            <button type="button" class="fav-btn btn-icon${link.favorite ? " active" : ""}" data-id="${link.id}" title="Favorito">${starIcon}</button>
        </div>
        <div class="card-body">
            <div class="card-title" title="${escapeHtml(link.title)}">${escapeHtml(link.title)}</div>
            <p class="card-desc">${escapeHtml(link.description) || "Sem descrição"}</p>
            <div class="card-domain">${hostname}</div>
        </div>
        <div class="card-footer">
            <div class="card-actions">
                <a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="btn-open">Abrir</a>
                <button type="button" class="copy-btn btn-icon" data-url="${escapeHtml(link.url)}" title="Copiar Link">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
                <button type="button" class="edit-btn btn-icon" data-id="${link.id}" title="Editar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button type="button" class="trash-btn btn-icon" data-id="${link.id}" title="Apagar" style="color: var(--danger);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        </div>
    </div>`;
};

// --- Link Dialog ---

const openLinkDialog = (link = null) => {
  editingLinkId = link?.id || null;
  linkForm.reset();
  resetLinkPreview();
  document.getElementById("link-icon").value = "";

  if (link) {
    document.getElementById("link-url").value = link.url;
    document.getElementById("link-title").value = link.title;
    document.getElementById("link-description").value = link.description || "";
    document.getElementById("link-category").value = link.categoryId || "";
    document.getElementById("link-icon").value = link.icon || "";
    currentPreview = { favicon: link.favicon || null, previewImage: link.previewImage || null };
    if (currentPreview.favicon || currentPreview.previewImage) {
      showLinkPreview({ title: link.title, hostname: getHostname(link.url) });
    }
    document.querySelector("#link-dialog .dialog-title").textContent = "Editar Link";
  } else {
    if (activeView !== "all" && activeView !== "favorites") {
      document.getElementById("link-category").value = activeView;
    }
    document.querySelector("#link-dialog .dialog-title").textContent = "Guardar Novo Link";
  }

  linkDialog.showModal();
};

const resetLinkPreview = () => {
  currentPreview = { favicon: null, previewImage: null };
  linkPreviewBlock.classList.add("hidden");
};

const showLinkPreview = ({ title, hostname }) => {
  const img = currentPreview.previewImage || currentPreview.favicon;
  if (!img) {
    linkPreviewBlock.classList.add("hidden");
    return;
  }
  linkPreviewImg.src = img;
  linkPreviewTitle.textContent = title || hostname;
  linkPreviewDomain.textContent = hostname;
  linkPreviewBlock.classList.remove("hidden");
};

const handleUrlPreview = async (e) => {
  const url = e.target.value.trim();
  if (!url) return;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  const preview = await fetchLinkPreview(url);
  if (!preview) return;

  currentPreview = { favicon: preview.favicon, previewImage: preview.previewImage };

  const titleInput = document.getElementById("link-title");
  if (!titleInput.value.trim() && preview.title) titleInput.value = preview.title;

  showLinkPreview({ title: preview.title, hostname: preview.hostname || parsed.hostname });
};

// --- Category Dialog ---

const openCategoryDialog = (cat = null) => {
  editingCategoryId = cat?.id || null;
  categoryForm.reset();
  document.getElementById("cat-icon").value = "";

  if (cat) {
    document.getElementById("cat-name").value = cat.name;
    document.getElementById("cat-icon").value = cat.icon || "";
    document.getElementById("cat-color").value = cat.color || "#15414A";
    document.querySelector("#category-dialog .dialog-title").textContent = "Editar Tema";
    document.getElementById("cat-submit-btn").textContent = "Guardar Tema";
  } else {
    document.querySelector("#category-dialog .dialog-title").textContent = "Criar Novo Tema";
    document.getElementById("cat-submit-btn").textContent = "Criar Tema";
  }

  syncPresetChips();
  categoryDialog.showModal();
};

const handleEditStack = () => {
  const cat = categories.find((c) => c.id === activeView);
  if (cat) openCategoryDialog(cat);
};

// --- Handlers ---

const handleLinkSubmit = async (e) => {
  e.preventDefault();
  const url = document.getElementById("link-url").value;
  if (safeHref(url) === "#") {
    showToast("Só são permitidos links http:// ou https://.", "error");
    return;
  }

  const linkData = {
    url,
    title: document.getElementById("link-title").value,
    description: document.getElementById("link-description").value || "",
    categoryId: document.getElementById("link-category").value || null,
    icon: document.getElementById("link-icon").value || null,
    favicon: currentPreview.favicon || null,
    previewImage: currentPreview.previewImage || null,
    tags: [],
  };

  try {
    if (editingLinkId) {
      const existing = links.find((l) => l.id === editingLinkId);
      if (existing) linkData.favorite = existing.favorite;
      await updateLink(currentUser.uid, editingLinkId, linkData);
    } else {
      linkData.favorite = false;
      await addLink(currentUser.uid, linkData);
    }
    linkDialog.close();
    linkForm.reset();
  } catch (error) {
    console.error(error);
    showToast("Não foi possível guardar o link.", "error");
  }
};

const handleCategorySubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById("cat-name").value;
  const icon = document.getElementById("cat-icon").value || null;
  const color = document.getElementById("cat-color").value;

  try {
    if (editingCategoryId) {
      await updateCategory(currentUser.uid, editingCategoryId, name, icon, color);
    } else {
      await addCategory(currentUser.uid, name, icon, color);
    }
    categoryDialog.close();
    categoryForm.reset();
  } catch (error) {
    console.error(error);
    showToast("Não foi possível guardar o tema.", "error");
  }
};

const handleLinkActions = async (e) => {
  const btn = e.target.closest("button");
  const linkCard = e.target.closest(".link-card");

  if (e.target.closest("a")) return;

  if (!btn) {
    if (linkCard) {
      const url = linkCard.dataset.url;
      if (url) window.open(url, "_blank", "noopener");
    }
    return;
  }

  const linkId = btn.dataset.id;

  if (btn.classList.contains("trash-btn")) {
    e.stopPropagation();
    if (confirm("Tem a certeza que deseja apagar este link?")) {
      await deleteLink(currentUser.uid, linkId);
    }
  } else if (btn.classList.contains("fav-btn")) {
    e.stopPropagation();
    const link = links.find((l) => l.id === linkId);
    if (link) await toggleFavorite(currentUser.uid, linkId, link.favorite);
  } else if (btn.classList.contains("edit-btn")) {
    e.stopPropagation();
    const link = links.find((l) => l.id === linkId);
    if (link) openLinkDialog(link);
  } else if (btn.classList.contains("copy-btn")) {
    e.stopPropagation();
    const url = btn.dataset.url;
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        showToast("Link copiado!");
      } catch (err) {
        console.error(err);
      }
    }
  }
};

const handleShareStack = async () => {
  const cat = categories.find((c) => c.id === activeView);
  if (!cat) return;
  const stackLinks = links.filter((l) => l.categoryId === cat.id);
  try {
    const url = await shareStack(currentUser.uid, currentUser.displayName, cat, stackLinks);
    showToast(`Link do tema copiado: ${url}`);
  } catch (err) {
    console.error(err);
    showToast("Não foi possível partilhar o tema.", "error");
  }
};

const handleImportFile = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const result = await importFromFile(currentUser.uid, file);
    showToast(`Importado: ${result.categoriesImported} temas, ${result.linksImported} links.`);
  } catch (err) {
    console.error(err);
    showToast("Não foi possível importar o ficheiro.", "error");
  } finally {
    e.target.value = "";
  }
};

const applyCardLayout = () => {
  linksView.classList.toggle("list-view", cardLayout === "list");
  document.querySelectorAll(".view-switch-btn").forEach((btn) => {
    const on = btn.dataset.layout === cardLayout;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
  });
};

const setCardLayout = (layout) => {
  cardLayout = layout === "list" ? "list" : "grid";
  localStorage.setItem("aroundwise_layout", cardLayout);
  applyCardLayout();
};

// --- Theme name presets ---

const populateThemePresets = () => {
  const datalist = document.getElementById("cat-name-suggestions");
  const chips = document.getElementById("cat-presets");
  const all = THEME_PRESETS.flatMap((g) => g.items);

  if (datalist) {
    datalist.innerHTML = all.map((p) => `<option value="${escapeHtml(p.name)}"></option>`).join("");
  }
  if (!chips) return;

  chips.innerHTML = THEME_PRESETS.map(
    (g) => `
      <div class="preset-group">
        <span class="preset-group-label">${escapeHtml(g.group)}</span>
        <div class="preset-group-items">
          ${g.items
            .map(
              (p) => `<button type="button" class="preset-chip" data-name="${escapeHtml(p.name)}" data-icon="${p.icon}"><span class="preset-chip-icon">${ICONS[p.icon] || ICONS.folder}</span>${escapeHtml(p.name)}</button>`
            )
            .join("")}
        </div>
      </div>`
  ).join("");

  chips.addEventListener("click", (e) => {
    const chip = e.target.closest(".preset-chip");
    if (!chip) return;
    document.getElementById("cat-name").value = chip.dataset.name;
    const iconSelect = document.getElementById("cat-icon");
    if (iconSelect && [...iconSelect.options].some((o) => o.value === chip.dataset.icon)) {
      iconSelect.value = chip.dataset.icon;
    }
    syncPresetChips();
  });
  document.getElementById("cat-name")?.addEventListener("input", syncPresetChips);
};

// Highlight the chip matching the typed name and mark names already in use.
const syncPresetChips = () => {
  const current = (document.getElementById("cat-name")?.value || "").trim().toLowerCase();
  const used = new Set(
    categories.filter((c) => c.id !== editingCategoryId).map((c) => (c.name || "").trim().toLowerCase())
  );
  document.querySelectorAll(".preset-chip").forEach((chip) => {
    const name = chip.dataset.name.toLowerCase();
    chip.classList.toggle("active", name === current);
    chip.classList.toggle("used", used.has(name));
    chip.title = used.has(name) ? "Já existe um tema com este nome" : "";
  });
};

const handleThemeToggle = () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("aroundwise_theme", newTheme);
  updateThemeIcon(newTheme);
};

export const updateThemeIcon = (theme) => {
  const btn = document.getElementById("theme-toggle-btn");
  if (!btn) return;
  const sun = btn.querySelector(".icon-sun");
  const moon = btn.querySelector(".icon-moon");
  if (theme === "dark") {
    sun.classList.add("hidden");
    moon.classList.remove("hidden");
  } else {
    sun.classList.remove("hidden");
    moon.classList.add("hidden");
  }
};
window.updateThemeIcon = updateThemeIcon;

export const initTheme = () => {
  const savedTheme = localStorage.getItem("aroundwise_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
};

const populateIconSelects = () => {
  const selects = [document.getElementById("link-icon"), document.getElementById("cat-icon")];
  const iconOptions = [
    { value: "link", label: "Link" },
    { value: "globe", label: "Globo" },
    { value: "bookmark", label: "Marcador" },
    { value: "star", label: "Estrela" },
    { value: "code", label: "Código" },
    { value: "terminal", label: "Terminal" },
    { value: "database", label: "Base de Dados" },
    { value: "cpu", label: "CPU" },
    { value: "book", label: "Livro" },
    { value: "fileText", label: "Documento" },
    { value: "palette", label: "Design" },
    { value: "mail", label: "Email" },
    { value: "briefcase", label: "Negócios" },
    { value: "dollarSign", label: "Finanças" },
    { value: "youtube", label: "YouTube" },
    { value: "github", label: "GitHub" },
    { value: "folder", label: "Pasta" },
    { value: "archive", label: "Arquivo" },
    { value: "file", label: "Ficheiro" },
    { value: "graduation", label: "Estudos" },
    { value: "tool", label: "Ferramentas" },
    { value: "home", label: "Casa" },
    { value: "heart", label: "Saúde" },
    { value: "map", label: "Viagens" },
    { value: "shoppingCart", label: "Compras" },
    { value: "newspaper", label: "Notícias" },
    { value: "video", label: "Vídeo" },
    { value: "music", label: "Música" },
    { value: "gamepad", label: "Jogos" },
    { value: "calendar", label: "Agenda" },
    { value: "clock", label: "Relógio" },
    { value: "cloud", label: "Nuvem" },
    { value: "coffee", label: "Café" },
    { value: "messageCircle", label: "Conversa" },
    { value: "twitter", label: "Redes Sociais" },
  ];

  selects.forEach((select) => {
    if (!select) return;
    select.innerHTML = '<option value="">Padrão</option>';
    iconOptions.forEach((icon) => {
      const option = document.createElement("option");
      option.value = icon.value;
      option.textContent = icon.label;
      select.appendChild(option);
    });
  });
};

const updateCategorySelect = () => {
  const select = document.getElementById("link-category");
  if (!select) return;
  let html = '<option value="">Geral</option>';
  categories.forEach((cat) => {
    html += `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`;
  });
  select.innerHTML = html;
};
