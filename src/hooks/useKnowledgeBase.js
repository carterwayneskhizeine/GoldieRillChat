/**
 * 知识库钩子函数
 * 用于在React组件中使用知识库功能
 */
import { useState, useEffect, useCallback } from 'react';
import { KnowledgeDB } from '../utils/db';
import KnowledgeService from '../services/KnowledgeBaseService';
import { KnowledgeItemTypes } from '../types/knowledgeBase';

/**
 * 获取所有知识库
 * @returns {Object} 知识库操作对象
 */
export const useKnowledgeBases = () => {
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 加载所有知识库
  const loadBases = useCallback(async () => {
    setLoading(true);
    try {
      const allBases = await KnowledgeDB.getAllBases();
      setBases(allBases);
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 添加知识库
  const addBase = useCallback(async (name, model) => {
    try {
      const newBase = await KnowledgeService.addKnowledgeBase(name, model);
      setBases(prev => [...prev, newBase]);
      return newBase;
    } catch (error) {
      console.error('Failed to add knowledge base:', error);
      throw error;
    }
  }, []);
  
  // 重命名知识库
  const renameBase = useCallback(async (baseId, name) => {
    try {
      await KnowledgeDB.updateBase(baseId, { name });
      setBases(prev => 
        prev.map(base => 
          base.id === baseId ? { ...base, name } : base
        )
      );
    } catch (error) {
      console.error('Failed to rename knowledge base:', error);
      throw error;
    }
  }, []);
  
  // 删除知识库
  const deleteBase = useCallback(async (baseId) => {
    try {
      await KnowledgeDB.deleteBase(baseId);
      setBases(prev => prev.filter(base => base.id !== baseId));
    } catch (error) {
      console.error('Failed to delete knowledge base:', error);
      throw error;
    }
  }, []);
  
  // 更新知识库设置
  const updateBaseSettings = useCallback(async (baseId, settings) => {
    try {
      await KnowledgeDB.updateBase(baseId, settings);
      setBases(prev => 
        prev.map(base => 
          base.id === baseId ? { ...base, ...settings } : base
        )
      );
    } catch (error) {
      console.error('Failed to update knowledge base settings:', error);
      throw error;
    }
  }, []);
  
  // 组件挂载时加载所有知识库
  useEffect(() => {
    loadBases();
  }, [loadBases]);
  
  return {
    bases,
    loading,
    addBase,
    renameBase,
    deleteBase,
    updateBaseSettings,
    refreshBases: loadBases
  };
};

/**
 * 使用单个知识库
 * @param {string} baseId 知识库ID
 * @returns {Object} 知识库操作对象
 */
export const useKnowledgeBase = (baseId) => {
  const [base, setBase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [processingItems, setProcessingItems] = useState([]);
  
  // 加载知识库
  const loadBase = useCallback(async () => {
    if (!baseId) return;
    
    setLoading(true);
    try {
      const knowledgeBase = await KnowledgeDB.getBase(baseId);
      if (knowledgeBase) {
        setBase(knowledgeBase);
        setItems(knowledgeBase.items || []);
        
        // 过滤正在处理的项目
        const processing = (knowledgeBase.items || []).filter(
          item => item.processingStatus === 'pending' || item.processingStatus === 'processing'
        );
        setProcessingItems(processing);
      }
    } catch (error) {
      console.error('Failed to load knowledge base:', error);
    } finally {
      setLoading(false);
    }
  }, [baseId]);
  
  // 添加文件
  const addFiles = useCallback(async (files) => {
    if (!baseId || !files.length) return;
    
    try {
      const newItems = [];
      
      for (const file of files) {
        const item = await KnowledgeService.addFileToKnowledgeBase(baseId, file);
        newItems.push(item);
      }
      
      setItems(prev => [...prev, ...newItems]);
      setProcessingItems(prev => [...prev, ...newItems]);
      
      return newItems;
    } catch (error) {
      console.error('Failed to add files:', error);
      throw error;
    }
  }, [baseId]);
  
  // 添加URL
  const addUrl = useCallback(async (url) => {
    if (!baseId || !url) return;
    
    try {
      const item = await KnowledgeService.addUrlToKnowledgeBase(baseId, url);
      setItems(prev => [...prev, item]);
      setProcessingItems(prev => [...prev, item]);
      return item;
    } catch (error) {
      console.error('Failed to add URL:', error);
      throw error;
    }
  }, [baseId]);
  
  // 添加笔记
  const addNote = useCallback(async (content) => {
    if (!baseId || !content) return;
    
    try {
      const item = await KnowledgeService.addNoteToKnowledgeBase(baseId, content);
      setItems(prev => [...prev, item]);
      setProcessingItems(prev => [...prev, item]);
      return item;
    } catch (error) {
      console.error('Failed to add note:', error);
      throw error;
    }
  }, [baseId]);
  
  // 更新笔记内容
  const updateNoteContent = useCallback(async (itemId, content) => {
    if (!itemId || !content) return;
    
    try {
      await KnowledgeDB.updateNoteContent(itemId, content);
      
      // 更新项目处理状态
      await KnowledgeService.updateItemStatus(itemId, 'pending', 0);
      setItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, processingStatus: 'pending', processingProgress: 0 } 
            : item
        )
      );
      
      // 模拟处理过程
      setTimeout(async () => {
        await KnowledgeService.updateItemStatus(itemId, 'processing', 50);
        setItems(prev => 
          prev.map(item => 
            item.id === itemId 
              ? { ...item, processingStatus: 'processing', processingProgress: 50 } 
              : item
          )
        );
        
        setTimeout(async () => {
          await KnowledgeService.updateItemStatus(itemId, 'completed', 100);
          setItems(prev => 
            prev.map(item => 
              item.id === itemId 
                ? { ...item, processingStatus: 'completed', processingProgress: 100 } 
                : item
            )
          );
          setProcessingItems(prev => prev.filter(item => item.id !== itemId));
        }, 1000);
      }, 500);
    } catch (error) {
      console.error('Failed to update note content:', error);
      throw error;
    }
  }, []);
  
  // 获取笔记内容
  const getNoteContent = useCallback(async (itemId) => {
    if (!itemId) return '';
    
    try {
      return await KnowledgeDB.getNoteContent(itemId);
    } catch (error) {
      console.error('Failed to get note content:', error);
      return '';
    }
  }, []);
  
  // 更新项目
  const updateItem = useCallback(async (itemId, updates) => {
    if (!itemId) return;
    
    try {
      await KnowledgeDB.updateItem(itemId, updates);
      setItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
    } catch (error) {
      console.error('Failed to update item:', error);
      throw error;
    }
  }, []);
  
  // 删除项目
  const removeItem = useCallback(async (itemId) => {
    if (!itemId) return;
    
    try {
      await KnowledgeDB.deleteItem(itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
      setProcessingItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Failed to remove item:', error);
      throw error;
    }
  }, []);
  
  // 获取处理状态
  const getProcessingStatus = useCallback((itemId) => {
    const item = items.find(item => item.id === itemId);
    return item ? item.processingStatus : null;
  }, [items]);
  
  // 获取处理进度
  const getProcessingProgress = useCallback((itemId) => {
    const item = items.find(item => item.id === itemId);
    return item ? item.processingProgress || 0 : 0;
  }, [items]);
  
  // 过滤指定类型的项目
  const getItemsByType = useCallback((type) => {
    return items.filter(item => item.type === type);
  }, [items]);
  
  // 获取指定类型的正在处理的项目
  const getProcessingItemsByType = useCallback((type) => {
    return processingItems.filter(item => item.type === type);
  }, [processingItems]);
  
  // 清除已完成的项目
  const clearCompleted = useCallback(() => {
    setProcessingItems(prev => 
      prev.filter(item => 
        item.processingStatus !== 'completed' && item.processingStatus !== 'failed'
      )
    );
  }, []);
  
  // 组件挂载时加载知识库
  useEffect(() => {
    loadBase();
    
    // 定期更新处理状态
    const intervalId = setInterval(() => {
      processingItems.forEach(async (item) => {
        const updatedItem = await KnowledgeDB.getBase(baseId)
          .then(base => base.items.find(i => i.id === item.id));
          
        if (updatedItem && updatedItem.processingStatus !== item.processingStatus) {
          setItems(prev => 
            prev.map(i => 
              i.id === item.id ? { ...i, ...updatedItem } : i
            )
          );
          
          if (updatedItem.processingStatus === 'completed' || updatedItem.processingStatus === 'failed') {
            setProcessingItems(prev => prev.filter(i => i.id !== item.id));
          }
        }
      });
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, [baseId, loadBase, processingItems]);
  
  return {
    base,
    loading,
    items,
    processingItems,
    addFiles,
    addUrl,
    addNote,
    updateNoteContent,
    getNoteContent,
    updateItem,
    removeItem,
    getProcessingStatus,
    getProcessingProgress,
    getItemsByType,
    getProcessingItemsByType,
    clearCompleted,
    refreshBase: loadBase,
    fileItems: getItemsByType(KnowledgeItemTypes.FILE),
    urlItems: getItemsByType(KnowledgeItemTypes.URL),
    noteItems: getItemsByType(KnowledgeItemTypes.NOTE),
    sitemapItems: getItemsByType(KnowledgeItemTypes.SITEMAP),
    directoryItems: getItemsByType(KnowledgeItemTypes.DIRECTORY)
  };
};

export default useKnowledgeBase; 