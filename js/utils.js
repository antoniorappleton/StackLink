export const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
};

export const showToast = (message, type = "success") => {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = `toast${type === "error" ? " toast-error" : ""}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
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
