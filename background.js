const DEFAULT_URL = "https://inpost.pl/paczkomat-radziwillow-rwl01bapp-warszawska-paczkomaty-mazowieckie";
const DEFAULT_CODE = "RWL01BAPP";
const CACHE_KEY = "weather_cache";
const HISTORY_KEY = "weather_history";
const INTERVAL = 60;

function codeFromUrl(url) {
  const m = String(url || "").match(/([A-Z]{3}\d{2,}[A-Z0-9]*)/i);
  return m ? m[1].toUpperCase() : DEFAULT_CODE;
}

function number(v) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function normalize(j) {
  const sensors = j?.air_sensors || [];
  const sensorMap = {};
  sensors.forEach(s => {
    const parts = String(s).split(":");
    if (parts.length >= 2) {
      sensorMap[parts[0].toUpperCase()] = number(parts[1]);
    }
  });
  return {
    pm1: sensorMap.PM1 ?? null,
    pm25: sensorMap.PM25 ?? sensorMap.PM2_5 ?? null,
    pm4: sensorMap.PM4 ?? null,
    pm10: sensorMap.PM10 ?? null,
    no2: sensorMap.NO2 ?? null,
    o3: sensorMap.O3 ?? null,
    temperature: sensorMap.TEMPERATURE ?? null,
    pressure: sensorMap.PRESSURE ?? null,
    humidity: sensorMap.HUMIDITY ?? null
  };
}

async function scrapeLocation(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "text/html",
        "X-Requested-With": "XMLHttpRequest",
        "Origin": "https://inpost.pl"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    return extractAddress(html);
  } catch(e) {
    console.log("Błąd scrapowania adresu:", e.message);
    return { street: "", city: "", zip: "", description: "" };
  }
}

function extractAddress(html) {
  /*
    Pobieramy pełny opis Paczkomatu z:
    <meta name="description" content="...">
  */

  const metaMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i
  );

  if (metaMatch && metaMatch[1]) {
    const description = metaMatch[1]
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    return {
      street: "",
      city: "",
      zip: "",
      description: description
    };
  }

  /*
    Jeżeli atrybuty meta tagu są w odwrotnej kolejności:
    content="..." name="description"
  */
  const reversedMetaMatch = html.match(
    /<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i
  );

  if (reversedMetaMatch && reversedMetaMatch[1]) {
    const description = reversedMetaMatch[1]
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    return {
      street: "",
      city: "",
      zip: "",
      description: description
    };
  }

  /*
    Jeśli description nie zostanie znalezione, zostają dotychczasowe
    dane adresowe z JSON-LD lub tekstu strony.
  */
  const jsonLdMatch = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );

  if (jsonLdMatch) {
    try {
      const json = JSON.parse(jsonLdMatch[1]);

      const addr =
        json.address ||
        (
          json["@graph"] &&
          json["@graph"].find(function (item) {
            return item["@type"] === "Place";
          })
        )?.address;

      if (addr) {
        return {
          street: addr.streetAddress || "",
          city: addr.addressLocality || "",
          zip: addr.postalCode || "",
          description: ""
        };
      }
    } catch (error) {}
  }

  const text = html.replace(/<[^>]+>/g, " ");

  const addressMatch = text.match(
    /([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9\s]+)\s*,\s*([A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9\-\s]+)\s+([0-9]{2}-[0-9]{3})/
  );

  if (addressMatch) {
    return {
      street: addressMatch[1].trim(),
      city: addressMatch[2].trim(),
      zip: addressMatch[3].trim(),
      description: ""
    };
  }

  return {
    street: "",
    city: "",
    zip: "",
    description: ""
  };
}

async function fetchWeather() {
  const { paczkomat_url = DEFAULT_URL, paczkomat_code, paczkomat_point_id } = await chrome.storage.local.get(["paczkomat_url", "paczkomat_code", "paczkomat_point_id"]);
  const code = (paczkomat_code || codeFromUrl(paczkomat_url)).toUpperCase();
  const pointId = paczkomat_point_id;
  if (!pointId) throw new Error(`Brak pointId. Znajdź go w DevTools (F12) → Network → air_index_level.`);
  const endpoint = `https://inpost.pl/shipx-point-data/${pointId}/${encodeURIComponent(code)}/air_index_level`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest", "Origin": "https://inpost.pl" }
  });
  if (!response.ok) throw new Error(`InPost HTTP ${response.status}`);
  const json = await response.json();
  const data = normalize(json);
  const location = await scrapeLocation(paczkomat_url);
  const now = Date.now();
  const historyEntry = { ...data, ts: now };
  const prev = await chrome.storage.local.get(HISTORY_KEY);
  let history = prev[HISTORY_KEY] || [];
  const lastCode = prev.last_code || null;
  if (lastCode !== code) {
    history = [historyEntry];
  } else {
    history.push(historyEntry);
    history = history.slice(-24);
  }
  await chrome.storage.local.set({
    [CACHE_KEY]: { data, fetchedAt: now, url: paczkomat_url, code, pointId, location },
    [HISTORY_KEY]: history,
    last_code: code
  });
  return data;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "refresh") {
    fetchWeather().then(data => sendResponse({ ok: true, data })).catch(e => sendResponse({ ok: false, error: e.message }));
  }
  if (msg.action === "getCache") {
    Promise.all([
      chrome.storage.local.get(CACHE_KEY),
      chrome.storage.local.get(HISTORY_KEY)
    ]).then(([cache, hist]) => sendResponse({
      ok: true,
      cache: cache[CACHE_KEY] || null,
      history: hist[HISTORY_KEY] || []
    }));
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => chrome.alarms.create("hourly-refresh", { periodInMinutes: INTERVAL }));
chrome.runtime.onStartup.addListener(() => chrome.alarms.create("hourly-refresh", { periodInMinutes: INTERVAL }));
chrome.alarms.onAlarm.addListener(a => {
  if (a.name === "hourly-refresh") fetchWeather().catch(() => {});
});
