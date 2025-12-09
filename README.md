# 智能笔记助手 (Smart Note Assistant)

这是一个基于 Google Gemini 2.5 模型的智能知识管理工具，具备 AutoSAR 专家模式、文档深度解析以及智能周报总结功能。

---

## 🚀 极速部署指南 (本地 Windows/Mac)

### 1. 准备环境
确保电脑已安装 [Node.js](https://nodejs.org/) (建议版本 v18 或更高)。

### 2. 下载与配置
将所有代码文件放入一个文件夹中，确保结构如下：
```text
/MySmartNote
  ├── electron/
  │    ├── main.js
  │    └── icon.png  <-- (重要) 请找一个 png 图片放这里作为图标，否则打包可能报错
  ├── src/
  ├── package.json   <-- (确保此文件存在)
  ├── vite.config.ts
  └── ...其他文件
```

### 3. 安装依赖
在文件夹根目录下打开终端 (CMD 或 PowerShell)，运行：

```bash
npm install
```

### 4. 打包软件
运行以下命令生成 `.exe` 安装包：

```bash
npm run dist
```

打包完成后，打开项目目录下的 `release` 文件夹，双击安装包即可安装使用。

---

## ✨ 功能特性

### 📝 智能笔记生成
*   **AutoSAR 专家模式**: 深度分析汽车电子架构、标准 (ISO26262/AutoSAR) 及 Log 问题。
*   **NotebookLM 模式**: 严格基于上传文档进行回答，杜绝 AI 幻觉。
*   **通用模式**: 格式化整理日常会议记录或学习笔记。

### 📅 Weekly Summary (智能周报)
*   **一键生成**: 点击侧边栏 "Weekly Summary" 按钮，自动汇总本周 (周一至周五) 的所有笔记。
*   **自动触发**: 如果软件在后台运行，每周五下午 5:00 自动生成周报。
*   **极简风格**: 自动剔除 AI 生成的历史内容，仅提取用户原始输入，生成高度提炼的 Executive Summary。

### 💾 数据安全
*   所有笔记数据存储在本地 (LocalStorage)。
*   API Key 存储在本地浏览器环境中，不会上传到任何中间服务器。

---

## ⚠️ 常见问题

*   **API Key**: 首次运行时，请点击侧边栏底部的 **Settings** 按钮，输入您的 Google Gemini API Key。
*   **图标缺失**: 如果打包时提示图标错误，请确保 `electron/icon.png` 文件存在且尺寸建议为 256x256 或 512x512。
*   **白屏**: 确保 `vite.config.ts` 中包含 `base: './'` 配置 (已默认配置)。
