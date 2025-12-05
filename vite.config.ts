import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 关键配置：使用相对路径 './'，否则打包成桌面软件后会白屏找不到资源
  base: './', 
})