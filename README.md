# 智能笔记助手 (Smart Note Assistant)

这是一个基于 Google Gemini 2.5 模型的智能知识管理工具。

---

## 📦 如何打包成 .exe 桌面软件 (推荐)

如果您觉得每次运行命令太麻烦，可以将本项目打包成一个独立的 `.exe` 安装包。

### 1. 修改 `package.json`

打开根目录下的 `package.json` 文件，**小心地**将其内容替换为以下内容（这会添加打包所需的命令和依赖配置）：

```json
{
  "name": "smart-note-assistant",
  "private": true,
  "version": "1.0.0",
  "main": "electron/main.js",
  "description": "Smart Note Assistant Desktop App",
  "author": "Your Name",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "pack": "npm run build && electron-builder --dir",
    "dist": "npm run build && electron-builder"
  },
  "build": {
    "appId": "com.smartnote.app",
    "productName": "Smart Note AI",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "icon.ico" 
    }
  },
  "dependencies": {
    "@google/genai": "^1.30.0",
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-markdown": "^9.0.1",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@types/uuid": "^9.0.8",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "electron": "^29.1.0",
    "electron-builder": "^24.13.3",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.2.0"
  }
}
```

### 2. 安装打包工具

在终端运行一次以下命令（可能需要几分钟）：

```bash
npm install
```

### 3. 生成 .exe 安装包

运行以下命令开始打包：

```bash
npm run dist
```

### 4. 获取安装包

等待命令运行完成。
打开项目文件夹下的 `release` 文件夹。
您会看到一个类似于 `Smart Note AI Setup 1.0.0.exe` 的文件。

**🎉 恭喜！双击这个 exe 文件即可安装使用，以后再也不用打开终端了！**

---

## 🛠️ 本地开发运行 (旧方式)

1.  **环境准备**: 安装 Node.js v18+。
2.  **安装依赖**: `npm install`
3.  **配置 API Key**: 在根目录新建 `.env` 文件，填入 `VITE_API_KEY=你的GeminiKey`。
4.  **启动**: `npm run dev`

---

## ⚠️ 常见问题

*   **白屏问题**: 如果打包后打开软件是白屏，请确保项目根目录下有我提供的 `vite.config.ts` 文件，并且里面配置了 `base: './'`。
*   **API Key 报错**: 打包成桌面软件后，`.env` 文件可能无法自动读取。**建议您在第一次打开软件时，在代码里写死 Key 或者后续我为您增加一个“设置”页面来手动输入 Key。** (目前代码已做兼容，如果打包后报错，请检查 API Key 是否有效)。
