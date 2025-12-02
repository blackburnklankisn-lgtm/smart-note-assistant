# 智能笔记助手 (Smart Note Assistant)

这是一个基于 Google Gemini 2.5 模型的智能知识管理工具。它能够将碎片化的文本、图片和 PDF 文档转化为结构清晰、逻辑严密的专业笔记。

## ✨ 核心功能

*   **多模态解析**：支持识别图片中的文字/图表，以及阅读 PDF 文档内容。
*   **智能重组**：自动纠正语病，将附件信息与文本逻辑深度融合。
*   **结构化输出**：自动生成摘要、关键要点、知识扩展（AI Note）和行动建议。
*   **富文本编辑**：支持 Markdown 渲染、字体调节、颜色高亮及拖拽调整布局。
*   **本地存储**：笔记数据自动保存至浏览器本地存储 (LocalStorage)。

---

## 🚀 本地部署安装指南

要在本地电脑上运行此项目，推荐使用 **Vite** 进行构建。请按照以下步骤操作：

### 1. 环境准备

确保你的电脑已安装以下软件：
*   **Node.js** (推荐 v18 或更高版本) - [下载地址](https://nodejs.org/)
*   **npm** (通常随 Node.js 一起安装)

### 2. 获取 Google Gemini API Key

本项目依赖 Google Gemini API。
1. 访问 [Google AI Studio](https://aistudiocdn.com/google-ai-studio).
2. 点击 "Get API key"。
3. 创建一个新的 API Key 并复制保存，后续步骤会用到。

### 3. 初始化项目

打开终端（Terminal 或 CMD），执行以下命令创建一个新的 Vite React TypeScript 项目：

```bash
# 创建项目文件夹 (例如命名为 smart-note)
npm create vite@latest smart-note -- --template react-ts

# 进入项目目录
cd smart-note

# 安装基础依赖
npm install
```

### 4. 安装项目依赖库

根据项目代码，安装所需的第三方库：

```bash
npm install lucide-react @google/genai react-markdown uuid
npm install -D tailwindcss postcss autoprefixer
```

### 5. 配置 Tailwind CSS

初始化 Tailwind 配置：

```bash
npx tailwindcss init -p
```

修改 `tailwind.config.js` 文件，配置内容路径和字体：

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // 如果需要排版插件
  ],
}
```
*注意：需要在 `index.css` 中引入 Tailwind 指令：*
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 6. 迁移代码文件

将提供的代码文件复制到 `src` 目录中相应的结构下：

*   `App.tsx` -> `src/App.tsx`
*   `types.ts` -> `src/types.ts`
*   `services/` -> `src/services/`
*   `components/` -> `src/components/`

### 7. 配置环境变量 (API Key)

在项目根目录下创建一个名为 `.env` 的文件，并添加你的 API Key：

```env
VITE_API_KEY=你的_GOOGLE_GEMINI_API_KEY_粘贴在这里
```

**⚠️ 重要代码调整：**
由于 Vite 在浏览器端使用的是 `import.meta.env` 而不是 `process.env`，你需要修改 `src/services/geminiService.ts` 文件：

**原代码：**
```typescript
if (!process.env.API_KEY) { ... }
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

**修改为：**
```typescript
const apiKey = import.meta.env.VITE_API_KEY; // Vite 标准方式
if (!apiKey) {
    throw new Error("API Key is missing. Please check .env file.");
}
const ai = new GoogleGenAI({ apiKey: apiKey });
```

### 8. 启动项目

一切准备就绪后，启动本地开发服务器：

```bash
npm run dev
```

终端会显示一个本地访问地址（通常是 `http://localhost:5173`），在浏览器中打开该地址即可使用智能笔记助手。

---

## 🛠️ 常见问题排查

**Q: 提示 "API Key is missing"？**
A: 请确保你创建了 `.env` 文件，并且变量名是以 `VITE_` 开头（例如 `VITE_API_KEY`），并按照第 7 步修改了代码中的调用方式。修改 `.env` 后需要重启终端。

**Q: 样式显示不正常？**
A: 请检查 `tailwind.config.js` 中的 `content` 路径是否包含了你的 `.tsx` 文件路径，以及是否在 `src/index.css` 中引入了 Tailwind 指令。

**Q: 无法识别 PDF 或图片？**
A: 请确保网络连接正常，因为解析多模态内容需要上传数据到 Google Gemini API 服务器。

## 📜 版权信息

本项目仅供学习和个人使用。使用 Google Gemini API 请遵循相关的服务条款和使用限制。
