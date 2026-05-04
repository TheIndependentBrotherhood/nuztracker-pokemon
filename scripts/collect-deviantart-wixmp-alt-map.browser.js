/*
  Browser console script (Chrome/Edge)
  - Scans only images inside #sub-folder-gallery
  - No hard round limit
  - Stops after 3 consecutive stable rounds
    (no new URLs OR page height does not increase)
  - Exports two CSV files:
    1) deviantart-wixmp-alt-map.csv (alt,name,url)
    2) deviantart-wixmp-urls.csv (url)
*/
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const WIXMP_PREFIX =
    "https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/";
  const PAUSE_MS = 1500;
  const STABLE_STOP = 3;

  const byUrl = new Map();

  const sanitize = (value) =>
    (value || "")
      .toLowerCase()
      .replace(/ by .*/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-+/g, "-");

  const add = (url, alt) => {
    if (!url) return;
    const cleanUrl = url.replaceAll("&amp;", "&").trim();
    if (!cleanUrl.startsWith(WIXMP_PREFIX)) return;

    const cleanAlt = (alt || "").trim();
    const name = sanitize(cleanAlt);

    if (!byUrl.has(cleanUrl)) {
      byUrl.set(cleanUrl, { alt: cleanAlt, name });
      return;
    }

    const previous = byUrl.get(cleanUrl);
    if ((!previous.alt || previous.alt.length < cleanAlt.length) && cleanAlt) {
      byUrl.set(cleanUrl, { alt: cleanAlt, name });
    }
  };

  const scan = () => {
    const root = document.querySelector("#sub-folder-gallery");
    if (!root) return 0;

    const images = root.querySelectorAll("img");

    for (const img of images) {
      add(img.currentSrc || "", img.alt || "");
      add(img.src || "", img.alt || "");

      if (img.srcset) {
        for (const item of img.srcset.split(",")) {
          const src = item.trim().split(/\s+/)[0];
          add(src, img.alt || "");
        }
      }
    }

    return images.length;
  };

  const downloadCsv = (fileName, rows) => {
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  let round = 0;
  let stableRounds = 0;
  let previousCount = 0;
  let previousHeight = 0;

  console.log("Start scan on #sub-folder-gallery only.");

  while (stableRounds < STABLE_STOP) {
    round += 1;

    const imageCount = scan();
    const currentCount = byUrl.size;
    const currentHeight = document.body.scrollHeight;

    const noNewUrls = currentCount === previousCount;
    const noHeightGrowth = currentHeight === previousHeight;

    if (noNewUrls || noHeightGrowth) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
    }

    console.log(
      `Round ${round} | galleryImgs=${imageCount} | urls=${currentCount} | height=${currentHeight} | noNewUrls=${noNewUrls} | noHeightGrowth=${noHeightGrowth} | stable=${stableRounds}`,
    );

    previousCount = currentCount;
    previousHeight = currentHeight;

    if (stableRounds >= STABLE_STOP) {
      break;
    }

    window.scrollBy(0, Math.floor(window.innerHeight * 0.9));
    await sleep(PAUSE_MS);
  }

  // One final pass after loop ends.
  scan();

  const mapRows = [["alt", "name", "url"]];
  const urlRows = [["url"]];

  for (const [url, metadata] of byUrl.entries()) {
    mapRows.push([metadata.alt, metadata.name, url]);
    urlRows.push([url]);
  }

  downloadCsv("deviantart-wixmp-alt-map.csv", mapRows);
  downloadCsv("deviantart-wixmp-urls.csv", urlRows);

  console.log(`Done. Exported ${byUrl.size} unique wixmp URLs.`);
})();
