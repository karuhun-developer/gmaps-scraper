module.exports = {
  apps: [
    {
      name: "gmap-scraper",
      script: "./src/index.js",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
