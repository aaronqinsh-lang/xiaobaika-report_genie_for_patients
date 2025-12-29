# 小白卡助手 (Xiaobai Card Assistant) - 进化开发提示词

## 1. 应用概述与定位
- **应用名称**：小白卡助手
- **核心功能**：基于 Google Gemini API 的高精度医疗报告分析工具。
- **目标用户**：需要深度、易读、且具备未来感的医疗报告解读服务的普通用户。
- **技术栈**：React, Tailwind CSS, Zustand (状态管理), Supabase (云端存储/认证), Google Gemini API (多模态推理 & 图像生成)。

## 2. 视觉特征与 UI 指令 (Cyber-Noir Style)
- **核心色调**：
  - 背景：`#0a0a12` (深邃黑蓝)。
  - 霓虹主色：`#e94560` (赛博红)。
  - 渐变：`from-[#e94560] to-purple-600`。
- **UI 元素**：
  - **字体**：标题使用 `Orbitron` (科技感)，正文使用 `Inter`。
  - **组件风格**：磨砂玻璃效果 (Glassmorphism)、圆角 `rounded-3xl`、呼吸灯动效、霓虹边框 (`neon-border`)。
  - **交互感**：所有操作应伴随微小的位移或缩放动画，体现“终端操控”的即时感。

## 3. AI 逻辑架构 (Gemini API 规范)
### 3.1 报告解构 (analyzeMedicalReport)
- **模型选择**：`gemini-3-flash-preview` (平衡速度与推理)。
- **分析维度**：强制执行 10 个维度的深度剖析（如指标趋势、潜在风险、临床定义等）。
- **输出格式**：严格 JSON。
- **辅助生成**：使用 `gemini-2.5-flash-image` 为每个分析生成赛博风格的医疗概念插图，增强视觉共鸣。

### 3.2 智能对话 (chatAboutReport)
- **模型选择**：`gemini-3-pro-preview` 或 `gemini-3-flash-preview`。
- **上下文注入**：对话必须基于当前报告的 10 维分析结果，禁止脱离事实。
- **格式限制**：禁用 Markdown 标题（#），使用【】作为标题，使用 >> 作为重点引导，增强移动端的可读性。

## 4. 存储与性能优化 (Quota & Persistence)
- **本地存储 (LocalStorage)**：
  - 限制：仅保存模型配置 (ModelConfig) 和语言偏好。
  - 排除：由于医疗图片 Base64 极大，禁止将 `sessions` 存入 LocalStorage，防止 `QuotaExceededError`。
- **云端同步 (Supabase)**：
  - 策略：会话和消息实时同步至云端数据库。
  - 关联：`sessions` 与 `messages` 建立 `ON DELETE CASCADE` 的外键关系。

## 5. 核心系统指令 (System Instructions)

### 5.1 分析专家人格：
> 你是“小白卡助手”，一个顶尖的赛博医学分析专家。任务是提供极其详尽的报告解读。
> 结构要求：包含 10 个维度，每个维度必须有核心结论 (conclusion) 和关键发现 (highlights)。

### 5.2 引导回复风格：
> 1. 禁用 Markdown 标题。
> 2. 使用【】作为栏目标题。
> 3. 重点信息使用“>>”符号引导。
> 4. 结构：定义 -> 数值解读 -> 临床建议 -> 温馨提示。
> 5. 固定后缀：[建议不能代替面诊]。

## 6. 开发注意事项
- **安全性**：API Key 通过 `process.env.API_KEY` 注入，不暴露在 UI。
- **健壮性**：必须具备 `QuotaExceededError` 捕获机制，并在缓存溢出时自动清理旧版本键（v1-v5）。
- **认证**：支持 Email + Google OAuth 双重矩阵登录。
