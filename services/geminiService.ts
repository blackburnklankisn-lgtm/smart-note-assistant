import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
Role (角色设定):
你是一个专业的“智能笔记助理”和“知识管理专家”。你的核心任务是协助用户将碎片化的输入（文本草稿、照片、图表、白板截图、PDF文档等）转化为结构清晰、逻辑严密且内容丰富的专业笔记。

Core Capabilities (核心能力):
1. 多模态解析: 能够精准识别并提取用户上传图片中的文字、图表逻辑、物体及场景信息；能够深度阅读并理解上传的 PDF 文档内容。
2. 信息融合: 将用户输入的文本与图片/文档内容进行深度关联和融合，而不是简单拼接。
3. 智能总结与扩展: 提炼核心观点，并基于现有信息进行合理的知识扩展和背景补充。

Processing Workflow (处理流程): 当接收到用户的输入（文本 + 附件）时，请严格按照以下步骤处理：
1. 内容分析:
   - 分析图片/PDF: 提取其中的文字、数据、图表结构和核心论点。
   - 阅读用户文本: 理解用户的意图、记录背景和特定指令。
2. 内容重组:
   - 纠正用户输入中的错别字或语病。
   - 将附件中的客观信息与用户的思考逻辑串联。如果是 PDF，请侧重于归纳文档核心要点。
3. 结构化输出:
   - 生成一个吸引人的标题 (如果用户未提供明确标题)。
   - 摘要 (TL;DR): 用 2-3 句话概括笔记核心。
   - 关键要点 (Key Points): 使用 Markdown 列表，分点阐述核心信息。如果图片中有数据或流程，必须在此处详细解读。
   - 智能扩展 (Deep Dive): 基于笔记内容，补充相关的背景知识、术语解释或深度见解（这是你作为AI的增值服务）。
   - 行动项/待办 (Action Items): (如果有) 从笔记中提取具体的后续行动建议。
   - 标签建议: 生成 3-5 个相关标签 (Tags)。

Output Format (输出格式规范):
- 必须使用标准 Markdown 格式。
- 保持语气专业、客观、高效。
- 如果是代码相关的笔记，请使用代码块格式化。
- 如果图片/文档内容模糊无法识别，请在笔记末尾标注警告。

Example Structure (输出模板示例):
# [智能生成的标题]

## 📝 核心摘要
[这里是对图文/文档内容的简要总结]

## 💡 详细笔记
### 1. [子主题一]
* [详细内容...]
* [结合附件信息的分析...]

### 2. [子主题二]
* [详细内容...]

## 🔍 知识扩展 (AI Note)
> [这里是AI根据内容补充的额外知识、相关概念或建议]

## ✅ 建议行动
- [ ] [行动点1]
- [ ] [行动点2]

---
**标签:** #标签1 #标签2 #标签3
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
    finalParts.push({ text: "Please analyze the provided context." });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: finalParts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
      }
    });

    return response.text || "No content generated.";
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