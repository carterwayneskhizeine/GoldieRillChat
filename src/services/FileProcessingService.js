/**
 * 文件处理服务
 * 负责处理不同类型的文件并为知识库处理
 */

import { detectFileType, isSitemapUrl } from '../utils/fileTypes';

class FileProcessingService {
  /**
   * 根据文件类型处理文件
   * @param {File} file - 文件对象
   * @param {Object} options - 处理选项
   * @param {number} options.chunkSize - 分块大小
   * @param {number} options.chunkOverlap - 分块重叠大小
   * @returns {Promise<Object>} - 处理结果
   */
  async processFile(file, options = {}) {
    const { chunkSize = 1000, chunkOverlap = 200 } = options;
    const fileType = detectFileType(file.name);
    
    console.log(`处理文件: ${file.name}, 类型: ${fileType}`);
    
    try {
      // 根据文件类型选择不同的处理方法
      switch (fileType) {
        case 'text':
          return await this.processTextFile(file, { chunkSize, chunkOverlap });
        case 'document':
          return await this.processDocumentFile(file, { chunkSize, chunkOverlap });
        case 'web':
          return await this.processWebFile(file, { chunkSize, chunkOverlap });
        case 'image':
          // 图片处理 (如果支持的话)
          return await this.processImageFile(file);
        case 'unknown':
          // 尝试基于MIME类型和扩展名进行智能处理
          if (file.type.includes('text') || 
              file.type.includes('markdown') || 
              file.name.endsWith('.md') || 
              file.name.endsWith('.markdown') ||
              file.name.endsWith('.txt')) {
            console.log(`基于文件名和MIME类型判断为文本文件: ${file.name}`);
            return await this.processTextFile(file, { chunkSize, chunkOverlap });
          } else if (file.type.includes('pdf') || 
                    file.type.includes('word') || 
                    file.type.includes('document')) {
            console.log(`基于MIME类型判断为文档文件: ${file.name}`);
            return await this.processDocumentFile(file, { chunkSize, chunkOverlap });
          } else if (file.type.includes('html') || 
                    file.type.includes('xml')) {
            console.log(`基于MIME类型判断为网页文件: ${file.name}`);
            return await this.processWebFile(file, { chunkSize, chunkOverlap });
          } else {
            // 对于完全未知的类型，尝试作为文本文件处理
            console.log(`未知文件类型，尝试作为文本文件处理: ${file.name}`);
            try {
              return await this.processTextFile(file, { chunkSize, chunkOverlap });
            } catch (textError) {
              throw new Error(`无法处理此文件类型: ${file.name}, MIME类型: ${file.type}`);
            }
          }
        default:
          throw new Error(`不支持的文件类型: ${fileType}`);
      }
    } catch (error) {
      console.error(`处理文件失败: ${file.name}`, error);
      throw new Error(`处理文件失败: ${error.message}`);
    }
  }
  
  /**
   * 处理URL
   * @param {string} url - URL地址
   * @param {Object} options - 处理选项
   * @returns {Promise<Object>} - 处理结果
   */
  async processUrl(url, options = {}) {
    try {
      // 检查是否为站点地图
      if (isSitemapUrl(url)) {
        return await this.processSitemap(url, options);
      } else {
        return await this.processWebUrl(url, options);
      }
    } catch (error) {
      console.error(`处理URL失败: ${url}`, error);
      throw new Error(`处理URL失败: ${error.message}`);
    }
  }
  
  /**
   * 处理文本文件
   * @private
   */
  async processTextFile(file, options) {
    try {
      console.log(`开始处理文本文件: ${file.name}`);
      const text = await this.readFileAsText(file);
      
      // 验证文本内容
      if (!text || text.trim().length === 0) {
        console.error(`文件内容为空: ${file.name}`);
        throw new Error(`文件内容为空或无法读取: ${file.name}`);
      }
      
      console.log(`成功读取文本文件: ${file.name}, 内容长度: ${text.length}`);
      
      // 这里会调用后端API进行处理，现在是一个模拟
      return {
        type: 'text',
        content: text,
        name: file.name,
        size: file.size,
        options,
        status: 'processed'
      };
    } catch (error) {
      console.error(`处理文本文件失败: ${file.name}`, error);
      // 返回错误状态而不是抛出异常，这样可以更平滑地处理错误
      return {
        type: 'text',
        name: file.name,
        size: file.size,
        options,
        status: 'error',
        error: error.message
      };
    }
  }
  
  /**
   * 处理文档文件 (PDF, DOCX等)
   * @private
   */
  async processDocumentFile(file, options) {
    // 文档处理需要officeparser，这里是调用后端API的模拟
    return {
      type: 'document',
      name: file.name,
      size: file.size,
      options,
      status: 'processing' // 实际上会由后端异步处理
    };
  }
  
  /**
   * 处理Web文件或HTML
   * @private
   */
  async processWebFile(file, options) {
    const html = await this.readFileAsText(file);
    return {
      type: 'web',
      content: html,
      name: file.name,
      size: file.size,
      options,
      status: 'processed'
    };
  }
  
  /**
   * 处理图片文件
   * @private
   */
  async processImageFile(file) {
    // 图片处理可能需要特殊的API
    return {
      type: 'image',
      name: file.name,
      size: file.size,
      status: 'processed'
    };
  }
  
  /**
   * 处理Web URL
   * @private
   */
  async processWebUrl(url, options) {
    try {
      console.log(`开始处理URL: ${url}`);
      const { chunkSize = 1000, chunkOverlap = 200 } = options;
      
      // 检查是否是维基百科URL
      const isWikipedia = url.includes('wikipedia.org');
      if (isWikipedia) {
        console.log('检测到维基百科URL，使用特殊处理逻辑');
      }
      
      // 定义多个CORS代理选项
      const corsProxies = [
        { name: '无代理', url: url },
        { name: 'corsproxy.io', url: `https://corsproxy.io/?${encodeURIComponent(url)}` },
        { name: 'allOrigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
        { name: 'cors-anywhere-demo', url: `https://cors-anywhere.herokuapp.com/${url}` },
        // 新增代理选项
        { name: 'corsfix', url: `https://proxy.corsfix.com/?${encodeURIComponent(url)}` },
        { name: 'cors.lol', url: `https://api.cors.lol/?url=${encodeURIComponent(url)}` },
        { name: 'codetabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
        { name: 'htmldriven', url: `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(url)}` },
        // cors.sh需要API密钥，如需使用请添加对应的headers
        // { name: 'cors.sh', url: `https://proxy.cors.sh/${url}`, headers: { 'x-cors-api-key': 'YOUR_API_KEY_HERE' } }
      ];
      
      let html = null;
      let response = null;
      let successProxy = null;
      
      // 尝试所有代理选项直到一个成功
      for (const proxy of corsProxies) {
        try {
          console.log(`尝试使用代理 [${proxy.name}] 抓取: ${proxy.url}`);
          
          // 添加特定代理的headers
          const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            ...(proxy.headers || {}) // 合并额外的headers (如API密钥)
          };
          
          response = await fetch(proxy.url, {
            headers,
            // 设置超时
            signal: AbortSignal.timeout(15000) // 15秒超时
          });
          
          if (response.ok) {
            html = await response.text();
            successProxy = proxy.name;
            console.log(`使用代理 [${proxy.name}] 抓取成功，内容大小: ${html.length}`);
            break;
          } else {
            console.log(`使用代理 [${proxy.name}] 抓取失败: ${response.status} ${response.statusText}`);
          }
        } catch (proxyError) {
          console.log(`使用代理 [${proxy.name}] 发生错误: ${proxyError.message}`);
          // 继续尝试下一个代理
        }
      }
      
      // 如果所有代理都失败
      if (!html) {
        console.error(`所有代理均失败，无法抓取URL: ${url}`);
        return {
          type: 'url',
          url,
          title: new URL(url).hostname,
          content: `无法获取URL内容，URL: ${url}\n网址: ${new URL(url).hostname}\n路径: ${new URL(url).pathname}`,
          error: '所有代理均失败',
          options,
          status: 'error'
        };
      }
      
      // 对于大型HTML内容，限制处理大小
      const MAX_HTML_SIZE = 500000; // 处理的HTML最大字节数
      if (html.length > MAX_HTML_SIZE) {
        console.warn(`HTML内容过大 (${html.length} 字节)，将被截断至 ${MAX_HTML_SIZE} 字节`);
        html = html.substring(0, MAX_HTML_SIZE);
      }
      
      // 简单提取文本内容，特殊处理维基百科页面
      let rawText;
      let title;
      
      if (isWikipedia) {
        // 维基百科页面特殊处理：通过选择器提取主要内容区
        ({ text: rawText, title } = this.extractWikipediaContent(html, url));
      } else {
        // 常规页面处理
        rawText = this.extractTextFromHtml(html);
        title = this.extractTitleFromHtml(html) || url;
      }
      
      // 限制原始文本大小
      const MAX_TEXT_SIZE = 100000; // 最大处理文本大小
      if (rawText.length > MAX_TEXT_SIZE) {
        console.warn(`提取文本过大 (${rawText.length} 字符)，将被截断至 ${MAX_TEXT_SIZE} 字符`);
        rawText = rawText.substring(0, MAX_TEXT_SIZE);
      }
      
      try {
        // ==== 新增: 长文本分块处理 ====
        const MAX_CONTENT_LENGTH = 8000; // 每个块的最大字符数
        console.log(`开始分块处理文本，长度: ${rawText.length}，最大块大小: ${MAX_CONTENT_LENGTH}`);
        const chunks = this.chunkText(rawText, MAX_CONTENT_LENGTH, chunkOverlap);
        
        console.log(`从URL提取文本, 原始长度: ${rawText.length}, 分为 ${chunks.length} 块`);
        
        // 如果内容太长，构建结构化内容
        let content;
        if (chunks.length > 1) {
          // 为多块内容构建结构化格式
          content = `# ${title}\n\n## 网址\n${url}\n\n## 内容摘要\n${chunks[0].substring(0, 500)}...\n\n`;
          content += `## 完整内容 (分 ${chunks.length} 块)\n\n`;
          content += chunks[0]; // 添加第一块完整内容
        } else {
          // 单块内容
          content = `# ${title}\n\n## 网址\n${url}\n\n## 内容\n${rawText}`;
        }
        
        return {
          type: 'url',
          url,
          title,
          content, // 返回处理后的内容
          rawContent: rawText.substring(0, 50000), // 限制原始内容大小
          rawHtml: html.substring(0, 20000), // 进一步限制原始HTML大小
          chunks, // 返回所有文本块
          chunkCount: chunks.length,
          options,
          status: 'processed',
          proxy: successProxy
        };
      } catch (chunkError) {
        console.error('文本分块失败:', chunkError);
        // 即使分块失败，仍返回一个有效的结果
        return {
          type: 'url',
          url,
          title,
          content: `# ${title}\n\n## 网址\n${url}\n\n## 内容\n${rawText.substring(0, 5000)}...\n\n(内容已截断，原文本长度: ${rawText.length})`,
          error: `文本分块失败: ${chunkError.message}`,
          options,
          status: 'partial', // 部分成功
          proxy: successProxy
        };
      }
    } catch (error) {
      console.error(`处理URL失败: ${url}`, error);
      // 返回错误但不中断流程
      return {
        type: 'url',
        url,
        content: `无法获取URL内容，错误信息: ${error.message}\nURL: ${url}`,
        error: error.message,
        options,
        status: 'error'
      };
    }
  }
  
  /**
   * 专门提取维基百科内容
   * @param {string} html - 维基百科页面HTML
   * @param {string} url - 页面URL
   * @returns {Object} - 包含文本和标题的对象
   */
  extractWikipediaContent(html, url) {
    try {
      // 使用简单的正则表达式提取主要内容区
      let text = '';
      let title = '';
      
      // 提取标题
      const titleMatch = html.match(/<h1[^>]*id="firstHeading"[^>]*>(.*?)<\/h1>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      } else {
        // 回退到常规标题提取
        title = this.extractTitleFromHtml(html) || url;
      }
      
      // 提取内容区
      const contentMatch = html.match(/<div[^>]*id="mw-content-text"[^>]*>(.*?)<div[^>]*class="printfooter"/is);
      if (contentMatch && contentMatch[1]) {
        const contentHtml = contentMatch[1];
        // 移除参考文献、导航等不需要的部分
        const cleanedHtml = contentHtml
          .replace(/<div[^>]*class="[^"]*(?:navbox|reference|reflist)[^"]*"[^>]*>.*?<\/div>/gs, '')
          .replace(/<table[^>]*class="[^"]*(?:navbox|infobox)[^"]*"[^>]*>.*?<\/table>/gs, '');
          
        // 提取文本内容
        text = this.extractTextFromHtml(cleanedHtml);
      } else {
        // 回退到常规文本提取
        text = this.extractTextFromHtml(html);
      }
      
      return { text, title };
    } catch (error) {
      console.error('提取维基百科内容失败:', error);
      // 回退到常规文本提取
      return {
        text: this.extractTextFromHtml(html),
        title: this.extractTitleFromHtml(html) || url
      };
    }
  }
  
  /**
   * 将文本分割成多个块
   * @param {string} text - 要分割的文本
   * @param {number} maxLength - 每个块的最大长度
   * @param {number} overlap - 块之间的重叠字符数
   * @returns {Array<string>} - 文本块数组
   */
  chunkText(text, maxLength = 8000, overlap = 200) {
    // 安全检查：如果文本为空，直接返回空数组
    if (!text) {
      return [''];
    }
    
    // 安全检查：限制最大文本长度，避免处理过大的文本导致内存问题
    const MAX_SAFE_TEXT_LENGTH = 1000000; // 100万字符上限
    if (text.length > MAX_SAFE_TEXT_LENGTH) {
      console.warn(`文本长度 ${text.length} 超过安全上限 ${MAX_SAFE_TEXT_LENGTH}，将被截断`);
      text = text.substring(0, MAX_SAFE_TEXT_LENGTH);
    }
    
    // 如果文本小于最大长度，直接返回
    if (text.length <= maxLength) {
      return [text];
    }
    
    // 安全检查：确保块大小合理
    if (maxLength <= 0) {
      maxLength = 8000;
    }
    if (overlap < 0 || overlap >= maxLength) {
      overlap = Math.min(200, Math.floor(maxLength * 0.1)); // 默认10%重叠
    }
    
    const chunks = [];
    let startIndex = 0;
    
    // 计算可能的最大块数，并预先分配空间
    const estimatedChunkCount = Math.ceil(text.length / (maxLength - overlap)) + 1;
    const safeChunkCount = Math.min(estimatedChunkCount, 1000); // 限制最大块数
    
    try {
      while (startIndex < text.length) {
        // 确保不会创建过多块，防止内存问题
        if (chunks.length >= safeChunkCount) {
          console.warn(`已达到最大块数 ${safeChunkCount}，剩余文本将被忽略`);
          break;
        }
        
        // 确定当前块的结束位置
        let endIndex = Math.min(startIndex + maxLength, text.length);
        
        // 如果还有更多文本，尝试在自然边界分割
        if (endIndex < text.length) {
          // 尝试在段落、句子或单词边界分割
          const lastParagraph = text.lastIndexOf('\n\n', endIndex);
          const lastSentence = text.lastIndexOf('. ', endIndex);
          const lastSpace = text.lastIndexOf(' ', endIndex);
          
          // 选择最近的分割点，但不要回退太远
          const minAcceptableIndex = startIndex + Math.floor(maxLength * 0.7); // 至少使用70%的最大长度
          
          if (lastParagraph > minAcceptableIndex) {
            endIndex = lastParagraph + 2; // 包含段落标记
          } else if (lastSentence > minAcceptableIndex) {
            endIndex = lastSentence + 2; // 包含句号和空格
          } else if (lastSpace > minAcceptableIndex) {
            endIndex = lastSpace + 1; // 包含空格
          }
          // 如果没有合适的分割点，保持原来的endIndex
        }
        
        // 安全检查：确保endIndex不会超出范围
        endIndex = Math.min(endIndex, text.length);
        
        // 添加当前块
        chunks.push(text.substring(startIndex, endIndex));
        
        // 移动到下一个块的起始位置，考虑重叠
        startIndex = Math.max(startIndex, endIndex - overlap);
        
        // 防止无限循环
        if (startIndex >= endIndex) {
          startIndex = endIndex;
        }
      }
      
      return chunks;
    } catch (error) {
      console.error('文本分块失败:', error);
      // 出错时返回单个块，包含错误信息
      return [`文本分块失败: ${error.message}. 原文本长度: ${text.length}`];
    }
  }
  
  /**
   * 从HTML中提取标题
   * @private
   */
  extractTitleFromHtml(html) {
    try {
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      return titleMatch ? titleMatch[1].trim() : '';
    } catch (error) {
      return '';
    }
  }
  
  /**
   * 从HTML中提取文本
   * @private
   */
  extractTextFromHtml(html) {
    try {
      // 移除脚本和样式
      let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
                      
      // 替换换行、分段和标题标签为换行符
      text = text.replace(/<br\s*\/?>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<\/h[1-6]>/gi, '\n')
                .replace(/<\/div>/gi, '\n')
                .replace(/<\/li>/gi, '\n');
                
      // 移除所有其他HTML标签
      text = text.replace(/<[^>]*>/g, '');
      
      // 替换多个空白符为单个空格
      text = text.replace(/\s+/g, ' ');
      
      // 解码HTML实体
      text = text.replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"');
                
      return text.trim();
    } catch (error) {
      console.error('提取文本失败:', error);
      return html; // 返回原始HTML作为后备
    }
  }
  
  /**
   * 处理站点地图
   * @private
   */
  async processSitemap(url, options) {
    try {
      console.log(`开始处理站点地图: ${url}`);
      
      // 定义多个CORS代理选项
      const corsProxies = [
        { name: '无代理', url: url },
        { name: 'corsproxy.io', url: `https://corsproxy.io/?${encodeURIComponent(url)}` },
        { name: 'allOrigins', url: `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
        { name: 'cors-anywhere-demo', url: `https://cors-anywhere.herokuapp.com/${url}` },
        // 新增代理选项
        { name: 'corsfix', url: `https://proxy.corsfix.com/?${encodeURIComponent(url)}` },
        { name: 'cors.lol', url: `https://api.cors.lol/?url=${encodeURIComponent(url)}` },
        { name: 'codetabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` },
        { name: 'htmldriven', url: `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(url)}` },
        // cors.sh需要API密钥，如需使用请添加对应的headers
        // { name: 'cors.sh', url: `https://proxy.cors.sh/${url}`, headers: { 'x-cors-api-key': 'YOUR_API_KEY_HERE' } }
      ];
      
      let sitemapContent = null;
      let response = null;
      let successProxy = null;
      
      // 尝试所有代理选项直到一个成功
      for (const proxy of corsProxies) {
        try {
          console.log(`尝试使用代理 [${proxy.name}] 抓取站点地图: ${proxy.url}`);
          
          // 添加特定代理的headers
          const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            ...(proxy.headers || {}) // 合并额外的headers (如API密钥)
          };
          
          response = await fetch(proxy.url, {
            headers,
            // 设置超时
            signal: AbortSignal.timeout(15000) // 15秒超时
          });
          
          if (response.ok) {
            sitemapContent = await response.text();
            successProxy = proxy.name;
            console.log(`使用代理 [${proxy.name}] 抓取站点地图成功，内容大小: ${sitemapContent.length}`);
            break;
          } else {
            console.log(`使用代理 [${proxy.name}] 抓取站点地图失败: ${response.status} ${response.statusText}`);
          }
        } catch (proxyError) {
          console.log(`使用代理 [${proxy.name}] 发生错误: ${proxyError.message}`);
          // 继续尝试下一个代理
        }
      }
      
      // 如果所有代理都失败
      if (!sitemapContent) {
        console.error(`所有代理均失败，无法抓取站点地图: ${url}`);
        return {
          type: 'sitemap',
          url,
          content: `无法获取站点地图内容，URL: ${url}`,
          error: '所有代理均失败',
          options,
          status: 'error'
        };
      }
      
      // 解析XML找到所有URL
      const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g) || [];
      const urls = urlMatches.map(match => {
        const url = match.replace(/<\/?loc>/g, '').trim();
        return url;
      });
      
      console.log(`从站点地图中解析到 ${urls.length} 个URL`);
      
      // 将提取的URL保存为内容
      let content = `## 站点地图: ${url}\n\n`;
      content += `共找到 ${urls.length} 个URL:\n\n`;
      content += urls.map((url, index) => `${index + 1}. ${url}`).join('\n');
      
      return {
        type: 'sitemap',
        url,
        urls,
        content,
        urlCount: urls.length,
        options,
        status: 'processed',
        proxy: successProxy
      };
    } catch (error) {
      console.error(`处理站点地图失败: ${url}`, error);
      // 返回错误但不中断流程
      return {
        type: 'sitemap',
        url,
        content: `无法解析站点地图，错误信息: ${error.message}\n站点地图URL: ${url}`,
        error: error.message,
        options,
        status: 'error'
      };
    }
  }
  
  /**
   * 处理目录
   * @param {string} directoryPath - 目录路径
   * @param {Object} options - 处理选项
   */
  async processDirectory(directoryPath, options = {}) {
    try {
      console.log(`开始处理目录: ${directoryPath}`);
      
      // 对于前端，我们只能保存路径信息
      // 实际的文件处理需要Electron主进程支持
      
      return {
        type: 'directory',
        path: directoryPath,
        content: `目录: ${directoryPath}\n\n此目录将被异步处理，处理完成后会更新内容。`,
        options,
        status: 'processed'
      };
    } catch (error) {
      console.error(`处理目录失败: ${directoryPath}`, error);
      return {
        type: 'directory',
        path: directoryPath,
        content: `处理目录失败: ${error.message}\n目录路径: ${directoryPath}`,
        error: error.message,
        options,
        status: 'error'
      };
    }
  }
  
  /**
   * 处理笔记
   * @param {string} title - 笔记标题
   * @param {string} content - 笔记内容
   * @param {Object} options - 处理选项
   */
  async processNote(title, content, options = {}) {
    return {
      type: 'note',
      title,
      content,
      options,
      status: 'processed'
    };
  }
  
  /**
   * 读取文件为文本，支持多种编码
   * @private
   */
  async readFileAsText(file) {
    // 尝试不同的编码格式
    const encodings = ['UTF-8', 'GBK', 'GB18030', 'UTF-16', 'UTF-16LE', 'UTF-16BE', 'ISO-8859-1'];
    
    // 首先尝试自动检测编码
    try {
      const result = await this.tryReadWithEncoding(file);
      // 如果读取结果为空或只有空白字符，尝试其他编码
      if (!result || result.trim().length === 0) {
        console.warn(`文件 ${file.name} 使用默认编码读取为空，尝试其他编码...`);
        return await this.tryMultipleEncodings(file, encodings);
      }
      return result;
    } catch (error) {
      console.error(`使用默认编码读取文件失败: ${error.message}`);
      // 如果默认编码读取失败，尝试其他编码
      return await this.tryMultipleEncodings(file, encodings);
    }
  }
  
  /**
   * 使用指定编码尝试读取文件
   * @private
   */
  async tryReadWithEncoding(file, encoding) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        console.log(`文件 ${file.name} ${encoding ? `使用 ${encoding} 编码` : ''}读取成功，内容长度: ${result.length}`);
        resolve(result);
      };
      reader.onerror = (e) => reject(new Error(`读取文件失败: ${e.target.error.message}`));
      
      if (encoding) {
        // 尝试使用指定编码读取
        try {
          reader.readAsText(file, encoding);
        } catch (error) {
          // 如果浏览器不支持此编码，回退到默认编码
          console.warn(`浏览器不支持 ${encoding} 编码，使用默认编码`);
          reader.readAsText(file);
        }
      } else {
        // 使用默认编码
        reader.readAsText(file);
      }
    });
  }
  
  /**
   * 尝试多种编码读取文件
   * @private
   */
  async tryMultipleEncodings(file, encodings) {
    for (const encoding of encodings) {
      try {
        const result = await this.tryReadWithEncoding(file, encoding);
        // 检查读取结果是否有效
        if (result && result.trim().length > 0) {
          console.log(`成功使用 ${encoding} 编码读取文件 ${file.name}`);
          return result;
        }
      } catch (error) {
        console.warn(`使用 ${encoding} 编码读取失败: ${error.message}`);
      }
    }
    
    // 所有编码都失败了，抛出错误
    throw new Error(`无法使用任何已知编码读取文件: ${file.name}`);
  }
}

// 导出一个单例
export default new FileProcessingService(); 