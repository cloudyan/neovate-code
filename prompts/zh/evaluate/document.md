---
name: document
description: 从文档文件中提取内容并转换为Markdown格式
params:
  - name: files
    description: 文档文件路径（支持通配符）
    type: string
    required: true
  - name: output
    description: 输出目录
    type: string
    required: false
    default: ./output
  - name: content_type
    description: 内容类型 (auto/resume/document)
    type: string
    required: false
    default: auto
---

从各种格式的文档文件中提取内容，并将其转换为标准化的Markdown格式。

## 使用示例

### 提取单个文档
```
/document files="document.txt"
```

### 批量提取文档到指定目录
```
/document files="documents/*.pdf" output="./markdown-docs"
```

### 提取简历内容
```
/document files="resume.txt" content_type="resume"
```

### 自动检测内容类型
```
/document files="mixed/*.*" content_type="auto"
```

## 功能特性

- **多格式支持**: 支持从 TXT、Markdown、PDF、DOCX 等格式提取内容
- **智能解析**: 自动识别和提取文档中的关键信息
- **内容类型检测**: 支持简历和通用文档两种解析模式
- **标准化输出**: 将所有文档转换为统一的Markdown格式
- **批量处理**: 支持同时处理多个文档文件
- **可扩展架构**: 通过实现 DocumentParser 接口可轻松添加新格式支持

## 输出格式

### 简历类型 (content_type=resume)
```markdown
# 简历

## 基本信息
**姓名：** [姓名]
**联系方式：**
- 电话：[电话号码]
- 邮箱：[邮箱地址]

## 技能
- [技能1]
- [技能2]
- ...

## 原始内容
[原始文本内容]
```

### 通用文档类型 (content_type=document)
```markdown
# [文档标题]

## 提取内容
[原始文本内容]

## 提取字段
**字段1：** [值1]
**字段2：** [值2]
```

## 扩展性

系统采用可扩展的解析器架构，可以通过实现 `DocumentParser` 接口来添加新的文档格式支持：

```typescript
class CustomParser implements DocumentParser {
  supportedExtensions = ['.custom'];

  extractText(filePath: string): string {
    // 实现自定义格式的文本提取逻辑
  }

  parseContent(content: string): Partial<DocumentInfo> {
    // 实现自定义的内容解析逻辑
  }
}
```

## 注意事项

- 当前版本主要支持TXT和Markdown格式文件
- PDF和DOCX格式需要额外的依赖库支持
- 自动检测模式会根据内容关键词判断是否为简历
- 输出目录会自动创建，如果不存在的话
