import { createSharedStack, getSharedStack } from "./db.js";

const SHARE_PREFIX = "/s/";

export const getShareIdFromLocation = () => {
  const { pathname } = window.location;
  if (pathname.startsWith(SHARE_PREFIX)) {
    return decodeURIComponent(pathname.slice(SHARE_PREFIX.length)).replace(/\/$/, "");
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("share");
};

export const buildShareUrl = (shareId) => {
  return `${window.location.origin}${SHARE_PREFIX}${shareId}`;
};

export const shareStack = async (uid, ownerName, category, links) => {
  const shareId = await createSharedStack(uid, ownerName, category, links);
  const url = buildShareUrl(shareId);
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    // Clipboard API unavailable (e.g. insecure context) - caller still gets the URL.
  }
  return url;
};

export const fetchSharedStack = (shareId) => getSharedStack(shareId);
