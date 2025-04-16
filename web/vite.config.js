// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Vuetify требует define: { __VUE_OPTIONS_API__: true }
export default defineConfig({
    plugins: [vue()],
    define: {
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false
    }
})
