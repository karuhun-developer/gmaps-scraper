import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { cors } from "hono/cors";
import gmapsRoute from "./routes/gmaps.js";

const app = new Hono();
const PORT = process.env.PORT || 3000;

// Global middleware
app.use("*", logger());
app.use("*", prettyJSON());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// Health check
app.get("/", (c) => {
  return c.json({
    name: "Google Maps Scraper API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      "POST /api/v1/gmaps": "Scrape Google Maps places",
      "GET /api/v1/gmaps/fields": "List available fields",
    },
    docs: {
      body: {
        query: "string (required) - Search keyword",
        total: "number (default 10, max 100) - Number of places to scrape",
        fields:
          'array (default ["name","address","phone","rating"]) - Data fields',
        maxReviews: "number (default 10) - Max reviews per place",
        scrollDelay: "number (default 800ms) - Delay between scrolls",
        scrollDistance: "number (default 400px) - Pixels per scroll",
        clickDelay: "number (default 300ms) - Delay after clicks",
        headless: "boolean (default false) - Run browser in headless mode",
      },
      availableFields: [
        "name",
        "category",
        "rating",
        "address",
        "phone",
        "website",
        "plusCode",
        "priceLevel",
        "hours",
        "coordinates",
        "reviews",
        "email",
        "menu",
        "accessibility",
        "serviceOptions",
        "highlights",
        "offerings",
        "foodOptions",
        "amenities",
        "crowd",
        "planning",
        "payments",
        "parking",
        "children",
        "pets",
      ],
      example: {
        query: "restoran padang jakarta",
        total: 5,
        fields: [
          "name",
          "address",
          "phone",
          "rating",
          "reviews",
          "serviceOptions",
          "accessibility",
        ],
        maxReviews: 10,
        scrollDelay: 800,
        scrollDistance: 400,
        clickDelay: 300,
      },
    },
  });
});

// API routes
app.route("/api/v1/gmaps", gmapsRoute);

// 404
app.notFound((c) => {
  return c.json({ success: false, error: "Route not found" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error("[Server Error]", err);
  return c.json(
    { success: false, error: err.message || "Internal server error" },
    500,
  );
});

// Start server
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║         Google Maps Scraper API v1.0.0           ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Server running at: http://localhost:${PORT}         ║`);
  console.log("║                                                   ║");
  console.log("║  Endpoints:                                       ║");
  console.log(`║    GET  http://localhost:${PORT}/                  ║`);
  console.log(`║    POST http://localhost:${PORT}/api/v1/gmaps      ║`);
  console.log(`║    GET  http://localhost:${PORT}/api/v1/gmaps/fields ║`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log("Example cURL:");
  console.log(`curl -X POST http://localhost:${PORT}/api/v1/gmaps \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(
    `  -d '{"query":"restoran padang jakarta","total":3,"fields":["name","address","phone","rating","reviews"],"maxReviews":5}'`,
  );
  console.log("");
});
