/**
 * Tavily AI 搜索服务
 */

class TavilyService {
  constructor() {
    this.baseUrl = 'https://api.tavily.com';
    this.cache = new Map();
    this.cacheExpiration = 30 * 60 * 1000; // 30分钟缓存过期
  }

  /**
   * 从localStorage获取API配置
   */
  getConfig() {
    const apiKey = localStorage.getItem('aichat_tavily_api_key');
    const maxResults = parseInt(localStorage.getItem('aichat_tavily_max_results')) || 5;
    const searchDepth = localStorage.getItem('aichat_tavily_search_depth') || 'basic';
    const searchTopic = localStorage.getItem('aichat_tavily_topic') || 'general';
    const includeAnswer = localStorage.getItem('aichat_tavily_include_answer') === 'true' ? true : 
                         localStorage.getItem('aichat_tavily_include_answer') === 'advanced' ? 'advanced' : false;
    // 读取图片相关参数
    const includeImages = localStorage.getItem('aichat_tavily_include_images') === 'true';
    const includeImageDescriptions = localStorage.getItem('aichat_tavily_include_image_descriptions') === 'true';
    const timeRange = localStorage.getItem('aichat_tavily_time_range') || '';
    const includeRawContent = localStorage.getItem('aichat_tavily_include_raw_content') === 'true';
    const days = parseInt(localStorage.getItem('aichat_tavily_days') || '3');
    
    // 解析包含和排除的域名
    let includeDomains = [];
    let excludeDomains = [];
    try {
      includeDomains = JSON.parse(localStorage.getItem('aichat_tavily_include_domains') || '[]');
      excludeDomains = JSON.parse(localStorage.getItem('aichat_tavily_exclude_domains') || '[]');
      
      // 过滤掉空字符串和非法值
      includeDomains = Array.isArray(includeDomains) ? includeDomains.filter(d => typeof d === 'string' && d.trim() !== '') : [];
      excludeDomains = Array.isArray(excludeDomains) ? excludeDomains.filter(d => typeof d === 'string' && d.trim() !== '') : [];
    } catch (error) {
      console.error('解析域名列表失败:', error);
      includeDomains = [];
      excludeDomains = [];
    }
    
    if (!apiKey) {
      throw new Error('请先在设置中配置 Tavily API 密钥');
    }

    // 确保结果数量在有效范围内
    const validMaxResults = Math.min(Math.max(1, maxResults), 20);
    
    return { 
      apiKey, 
      maxResults: validMaxResults, 
      searchDepth,
      searchTopic,
      includeAnswer,
      includeDomains,
      excludeDomains,
      includeImages,
      includeImageDescriptions,
      timeRange,
      includeRawContent,
      days
    };
  }

  /**
   * 生成缓存键
   */
  getCacheKey(query) {
    return `tavily:${query}`;
  }

  /**
   * 检查缓存
   */
  checkCache(query) {
    const key = this.getCacheKey(query);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiration) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * 设置缓存
   */
  setCache(query, data) {
    const key = this.getCacheKey(query);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 检查是否配置了API密钥
   */
  isConfigured() {
    const apiKey = localStorage.getItem('aichat_tavily_api_key');
    return !!apiKey;
  }

  /**
   * 执行Tavily搜索
   * @param {string} query - 搜索查询
   * @returns {Promise<Object>} 搜索结果
   */
  async search(query) {
    // 检查是否配置了API密钥
    if (!this.isConfigured()) {
      throw new Error('请先在设置中配置 Tavily API 密钥');
    }

    // 检查缓存
    const cached = this.checkCache(query);
    if (cached) {
      return cached;
    }

    try {
      const config = this.getConfig();
      
      // 构建请求体
      const requestBody = {
        query,
        search_depth: config.searchDepth,
        max_results: config.maxResults,
        topic: config.searchTopic
      };
      
      // 添加includeAnswer参数并确保格式正确
      if (config.includeAnswer === true || config.includeAnswer === 'basic') {
        requestBody.include_answer = true;
      } else if (config.includeAnswer === 'advanced') {
        requestBody.include_answer = 'advanced';
      } else {
        requestBody.include_answer = false;
      }
      
      // 添加图片相关参数
      requestBody.include_images = !!config.includeImages;
      requestBody.include_image_descriptions = !!config.includeImageDescriptions;
      
      // 只有当数组不为空时才添加域名参数
      if (config.includeDomains && config.includeDomains.length > 0) {
        requestBody.include_domains = config.includeDomains;
      }
      
      if (config.excludeDomains && config.excludeDomains.length > 0) {
        requestBody.exclude_domains = config.excludeDomains;
      }
      
      // 添加可选参数
      if (config.timeRange) {
        requestBody.time_range = config.timeRange;
      }
      
      if (config.includeRawContent) {
        requestBody.include_raw_content = !!config.includeRawContent;
      }
      
      if (config.searchTopic === 'news' && config.days) {
        requestBody.days = Math.max(1, parseInt(config.days) || 3);
      }

      // 打印请求参数便于调试
      console.log('Tavily搜索参数:', JSON.stringify(requestBody, null, 2));

      // 发起请求
      const response = await Promise.race([
        fetch(`${this.baseUrl}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify(requestBody)
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('搜索请求超时，请检查网络连接')), 30000)
        )
      ]);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Tavily API 密钥无效，请检查设置');
        } else if (response.status === 429) {
          throw new Error('已超出 Tavily API 使用限制，请稍后再试');
        } else {
          // 尝试获取更详细的错误信息
          const errorMsg = errorData.message || errorData.error || JSON.stringify(errorData);
          console.error('Tavily API错误详情:', errorData);
          throw new Error(`搜索请求失败: ${response.status}${errorMsg ? ' - ' + errorMsg : ''}`);
        }
      }

      const data = await response.json();
      console.log('Tavily原始搜索结果:', data);
      
      // 转换为统一格式
      const searchResults = {
        query,
        timestamp: Date.now(),
        results: data.results.map(result => ({
          title: result.title,
          link: result.url,
          snippet: result.content,
          content: result.raw_content || result.content,
          displayUrl: new URL(result.url).hostname,
          score: result.score
        })),
        answer: data.answer,
        images: data.images // 保存图片结果
      };
      
      // 缓存结果
      this.setCache(query, searchResults);
      
      return searchResults;
    } catch (error) {
      console.error('Tavily搜索失败:', error);
      throw error;
    }
  }

  /**
   * 提取网页内容
   * @param {string} url - 网页URL
   * @returns {Promise<string>} 提取的网页内容
   */
  async extractContent(url) {
    // 检查是否配置了API密钥
    if (!this.isConfigured()) {
      throw new Error('请先在设置中配置 Tavily API 密钥');
    }

    try {
      const config = this.getConfig();
      
      const response = await Promise.race([
        fetch(`${this.baseUrl}/extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            urls: url,
            extract_depth: config.searchDepth
          })
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('提取内容请求超时，请检查网络连接')), 30000)
        )
      ]);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Tavily API 密钥无效，请检查设置');
        } else if (response.status === 429) {
          throw new Error('已超出 Tavily API 使用限制，请稍后再试');
        } else {
          throw new Error(`提取内容失败: ${response.status}`);
        }
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results[0].raw_content;
      }
      
      return null;
    } catch (error) {
      console.error(`提取内容失败 ${url}:`, error);
      return null;
    }
  }

  /**
   * 下载搜索返回的图片到本地
   * @param {Array} images - 图片URL数组
   * @param {string} folderPath - 保存图片的文件夹路径
   * @returns {Promise<Array>} - 更新后的图片数组
   */
  async downloadSearchImages(images, folderPath) {
    try {
      console.log(`开始下载 ${images.length} 张图片到 ${folderPath}`);
      
      // 调用Electron的图片下载API
      const result = await window.electron.downloadSearchImages(images.map(img => img.url), folderPath);
      
      if (!result.success) {
        console.error('图片下载失败:', result.error);
        return images; // 下载失败时返回原始图片数组
      }
      
      // 更新图片URL为本地路径
      return images.map((img, index) => {
        const downloadResult = result.images[index];
        if (downloadResult && downloadResult.success) {
          // 找到对应的下载结果，并更新URL为本地路径
          return {
            ...img,
            originalUrl: img.url, // 保存原始URL
            url: `file://${downloadResult.localPath}` // 更新为本地文件路径
          };
        }
        return img; // 如果下载失败，保持原样
      });
    } catch (error) {
      console.error('下载图片过程中出错:', error);
      return images; // 出错时返回原始图片数组
    }
  }

  /**
   * 搜索并获取内容 - 与searchService保持兼容的接口
   * @param {string} query - 搜索查询
   * @param {string} folderPath - 保存图片的文件夹路径 
   * @returns {Promise<Object>} 处理后的搜索结果和网页内容
   */
  async searchAndFetchContent(query, folderPath) {
    // 检查是否配置了API密钥
    if (!this.isConfigured()) {
      throw new Error('请先在设置中配置 Tavily API 密钥');
    }

    // 检查缓存
    const cached = this.checkCache(query);
    if (cached) {
      return cached;
    }

    try {
      const searchResults = await this.search(query);
      const config = this.getConfig();
      
      // 检查图片设置和结果
      // 只有当includeImages为true，且有图片结果，且有文件夹路径时才处理图片
      if (config.includeImages && searchResults.images && searchResults.images.length > 0 && folderPath) {
        console.log(`搜索返回了 ${searchResults.images.length} 张图片，开始下载到本地...`);
        
        // 下载图片并更新URL为本地路径
        const updatedImages = await this.downloadSearchImages(searchResults.images, folderPath);
        
        // 更新搜索结果中的图片数组
        searchResults.images = updatedImages;
        
        // 更新缓存
        this.setCache(query, searchResults);
      } else if (!config.includeImages) {
        // 如果设置为不包含图片，移除图片数组
        if (searchResults.images) {
          console.log('根据设置，不处理搜索图片结果');
          delete searchResults.images;
          // 更新缓存
          this.setCache(query, searchResults);
        }
      }
      
      // 如果搜索结果中已经包含了内容，直接返回完整的结果
      if (searchResults.results && searchResults.results.length > 0) {
        return searchResults;
      }
      
      throw new Error('未找到相关搜索结果');
    } catch (error) {
      console.error('搜索失败:', error);
      throw error;
    }
  }

  /**
   * 测试搜索功能
   */
  async testSearch() {
    try {
      if (!this.isConfigured()) {
        console.error('请先配置Tavily API Key');
        return {
          success: false,
          message: '请先在设置中配置 Tavily API 密钥'
        };
      }
      const results = await this.search('What is artificial intelligence?');
      console.log('Tavily搜索测试结果:', results);
      return {
        success: true,
        message: '搜索测试成功',
        results
      };
    } catch (error) {
      console.error('Tavily搜索测试失败:', error);
      return {
        success: false,
        message: `搜索测试失败: ${error.message}`,
        error
      };
    }
  }
}

// 导出单例实例
export const tavilyService = new TavilyService(); 