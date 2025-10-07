// docs/js/preview.js
const CFN_URL = "https://europe-west2-stacklink-9944f.cloudfunctions.net/meta";

async function tryCF(url) {
  const r = await fetch(`${CFN_URL}?url=${encodeURIComponent(url)}`);
  if (!r.ok) throw new Error("cfn not ok");
  return await r.json(); // { title, description, image, site, url }
}

async function tryMicrolink(url) {
  const r = await fetch(
    `https://api.microlink.io?url=${encodeURIComponent(url)}`
  );
  const j = await r.json();
  if (!j?.data) throw new Error("microlink empty");
  return {
    url,
    title: j.data.title || "",
    description: j.data.description || "",
    image: j.data.image?.url || "",
    site: j.data.publisher || "",
  };
}

export async function getPreview(url) {
  try {
    return await tryCF(url);
  } catch (e1) {
    console.warn("CFN preview fail:", e1?.message);
    try {
      return await tryMicrolink(url);
    } catch (e2) {
      console.warn("Microlink fail:", e2?.message);
      return null;
    }
  }
}
