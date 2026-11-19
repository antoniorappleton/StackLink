export const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
};

// showToast("Texto") or showToast("Texto", "success", { actionLabel: "Anular", onAction, duration })
export const showToast = (message, type = "success", options = {}) => {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast${type === "error" ? " toast-error" : ""}`;
    const text = document.createElement("span");
    text.textContent = message;
    toast.appendChild(text);

    const duration = options.duration || (options.actionLabel ? 6000 : 2800);
    const timer = setTimeout(() => toast.remove(), duration);

    if (options.actionLabel && typeof options.onAction === "function") {
        toast.classList.add("toast-has-action");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "toast-action";
        btn.textContent = options.actionLabel;
        btn.addEventListener("click", () => {
            clearTimeout(timer);
            toast.remove();
            options.onAction();
        });
        toast.appendChild(btn);
    }
};

// Canonical form of a URL for duplicate detection: ignores protocol,
// "www.", trailing slash, #fragment and letter case of the host.
export const normalizeUrl = (url = "") => {
    try {
        const u = new URL(String(url).trim());
        const host = u.hostname.toLowerCase().replace(/^www\./, "");
        const path = u.pathname.replace(/\/+$/, "");
        return `${host}${path}${u.search}`;
    } catch {
        return String(url).trim().toLowerCase().replace(/\/+$/, "");
    }
};

// Lower-case + strip accents so "musica" finds "Música".
export const foldText = (str = "") =>
    String(str).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// First http(s) URL found in a piece of text (Android share sheets often
// put the URL inside "text" instead of "url").
export const extractUrl = (text = "") => {
    const m = String(text).match(/https?:\/\/[^\s<>"']+/i);
    return m ? m[0] : null;
};

export const escapeHtml = (str = "") =>
    String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

export const getHostname = (url) => {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
};

// Only ever render http(s) URLs as live hrefs/window.open targets - blocks
// javascript:/data: schemes that could otherwise be smuggled in through a
// saved or shared link and executed when a visitor clicks "Abrir".
export const safeHref = (url) => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : "#";
    } catch {
        return "#";
    }
};
