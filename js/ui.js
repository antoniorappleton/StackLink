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
const modalLinksContainer = document.getElementById("modal-links-container");
const searchInput = document.getElementById("search-input");
const heroTitle = document.querySelector(".hero-section h1");

// Modals
const linkDialog = document.getElementById("link-dialog");
const categoryDialog = document.getElementById("category-dialog");
const categoryLinksDialog = document.getElementById("category-links-dialog");
const linkForm = document.getElementById("link-form");
const categoryForm = document.getElementById("category-form");

// Modal Elements
const modalCategoryTitle = document.getElementById("modal-category-title");
const modalCategoryIcon = document.getElementById("modal-category-icon");


// Buttons
const addLinkBtn = document.getElementById("add-link-btn");
const addCategoryBtn = document.getElementById("add-category-btn");
const toggleViewBtn = document.getElementById("toggle-view-btn");

// --- Initialization ---

export const initUI = (user) => {
  currentUser = user;
  if (!currentUser) return; 

  // Update Greeting
  updateGreeting();

  // Subscriptions
  subscribeToCategories(user.uid, (newCategories) => {
    categories = newCategories;
    renderCategories();
    updateCategorySelect();
  });

  subscribeToLinks(user.uid, (newLinks) => {
    links = newLinks;
    renderCategories(); // Update counts
    if(categoryLinksDialog.open) {
        renderLinks();
    }
  });

  // Event Listeners
  setupEventListeners();

  // Populate icon selects
  populateIconSelects();

  // Init Theme
  initTheme();
};

const updateGreeting = () => {
    if (!heroTitle || !currentUser) return;
    const hour = new Date().getHours();
    let greeting = "Olá";
    if (hour < 12) greeting = "Bom dia";
    else if (hour < 18) greeting = "Boa tarde";
    else greeting = "Boa noite";
    
    const firstName = currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Explorador';
    heroTitle.textContent = `${greeting}, ${firstName}! 👋`;
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
    document.querySelector("#link-dialog h2").textContent = "Guardar Novo Link";
    if(categoryLinksDialog.open && activeCategory !== 'all' && activeCategory !== 'favorites') {
         document.getElementById("link-category").value = activeCategory;
    }
    linkDialog.showModal();
  });

  addCategoryBtn.addEventListener("click", () => {
    editingCategoryId = null;
    categoryForm.reset();
    document.getElementById("cat-icon").value = ""; 
    document.querySelector("#category-dialog h2").textContent = "Criar Nova Stack";
    categoryDialog.showModal();
  });

  // Forms
  linkForm.addEventListener("submit", handleLinkSubmit);
  categoryForm.addEventListener("submit", handleCategorySubmit);

  // Filter & Search
  searchInput.addEventListener("input", () => {
      if(categoryLinksDialog.open) {
          renderLinks();
      } else {
           if(searchInput.value.length > 0) {
               setActiveCategory('all');
               categoryLinksDialog.showModal();
           }
      }
  });

  // Delegation for Categories
  categoriesContainer.addEventListener("click", (e) => {
    const card = e.target.closest(".category-card");
    if (card) {
      setActiveCategory(card.dataset.id);
      categoryLinksDialog.showModal();
    }
  });

  // Delegation for Links
  modalLinksContainer.addEventListener("click", handleLinkActions);
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
    console.error(error);
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
      if(categoryLinksDialog.open && activeCategory === editingCategoryId) {
          modalCategoryTitle.textContent = name;
      }
    } else {
      await addCategory(currentUser.uid, name, icon, color);
    }
    categoryDialog.close();
    categoryForm.reset();
  } catch (error) {
    console.error(error);
  }
};

const handleLinkActions = async (e) => {
  const btn = e.target.closest("button");
  const linkCard = e.target.closest(".link-card");

  if (e.target.closest("a")) return;

  if (linkCard && !btn) {
    if (window.innerWidth <= 768) {
        linkCard.classList.toggle('expanded');
        return;
    }
    const url = linkCard.dataset.url;
    if (url) window.open(url, "_blank");
    return;
  }

  if (!btn) return;

  const linkId = btn.dataset.id;

  if (btn.classList.contains("trash-btn")) {
    e.stopPropagation();
    if (confirm("Tem a certeza que deseja apagar este link?")) {
      await deleteLink(currentUser.uid, linkId);
    }
  } else if (btn.classList.contains("fav-btn")) {
    e.stopPropagation();
    const link = links.find((l) => l.id === linkId);
    if (link) {
      await toggleFavorite(currentUser.uid, linkId, link.favorite);
    }
  } else if (btn.classList.contains("edit-btn")) {
    e.stopPropagation();
    const link = links.find((l) => l.id === linkId);
    if (link) {
      editingLinkId = linkId;
      document.getElementById("link-url").value = link.url;
      document.getElementById("link-title").value = link.title;
      document.getElementById("link-description").value = link.description || "";
      document.getElementById("link-category").value = link.categoryId || "";
      document.getElementById("link-icon").value = link.icon || "";
      document.querySelector("#link-dialog h2").textContent = "Editar Link";
      linkDialog.showModal();
    }
  } else if (btn.classList.contains("copy-btn")) {
    e.stopPropagation();
    const url = btn.dataset.url;
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary);"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
      } catch (err) {
        console.error(err);
      }
    }
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

export const updateThemeIcon = (theme) => {
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
window.updateThemeIcon = updateThemeIcon;

export const initTheme = () => {
  const savedTheme = localStorage.getItem("stacklink_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);
};

const setActiveCategory = (id) => {
  activeCategory = id;
  let catName = "Stack";
  let catIconHtml = ICONS.globe;

  if (id === 'all') {
      catName = "Todos os Links";
      catIconHtml = ICONS.globe;
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
  updateEditCategoryBtn();
};

const updateEditCategoryBtn = () => {
    let existingEditBtn = document.getElementById("modal-edit-cat-btn");
    if(!existingEditBtn) {
        existingEditBtn = document.createElement("button");
        existingEditBtn.id = "modal-edit-cat-btn";
        existingEditBtn.className = "btn-icon";
        existingEditBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        existingEditBtn.title = "Editar Stack";
        existingEditBtn.onclick = () => {
             const cat = categories.find((c) => c.id === activeCategory);
            if (!cat) return;
            editingCategoryId = activeCategory;
            document.getElementById("cat-name").value = cat.name;
            document.getElementById("cat-icon").value = cat.icon || "";
            document.getElementById("cat-color").value = cat.color;
            document.querySelector("#category-dialog h2").textContent = "Editar Stack";
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
  ];

  selects.forEach(select => {
      if(!select) return;
      select.innerHTML = '<option value="">Padrão</option>';
      iconOptions.forEach((icon) => {
        const option = document.createElement("option");
        option.value = icon.value;
        option.textContent = icon.label;
        select.appendChild(option);
      });
  });
};

// --- Initialization ---

const renderCategories = () => {
  const counts = links.reduce((acc, link) => {
      acc.all = (acc.all || 0) + 1;
      if (link.favorite) acc.favorites = (acc.favorites || 0) + 1;
      if (link.categoryId) acc[link.categoryId] = (acc[link.categoryId] || 0) + 1;
      return acc;
    }, { all: 0, favorites: 0 });
  
  const firstName = currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Meu';

  let html = `
    <div class="category-card" data-id="all" style="animation: slideUp 0.4s var(--transit-smooth); --cat-accent: var(--accent-primary)">
        <div class="cat-card-icon-container">${ICONS.globe}</div>
        <div class="cat-card-body">
            <div class="cat-card-info">
                <h3>Todos os Links</h3>
                <span class="count">${counts.all || 0} Itens</span>
            </div>
        </div>
    </div>
    <div class="category-card" data-id="favorites" style="animation: slideUp 0.5s var(--transit-smooth); --cat-accent: #fbbf24">
        <div class="cat-card-icon-container" style="color: #fbbf24">${ICONS.star}</div>
        <div class="cat-card-body">
            <div class="cat-card-info">
                <h3>Favoritos de ${firstName}</h3>
                <span class="count">${counts.favorites || 0} Itens</span>
            </div>
        </div>
    </div>
  `;

  categories.forEach((cat, index) => {
    const count = counts[cat.id] || 0;
    const iconHtml = cat.icon && ICONS[cat.icon] ? ICONS[cat.icon] : (cat.icon || ICONS.folder);
    const catAccent = cat.color || 'var(--accent-primary)';
    const delay = 0.6 + (index * 0.1);

    html += `
        <div class="category-card" data-id="${cat.id}" style="animation: slideUp ${delay}s var(--transit-smooth); --cat-accent: ${catAccent}">
            <div class="cat-card-icon-container" style="color: ${catAccent}">${iconHtml}</div>
            <div class="cat-card-body">
                 <div class="cat-card-info">
                    <h3>${cat.name}</h3>
                    <span class="count">${count} Recursos</span>
                </div>
            </div>
        </div>`;
  });

  categoriesContainer.innerHTML = html;
};

const updateCategorySelect = () => {
  const select = document.getElementById("link-category");
  if(!select) return;
  let html = '<option value="">Geral</option>';
  categories.forEach((cat) => {
    html += `<option value="${cat.id}">${cat.name}</option>`;
  });
  select.innerHTML = html;
};

const renderLinks = () => {
  const searchTerm = searchInput.value.toLowerCase();
  const filteredLinks = links.filter((link) => {
    if (activeCategory === "favorites" && !link.favorite) return false;
    if (activeCategory !== "all" && activeCategory !== "favorites" && link.categoryId !== activeCategory) return false;
    if (searchTerm) {
      return link.title.toLowerCase().includes(searchTerm) || link.url.toLowerCase().includes(searchTerm);
    }
    return true;
  });

  if (filteredLinks.length === 0) {
    modalLinksContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 4rem;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="opacity: 0.3; margin-bottom: 1rem;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <p>Ainda não há links nesta stack.</p>
    </div>`;
    return;
  }

  modalLinksContainer.innerHTML = filteredLinks.map((link, index) => {
      const category = categories.find((c) => c.id === link.categoryId);
      const catName = category ? category.name : "Geral";
      let hostname = "";
      try { hostname = new URL(link.url).hostname; } catch (e) { hostname = link.url; }
      const linkIcon = link.icon && ICONS[link.icon] ? ICONS[link.icon] : (link.icon || ICONS.globe);
      const delay = (index * 0.05);

      return `
        <div class="link-card" data-url="${link.url}" style="animation: slideUp 0.4s var(--transit-smooth) ${delay}s both;">
            <div class="card-header">
                <div class="globe-icon">${linkIcon}</div>
                <button class="fav-btn btn-icon ${link.favorite ? "active" : ""}" data-id="${link.id}">
                    ${link.favorite ? ICONS.star : ICONS.star}
                </button>
            </div>
            
            <div class="card-body">
                <div class="card-title" title="${link.title}">${link.title}</div>
                <p class="card-desc">${link.description || "Sem descrição"}</p>
                <div class="card-domain" style="font-size: 0.75rem; color: var(--text-secondary); opacity: 0.6;">${hostname}</div>
            </div>

            <div class="card-footer">
                <div class="card-actions" style="display: flex; gap: 0.5rem; width: 100%; justify-content: flex-end;">
                     <button class="copy-btn btn-icon" data-url="${link.url}" title="Copiar Link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>
                    <a href="${link.url}" target="_blank" class="btn-open">Abrir</a>
                    <button class="edit-btn btn-icon" data-id="${link.id}" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="trash-btn btn-icon" data-id="${link.id}" title="Apagar" style="color: hsl(0, 80%, 60%);">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        </div>`;
    }).join("");
};
