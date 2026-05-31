# 🗺️ Google Maps Scraper API

REST API untuk scraping data Google Maps menggunakan **Playwright** + **Hono**, dengan human-like behavior untuk menghindari deteksi bot.

## Stack

- **[Hono](https://hono.dev/)** — Web framework ultra-cepat untuk Node.js
- **[Playwright](https://playwright.dev/)** — Browser automation (Chromium)
- **Anti-bot** — User-agent spoofing, random delays, human-like mouse movement, stealth mode

---

## Instalasi

```bash
npm install
npx playwright install chromium
npm start
```

Server berjalan di `http://localhost:3000`

---

## Endpoints

### `GET /`
Info API + contoh penggunaan

### `POST /api/v1/gmaps`
Scrape data tempat dari Google Maps

**Request Body:**

| Field | Type | Default | Deskripsi |
|-------|------|---------|-----------|
| `query` | `string` | **required** | Kata kunci pencarian |
| `total` | `number` | `10` | Jumlah tempat yang di-scrape (max 100) |
| `fields` | `string[]` | `["name","address","phone","rating"]` | Field yang ingin diambil |
| `maxReviews` | `number` | `10` | Jumlah ulasan per tempat |
| `scrollDelay` | `number` | `800` | Delay antar scroll (ms) |
| `scrollDistance` | `number` | `400` | Jarak scroll per langkah (px) |
| `clickDelay` | `number` | `300` | Delay setelah klik (ms) |
| `headless` | `boolean` | `false` | Mode headless browser |

**Available Fields:**

| Field | Deskripsi |
|-------|-----------|
| `name` | Nama bisnis |
| `category` | Kategori/jenis usaha |
| `rating` | Rating bintang rata-rata |
| `address` | Alamat lengkap |
| `phone` | Nomor telepon |
| `website` | URL website |
| `plusCode` | Google Plus Code |
| `priceLevel` | Level harga ($, $$, $$$) |
| `hours` | Jam buka per hari |
| `coordinates` | Latitude & longitude |
| `reviews` | N ulasan terbaru (text, rating, tanggal, penulis) |
| `email` | Email dari website (lambat, perlu `website`) |
| `menu` | Item menu atau link menu eksternal |
| `serviceOptions` | Dine-in, Takeout, Delivery, dll |
| `accessibility` | Akses kursi roda, parkir, dll |
| `highlights` | Keunggulan/fasilitas |
| `offerings` | Penawaran (alkohol, kopi, dll) |
| `foodOptions` | Pilihan makanan (vegetarian, halal, dll) |
| `amenities` | Fasilitas tambahan |
| `crowd` | Tipe suasana/keramaian |
| `planning` | Reservasi, LGBTQ+ friendly, dll |
| `payments` | Metode pembayaran |
| `parking` | Opsi parkir |
| `children` | Ramah anak |
| `pets` | Kebijakan hewan peliharaan |

### `GET /api/v1/gmaps/fields`
Daftar semua field yang tersedia beserta deskripsinya

---

## Contoh Penggunaan

### Basic (nama, alamat, telepon, rating)
```bash
curl -X POST http://localhost:3000/api/v1/gmaps \
  -H "Content-Type: application/json" \
  -d '{
    "query": "restoran padang jakarta",
    "total": 5,
    "fields": ["name", "address", "phone", "rating"]
  }'
```

### Lengkap (semua field)
```bash
curl -X POST http://localhost:3000/api/v1/gmaps \
  -H "Content-Type: application/json" \
  -d '{
    "query": "kafe jakarta selatan",
    "total": 3,
    "fields": [
      "name", "category", "rating", "address", "phone", "website",
      "priceLevel", "hours", "coordinates", "reviews",
      "serviceOptions", "accessibility", "highlights",
      "offerings", "foodOptions", "menu"
    ],
    "maxReviews": 10,
    "scrollDelay": 1000,
    "scrollDistance": 400,
    "clickDelay": 400
  }'
```

### Headless mode (lebih cepat, tidak ada jendela browser)
```bash
curl -X POST http://localhost:3000/api/v1/gmaps \
  -H "Content-Type: application/json" \
  -d '{
    "query": "hotel bintang 5 bali",
    "total": 10,
    "fields": ["name", "rating", "address", "phone", "website", "reviews"],
    "maxReviews": 5,
    "headless": true
  }'
```

---

## Contoh Response

```json
{
  "success": true,
  "meta": {
    "query": "restoran padang jakarta",
    "requested": 5,
    "scraped": 5,
    "fields": ["name", "address", "phone", "rating"],
    "startedAt": "2026-01-01T10:00:00.000Z",
    "finishedAt": "2026-01-01T10:02:30.000Z",
    "durationSeconds": 150.25,
    "scrapeOptions": {
      "scrollDelay": 800,
      "scrollDistance": 400,
      "clickDelay": 300,
      "headless": false
    }
  },
  "data": [
    {
      "name": "Restoran Padang Sederhana",
      "rating": "4.5",
      "reviewCount": "1,234",
      "address": "Jl. Sudirman No. 1, Jakarta Pusat",
      "phone": "+62 21 1234 5678",
      "url": "https://www.google.com/maps/place/..."
    }
  ]
}
```

---

## Anti-Bot Features

- ✅ **User-Agent spoofing** (Chrome 148 Windows 10)
- ✅ **Random typing delays** (50-150ms per karakter)
- ✅ **Human-like mouse movement** ke elemen sebelum klik
- ✅ **Random scroll behavior** dengan jitter
- ✅ **Configurable scroll delay & distance**
- ✅ **Stealth mode** (disable webdriver detection, canvas fingerprint noise)
- ✅ **Random pauses** antar aksi
- ✅ **Locale & timezone** Indonesia
- ✅ **Geolocation** Jakarta

---

## Struktur Proyek

```
src/
├── index.js              # Hono server entry point
├── routes/
│   └── gmaps.js          # API route handlers
└── scraper/
    ├── gmaps.js           # Main scraper logic
    ├── helpers.js         # Human-like behavior utilities
    └── selectors.js       # Google Maps CSS selectors
```

---

## Tips

- Untuk performa lebih baik, set `headless: true` di production
- Semakin banyak `fields` → semakin lama waktu scraping
- Field `email` paling lambat karena perlu visit website
- Gunakan `scrollDelay` lebih besar (1000-1500ms) kalau sering kena rate limit
- Google Maps sering update UI, update `selectors.js` jika ada yang tidak berfungsi
