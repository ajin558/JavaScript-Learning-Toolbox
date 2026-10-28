# JavaScript 学习工具箱

一套可以直接使用、也适合阅读源码练习 JavaScript 的小工具，包含独立网页工具和 Chrome / Edge 浏览器扩展。

## 功能

- **网页工具**：JSON 格式化与校验、文本清理、待办清单。
- **网页转 JSON**：提取标题、链接、图片、表格和 JSON-LD；支持填写 CSS 选择器提取商品卡片等重复内容。
- **表格导出**：将网页中的标准 HTML 表格导出为 CSV。
- **布局与样式检查**：查看选中元素的尺寸、位置、字体、颜色、盒模型、父级 Grid / Flex 布局和同层间距，并复制 CSS。
- **本地练习页**：提供带有大量卡片、图片、表格和响应式布局的页面，方便练习与验证。

网页工具和扩展都在本地处理页面内容，不会将页面内容上传到服务器。待办清单保存在当前浏览器的 `localStorage` 中。

## 使用网页工具

用浏览器打开 `site/index.html` 即可。也可以在 VS Code 安装 Live Server 后，右键 `index.html` 选择 **Open with Live Server**。

在线体验：[JavaScript 学习工具箱](https://ajin558.github.io/JavaScript-Learning-Toolbox/)。网站由 GitHub Pages 发布；更新 `site/` 目录并推送到 `main` 后会自动重新部署。GitHub Pages 的国内网络可达性可能因地区和运营商而异。

## 安装浏览器扩展

1. 打开 Chrome 的 `chrome://extensions`，或 Edge 的 `edge://extensions`。
2. 打开右上角的 **开发者模式**。
3. 点击 **加载已解压的扩展**，选择本项目的 `extension/` 文件夹。
4. 打开普通网页，点击工具栏里的“JS 学习工具箱”。抓取页面、读取表格或启动样式检查时，浏览器会在当前页面临时注入脚本。

扩展通过 `activeTab` 在用户操作后访问当前标签页。浏览器内部页面、扩展商店页和部分受保护页面不允许注入脚本；跨域 iframe 内容也可能无法读取。表格导出针对网页中的标准 HTML `<table>`。部分网站可能使用 Canvas、封闭 Shadow DOM 或特殊框架，这些内容受浏览器能力限制。

### 网页转 JSON

在扩展弹窗选择“网页转 JSON”，勾选要提取的标题、链接、图片、表格或 JSON-LD 结构化数据，再点“抓取并生成 JSON”。可以复制结果或下载 JSON 文件。页面信息（标题、网址、描述、语言和抓取时间）会自动放进 `page` 字段。

想提取商品卡片等重复内容时，展开“自定义提取商品 / 卡片字段”，填写卡片 CSS 选择器及卡片内部的字段选择器。例如：卡片 `.product-card`，标题 `.title`，价格 `.price`，链接 `a`，图片 `img`。不同网站结构不同，选择器需要按目标网页调整。提取数量有上限，动态加载内容需要先在页面上滚动或等待加载。

### 本地验证扩展

项目附带 `site/extension-fixture.html` 测试页，包含 210 张商品卡片、260 个链接、图片、CSS Grid / Flex 布局、字体样式和 CSV 表格。可以用它稳定复现扩展的抓取与测量体验：

1. 在项目根目录运行 `python -m http.server 8765 --directory site`。
2. 浏览器打开 `http://127.0.0.1:8765/extension-fixture.html`。
3. 在扩展弹窗尝试 JSON 抓取、卡片选择器 `.product-card`（标题 `.product-title`、价格 `.product-price`、链接 `a`、图片 `img`）、表格 CSV 导出。
4. 在“样式检查”中选取卡片、文字和色块；查看同层间距，复制 CSS，再滚动页面确认位置数值会刷新。

标题、链接、图片及自定义卡片最多扫描 5,000 个候选节点、导出 200 项；超过上限时会显示截断状态。表格最多导出 20 张、每张 100 行。测试页中的链接与卡片数量用于验证 200 项上限。停止本地服务器可在运行窗口按 `Ctrl+C`。

## 代码学习顺序

1. `site/app.js` 的 JSON 工具：练习事件、`JSON.parse` 和 `JSON.stringify`。
2. 文本清理：练习字符串、正则表达式和复选框状态。
3. 待办清单：练习数组、DOM 创建、事件委托和 `localStorage`。
4. `extension/popup.js`：练习浏览器扩展弹窗、当前标签页和下载。
5. `extension/content.js`：练习 DOM 查询、事件监听、计算样式、JSON-LD 和 Shadow DOM。

可以从 `console.log()`、断点和浏览器开发者工具开始观察程序运行。给代码做小改动后，刷新网页或在扩展管理页重新加载扩展。

## 目录结构

```text
js-learning-toolbox/
├── .gitignore
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── site/
│   ├── index.html
│   ├── extension-fixture.html
│   ├── styles.css
│   └── app.js
└── extension/
    ├── manifest.json
    ├── popup.html
    ├── popup.css
    ├── popup.js
    └── content.js
```

## 参与改进

欢迎提交 Issue 或 Pull Request。提交前请阅读 [贡献指南](CONTRIBUTING.md)，并说明改动目的及手动验证方式。新增网页提取字段时，请尽量保持由用户主动触发，并注意不同网站的 DOM 结构差异。

## 许可证

本项目使用 [MIT License](LICENSE)。
