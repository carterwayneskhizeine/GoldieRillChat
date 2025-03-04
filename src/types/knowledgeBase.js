/**
 * 知识库类型定义
 */

// 知识库项类型
export const KnowledgeItemTypes = {
  FILE: 'file',
  URL: 'url',
  NOTE: 'note',
  SITEMAP: 'sitemap',
  DIRECTORY: 'directory'
};

// 处理状态
export const ProcessingStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * @typedef {Object} KnowledgeItem
 * @property {string} id - 唯一ID
 * @property {string} baseId - 所属知识库ID
 * @property {string} type - 项目类型（file|url|note|sitemap|directory）
 * @property {Object|string} content - 内容，可能是字符串或文件对象
 * @property {string} [remark] - 备注
 * @property {number} created_at - 创建时间戳
 * @property {number} updated_at - 更新时间戳
 * @property {string} [processingStatus] - 处理状态
 * @property {number} [processingProgress] - 处理进度(0-100)
 * @property {string} [processingError] - 处理错误信息
 */

/**
 * @typedef {Object} KnowledgeBase
 * @property {string} id - 唯一ID
 * @property {string} name - 知识库名称
 * @property {Object} model - 嵌入模型
 * @property {number} dimensions - 嵌入维度
 * @property {string} [description] - 描述
 * @property {KnowledgeItem[]} items - 知识库项目
 * @property {number} created_at - 创建时间戳
 * @property {number} updated_at - 更新时间戳
 * @property {number} documentCount - 文档数量
 * @property {number} [threshold] - 相似度阈值
 */

/**
 * @typedef {Object} KnowledgeReference
 * @property {number} id - 引用ID
 * @property {string} content - 引用内容
 * @property {string} sourceUrl - 来源URL
 * @property {string} type - 项目类型
 * @property {Object} [file] - 文件信息
 */ 