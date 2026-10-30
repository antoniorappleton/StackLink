import { exportUserData, importData } from "./db.js";

const download = (filename, content, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportAsJson = async (uid) => {
  const data = await exportUserData(uid);
  download("aroundwise-export.json", JSON.stringify(data, null, 2), "application/json");
};

export const exportAsBookmarksHtml = async (uid) => {
  const { categories, links } = await exportUserData(uid);
  const byCategory = new Map(categories.map((c) => [c.id, []]));
  const uncategorized = [];

  links.forEach((link) => {
    if (link.categoryId && byCategory.has(link.categoryId)) {
      byCategory.get(link.categoryId).push(link);
    } else {
      uncategorized.push(link);
    }
  });

  const escapeHtml = (str = "") =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const linkItem = (link) =>
    `<DT><A HREF="${escapeHtml(link.url)}">${escapeHtml(link.title || link.url)}</A>`;

  let body = "";
  categories.forEach((cat) => {
    const catLinks = byCategory.get(cat.id) || [];
    body += `<DT><H3>${escapeHtml(cat.name)}</H3>\n<DL><p>\n${catLinks.map(linkItem).join("\n")}\n</DL><p>\n`;
  });
  if (uncategorized.length) {
    body += `<DT><H3>Geral</H3>\n<DL><p>\n${uncategorized.map(linkItem).join("\n")}\n</DL><p>\n`;
  }

  const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks (Aroundwise)</H1>
<DL><p>
${body}</DL><p>
`;

  download("aroundwise-bookmarks.html", html, "text/html");
};

const parseBookmarksHtml = (htmlText) => {
  const doc = new DOMParser().parseFromString(htmlText, "text/html");
  const categories = [];
  const links = [];

  const walk = (node, categoryName) => {
    for (const child of node.children) {
      if (child.tagName === "H3") {
        categoryName = child.textContent.trim();
        if (categoryName && !categories.some((c) => c.id === categoryName)) {
          categories.push({ id: categoryName, name: categoryName, color: "#15414A" });
        }
      } else if (child.tagName === "A") {
        const url = child.getAttribute("href");
        if (url) {
          links.push({
            url,
            title: child.textContent.trim() || url,
            categoryId: categoryName || null,
          });
        }
      } else if (child.children.length) {
        walk(child, categoryName);
      }
    }
  };

  walk(doc.body, null);
  return { categories, links };
};

export const importFromFile = async (uid, file) => {
  const text = await file.text();
  let payload;

  if (file.name.endsWith(".json")) {
    payload = JSON.parse(text);
  } else {
    payload = parseBookmarksHtml(text);
  }

  return importData(uid, payload);
};
