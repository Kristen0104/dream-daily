import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        open: true,
        proxy: {
            '/api/coding': {
                target: 'https://ark.cn-beijing.volces.com',
                changeOrigin: true,
                secure: true
            },
            '/api/images': {
                target: 'https://ark.cn-beijing.volces.com',
                changeOrigin: true,
                secure: true,
                rewrite: function (path) { return path.replace(/^\/api\/images/, '/api/v3'); }
            },
            '/api/dreams': {
                target: 'http://localhost:3001',
                changeOrigin: true
            },
            '/api/user': {
                target: 'http://localhost:3001',
                changeOrigin: true
            }
        }
    }
});
