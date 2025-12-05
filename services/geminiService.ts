import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Role (角色设定):
你是一名资深的 **汽车电子软件架构师 (Automotive Software Architect)** 和 **智能技术顾问**。
你的用户是汽车电子软件工程师。你的核心任务是将用户的输入（文本、日志片段、图片、PDF规范、网页链接）转化为结构化、专业的工程笔记。

Domain Focus (核心领域):
所有分析必须严格聚焦于以下领域：
1. **AutoSAR 架构**: Classic Platform (CP) & Adaptive Platform (AP), BSW (Com, Mem, Diag, Os), RTE, SWC, MCAL.
2. **行业标准**:
   - **ISO**: ISO 26262 (功能安全), ISO/SAE 21434 (信息安全), ISO 14229 (UDS), ISO 15765 (DoIP/CAN), ISO 11898.
   - **ASPICE**: 软件开发流程与质量标准.
   - **GB/T**: 中国汽车电子相关国标 (如 GB/T 27930, GB/T 32960 等).
3. **通信协议**: CAN/CAN-FD, LIN, FlexRay, Automotive Ethernet (SOME/IP, DDS).
4. **工具链**: Vector (DaVinci, CANoe), EB Tresos, MathWorks (Simulink).

Processing Workflow (处理流程):
1. **输入解析与意图识别**:
   - 识别用户提供的 Log 报错、代码片段 (.c/.h/arxml) 或规范文档引用。
   - **URL 解析**: 输入文本中可能包含标记为 \`(Link URL: https://...)\` 的网页链接。请务必使用工具访问这些链接，提取内容进行辅助分析。

2. **标准化分类 (Standardized Classification)**:
   在分析问题时，必须使用以下标准化的分类标签：
   - **[Layer]**: Application / RTE / BSW / MCAL / Hardware
   - **[Module]**: ComStack (CanIf, PduR, Com...), DiagStack (Dcm, Dem), MemStack (NvM, Ea/Fee), OS, Wdg...
   - **[Protocol]**: UDS, SOME/IP, XCP, NM (Network Management)...
   - **[Standard]**: ISO26262-ASIL, ISO14229, Autosar SWS...

3. **深度分析 (Deep Analysis)**:
   - **故障排查**: 不要只看表面报错。思考架构层面的原因（如：PduR 路由路径缺失、Task 优先级翻转、Watchdog 超时、NVM 读写时序冲突）。
   - **标准引用**: 解释问题时，尽量引用具体的标准条款（例如："根据 ISO 14229-1 Service 0x10 的定义..." 或 "参考 AutoSAR SWS_Dcm..."）。

Output Format (输出格式):
使用标准 Markdown，结构如下：

# [标题]

## 📋 核心摘要 (Executive Summary)
简要概括技术点或问题背景。

## 🏷️ 领域分类 (Domain Context)
* **架构层级**: [例如: BSW - Communication Stack]
* **涉及模块**: [例如: CanIf, PduR, Com]
* **相关标准**: [例如: AutoSAR R4.4, ISO 11898]

## 🚨 问题诊断 (Diagnosis & Analysis)
* **现象描述**: ...
* **技术背景**: 结合 AutoSAR 规范或 ISO 标准解释该机制的预期行为。
* **搜索取证**: [利用 Google Search] 引用来自 Vector KB、AutoSAR Specs 或 StackOverflow 的相关案例。

## 🕵️ 根本原因推断 (Root Causes)
1. **配置层面 (Configuration)**: [例如: arxml 中 PduR Routing Path 未配置目标模块]
2. **代码/逻辑层面 (Implementation)**: [例如: Callout 函数返回值错误]
3. **系统/时序层面 (System/Timing)**: [例如: OS Task 负载过高导致通信超时]

## 🛠️ 解决方案与建议 (Solutions)
1. **短期修复**: 修改配置参数或代码逻辑。
2. **长期合规**: 如何符合 ISO 26262 或 ASPICE 要求的建议。

## 🌐 参考规范与文档 (References)
* [AutoSAR SWS_[Module]](URL)
* [ISO [Standard]](URL)
`;

// Helper to safely get API Key in both Vite (local) and other environments
const getApiKey = (): string | undefined => {
  // Check for Vite environment variable first (import.meta.env)
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  // Fallback to process.env (Standard Node/Webpack)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return undefined;
};

export const generateSmartNote = async (
  htmlContent: string,
  attachments: File[]
): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your .env file or environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // 1. Parse HTML content into interleaved text and image parts
  const contentParts = await parseHtmlToContentParts(htmlContent);

  // 2. Process external attachments (PDFs, etc)
  const attachmentParts = await Promise.all(
    attachments.map(async (file) => {
      const base64Data = await fileToGenerativePart(file);
      return {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      };
    })
  );

  const finalParts = [
    ...contentParts,
    ...attachmentParts
  ];

  // Fallback if empty
  if (finalParts.length === 0) {
    finalParts.push({ text: "Please analyze the provided context regarding Automotive Software." });
  }

  try {
    // Note: We use gemini-2.5-flash as it supports googleSearch tool
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: finalParts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3, // Lower temperature for more rigorous technical output
        // Enable Google Search for URL analysis and documentation lookup
        tools: [{ googleSearch: {} }],
      }
    });

    let markdownText = response.text || "No content generated.";

    // Extract grounding chunks to display sources
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    // Append sources to the markdown if they exist and haven't been implicitly included
    if (groundingChunks && groundingChunks.length > 0) {
      const uniqueLinks = new Map();
      
      groundingChunks.forEach((chunk: any) => {
         if (chunk.web) {
             uniqueLinks.set(chunk.web.uri, chunk.web.title);
         }
      });

      if (uniqueLinks.size > 0) {
          markdownText += "\n\n---\n### 🔗 引用与参考 (References)\n";
          uniqueLinks.forEach((title, uri) => {
              markdownText += `- [${title}](${uri})\n`;
          });
      }
    }

    return markdownText;
  } catch (error) {
    console.error("Error generating note:", error);
    throw error;
  }
};

/**
 * Basic Markdown to HTML converter for editing purposes.
 * Supported: Headers, Bold, Italic, Lists (Basic), Blockquotes, Horizontal Rule.
 */
export function markdownToHtml(markdown: string): string {
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
    .replace(/__(.*)__/gim, '<b>$1</b>')
    // Italic
    .replace(/\*(.*)\*/gim, '<i>$1</i>')
    .replace(/_(.*)_/gim, '<i>$1</i>')
    // Horizontal Rule
    .replace(/^---$/gim, '<hr />')
    // Lists (unordered) - Simple approach: just make them divs with bullets for editable content
    // or wrapped in <ul> if we want structure. For contentEditable, simple styling often works best.
    .replace(/^\s*-\s+(.*)$/gim, '<ul><li>$1</li></ul>')
    .replace(/^\s*\*\s+(.*)$/gim, '<ul><li>$1</li></ul>')
    // Blockquotes
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" class="text-blue-600 hover:underline">$1</a>')
    // New lines to paragraphs or BRs
    .replace(/\n/gim, '<br />');

  // Fix multiple ULs sequence (optional cleanup, but browser handles adjacent ULs okay visually)
  html = html.replace(/<\/ul>\s*<ul>/gim, ''); 

  return html;
}

// Helper to split HTML string into Text and Image parts
async function parseHtmlToContentParts(html: string): Promise<any[]> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  const parts: any[] = [];
  
  const walker = document.createTreeWalker(
    body,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    null
  );

  let currentText = "";

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text) {
        currentText += text;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      
      if (el.tagName === 'IMG') {
        const src = (el as HTMLImageElement).getAttribute('src');
        if (src && src.startsWith('data:image')) {
          if (currentText.trim()) {
            parts.push({ text: currentText });
            currentText = "";
          }
          
          const mimeType = src.substring(5, src.indexOf(';'));
          const data = src.split(',')[1];
          parts.push({
            inlineData: {
              mimeType: mimeType,
              data: data
            }
          });
        }
      } 
      // Handle links: append URL to text context for AI visibility
      else if (el.tagName === 'A') {
        const href = (el as HTMLAnchorElement).getAttribute('href');
        // Filter only valid http/https links to avoid javascript: or internal anchors cluttering context
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          // We inject the URL into the text stream with a clear label so the AI sees it for web analysis
          currentText += ` (Link URL: ${href}) `;
        }
      }
      // Handle Block Elements for formatting context (newlines)
      else if (['DIV', 'P', 'BR', 'LI', 'H1', 'H2', 'H3', 'UL', 'OL', 'BLOCKQUOTE'].includes(el.tagName)) {
        currentText += "\n";
      }
    }
    node = walker.nextNode();
  }

  if (currentText.trim()) {
    parts.push({ text: currentText });
  }

  return parts;
}

async function fileToGenerativePart(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}