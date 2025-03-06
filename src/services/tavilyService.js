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
    
    // 解析包含和排除的域名
    let includeDomains = [];
    let excludeDomains = [];
    try {
      includeDomains = JSON.parse(localStorage.getItem('aichat_tavily_include_domains') || '[]');
      excludeDomains = JSON.parse(localStorage.getItem('aichat_tavily_exclude_domains') || '[]');
    } catch (error) {
      console.error('解析域名列表失败:', error);
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
      includeDomains: includeDomains.filter(d => d),
      excludeDomains: excludeDomains.filter(d => d)
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
        topic: config.searchTopic,
        include_answer: config.includeAnswer,
        include_domains: config.includeDomains,
        exclude_domains: config.excludeDomains
      };

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
          throw new Error(errorData.message || `搜索请求失败: ${response.status}`);
        }
      }

      const data = await response.json();
      
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
        answer: data.answer
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
   * 搜索并获取内容 - 与searchService保持兼容的接口
   * @param {string} query - 搜索查询
   * @returns {Promise<Object>} 处理后的搜索结果和网页内容
   */
  async searchAndFetchContent(query) {
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
      
      // 如果搜索结果中已经包含了内容，直接返回
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