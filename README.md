# 智能笔记助手 (Smart Note Assistant)

这是一个基于 Google Gemini 2.5 模型的智能知识管理工具。它能够将碎片化的文本、图片和 PDF 文档转化为结构清晰、逻辑严密的专业笔记。

---

## 🛠️ 本地部署安装指南 (保姆级教程)

本教程将指导您如何在本地 Windows/Mac 电脑上，使用 **Vite + React + TypeScript** 搭建并运行本项目。

### 第一步：环境准备

1.  **安装 Node.js**:
    *   访问 [Node.js 官网](https://nodejs.org/) 下载并安装 **LTS 版本** (推荐 v18 或更高)。
    *   安装完成后，打开终端 (Terminal 或 CMD)，输入 `node -v` 检查是否安装成功。

2.  **准备代码编辑器**:
    *   推荐使用 [VS Code](https://code.visualstudio.com/)。

3.  **获取 Google Gemini API Key**:
    *   访问 [Google AI Studio](https://aistudiocdn.com/google-ai-studio) 获取免费的 API Key。

---

### 第二步：创建项目基础框架

在电脑上选择一个文件夹，打开终端，依次执行以下命令：

```bash
# 1. 创建一个名为 smart-note 的新项目 (选择 React 和 TypeScript)
npm create vite@latest smart-note -- --template react-ts

# 2. 进入项目目录
cd smart-note

# 3. 安装基础依赖
npm install
```

---

### 第三步：安装项目所需插件

复制以下命令在终端中运行，安装本项目需要的所有第三方库：

```bash
# 安装核心功能库
npm install lucide-react @google/genai react-markdown uuid

# 安装 TypeScript 类型定义 (防止报错)
npm install -D @types/uuid @types/node

# 安装 TailwindCSS 样式库及排版插件
npm install -D tailwindcss postcss autoprefixer @tailwindcss/typography
```

---

### 第四步：配置样式 (Tailwind CSS)

1.  **初始化配置**：
    在终端运行：
    ```bash
    npx tailwindcss init -p
    ```
    这会生成 `tailwind.config.js` 和 `postcss.config.js` 文件。

2.  **修改 `tailwind.config.js`**：
    用编辑器打开该文件，**完全替换** 为以下内容：

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
        },
      },
      plugins: [
        require('@tailwindcss/typography'),
      ],
    }
    ```

3.  **引入样式**：
    打开 `src/index.css`，**清空原有内容**，填入以下代码：

    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;

    /* 自定义滚动条样式 */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: #f1f5f9; 
    }
    ::-webkit-scrollbar-thumb {
      background: #cbd5e1; 
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #94a3b8; 
    }
    ```

---

### 第五步：迁移源代码 (最关键的一步)

请按照以下结构将本项目提供的代码复制到 `src` 文件夹中。

1.  **清理默认文件**：
    *   删除 `src/App.css` (如果存在)。
    *   你可以保留 `src/main.tsx` (Vite 默认入口)，不要使用本项目提供的 `index.tsx`。

2.  **创建文件结构**：
    在 `src` 目录下新建 `components` 和 `services` 文件夹。

3.  **复制文件内容**：

    *   **src/types.ts**: 复制 `types.ts` 的所有代码。
    *   **src/App.tsx**: 复制 `App.tsx` 的所有代码。
    *   **src/components/InputSection.tsx**: 复制 `components/InputSection.tsx` 的所有代码。
    *   **src/components/NoteDisplay.tsx**: 复制 `components/NoteDisplay.tsx` 的所有代码。
    *   **src/services/storageService.ts**: 复制 `services/storageService.ts` 的所有代码。
    *   **src/services/geminiService.ts**: 复制 `services/geminiService.ts` 的代码。**注意：需要修改此文件，详见下一步！**

4.  **修改 `index.html`**：
    打开项目根目录下的 `index.html`，在 `<head>` 标签内添加字体链接：
    ```html
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    ```

---

### 第六步：修改代码以适配本地环境 (必读)

本项目原始代码是为特定在线环境编写的，在本地 Vite 运行需要修改两个地方：

**1. 修改 API Key 调用方式**
打开 **`src/services/geminiService.ts`**，找到以下代码：

```typescript
// ❌ 原始代码 (本地运行会报错 process is not defined)
if (!process.env.API_KEY) { ... }
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

**✅ 修改为：**

```typescript
// 使用 Vite 特有的环境变量方式
const apiKey = import.meta.env.VITE_API_KEY;

if (!apiKey) {
  throw new Error("API Key is missing. Please check .env file.");
}

const ai = new GoogleGenAI({ apiKey: apiKey });
```

**2. 确保入口文件正确**
确保你的 `src/main.tsx` (或 `src/index.tsx`) 正常引入了 `App`。通常 Vite 默认生成的 `main.tsx` 如下，无需大改：

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // 注意这里可能需要加 .tsx 后缀
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

---

### 第七步：配置 API Key

1.  在项目根目录（与 `package.json` 同级）创建一个名为 `.env` 的文件。
2.  在文件中输入你的 API Key：

```env
VITE_API_KEY=AIzaSy...这里粘贴你的真实Key...
```

*注意：变量名必须以 `VITE_` 开头，否则 Vite 无法读取。*

---

### 第八步：启动运行

1.  在终端输入：
    ```bash
    npm run dev
    ```
2.  终端会显示类似 `Local: http://localhost:5173/` 的地址。
3.  按住 `Ctrl` 点击链接，或在浏览器手动输入该地址。

**恭喜！如果一切顺利，你现在应该可以在本地使用智能笔记助手了。**

---

### 常见报错排查

*   **报错：`process is not defined`**
    *   原因：未完成第六步的第1点修改。浏览器环境没有 `process` 对象。
    *   解决：去 `src/services/geminiService.ts` 把 `process.env.API_KEY` 改为 `import.meta.env.VITE_API_KEY`。

*   **报错：`API Key is missing`**
    *   原因：`.env` 文件没创建，或者变量名没加 `VITE_` 前缀。
    *   解决：检查 `.env` 文件，确保写的是 `VITE_API_KEY=...`，修改后**重启终端**再次运行 `npm run dev`。

*   **样式乱码/不显示**
    *   原因：Tailwind 配置不正确。
    *   解决：检查 `tailwind.config.js` 的 `content` 是否包含 `src` 目录；检查 `src/index.css` 是否引入了 `@tailwind` 指令。
