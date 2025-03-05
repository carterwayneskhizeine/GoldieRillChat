/**
 * 知识库钩子函数
 * 用于在React组件中使用知识库功能
 */
import { useState, useEffect, useCallback } from 'react';
import { db } from '../utils/db';
import toastManager from '../utils/toastManager';
import {
  addKnowledgeBase as addKnowledgeBaseService,
  addFileToKnowledgeBase as addFileService,
  addUrlToKnowledgeBase as addUrlService,
  addNoteToKnowledgeBase as addNoteService,
  addDirectoryToKnowledgeBase as addDirectoryService
} from '../services/KnowledgeBaseService';
import { KnowledgeItemTypes } from '../types/knowledgeBase';

/**
 * 获取所有知识库
 * @returns {Object} 知识库操作对象
 */
export const useKnowledgeBases = () => {
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 加载所有知识库
  const loadAllBases = useCallback(async () => {
    try {
      setLoading(true);
      const allBases = await db.knowledgeBases.toArray();
      setBases(allBases);
    } catch (error) {
      console.error('加载知识库失败:', error);
      toastManager.error('加载知识库失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // 添加知识库
  const addBase = useCallback(async (name, modelId) => {
    try {
      const newBase = await addKnowledgeBaseService(name, modelId);
      // 添加新知识库后立即刷新所有知识库列表，而不仅仅是更新本地状态
      await loadAllBases();
      return newBase;
    } catch (error) {
      console.error('添加知识库失败:', error);
      toastManager.error('添加知识库失败: ' + error.message);
      throw error;
    }
  }, [loadAllBases]);
  
  // 重命名知识库
  const renameBase = useCallback(async (baseId, newName) => {
    try {
      await db.knowledgeBases.update(baseId, { 
        name: newName,
        updatedAt: new Date().toISOString()
      });
      
      setBases(prev => prev.map(base => 
        base.id === baseId ? { ...base, name: newName, updatedAt: new Date().toISOString() } : base
      ));
    } catch (error) {
      console.error('重命名知识库失败:', error);
      toastManager.error('重命名知识库失败: ' + error.message);
    }
  }, []);
  
  // 删除知识库
  const deleteBase = useCallback(async (baseId) => {
    try {
      // 获取知识库中的所有项目
      const items = await db.knowledgeItems.where('baseId').equals(baseId).toArray();
      
      // 删除所有项目
      for (const item of items) {
        await db.knowledgeItems.delete(item.id);
      }
      
      // 删除知识库
      await db.knowledgeBases.delete(baseId);
      
      // 更新状态
      setBases(prev => prev.filter(base => base.id !== baseId));
      
      toastManager.success('删除知识库成功');
    } catch (error) {
      console.error('删除知识库失败:', error);
      toastManager.error('删除知识库失败: ' + error.message);
    }
  }, []);
  
  // 更新知识库设置
  const updateBase = useCallback(async (baseId, updates) => {
    try {
      await db.knowledgeBases.update(baseId, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      setBases(prev => prev.map(base => 
        base.id === baseId ? { ...base, ...updates, updatedAt: new Date().toISOString() } : base
      ));
    } catch (error) {
      console.error('更新知识库设置失败:', error);
      toastManager.error('更新知识库设置失败: ' + error.message);
    }
  }, []);
  
  // 组件挂载时加载所有知识库
  useEffect(() => {
    loadAllBases();
  }, [loadAllBases]);
  
  return {
    bases,
    loading,
    refreshBases: loadAllBases,
    addBase,
    renameBase,
    deleteBase,
    updateBase
  };
};

/**
 * 使用单个知识库
 * @param {string} baseId 知识库ID
 * @returns {Object} 知识库操作对象
 */
export const useKnowledge = (baseId) => {
  const [base, setBase] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 加载知识库
  const loadBase = useCallback(async () => {
    if (!baseId) return;
    
    try {
      setLoading(true);
      
      // 加载知识库数据
      const baseData = await db.knowledgeBases.get(baseId);
      
      if (baseData) {
        // 加载知识库项目
        const itemsData = await db.knowledgeItems.where('baseId').equals(baseId).toArray();
        setBase(baseData);
        setItems(itemsData);
      } else {
        console.error(`知识库 ${baseId} 不存在`);
      }
    } catch (error) {
      console.error('加载知识库失败:', error);
      toastManager.error('加载知识库失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [baseId]);
  
  // 添加文件
  const addFile = useCallback(async (file) => {
    if (!baseId) return;
    
    try {
      const newItem = await addFileService(baseId, file);
      setItems(prev => [...prev, newItem]);
      
      // 更新知识库的更新时间和文档数量
      setBase(prev => ({
        ...prev,
        documentCount: (prev.documentCount || 0) + 1,
        itemCount: (prev.itemCount || 0) + 1,
        updatedAt: new Date().toISOString()
      }));
      
      return newItem;
    } catch (error) {
      console.error('添加文件失败:', error);
      toastManager.error('添加文件失败: ' + error.message);
    }
  }, [baseId]);
  
  // 添加URL
  const addUrl = useCallback(async (url) => {
    if (!baseId) return;
    
    try {
      const newItem = await addUrlService(baseId, url);
      setItems(prev => [...prev, newItem]);
      
      // 更新知识库的更新时间和文档数量
      setBase(prev => ({
        ...prev,
        documentCount: (prev.documentCount || 0) + 1,
        itemCount: (prev.itemCount || 0) + 1,
        updatedAt: new Date().toISOString()
      }));
      
      return newItem;
    } catch (error) {
      console.error('添加URL失败:', error);
      toastManager.error('添加URL失败: ' + error.message);
    }
  }, [baseId]);
  
  // 添加笔记
  const addNote = useCallback(async (title, content) => {
    if (!baseId) return;
    
    try {
      const newItem = await addNoteService(baseId, title, content);
      setItems(prev => [...prev, newItem]);
      
      // 更新知识库的更新时间和文档数量
      setBase(prev => ({
        ...prev,
        documentCount: (prev.documentCount || 0) + 1,
        itemCount: (prev.itemCount || 0) + 1,
        updatedAt: new Date().toISOString()
      }));
      
      return newItem;
    } catch (error) {
      console.error('添加笔记失败:', error);
      toastManager.error('添加笔记失败: ' + error.message);
    }
  }, [baseId]);
  
  // 添加目录
  const addDirectory = useCallback(async (directoryPath) => {
    if (!baseId) return;
    
    try {
      const newItem = await addDirectoryService(baseId, directoryPath);
      setItems(prev => [...prev, newItem]);
      
      // 更新知识库的更新时间和文档数量
      setBase(prev => ({
        ...prev,
        documentCount: (prev.documentCount || 0) + 1,
        itemCount: (prev.itemCount || 0) + 1,
        updatedAt: new Date().toISOString()
      }));
      
      return newItem;
    } catch (error) {
      console.error('添加目录失败:', error);
      toastManager.error('添加目录失败: ' + error.message);
    }
  }, [baseId]);
  
  // 删除项目
  const removeItem = useCallback(async (itemId) => {
    if (!baseId) return;
    
    try {
      // 获取项目
      const item = await db.knowledgeItems.get(itemId);
      
      if (!item) {
        throw new Error(`项目 ${itemId} 不存在`);
      }
      
      // 删除项目
      await db.knowledgeItems.delete(itemId);
      
      // 更新状态
      setItems(prev => prev.filter(item => item.id !== itemId));
      
      // 更新知识库的更新时间和文档数量
      setBase(prev => ({
        ...prev,
        documentCount: Math.max(0, (prev.documentCount || 0) - 1),
        itemCount: Math.max(0, (prev.itemCount || 0) - 1),
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('删除项目失败:', error);
      toastManager.error('删除项目失败: ' + error.message);
    }
  }, [baseId]);
  
  // 更新知识库信息
  const updateBaseInfo = useCallback(async (updates) => {
    if (!baseId) return;
    
    try {
      await db.knowledgeBases.update(baseId, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      
      setBase(prev => ({
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('更新知识库信息失败:', error);
      toastManager.error('更新知识库信息失败: ' + error.message);
    }
  }, [baseId]);
  
  // 刷新知识库数据
  const refreshBase = useCallback(() => {
    loadBase();
  }, [loadBase]);
  
  // 组件挂载时加载知识库
  useEffect(() => {
    loadBase();
  }, [loadBase]);
  
  return {
    base,
    items,
    loading,
    refreshBase,
    addFile,
    addUrl,
    addNote,
    addDirectory,
    removeItem,
    updateBaseInfo
  };
};

export default {
  useKnowledgeBases,
  useKnowledge
}; 