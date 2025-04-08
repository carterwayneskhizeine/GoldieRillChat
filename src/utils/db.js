/**
 * 知识库数据库模块
 * 使用Dexie.js操作IndexedDB
 */
import Dexie from 'dexie';
import { v4 as uuidv4 } from 'uuid';

// 创建数据库实例
export const db = new Dexie('GoldieRillChatDB');

// 定义数据库结构
db.version(1).stores({
  // 知识库表
  knowledgeBases: 'id, name, model, created_at, updated_at',
  
  // 知识库项目表
  knowledgeItems: 'id, baseId, type, created_at, updated_at, processingStatus',
  
  // 知识库笔记内容表 (单独存储笔记内容，提高性能)
  knowledgeNotes: 'id, itemId, content'
});

/**
 * 知识库数据操作工具类
 */
export const KnowledgeDB = {
  /**
   * 获取所有知识库
   * @returns {Promise<Array>} 知识库列表
   */
  getAllBases: async () => {
    return await db.knowledgeBases.toArray();
  },
  
  /**
   * 获取单个知识库
   * @param {string} id 知识库ID
   * @returns {Promise<Object>} 知识库对象
   */
  getBase: async (id) => {
    const base = await db.knowledgeBases.get(id);
    if (base) {
      // 加载知识库项目
      base.items = await db.knowledgeItems
        .where('baseId')
        .equals(id)
        .toArray();
    }
    return base;
  },
  
  /**
   * 添加知识库
   * @param {Object} base 知识库对象
   * @returns {Promise<string>} 知识库ID
   */
  addBase: async (base) => {
    const timestamp = Date.now();
    const baseWithTimestamp = {
      ...base,
      created_at: timestamp,
      updated_at: timestamp,
      items: []
    };
    
    const id = await db.knowledgeBases.add(baseWithTimestamp);
    return id;
  },
  
  /**
   * 更新知识库
   * @param {string} id 知识库ID
   * @param {Object} updates 更新内容
   * @returns {Promise<void>}
   */
  updateBase: async (id, updates) => {
    await db.knowledgeBases.update(id, {
      ...updates,
      updated_at: Date.now()
    });
  },
  
  /**
   * 删除知识库
   * @param {string} id 知识库ID
   * @returns {Promise<void>}
   */
  deleteBase: async (id) => {
    // 删除知识库相关的所有项目
    const items = await db.knowledgeItems
      .where('baseId')
      .equals(id)
      .toArray();
      
    // 删除笔记内容
    const noteItems = items.filter(item => item.type === 'note');
    if (noteItems.length > 0) {
      await db.knowledgeNotes
        .where('itemId')
        .anyOf(noteItems.map(item => item.id))
        .delete();
    }
    
    // 删除所有项目
    await db.knowledgeItems
      .where('baseId')
      .equals(id)
      .delete();
      
    // 删除知识库
    await db.knowledgeBases.delete(id);
  },
  
  /**
   * 添加知识库项目
   * @param {Object} item 知识库项目
   * @returns {Promise<string>} 项目ID
   */
  addItem: async (item) => {
    const timestamp = Date.now();
    const itemWithTimestamp = {
      ...item,
      created_at: timestamp,
      updated_at: timestamp
    };
    
    const id = await db.knowledgeItems.add(itemWithTimestamp);
    
    // 如果是笔记类型，单独存储内容
    if (item.type === 'note' && typeof item.content === 'string') {
      await db.knowledgeNotes.add({
        id: uuidv4(),
        itemId: id,
        content: item.content
      });
      
      // 移除内容，避免重复存储
      await db.knowledgeItems.update(id, { content: '' });
    }
    
    // 更新知识库的更新时间
    await db.knowledgeBases.update(item.baseId, {
      updated_at: timestamp
    });
    
    return id;
  },
  
  /**
   * 获取笔记内容
   * @param {string} itemId 笔记项目ID
   * @returns {Promise<string>} 笔记内容
   */
  getNoteContent: async (itemId) => {
    const note = await db.knowledgeNotes
      .where('itemId')
      .equals(itemId)
      .first();
    return note ? note.content : '';
  },
  
  /**
   * 更新笔记内容
   * @param {string} itemId 笔记项目ID
   * @param {string} content 笔记内容
   * @returns {Promise<void>}
   */
  updateNoteContent: async (itemId, content) => {
    const note = await db.knowledgeNotes
      .where('itemId')
      .equals(itemId)
      .first();
      
    if (note) {
      await db.knowledgeNotes.update(note.id, { content });
    } else {
      await db.knowledgeNotes.add({
        id: uuidv4(),
        itemId,
        content
      });
    }
    
    // 更新项目的更新时间
    await db.knowledgeItems.update(itemId, {
      updated_at: Date.now()
    });
  },
  
  /**
   * 更新知识库项目
   * @param {string} id 项目ID
   * @param {Object} updates 更新内容
   * @returns {Promise<void>}
   */
  updateItem: async (id, updates) => {
    await db.knowledgeItems.update(id, {
      ...updates,
      updated_at: Date.now()
    });
  },
  
  /**
   * 删除知识库项目
   * @param {string} id 项目ID
   * @returns {Promise<void>}
   */
  deleteItem: async (id) => {
    const item = await db.knowledgeItems.get(id);
    if (!item) return;
    
    // 如果是笔记，删除笔记内容
    if (item.type === 'note') {
      await db.knowledgeNotes
        .where('itemId')
        .equals(id)
        .delete();
    }
    
    // 删除项目
    await db.knowledgeItems.delete(id);
    
    // 更新知识库的更新时间
    await db.knowledgeBases.update(item.baseId, {
      updated_at: Date.now()
    });
  }
};

export default db; 