import * as functions from "firebase-functions";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

export const meta = functions
  .region("europe-west2")
  .https.onRequest(async (req, res) => {
    // CORS
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    if (req.method === "OPTIONS") return res.status(204).send("");

    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "missing url" });

    try {
      const html = await (await fetch(url)).text();
      const $ = cheerio.load(html);

      const pick = (sel) =>
        $(`meta[property="${sel}"]`).attr("content") ||
        $(`meta[name="${sel}"]`).attr("content") ||
        "";

      const data = {
        url,
        title: pick("og:title") || $("title").first().text() || "",
        description: pick("og:description") || pick("description") || "",
        image: pick("og:image") || pick("twitter:image") || "",
        site: pick("og:site_name") || "",
      };

      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      return res.json(data);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "fetch_failed" });
    }
  });
