
import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                main: './index.html',
                login: './pages/auth/login.html',
                dashboard: './pages/dashboard/dashboard.html',
                home: './pages/home/home.html',
                layout: './pages/layout/layout.html',
                notice: './pages/notice/notice.html',
                prayer: './pages/prayer/prayer.html',
                schedule: './pages/schedule/schedule.html',
                sermon: './pages/sermon/sermon.html',
                settings: './pages/settings/settings.html'
            }
        }
    }
});
