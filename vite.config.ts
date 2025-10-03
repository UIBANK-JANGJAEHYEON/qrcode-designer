import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: './', // 빌드 후 상대 경로로 접근
  root: "src", // index.html 위치
  plugins: [react()],
  publicDir: "public", // 정적 자원
  build: {
    outDir: "../dist", // 빌드 결과
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
