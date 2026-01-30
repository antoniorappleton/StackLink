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
let isCompactView = localStorage.getItem("stacklink_view_mode") === "compact";

// Track editing state
let editingLinkId = null;
let editingCategoryId = null;

// DOM Elements
const categoriesContainer = document.getElementById("categories-container");
const modalLinksContainer = document.getElementById("modal-links-container"); // NEW reference
const searchInput = document.getElementById("search-input");
const controlsSection = document.querySelector(".actions"); 

// Modals
const linkDialog = document.getElementById("link-dialog");
const categoryDialog = document.getElementById("category-dialog");
const categoryLinksDialog = document.getElementById("category-links-dialog"); // NEW Modal
const linkForm = document.getElementById("link-form");
const categoryForm = document.getElementById("category-form");

// Modal Elements
const modalCategoryTitle = document.getElementById("modal-category-title");
const modalCategoryIcon = document.getElementById("modal-category-icon");


// Buttons
const addLinkBtn = document.getElementById("add-link-btn");
const addCategoryBtn = document.getElementById("add-category-btn");
const toggleViewBtn = document.getElementById("toggle-view-btn");
// const expandCatsBtn = document.getElementById("expand-cats-btn"); // REMOVED

// Create Edit Category Button (inserted dynamically)
const editCategoryBtn = document.createElement("button");
editCategoryBtn.className = "btn btn-secondary hidden";
editCategoryBtn.innerHTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
editCategoryBtn.title = "Editar Categoria Atual";

// --- Initialization ---

export const initUI = (user) => {
  currentUser = user;
  if (!currentUser) return; 

  // Inject Edit Cat Btn - We might want to place this differently now, maybe in the modal header?
  // For now, let's leave it in controlsSection but control visibility carefully.
  controlsSection.appendChild(editCategoryBtn);

  // Subscriptions
  subscribeToCategories(user.uid, (newCategories) => {
    categories = newCategories;
    renderCategories();
    updateCategorySelect();
    // updateEditCategoryBtnVisibility(); // Handled when opening modal now
  });

  subscribeToLinks(user.uid, (newLinks) => {
    links = newLinks;
    renderCategories(); // Update counts
    if(categoryLinksDialog.open) {
        renderLinks(); // Only re-render links if modal is open
    }
  });

  // Event Listeners
  setupEventListeners();

  // Populate icon selects
  populateIconSelects();

  // Init Theme
  initTheme();

  // Init View Mode
  if (isCompactView) {
    categoriesContainer.classList.add("compact-view");
  }
};

const setupEventListeners = () => {
  // Dialog Triggers
  if (toggleViewBtn) {
    toggleViewBtn.addEventListener("click", handleViewToggle);
  }

  // Theme Toggle
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", handleThemeToggle);
  }

  addLinkBtn.addEventListener("click", () => {
    editingLinkId = null;
    linkForm.reset();
    document.getElementById("link-icon").value = ""; 
    document.querySelector("#link-dialog h2").textContent = "Novo Link";
    // Pre-select category if we are inside a category modal
    if(categoryLinksDialog.open && activeCategory !== 'all' && activeCategory !== 'favorites') {
         document.getElementById("link-category").value = activeCategory;
    }
    linkDialog.showModal();
  });

  addCategoryBtn.addEventListener("click", () => {
    editingCategoryId = null;
    categoryForm.reset();
    document.getElementById("cat-icon").value = ""; 
    document.querySelector("#category-dialog h2").textContent =
      "Nova Categoria";
    categoryDialog.showModal();
  });

  // Edit Category Button (Now context-aware)
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
  searchInput.addEventListener("input", () => {
      // If we type in search, we might want to show results. 
      // Current design: Search inside the open category? Or global search?
      // "Pesquisar links..." implies finding links.
      // If modal is closed, maybe we shouldn't search? Or maybe search opens a "Search Results" modal?
      // For now, let's assume search filters the CURRENT view. 
      // If modal is open, it filters there.
      if(categoryLinksDialog.open) {
          renderLinks();
      } else {
          // If grid view, maybe highlight categories? Or do nothing?
          // Let's leave as is (only works if renderLinks is called).
          // Maybe we auto-open "All" modal on search?
           if(searchInput.value.length > 0) {
               setActiveCategory('all');
               categoryLinksDialog.showModal();
           }
      }
  });

  // Delegation for Categories (Click on Card)
  categoriesContainer.addEventListener("click", (e) => {
    const card = e.target.closest(".category-card");
    if (card) {
      setActiveCategory(card.dataset.id);
      categoryLinksDialog.showModal();
    }
    // Handle delete/edit category buttons directly on card if we add them later
  });

  // Delegation for Links (Fav, Delete, Edit)
  modalLinksContainer.addEventListener("click", handleLinkActions); // Changed target
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
      // Update modal title if open and matches
      if(categoryLinksDialog.open && activeCategory === editingCategoryId) {
          modalCategoryTitle.textContent = name;
          // Icon update handled in render
      }
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
  } else if (btn.classList.contains("toggle-size-btn")) {
    const card = btn.closest(".link-card");
    card.classList.toggle("collapsed");
  }
};

const handleViewToggle = () => {
  isCompactView = !isCompactView;
  if (isCompactView) {
    categoriesContainer.classList.add("compact-view");
    localStorage.setItem("stacklink_view_mode", "compact");
  } else {
    categoriesContainer.classList.remove("compact-view");
    localStorage.setItem("stacklink_view_mode", "expanded");
  }
};

const handleThemeToggle = () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("stacklink_theme", newTheme);

  updateThemeIcon(newTheme);
};

const updateThemeIcon = (theme) => {
  const btn = document.getElementById("theme-toggle-btn");
  if (!btn) return;
  const sun = btn.querySelector(".icon-sun");
  const moon = btn.querySelector(".icon-moon");

  if (theme === "light") {
    sun.classList.add("hidden");
    moon.classList.remove("hidden");
  } else {
    sun.classList.remove("hidden");
    moon.classList.add("hidden");
  }
};

export const initTheme = () => {
  const savedTheme = localStorage.getItem("stacklink_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
};

const setActiveCategory = (id) => {
  activeCategory = id;
  
  // Update Modal Header using logic similar to renderCategories
  let catName = "Todos";
  let catIconHtml = ICONS.globe; // Default

  if (id === 'all') {
      catName = "Todos os Links";
      catIconHtml = ICONS.globe; // Or a specific 'all' icon
  } else if (id === 'favorites') {
      catName = "Favoritos";
      catIconHtml = ICONS.star;
  } else {
       const cat = categories.find(c => c.id === id);
       if(cat) {
           catName = cat.name;
           catIconHtml = cat.icon && ICONS[cat.icon] ? ICONS[cat.icon] : (cat.icon || ICONS.folder);
       }
  }

  modalCategoryTitle.textContent = catName;
  modalCategoryIcon.innerHTML = catIconHtml;

  renderLinks();
  updateEditCategoryBtnVisibility();
};

const updateEditCategoryBtnVisibility = () => {
    // Logic: we want to show this button IN the modal header maybe?
    // Or just keep using the one in controlsSection but make it context aware
    // If modal is open, we can show it.
    // Let's actually append it to the modal header dynamically or toggle visibility
    
    // For now, let's keep the existing logic but maybe move the button to the modal header in HTML?
    // Simpler: Just toggle visibility of the global button. But wait, the global button is outside the modal.
    // Implementation Plan didn't specify, but UX wise, editing a category is best done when viewing it.
    // Let's create a Specific Edit Button inside the modal header in HTML later or inject it now.
    
    // Let's just create a new button inside the modal header for editing category.
    // Actually, I'll inject it into the modal header if it's a custom category.
    
    let existingEditBtn = document.getElementById("modal-edit-cat-btn");
    if(!existingEditBtn) {
        existingEditBtn = document.createElement("button");
        existingEditBtn.id = "modal-edit-cat-btn";
        existingEditBtn.className = "btn-icon";
        existingEditBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        existingEditBtn.title = "Editar Categoria";
        existingEditBtn.onclick = () => {
             const cat = categories.find((c) => c.id === activeCategory);
            if (!cat) return;
            editingCategoryId = activeCategory;
            document.getElementById("cat-name").value = cat.name;
            document.getElementById("cat-icon").value = cat.icon || "";
            document.getElementById("cat-color").value = cat.color;
            document.querySelector("#category-dialog h2").textContent = "Editar Categoria";
            categoryDialog.showModal();
        }
        document.querySelector("#category-links-dialog .header-content").appendChild(existingEditBtn);
    }
    
    if (activeCategory === "all" || activeCategory === "favorites") {
         existingEditBtn.classList.add("hidden");
    } else {
         existingEditBtn.classList.remove("hidden");
    }
};

// Populate icon select dropdowns
const populateIconSelects = () => {
  const linkIconSelect = document.getElementById("link-icon");
  const catIconSelect = document.getElementById("cat-icon");

  // Icon names with clean labels (no emojis)
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
    { value: "newspaper", label: "Notícias / Jornal" },
    { value: "rss", label: "RSS / Feed" },
    { value: "smartphone", label: "Smartphone" },
    { value: "monitor", label: "Monitor" },
    { value: "laptop", label: "Laptop" },
    { value: "wifi", label: "WiFi / Rede" },
    { value: "cloud", label: "Cloud / Nuvem" },
    { value: "gamepad", label: "Gaming / Jogos" },
    { value: "film", label: "Cinema / Filme" },
    { value: "tv", label: "TV / Televisão" },
    { value: "activity", label: "Atividade / Fitness" },
    { value: "heart", label: "Saúde / Coração" },
    { value: "map", label: "Mapa" },
    { value: "mapPin", label: "Localização" },
    { value: "home", label: "Casa / Home" },
    { value: "folder", label: "Pasta" },
    { value: "file", label: "Arquivo" },
    { value: "archive", label: "Arquivo / Backup" },
    { value: "calendar", label: "Calendário" },
    { value: "clock", label: "Relógio / Tempo" },
    { value: "lock", label: "Segurança / Privado" },
    { value: "shield", label: "Proteção / Shield" },
    { value: "award", label: "Prêmio / Conquista" },
    { value: "gift", label: "Presente / Gift" },
    { value: "bell", label: "Notificação / Alerta" },
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
    // Replaced 'chips' with 'cards'
    
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
      return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>';
      // ... (Rest of existing heuristics if needed, simplified for brevity or use ICONS fallback)
    return ICONS.folder || '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
  };

  let html = ``;
  
  // "All" Card
  html += `
    <div class="category-card" data-id="all">
        <div class="cat-card-icon">${ICONS.globe}</div>
        <div class="cat-card-info">
            <h3>Todos</h3>
            <span class="count">${counts.all || 0} Links</span>
        </div>
    </div>
  `;
  
  // "Favorites" Card
  html += `
    <div class="category-card" data-id="favorites">
        <div class="cat-card-icon" style="color: #fbbf24;">${ICONS.star}</div>
        <div class="cat-card-info">
            <h3>Favoritos</h3>
            <span class="count">${counts.favorites || 0} Links</span>
        </div>
    </div>
  `;

  // Dynamic categories
  categories.forEach((cat) => {
    const count = counts[cat.id] || 0;
    const iconHtml =
      cat.icon && ICONS[cat.icon]
        ? ICONS[cat.icon]
        : cat.icon || getIcon(cat.name);
        
    const colorStyle = cat.color ? `style="color: ${cat.color}"` : '';

    html += `
        <div class="category-card" data-id="${cat.id}">
            <div class="cat-card-icon" ${colorStyle}>
                ${iconHtml}
            </div>
             <div class="cat-card-info">
                <h3>${cat.name}</h3>
                <span class="count">${count} Links</span>
            </div>
        </div>`;
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
    modalLinksContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">Nenhum link encontrado.</div>`;
    return;
  }

  modalLinksContainer.innerHTML = filteredLinks
    .map((link) => {
      const category = categories.find((c) => c.id === link.categoryId);
      const catName = category ? category.name : "Geral";
      let hostname = "";
      try {
        hostname = new URL(link.url).hostname;
      } catch (e) {
          hostname = link.url;
      }

      const linkIcon =
        link.icon && ICONS[link.icon]
          ? ICONS[link.icon]
          : link.icon || ICONS.globe;

      return `
        <div class="link-card ${isCompactView ? 'collapsed' : ''}">
            <div class="card-header">
                <div class="card-header-left">
                    <div class="globe-icon">
                        ${linkIcon}
                    </div>
                    <div class="card-title-group">
                        <div class="card-title" title="${link.title}">${link.title}</div>
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
                    <button class="edit-btn btn-icon" data-id="${link.id}" title="Editar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="trash-btn btn-icon" data-id="${link.id}" title="Apagar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                    <button class="toggle-size-btn btn-icon" data-id="${link.id}" title="Expandir/Encolher">
                        <svg class="icon-shrink" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="4 14 10 14 10 20"></polyline>
                            <polyline points="20 10 14 10 14 4"></polyline>
                            <line x1="14" y1="10" x2="21" y2="3"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                        <svg class="icon-expand hidden" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <polyline points="9 21 3 21 3 15"></polyline>
                            <line x1="21" y1="3" x2="14" y2="10"></line>
                            <line x1="3" y1="21" x2="10" y2="14"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        `;
    })
    .join("");
};
