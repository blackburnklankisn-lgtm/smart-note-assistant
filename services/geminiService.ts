import { GoogleGenAI } from "@google/genai";
import { NoteRole, ChatMessage } from "../types";

const PROMPTS = {
  autosar: `
Role (角色设定):
你是一名资深的 **汽车电子软件架构师 (Automotive Software Architect)** 和 **智能技术顾问**。
你的用户是汽车电子软件工程师。你的核心任务是将用户的输入（文本、日志片段、图片、PDF规范、网页链接、**会议录音**）转化为结构化、专业的工程笔记。

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
   - **会议语音分析**: 如果输入包含音频文件，请转录并总结会议中的技术讨论要点、决策结论和待办事项 (Action Items)。
   - **URL 解析**: 输入文本中可能包含标记为 \`(Link URL: https://...)\` 的网页链接。请务必使用工具访问这些链接，提取内容进行辅助分析。

2. **标准化分类 (Standardized Classification)**:
   在分析问题时，使用以下分类标签：
   - **[Layer]**: Application / RTE / BSW / MCAL / Hardware
   - **[Module]**: ComStack, DiagStack, MemStack, OS...
   - **[Standard]**: ISO26262, ISO14229, Autosar SWS...

3. **深度分析 (Deep Analysis)**:
   - **故障排查**: 思考架构层面的原因（如：PduR 路由路径缺失、Task 优先级翻转）。
   - **标准引用**: 引用具体的标准条款。

Output Format (输出格式):
使用标准 Markdown，结构如下：

# [标题]

## 📋 核心摘要 (Executive Summary)
简要概括技术点、问题背景或会议主旨。

## 🏷️ 领域分类 (Domain Context)
* **架构层级**: ...
* **涉及模块**: ...

## 🚨 问题诊断 / 会议纪要 (Diagnosis / Meeting Minutes)
* **现象描述 / 讨论议题**: ...
* **技术背景 / 观点详情**: ...

## 🕵️ 根本原因 / 决策结论 (Root Causes / Decisions)
1. ...
2. ...

## 🛠️ 解决方案 / 待办事项 (Solutions / Action Items)
1. ...
2. ...
`,

  notebooklm: `
Role (角色设定):
你是一名类似 **Google NotebookLM** 的智能文档分析助手。你的核心任务是对用户上传的全部内容（文本、图片、PDF文档、**音频录音**）进行深度阅读、综合分析和精准总结。

Strict Constraints (严格限制):
1. **完全依据来源 (Grounding)**: 所有的回答、总结、洞察必须**完全基于用户本次提供的输入资源**。
2. **禁止联网引用 (No External Citation)**: 严禁使用外部网络搜索工具，严禁引用互联网上的非用户提供的内容。只分析用户给你的东西。
3. **忠实原文**: 不要编造原文中不存在的事实。如果用户提出的问题无法从提供的文档中找到答案，请明确说明“提供的资源中未包含此信息”。

Output Format (输出格式):
请使用结构清晰的 Markdown 格式：
- **核心洞察 (Key Insights)**: 提炼文档或录音中最有价值的 3-5 个观点。
- **深度摘要 (Deep Summary)**: 对内容进行逻辑化的详细总结，而不是简单的流水账。
- **引用来源 (Source Citations)**: 在提及具体观点时，尽可能注明出自哪个文件或哪个章节（如果输入包含多个文件）。
`,

  general: `
Role (角色设定):
你是一名通用的 **智能笔记助手 (Smart Note Assistant)**。你的目标是帮助用户高效地整理信息、构建知识库。

Tasks (任务):
1. **内容重组**: 将用户碎片化、口语化、杂乱的输入文本整理成结构清晰、逻辑严密的专业笔记。
2. **音频转录与总结**: 如果包含音频文件，请提取关键对话内容，生成会议纪要。
3. **格式优化**: 充分利用 Markdown 的标题、列表、加粗、代码块等特性，提升可读性。
4. **智能纠错**: 修正明显的拼写和语法错误，润色语言，使其更加流畅专业。
5. **要点提炼**: 自动识别并提取内容中的 Action Items (待办事项)、Key Decisions (关键决策) 或 Core Concepts (核心概念)。

Output Format (输出格式):
生成一份排版精美、结构通用的 Markdown 笔记。
`,

  weekly: `
Role (角色设定):
你是一名崇尚 **极简主义 (Minimalism)** 的高级技术项目经理。
你的任务是将用户本周（周一到周五）产生的所有杂乱、原始的笔记内容，“蒸馏”成一份**极度精炼、高价值**的周报摘要。

Core Principles (核心原则):
1.  **拒绝流水账**: 严禁按时间顺序机械地罗列每一条笔记。请将相关联的任务进行合并归纳。
2.  **简单有效**: 每一项内容只能用 **1-2 句话** 概括。直击重点，不要废话。
3.  **图片/文档/音频概括**: 如果输入内容中包含图片、文档或音频会议记录，**不要**详细分析细节，只需用 **半句话** 说明其用途或内容（例如：“参考了以太网架构图”或“周三架构评审会议录音”）。
4.  **极度简洁**: 整个周报的篇幅要短小精悍，让人在 30 秒内能看完全部核心内容。

Output Template (输出模板 - 严格遵守):

# 📅 Weekly Executive Summary

## 🏆 Highlights (核心成果)
* [成果1]: [用一句话概括做完了什么]
* [成果2]: [简练描述]

## 🚧 Key Issues (关键问题)
* [问题1]: [一句话描述问题及当前状态]
* [问题2]: [简练描述]

## 📂 Docs & Assets (资料概览)
* [简要列出本周涉及的关键文档、图片或会议录音]

## 🗓️ Next Focus (下周重点)
* [一句话计划]
`
};

// Helper to safely get API Key in both Vite (local) and other environments
export const getApiKey = (): string | undefined => {
  if (typeof window !== 'undefined') {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey && storedKey.trim() !== '') {
      return storedKey.trim();
    }
  }

  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return undefined;
};

export const generateSmartNote = async (
  htmlContent: string,
  attachments: File[],
  role: NoteRole = 'autosar'
): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure it in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  // 1. Parse HTML content into interleaved text and image parts
  const contentParts = await parseHtmlToContentParts(htmlContent);

  // 2. Process external attachments (PDFs, Audio, Images)
  const attachmentParts = await Promise.all(
    attachments.map(async (file) => {
      const base64Data = await fileToGenerativePart(file);
      return {
        inlineData: {
          data: base64Data,
          mimeType: file.type, // Works for 'audio/webm', 'audio/mp3', 'application/pdf', etc.
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
    finalParts.push({ text: "Please analyze the provided context." });
  }

  // Configure Tools based on Role
  const tools = [];
  if (role === 'autosar' || role === 'general' || role === 'weekly') {
    tools.push({ googleSearch: {} });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: finalParts },
      config: {
        systemInstruction: PROMPTS[role],
        temperature: role === 'notebooklm' ? 0.2 : 0.4,
        tools: tools.length > 0 ? tools : undefined,
      }
    });

    let markdownText = response.text || "No content generated.";

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
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
 * Chat with the current note context (Q&A Mode)
 */
export const chatWithNote = async (
  noteHtml: string,
  noteAttachments: File[],
  chatHistory: ChatMessage[],
  newMessage: string,
  role: NoteRole
): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  // 1. Prepare Context (Note Content + Attachments)
  const contentParts = await parseHtmlToContentParts(noteHtml);
  const attachmentParts = await Promise.all(
    noteAttachments.map(async (file) => {
      const base64Data = await fileToGenerativePart(file);
      return {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      };
    })
  );

  const contextMessage = {
    role: 'user',
    parts: [
      { text: `CONTEXT START\n${PROMPTS[role]}\n\nHere is the current content of the note (and attachments) you are discussing:\n` },
      ...contentParts,
      ...attachmentParts,
      { text: "\nCONTEXT END\n\nPlease answer the following questions based on the context above." }
    ]
  };

  const modelAck = {
    role: 'model',
    parts: [{ text: "Understood. I have analyzed the note content and attachments. What is your question?" }]
  };

  const historyParts = chatHistory.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }]
  }));

  const userPrompt = {
    role: 'user',
    parts: [{ text: newMessage }]
  };

  const contents = [contextMessage, modelAck, ...historyParts, userPrompt];

  const tools = [];
  if (role === 'autosar' || role === 'general' || role === 'weekly') {
    tools.push({ googleSearch: {} });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: "You are a helpful AI assistant. Answer the user's questions based on the provided note context.",
        tools: tools.length > 0 ? tools : undefined,
      }
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

export function markdownToHtml(markdown: string): string {
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
    .replace(/__(.*)__/gim, '<b>$1</b>')
    .replace(/\*(.*)\*/gim, '<i>$1</i>')
    .replace(/_(.*)_/gim, '<i>$1</i>')
    .replace(/^---$/gim, '<hr />')
    .replace(/^\s*-\s+(.*)$/gim, '<ul><li>$1</li></ul>')
    .replace(/^\s*\*\s+(.*)$/gim, '<ul><li>$1</li></ul>')
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" class="text-blue-600 hover:underline">$1</a>')
    .replace(/\n/gim, '<br />');

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
      else if (el.tagName === 'A') {
        const href = (el as HTMLAnchorElement).getAttribute('href');
        if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
          currentText += ` (Link URL: ${href}) `;
        }
      }
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