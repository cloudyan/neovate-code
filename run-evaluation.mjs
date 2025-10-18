import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取当前工作目录
const cwd = process.cwd();

// test
// node run-evaluation.mjs

// 直接从源代码导入工具函数
const { createEvaluateTool } = await import('./src/tools/evaluate.ts');

// 获取所有简历文件
const resumeDir = path.join(cwd, 'extracted-resumes');
const resumeFiles = fs
  .readdirSync(resumeDir)
  .filter((file) => path.extname(file) === '.md')
  .map((file) => path.join('extracted-resumes', file));

console.log('找到简历文件:', resumeFiles.length, '个');
console.log('文件列表:', resumeFiles);

// 创建工具实例
const evaluateTool = createEvaluateTool({ cwd });

// 执行评估
try {
  const result = await evaluateTool.execute({
    resume_files: resumeFiles,
    output_file: 'evaluations/evaluation.json',
  });
  console.log('评估完成:', result.returnDisplay);
  console.log('结果已保存到 evaluations/evaluation.json');
} catch (error) {
  console.error('评估失败:', error);
}
