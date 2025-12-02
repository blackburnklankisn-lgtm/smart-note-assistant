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

    > **⚠️ 常见问题**：如果运行此命令后没有生成文件，或者报错，请**直接手动创建**这两个文件，内容如下：

    *   **手动创建 `tailwind.config.js`**:
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

    *   **手动创建 `postcss.config.js`**:
        ```javascript
        export default {
          plugins: {
            tailwindcss: {},
            autoprefixer: {},
          },
        }
        ```

2.  **引入样式**：
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
    *   **src/services/geminiService.ts**: 复制 `services/geminiService.ts` 的所有代码。

    > **注意**：如果代码中有红色波浪线报错，通常是因为依赖包没安装好，请重新执行第三步。

---

### 第六步：配置 API Key 与 环境变量

Vite 项目默认不支持直接使用 `process.env`，我们需要做一个简单的配置来适配代码。

1.  **创建 `.env` 文件**：
    在项目根目录（与 `package.json` 同级）新建一个名为 `.env` 的文件，填入你的 Key：
    ```env
    VITE_API_KEY=你的_Google_Gemini_API_Key_粘贴在这里
    ```

2.  **修改 `vite.config.ts`**：
    打开根目录下的 `vite.config.ts`，修改为以下内容。这一步非常重要，它能让代码中的 `process.env.API_KEY` 正常工作。

    ```typescript
    import { defineConfig, loadEnv } from 'vite'
    import react from '@vitejs/plugin-react'

    // https://vitejs.dev/config/
    export default defineConfig(({ mode }) => {
      const env = loadEnv(mode, process.cwd(), '');
      return {
        plugins: [react()],
        define: {
          'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
        },
      };
    })
    ```

---

### 第七步：启动项目 🚀

1.  回到终端，运行启动命令：
    ```bash
    npm run dev
    ```

2.  终端会显示一个地址，通常是 `http://localhost:5173/`。
3.  按住 `Ctrl` (或 Mac 上的 `Cmd`) 点击该链接，或在浏览器中直接访问。

🎉 **恭喜！你现在可以在本地使用智能笔记助手了！**

---

### 常见问题排查

*   **报错 `process is not defined`**: 请仔细检查**第六步**中 `vite.config.ts` 的配置是否完全一致。
*   **无法生成笔记**: 请检查 `.env` 文件中的 API Key 是否有效，以及是否开启了网络代理（国内用户通常需要代理才能访问 Google API）。
*   **样式混乱**: 请检查 `src/index.css` 是否正确引入了 `@tailwind` 指令。
