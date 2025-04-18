// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default ({ mode }) => {
    const env = loadEnv(mode, process.cwd())
    return defineConfig({
        plugins: [vue()],
        define: {
            __VUE_OPTIONS_API__: true,
            __VUE_PROD_DEVTOOLS__: false
        },
        server: {
            proxy: {
                '/healthz': {
                    target: env.VITE_SERVER_URL,
                    changeOrigin: true,
                    secure: true,
                }
            }
        }
    })
}
