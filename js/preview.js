// Fetches a lightweight preview (title, favicon, image) for a URL so the
// "Novo Link" form can auto-fill details without any backend of our own.
const MICROLINK_ENDPOINT = "https://api.microlink.io/";

export const faviconFallback = (url) => {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?sz=128&domain=${hostname}`;
  } catch {
    return null;
  }
};

export const fetchLinkPreview = async (url) => {
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }

  const fallback = {
    title: "",
    description: "",
    favicon: faviconFallback(url),
    previewImage: null,
    hostname,
  };

  try {
    const res = await fetch(
      `${MICROLINK_ENDPOINT}?url=${encodeURIComponent(url)}&palette=false`
    );
    if (!res.ok) return fallback;
    const { status, data } = await res.json();
    if (status !== "success" || !data) return fallback;

    return {
      title: data.title || "",
      description: data.description || "",
      favicon: data.logo?.url || fallback.favicon,
      previewImage: data.image?.url || data.screenshot?.url || null,
      hostname,
    };
  } catch (err) {
    console.warn("Preview fetch failed, using favicon fallback:", err);
    return fallback;
  }
};
