import fs from 'fs';
import path from 'pathe';
import { z } from 'zod';
import { createTool } from '../../src/tool';
import { safeStringify } from '../../src/utils/safeStringify';

// 目标: 实现文档的内容读取，支持 '.pdf', '.doc', '.docx' 等格式

// 支持的文档文件格式
const SUPPORTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.md'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 验证文件路径是否安全
function validateFilePath(basePath: string, filePath: string): boolean {
  const resolvedBase = path.resolve(basePath);
  const resolvedFile = path.resolve(filePath);
  return resolvedFile.startsWith(resolvedBase);
}

// 验证输出路径是否安全
function validateOutputPath(basePath: string, outputPath: string): boolean {
  const resolvedBase = path.resolve(basePath);
  const resolvedOutput = path.resolve(outputPath);
  return resolvedOutput.startsWith(resolvedBase);
}

// 检查文件大小
function checkFileSize(filePath: string): void {
  try {
    const stats = fs.statSync(filePath);
    if (stats.size > MAX_FILE_SIZE) {
      throw new Error(
        `文件太大: ${Math.round(stats.size / 1024 / 1024)}MB，最大支持 ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('文件太大')) {
      throw error;
    }
    throw new Error(`无法读取文件: ${filePath}`);
  }
}

// 通用文档信息接口
interface DocumentInfo {
  title?: string;
  metadata?: Record<string, any>;
  content: string;
  extractedFields?: Record<string, any>;
}

// 文档解析器接口
interface DocumentParser {
  supportedExtensions: string[];
  extractText(filePath: string): string;
  parseContent?(content: string): Partial<DocumentInfo>;
  // 异步提取文本（用于PDF等需要异步处理的格式）
  extractTextAsync?(filePath: string): Promise<string>;
}

// TXT 文本解析器
class TextParser implements DocumentParser {
  supportedExtensions = ['.txt'];

  extractText(filePath: string): string {
    // 检查文件大小
    checkFileSize(filePath);
    return fs.readFileSync(filePath, 'utf-8');
  }

  parseContent(content: string): Partial<DocumentInfo> {
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line);
    const title =
      lines.length > 0 && lines[0].length < 100 ? lines[0] : undefined;

    return {
      title,
      content,
    };
  }
}

// Markdown 解析器
class MarkdownParser implements DocumentParser {
  supportedExtensions = ['.md'];

  extractText(filePath: string): string {
    // 检查文件大小
    checkFileSize(filePath);
    return fs.readFileSync(filePath, 'utf-8');
  }

  parseContent(content: string): Partial<DocumentInfo> {
    // 提取第一个 # 标题作为文档标题
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : undefined;

    return {
      title,
      content,
    };
  }
}

// PDF 解析器
class PDFParser implements DocumentParser {
  supportedExtensions = ['.pdf'];

  extractText(filePath: string): string {
    // 同步版本暂不实现，使用异步版本
    throw new Error('PDF 文件解析需要异步处理，请使用 extractTextAsync 方法');
  }

  async extractTextAsync(filePath: string): Promise<string> {
    try {
      // 检查文件大小
      checkFileSize(filePath);

      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const dataBuffer = fs.readFileSync(filePath);
      const uint8Array = new Uint8Array(dataBuffer);

      const pdfDoc = await pdfjsLib.getDocument({
        data: uint8Array,
      }).promise;

      let fullText = '';
      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();
        const textItems = textContent.items;
        // 定义正确的类型
        const text = textItems.map((item: any) => item.str || '').join(' ');
        fullText += text + '\n';
      }

      return fullText;
    } catch (error) {
      const message = error instanceof Error ? error.message : '未知错误';
      throw new Error(`PDF 文件解析失败: ${message}`);
    }
  }
}

// Word 文档解析器（占位符实现）
class WordParser implements DocumentParser {
  supportedExtensions = ['.doc', '.docx'];

  extractText(filePath: string): string {
    throw new Error(
      'Word 文档解析需要额外的依赖库（如 mammoth），当前版本暂不支持',
    );
  }
}

// 注册所有解析器
const parsers: Record<string, DocumentParser> = {
  '.txt': new TextParser(),
  '.md': new MarkdownParser(),
  '.pdf': new PDFParser(),
  '.doc': new WordParser(),
  '.docx': new WordParser(),
};

// 通用文档提取函数
async function extractDocument(filePath: string): Promise<DocumentInfo> {
  const ext = path.extname(filePath).toLowerCase();
  const parser = parsers[ext];

  if (!parser) {
    throw new Error(
      `不支持的文件格式: ${ext}。支持的格式: ${Object.keys(parsers).join(', ')}`,
    );
  }

  // 提取文本内容
  let textContent: string;
  if (parser.extractTextAsync) {
    // 使用异步方法提取文本
    textContent = await parser.extractTextAsync(filePath);
  } else {
    // 使用同步方法提取文本
    textContent = parser.extractText(filePath);
  }

  // 基础文档信息
  const documentInfo: DocumentInfo = {
    content: textContent,
  };

  // 如果解析器提供内容解析功能，则使用它
  if (parser.parseContent) {
    const parsed = parser.parseContent(textContent);
    documentInfo.title = parsed.title;
    documentInfo.metadata = parsed.metadata;
    documentInfo.extractedFields = parsed.extractedFields;
  }

  return documentInfo;
}

// 简历特定的内容解析器
function parseResumeContent(content: string): Record<string, any> {
  const lines = content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line);
  const result: Record<string, any> = {};

  // 提取姓名（通常在第一行）
  if (lines.length > 0 && lines[0].length < 20) {
    result.name = lines[0];
  }

  // 提取联系方式
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

  result.contact = {};

  for (const line of lines) {
    const emailMatch = line.match(emailRegex);
    if (emailMatch && !result.contact.email) {
      result.contact.email = emailMatch[0];
    }

    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !result.contact.phone) {
      result.contact.phone = phoneMatch[0];
    }
  }

  // 提取技能关键词
  const skillKeywords = [
    'JavaScript',
    'TypeScript',
    'React',
    'Vue',
    'Angular',
    'Node.js',
    'Python',
    'Java',
    'C++',
    'C#',
    'Go',
    'Rust',
    'PHP',
    'HTML',
    'CSS',
    'Sass',
    'Less',
    'Bootstrap',
    'Tailwind',
    'MySQL',
    'PostgreSQL',
    'MongoDB',
    'Redis',
    'Elasticsearch',
    'Docker',
    'Kubernetes',
    'Jenkins',
    'Git',
    'CI/CD',
    'AWS',
    'Azure',
    'GCP',
    '阿里云',
    '腾讯云',
    '机器学习',
    '深度学习',
    '数据分析',
    '人工智能',
  ];

  result.skills = [];
  const lowerContent = content.toLowerCase();

  for (const skill of skillKeywords) {
    if (
      lowerContent.includes((skill as string).toLowerCase()) &&
      !result.skills.includes(skill)
    ) {
      result.skills.push(skill as string);
    }
  }

  return result;
}

// 转换为 Markdown 格式
function convertToMarkdown(
  document: DocumentInfo,
  originalText: string,
  contentType?: string,
): string {
  let markdown = '';

  // 根据内容类型设置标题
  if (contentType === 'resume') {
    markdown = '# 简历\n\n';

    // 简历特定的解析
    const resumeData = parseResumeContent(originalText);

    // 基本信息
    if (resumeData.name) {
      markdown += `## 基本信息\n\n**姓名：** ${resumeData.name}\n\n`;
    }

    if (resumeData.contact) {
      markdown += '**联系方式：**\n';
      if (resumeData.contact.phone)
        markdown += `- 电话：${resumeData.contact.phone}\n`;
      if (resumeData.contact.email)
        markdown += `- 邮箱：${resumeData.contact.email}\n`;
      markdown += '\n';
    }

    // 技能
    if (resumeData.skills && resumeData.skills.length > 0) {
      markdown += '## 技能\n\n';
      resumeData.skills.forEach((skill: string) => {
        markdown += `- ${skill}\n`;
      });
      markdown += '\n';
    }

    // 原始文本内容（作为补充）
    markdown += '## 原始内容\n\n';
    markdown += '```\n';
    markdown += originalText;
    markdown += '\n```\n';
  } else {
    // 通用文档转换
    markdown = document.title ? `# ${document.title}\n\n` : '# 文档内容\n\n';
    markdown += '## 提取内容\n\n';
    markdown += '```\n';
    markdown += originalText;
    markdown += '\n```\n';

    // 添加提取的元数据
    if (
      document.extractedFields &&
      Object.keys(document.extractedFields).length > 0
    ) {
      markdown += '\n## 提取字段\n\n';
      Object.entries(document.extractedFields).forEach(([key, value]) => {
        markdown += `**${key}：** ${JSON.stringify(value)}\n\n`;
      });
    }
  }

  return markdown;
}

export function createDocumentTool(opts: { cwd: string }) {
  return createTool({
    name: 'document',
    description: `
从各种文档格式中提取内容并转换为标准 Markdown 格式。

支持的功能：
- 读取 TXT、Markdown 格式的文档文件
- 可扩展支持 PDF、Word 等格式（需要额外依赖）
- 解析文档中的基本信息（标题、元数据等）
- 支持简历特定内容解析（姓名、联系方式、技能等）
- 将提取的内容转换为标准化的 Markdown 格式
- 支持批量处理多个文档文件

扩展性：
- 通过实现 DocumentParser 接口可以轻松添加新的文档格式支持
- 支持自定义内容解析逻辑
- 可配置的输出格式和内容类型
    `.trim(),
    parameters: z.object({
      file_paths: z.array(z.string()).describe('文档文件路径列表'),
      output_dir: z
        .string()
        .optional()
        .describe('输出目录，如果不指定则返回内容而不写入文件'),
      content_type: z
        .enum(['auto', 'resume', 'document'])
        .optional()
        .describe('内容类型，auto为自动检测'),
    }),
    getDescription: ({ params }) => {
      if (!params.file_paths || !Array.isArray(params.file_paths)) {
        return 'No file paths provided';
      }
      return `Extract ${params.file_paths.length} document(s)`;
    },
    execute: async ({ file_paths, output_dir, content_type = 'auto' }) => {
      try {
        const results = [];

        for (const filePath of file_paths) {
          // 验证文件路径
          const fullPath = path.isAbsolute(filePath)
            ? filePath
            : path.resolve(opts.cwd, filePath);

          if (!fs.existsSync(fullPath)) {
            throw new Error(`文件不存在: ${filePath}`);
          }

          // 检查文件格式
          const ext = path.extname(fullPath).toLowerCase();
          if (!SUPPORTED_EXTENSIONS.includes(ext)) {
            throw new Error(
              `不支持的文件格式: ${ext}。支持的格式: ${SUPPORTED_EXTENSIONS.join(', ')}`,
            );
          }

          // 检查文件大小
          const stats = fs.statSync(fullPath);
          if (stats.size > MAX_FILE_SIZE) {
            throw new Error(
              `文件过大: ${filePath}。最大支持大小: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            );
          }

          // 提取文档内容
          const documentInfo = await extractDocument(fullPath);

          // 自动检测内容类型
          let detectedType = content_type;
          if (content_type === 'auto') {
            // 简单的启发式检测
            const lowerContent = documentInfo.content.toLowerCase();
            const hasResumeKeywords = [
              '简历',
              '工作经历',
              '教育背景',
              '技能',
              '联系方式',
            ].some((keyword) => lowerContent.includes(keyword));
            detectedType = hasResumeKeywords ? 'resume' : 'document';
          }

          // 转换为 Markdown
          const markdownContent = convertToMarkdown(
            documentInfo,
            documentInfo.content,
            detectedType,
          );

          // 处理输出
          if (output_dir) {
            const outputDir = path.isAbsolute(output_dir)
              ? output_dir
              : path.resolve(opts.cwd, output_dir);

            // 验证输出路径是否安全
            if (!validateOutputPath(opts.cwd, outputDir)) {
              throw new Error('输出路径不安全，必须在当前工作目录内');
            }

            // 确保输出目录存在
            fs.mkdirSync(outputDir, { recursive: true });

            // 生成输出文件名
            const baseName = path.basename(fullPath, path.extname(fullPath));
            const outputPath = path.join(outputDir, `${baseName}.md`);

            // 写入文件
            fs.writeFileSync(outputPath, markdownContent, 'utf-8');

            results.push({
              originalFile: filePath,
              outputFile: path.relative(opts.cwd, outputPath),
              contentType: detectedType,
              success: true,
              message: '提取成功',
            });
          } else {
            results.push({
              originalFile: filePath,
              content: markdownContent,
              contentType: detectedType,
              success: true,
              message: '提取成功',
            });
          }
        }

        return {
          returnDisplay: `成功提取 ${results.length} 个文档文件`,
          llmContent: safeStringify({
            results,
            count: results.length,
          }),
        };
      } catch (e) {
        return {
          isError: true,
          llmContent: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },
    approval: {
      category: 'read',
    },
  });
}
