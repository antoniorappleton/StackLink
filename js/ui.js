import { auth } from "./auth.js";
import {
  subscribeToCategories,
  addCategory,
  updateCategory,
  subscribeToLinks,
  addLink,
  updateLink,
  deleteLink,
  toggleFavorite,
} from "./db.js";
import { ICONS } from "./icons.js";

// State
let currentUser = null;
let categories = [];
let links = [];
let activeCategory = "all";

// Track editing state
let editingLinkId = null;
let editingCategoryId = null;

// DOM Elements
const categoriesContainer = document.getElementById("categories-container");
const linksContainer = document.getElementById("links-container");
const searchInput = document.getElementById("search-input");
const controlsSection = document.querySelector(".actions"); // To inject edit category btn

// Modals
const linkDialog = document.getElementById("link-dialog");
const categoryDialog = document.getElementById("category-dialog");
const linkForm = document.getElementById("link-form");
const categoryForm = document.getElementById("category-form");

// Buttons
const addLinkBtn = document.getElementById("add-link-btn");
const addCategoryBtn = document.getElementById("add-category-btn");

// Create Edit Category Button (inserted dynamically)
const editCategoryBtn = document.createElement("button");
editCategoryBtn.className = "btn btn-secondary hidden";
editCategoryBtn.innerHTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
editCategoryBtn.title = "Editar Categoria Atual";

// --- Initialization ---

export const initUI = (user) => {
  currentUser = user;
  if (!currentUser) return; // Should be handled by main app.js hiding UI logic

  // Inject Edit Cat Btn
  controlsSection.appendChild(editCategoryBtn);

  // Subscriptions
  subscribeToCategories(user.uid, (newCategories) => {
    categories = newCategories;
    renderCategories();
    updateCategorySelect();
    updateEditCategoryBtnVisibility();
  });

  subscribeToLinks(user.uid, (newLinks) => {
    links = newLinks;
    renderLinks();
  });

  // Event Listeners
  setupEventListeners();

  // Populate icon selects
  populateIconSelects();
};

const setupEventListeners = () => {
  // Dialog Triggers
  addLinkBtn.addEventListener("click", () => {
    editingLinkId = null;
    linkForm.reset();
    document.getElementById("link-icon").value = ""; // Reset icon
    document.querySelector("#link-dialog h2").textContent = "Novo Link";
    linkDialog.showModal();
  });

  addCategoryBtn.addEventListener("click", () => {
    editingCategoryId = null;
    categoryForm.reset();
    document.getElementById("cat-icon").value = ""; // Reset icon
    document.querySelector("#category-dialog h2").textContent =
      "Nova Categoria";
    categoryDialog.showModal();
  });

  editCategoryBtn.addEventListener("click", () => {
    if (activeCategory === "all" || activeCategory === "favorites") return;
    const cat = categories.find((c) => c.id === activeCategory);
    if (!cat) return;

    editingCategoryId = activeCategory;
    document.getElementById("cat-name").value = cat.name;
    document.getElementById("cat-icon").value = cat.icon || "";
    document.getElementById("cat-color").value = cat.color;
    document.querySelector("#category-dialog h2").textContent =
      "Editar Categoria";
    categoryDialog.showModal();
  });

  // Forms
  linkForm.addEventListener("submit", handleLinkSubmit);
  categoryForm.addEventListener("submit", handleCategorySubmit);

  // Filter & Search
  searchInput.addEventListener("input", () => renderLinks());

  // Delegation for Categories
  categoriesContainer.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) {
      setActiveCategory(chip.dataset.id);
    }
  });

  // Delegation for Links (Fav, Delete, Edit)
  linksContainer.addEventListener("click", handleLinkActions);
};

// --- Handlers ---

const handleLinkSubmit = async (e) => {
  e.preventDefault();
  const linkData = {
    url: document.getElementById("link-url").value,
    title: document.getElementById("link-title").value,
    description: document.getElementById("link-description").value || "",
    categoryId: document.getElementById("link-category").value || null,
    icon: document.getElementById("link-icon").value || null,
    tags: [],
    // favorite: preserve if editing, else false
  };

  try {
    if (editingLinkId) {
      // Preserve existing favorite status
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
    alert("Erro ao salvar link: " + error.message);
  }
};

const handleCategorySubmit = async (e) => {
  e.preventDefault();
  const name = document.getElementById("cat-name").value;
  const icon = document.getElementById("cat-icon").value || null;
  const color = document.getElementById("cat-color").value;

  try {
    if (editingCategoryId) {
      await updateCategory(
        currentUser.uid,
        editingCategoryId,
        name,
        icon,
        color
      );
    } else {
      await addCategory(currentUser.uid, name, icon, color);
    }
    categoryDialog.close();
    categoryForm.reset();
  } catch (error) {
    alert("Erro ao salvar categoria: " + error.message);
  }
};

const handleLinkActions = async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const linkId = btn.dataset.id;

  if (btn.classList.contains("trash-btn")) {
    if (confirm("Tem a certeza que deseja apagar este link?")) {
      await deleteLink(currentUser.uid, linkId);
    }
  } else if (btn.classList.contains("fav-btn")) {
    const link = links.find((l) => l.id === linkId);
    if (link) {
      await toggleFavorite(currentUser.uid, linkId, link.favorite);
    }
  } else if (btn.classList.contains("edit-btn")) {
    const link = links.find((l) => l.id === linkId);
    if (link) {
      editingLinkId = linkId;
      document.getElementById("link-url").value = link.url;
      document.getElementById("link-title").value = link.title;
      document.getElementById("link-description").value =
        link.description || "";
      document.getElementById("link-category").value = link.categoryId || "";
      document.getElementById("link-icon").value = link.icon || "";
      document.querySelector("#link-dialog h2").textContent = "Editar Link";
      linkDialog.showModal();
    }
  }
};

const setActiveCategory = (id) => {
  activeCategory = id;
  renderCategories(); // Re-render to update active class
  renderLinks();
  updateEditCategoryBtnVisibility();
};

const updateEditCategoryBtnVisibility = () => {
  if (activeCategory === "all" || activeCategory === "favorites") {
    editCategoryBtn.classList.add("hidden");
  } else {
    editCategoryBtn.classList.remove("hidden");
  }
};

// Populate icon select dropdowns
const populateIconSelects = () => {
  const linkIconSelect = document.getElementById("link-icon");
  const catIconSelect = document.getElementById("cat-icon");

  // Icon names with labels
  const iconOptions = [
    { value: "link", label: "Link" },
    { value: "globe", label: "Globo" },
    { value: "bookmark", label: "Marcador" },
    { value: "star", label: "Estrela" },
    { value: "code", label: "Código" },
    { value: "terminal", label: "Terminal" },
    { value: "database", label: "Base de Dados" },
    { value: "cpu", label: "CPU / Processador" },
    { value: "book", label: "Livro" },
    { value: "fileText", label: "Documento" },
    { value: "graduation", label: "Graduação" },
    { value: "image", label: "Imagem" },
    { value: "video", label: "Vídeo" },
    { value: "music", label: "Música" },
    { value: "palette", label: "Design / Paleta" },
    { value: "mail", label: "Email" },
    { value: "messageCircle", label: "Mensagem" },
    { value: "briefcase", label: "Negócios" },
    { value: "dollarSign", label: "Finanças" },
    { value: "trendingUp", label: "Crescimento" },
    { value: "settings", label: "Configurações" },
    { value: "tool", label: "Ferramenta" },
    { value: "search", label: "Pesquisa" },
    { value: "youtube", label: "YouTube" },
    { value: "github", label: "GitHub" },
    { value: "twitter", label: "Twitter" },
    { value: "shoppingCart", label: "Compras" },
    { value: "coffee", label: "Café" },
  ];

  iconOptions.forEach((icon) => {
    const option = document.createElement("option");
    option.value = icon.value;
    option.textContent = icon.label;
    linkIconSelect.appendChild(option.cloneNode(true));
    catIconSelect.appendChild(option);
  });
};

// --- Renderers ---

const renderCategories = () => {
  // Calculate counts
  const counts = links.reduce(
    (acc, link) => {
      acc.all = (acc.all || 0) + 1;
      if (link.favorite) acc.favorites = (acc.favorites || 0) + 1;
      if (link.categoryId)
        acc[link.categoryId] = (acc[link.categoryId] || 0) + 1;
      return acc;
    },
    { all: 0, favorites: 0 }
  );

  const getIcon = (name) => {
    // Simple heuristic for icons, could be stored in DB later
    const n = name.toLowerCase();
    if (n.includes("tech") || n.includes("dev"))
      return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
    if (n.includes("news") || n.includes("notícia"))
      return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>';
    if (n.includes("study") || n.includes("estudo"))
      return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
    if (n.includes("entret"))
      return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    if (n.includes("finan"))
      return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
  };

  // Static chips
  let html = `
        <button class="chip ${
          activeCategory === "all" ? "active" : ""
        }" data-id="all">
            Todos <span class="badge">${counts.all || 0}</span>
        </button>
        <button class="chip ${
          activeCategory === "favorites" ? "active" : ""
        }" data-id="favorites">
            ★ Favoritos <span class="badge">${counts.favorites || 0}</span>
        </button>
    `;

  // Dynamic categories
  categories.forEach((cat) => {
    const isActive = activeCategory === cat.id ? "active" : "";
    const count = counts[cat.id] || 0;
    // Use icon from library if it's a key, otherwise use as-is (for custom SVG/emoji)
    const iconHtml =
      cat.icon && ICONS[cat.icon]
        ? ICONS[cat.icon]
        : cat.icon || getIcon(cat.name);

    html += `
        <button class="chip ${isActive}" data-id="${cat.id}">
            ${iconHtml}
            ${cat.name}
            <span class="badge">${count}</span>
        </button>`;
  });

  categoriesContainer.innerHTML = html;
};

const updateCategorySelect = () => {
  const select = document.getElementById("link-category");
  let html = '<option value="">Sem categoria</option>';
  categories.forEach((cat) => {
    html += `<option value="${cat.id}">${cat.name}</option>`;
  });
  select.innerHTML = html;
};

const renderLinks = () => {
  const searchTerm = searchInput.value.toLowerCase();

  const filteredLinks = links.filter((link) => {
    // Filter by Category
    if (activeCategory === "favorites" && !link.favorite) return false;
    if (
      activeCategory !== "all" &&
      activeCategory !== "favorites" &&
      link.categoryId !== activeCategory
    )
      return false;

    // Filter by Search
    if (searchTerm) {
      return (
        link.title.toLowerCase().includes(searchTerm) ||
        link.url.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  if (filteredLinks.length === 0) {
    linksContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">Nenhum link encontrado.</div>`;
    return;
  }

  linksContainer.innerHTML = filteredLinks
    .map((link) => {
      const category = categories.find((c) => c.id === link.categoryId);
      const catName = category ? category.name : "Geral";
      const hostname = new URL(link.url).hostname;

      // Use icon from library if it's a key, otherwise use as-is, or default globe
      const linkIcon =
        link.icon && ICONS[link.icon]
          ? ICONS[link.icon]
          : link.icon || ICONS.globe;

      return `
        <div class="link-card">
            <div class="card-header">
                <div class="card-header-left">
                    <div class="globe-icon">
                        ${linkIcon}
                    </div>
                    <div class="card-title-group">
                        <div class="card-title" title="${link.title}">${
        link.title
      }</div>
                    </div>
                </div>
                <button class="fav-btn ${
                  link.favorite ? "active" : ""
                }" data-id="${link.id}">
                    ${
                      link.favorite
                        ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="filled-star"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
                        : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
                    }
                </button>
            </div>
            
            <div class="card-body">
                <p class="card-desc">${link.description || "Sem descrição"}</p>
                <div class="card-domain">${hostname}</div>
            </div>

            <div class="card-footer">
                <span class="card-category">${catName}</span>
                <div class="card-actions">
                    <a href="${link.url}" target="_blank" class="btn-open">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                        Abrir
                    </a>
                    <button class="edit-btn btn-icon" data-id="${
                      link.id
                    }" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="trash-btn btn-icon" data-id="${
                      link.id
                    }" title="Apagar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        </div>
        `;
    })
    .join("");
};
