/**
 * Google Maps Selectors
 * Centralized for easy maintenance when Google updates their DOM
 */

export const SELECTORS = {
  // Search
  searchBox: "input#searchboxinput",
  searchButton: "button#searchbox-searchbutton",

  // Results panel
  resultsPanel: 'div[role="feed"]',
  resultItem: 'div[role="feed"] div.Nv2PK',

  // Place detail panel
  placePanel: 'div[role="main"]',

  // Basic info
  placeName: "h1.DUwDvf",
  placeCategory: "button.DkEaL",
  placeRating: 'div.F7nice span[aria-hidden="true"]',
  placeReviewCount:
    'div.F7nice span[aria-label*="ulasan"], div.F7nice span[aria-label*="review"]',
  placeAddress: 'button[data-item-id="address"] div.Io6YTe',
  placePhone: 'button[data-item-id^="phone"] div.Io6YTe',
  placeWebsite: 'a[data-item-id="authority"] div.Io6YTe',
  placePlusCode: 'button[data-item-id="oloc"] div.Io6YTe',

  // Hours
  hoursButton:
    'div[data-hide-tooltip-on-mouse-move] button[jsaction*="pane.openhours"]',
  hoursTable: "table.eK4R0e",
  hoursRow: "table.eK4R0e tr",

  // About section tabs
  aboutTab: 'button[aria-label*="Tentang"], button[aria-label*="About"]',
  reviewsTab: 'button[aria-label*="Ulasan"], button[aria-label*="Reviews"]',
  menuTab: 'button[aria-label*="Menu"]',

  // About section content
  aboutSection: 'div.m6QErb[data-tab-index="1"]',

  // Service options, accessibility, etc. in About tab
  aboutFeatureSection: "div.eLqde",
  aboutFeatureTitle: "h2.iL3Qke",
  aboutFeatureItem: "li.hpLkke",
  aboutFeatureItemLabel: "span.fontBodyMedium",

  // Reviews section
  reviewsSection: 'div[data-tab-index="0"]',
  reviewsContainer: "div.m6QErb.DxyBCb",
  reviewItem: "div[data-review-id]",
  reviewAuthor: "div.d4r55",
  reviewText: "span.wiI7pd",
  reviewRating: 'span[aria-label*="bintang"], span[aria-label*="star"]',
  reviewDate: "span.rsqaWe",
  reviewMoreButton:
    'button[aria-label="Selengkapnya"], button[aria-label*="More"]',

  // Sort reviews
  reviewSortButton:
    'button[data-value*="sort"], button[aria-label*="Urutkan"], button[aria-label*="Sort"]',

  // Photos
  photoSection: "div.KKx0fc",
  photoCount: "div.YkuOqf",

  // Price level
  priceLevel: 'span[aria-label*="Harga:"], span[aria-label*="Price:"]',

  // Popular times
  popularTimesSection: "div.y0skZc",

  // Menu section
  menuSection: "div.WbznCd",
  menuItem: "li.qjESne",
  menuItemName: "div.WV7iEb",
  menuItemPrice: "div.GkFnEb",
  menuItemDescription: "div.HlvSq",

  // Amenities / Highlights sections
  highlightsSection:
    'div[aria-label*="Keunggulan"], div[aria-label*="Highlights"]',
};

export const FIELD_LABELS = {
  // Service options
  serviceOptions: [
    "Dine-in",
    "Takeout",
    "Delivery",
    "Drive-through",
    "Curbside pickup",
    "No-contact delivery",
    "Dine in",
    "Layanan pesan-antar",
    "Makan di tempat",
    "Bawa pulang",
    "Pesan antar",
    "Antar ke mobil",
    "Tidak kontak saat pengiriman",
  ],

  // Accessibility
  accessibility: [
    "Tempat parkir",
    "Parkir",
    "Akses kursi roda",
    "Parkir kursi roda",
    "Toilet kursi roda",
    "Tempat duduk kursi roda",
    "Wheelchair-accessible",
    "Wheelchair accessible",
    "Accessible parking",
    "Accessible entrance",
    "Accessible restroom",
    "Accessible seating",
    "Aksesibilitas",
  ],

  // Highlights / Amenities
  highlights: [
    "Tempat ramai",
    "Cocok untuk",
    "Suasana",
    "Layanan",
    "Pembayaran",
    "Perencanaan",
    "Untuk anak",
    "Keunggulan",
    "Live music",
    "Musik langsung",
    "Ramah anak",
    "Cocok untuk grup",
    "Ramah hewan peliharaan",
    "Parkir gratis",
  ],

  // Food options
  foodOptions: [
    "Makanan",
    "Menu",
    "Pilihan makanan",
    "Vegetarian",
    "Vegan",
    "Halal",
    "Junk food",
    "Dessert",
    "Minuman",
    "Sarapan",
    "Makan siang",
    "Makan malam",
    "Pilihan sehat",
  ],

  // Offerings
  offerings: [
    "Penawaran",
    "Offering",
    "Alkohol",
    "Bir",
    "Koktail",
    "Kopi",
    "Teh",
    "Minuman beralkohol",
    "Happy hour",
    "Pemesanan meja",
  ],
};
