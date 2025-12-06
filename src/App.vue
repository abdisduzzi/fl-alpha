<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* GLOBAL RESET & DARK THEME */
:root {
  --bg-color: #000000;
  --card-bg: #111111;
  --text-primary: #ffffff;
  --text-secondary: #aaaaaa;
  --accent: #ffffff;
  --accent-text: #000000;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--bg-color);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}

/* Transisi halus untuk semua elemen */
* {
  box-sizing: border-box;
  transition: background-color 0.3s ease, color 0.3s ease, transform 0.2s ease;
}
</style>