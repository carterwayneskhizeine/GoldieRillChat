/**
 * Google Custom Search API 服务
 * 
 * 注意：此服务已被 tavilyService.js 替换
 * 此文件保留作为参考和备份
 * 新的搜索功能请使用 tavilyService
 */
import * as cheerio from 'cheerio';

class SearchService {
  constructor() {
    this.baseUrl = 'https://www.googleapis.com/customsearch/v1';
    this.cache = new Map();
    this.cacheExpiration = 30 * 60 * 1000; // 30分钟缓存过期
  }

  /**
   * 从localStorage获取API配置
   */
  getConfig() {
    const apiKey = localStorage.getItem('aichat_google_api_key');
    const searchEngineId = localStorage.getItem('aichat_search_engine_id');
    const maxResults = parseInt(localStorage.getItem('aichat_max_search_results')) || 10;
    
    if (!apiKey || !searchEngineId) {
      throw new Error('请先在设置中配置 Google API 密钥和搜索引擎 ID');
    }

    // 确保结果数量不超过10
    const validMaxResults = Math.min(Math.max(1, maxResults), 10);
    return { apiKey, searchEngineId, maxResults: validMaxResults };
  }

  /**
   * 生成缓存键
   */
  getCacheKey(query) {
    return `search:${query}`;
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
   * 执行Google搜索
   * @param {string} query - 搜索查询
   * @param {number} num - 返回结果数量（默认5个）
   * @returns {Promise<Object>} 搜索结果
   */
  async googleSearch(query, num = 5) {
    // 检查缓存
    const cached = this.checkCache(query);
    if (cached) {
      return cached;
    }

    try {
      const { apiKey, searchEngineId } = this.getConfig();
      
      // 构建搜索URL
      const params = new URLSearchParams({
        key: apiKey,
        cx: searchEngineId,
        q: query,
        num: num.toString(),
        safe: 'active'
      });

      // 发起请求
      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || '搜索请求失败');
      }

      const data = await response.json();
      
      // 缓存结果
      this.setCache(query, data);
      
      return data;
    } catch (error) {
      console.error('Google搜索失败:', error);
      throw error;
    }
  }

  /**
   * 抓取网页内容
   * @param {string} url - 网页URL
   * @returns {Promise<string>} 处理后的网页内容
   */
  async fetchPageContent(url) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      return this.extractMainContent(html);
    } catch (error) {
      console.error(`抓取页面失败 ${url}:`, error);
      return null;
    }
  }

  /**
   * 提取网页主要内容
   * @param {string} html - 网页HTML
   * @returns {string} 处理后的主要内容
   */
  extractMainContent(html) {
    const $ = cheerio.load(html);

    // 移除不需要的元素
    $('script, style, iframe, nav, footer, header, aside').remove();
    $('[class*="advertisement"], [id*="advertisement"]').remove();
    $('[class*="banner"], [id*="banner"]').remove();

    // 获取主要内容区域
    let content = '';
    
    // 尝试找到主要内容区域
    const mainSelectors = ['main', 'article', '.content', '#content', '.main', '#main'];
    for (const selector of mainSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }

    // 如果没有找到主要内容区域，获取body内容
    if (!content) {
      content = $('body').text();
    }

    // 清理文本
    return this.cleanText(content);
  }

  /**
   * 清理文本内容
   * @param {string} text - 原始文本
   * @returns {string} 清理后的文本
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')  // 合并多个空白字符
      .replace(/\n+/g, '\n') // 合并多个换行
      .trim();
  }

  /**
   * 搜索并获取内容
   * @param {string} query - 搜索查询
   * @returns {Promise<Object>} 处理后的搜索结果和网页内容
   */
  async searchAndFetchContent(query) {
    // 检查缓存
    const cached = this.checkCache(query);
    if (cached) {
      return cached;
    }

    try {
      const { apiKey, searchEngineId, maxResults } = this.getConfig();
      
      // 构建搜索URL
      const params = new URLSearchParams({
        key: apiKey,
        cx: searchEngineId,
        q: query,
        num: maxResults.toString(),
        safe: 'active'
      });

      // 发起请求
      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || '搜索请求失败');
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        throw new Error('未找到相关搜索结果');
      }

      // 获取搜索结果的网页内容
      const contentPromises = data.items.map(async result => {
        try {
          // 使用代理服务器来解决CORS问题
          // 这里使用CORS代理服务，如果需要可以替换为自己的代理服务器
          const proxyUrl = 'https://corsproxy.io/?';
          const targetUrl = encodeURIComponent(result.link);
          
          const response = await fetch(`${proxyUrl}${targetUrl}`, {
            mode: 'cors', // 使用cors模式而不是no-cors
            headers: {
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (!response.ok) {
            throw new Error(`请求失败: ${response.status} ${response.statusText}`);
          }
          
          const html = await response.text();
          const content = this.extractMainContent(html);
          
          if (content) {
            return {
              title: result.title,
              link: result.link,
              snippet: result.snippet,
              content: content.substring(0, 2000), // 限制内容长度
              displayUrl: result.displayLink || result.link // 添加显示用的URL
            };
          }
        } catch (error) {
          console.error(`抓取页面失败 ${result.link}:`, error);
        }
        return {
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          content: result.snippet, // 如果抓取失败，使用搜索结果摘要作为内容
          displayUrl: result.displayLink || result.link
        };
      });

      // 等待所有内容获取完成
      const contents = await Promise.all(contentPromises);

      const searchResults = {
        query,
        timestamp: Date.now(),
        results: contents
      };

      // 缓存结果
      this.setCache(query, searchResults);
      
      return searchResults;
    } catch (error) {
      console.error('搜索失败:', error);
      throw error;
    }
  }

  async search(query) {
    const apiKey = localStorage.getItem('aichat_google_api_key');
    const searchEngineId = localStorage.getItem('aichat_search_engine_id');
    const maxResults = parseInt(localStorage.getItem('aichat_max_search_results')) || 5;

    if (!apiKey || !searchEngineId) {
      throw new Error('Google API Key 或搜索引擎 ID 未设置');
    }

    const cacheKey = this.generateCacheKey(query);
    const cachedResults = this.checkCache(cacheKey);
    if (cachedResults) {
      return cachedResults;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=${maxResults}`
      );

      if (!response.ok) {
        throw new Error('搜索请求失败');
      }

      const data = await response.json();
      const results = data.items || [];
      
      const searchResults = {
        query,
        timestamp: Date.now(),
        results: results.map(item => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet
        }))
      };

      this.setCache(cacheKey, searchResults);
      return searchResults;

    } catch (error) {
      console.error('搜索失败:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const searchService = new SearchService(); 