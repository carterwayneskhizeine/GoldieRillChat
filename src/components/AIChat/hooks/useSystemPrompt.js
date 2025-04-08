import { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '../constants';
import { getSystemPromptTemplates, saveSystemPromptTemplates, DEFAULT_SYSTEM_PROMPT_TEMPLATES } from '../constants/systemPromptTemplates';

export const useSystemPrompt = () => {
  // 系统提示词状态
  const [systemPrompt, setSystemPrompt] = useState(() => {
    const savedPrompt = localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
    // 如果没有保存的提示词，使用默认模板的内容
    return savedPrompt || DEFAULT_SYSTEM_PROMPT_TEMPLATES[0].content;
  });

  // 系统提示词启用状态，默认为启用
  const [systemPromptEnabled, setSystemPromptEnabled] = useState(() => {
    const savedEnabled = localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT_ENABLED);
    // 如果没有保存的状态，默认为启用
    return savedEnabled === null ? true : savedEnabled === 'true';
  });

  // 系统提示词模板状态
  const [systemPromptTemplates, setSystemPromptTemplates] = useState(() => {
    return getSystemPromptTemplates();
  });

  // 当前选中的模板ID，检查当前系统提示词是否与某个模板匹配
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => {
    const savedPrompt = localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT);
    const savedTemplateId = localStorage.getItem(STORAGE_KEYS.SELECTED_TEMPLATE_ID);
    
    // 如果有保存的模板ID，优先使用
    if (savedTemplateId) {
      const templates = getSystemPromptTemplates();
      const template = templates.find(t => t.id === savedTemplateId);
      if (template) {
        return savedTemplateId;
      }
    }
    
    // 检查当前系统提示词是否与某个模板匹配
    if (savedPrompt) {
      const templates = getSystemPromptTemplates();
      const matchedTemplate = templates.find(t => t.content === savedPrompt);
      if (matchedTemplate) {
        return matchedTemplate.id;
      }
    }
    
    // 默认选中第一个模板
    return DEFAULT_SYSTEM_PROMPT_TEMPLATES[0].id;
  });

  // 保存系统提示词到本地存储
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, systemPrompt);
  }, [systemPrompt]);

  // 保存系统提示词启用状态到本地存储
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT_ENABLED, systemPromptEnabled.toString());
  }, [systemPromptEnabled]);

  // 保存系统提示词模板到本地存储
  useEffect(() => {
    saveSystemPromptTemplates(systemPromptTemplates);
  }, [systemPromptTemplates]);

  // 保存当前选中的模板ID
  useEffect(() => {
    if (selectedTemplateId) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_TEMPLATE_ID, selectedTemplateId);
    }
  }, [selectedTemplateId]);

  // 初始化时，如果没有设置过系统提示词，则设置为启用状态并使用默认模板
  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT_ENABLED)) {
      setSystemPromptEnabled(true);
      localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT_ENABLED, 'true');
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.SYSTEM_PROMPT)) {
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT_TEMPLATES[0].content);
      setSelectedTemplateId(DEFAULT_SYSTEM_PROMPT_TEMPLATES[0].id);
      localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT_TEMPLATES[0].content);
    }
  }, []);

  // 应用模板
  const applyTemplate = (templateId) => {
    const template = systemPromptTemplates.find(t => t.id === templateId);
    if (template) {
      setSystemPrompt(template.content);
      setSelectedTemplateId(templateId);
      // 确保本地存储也立即更新
      localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, template.content);
      localStorage.setItem(STORAGE_KEYS.SELECTED_TEMPLATE_ID, templateId);
    }
  };

  // 添加新模板
  const addTemplate = (name, content) => {
    const newTemplate = {
      id: `template_${Date.now()}`,
      name,
      content
    };
    const updatedTemplates = [...systemPromptTemplates, newTemplate];
    setSystemPromptTemplates(updatedTemplates);
    
    // 添加后立即应用新模板
    setSystemPrompt(content);
    setSelectedTemplateId(newTemplate.id);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, content);
    localStorage.setItem(STORAGE_KEYS.SELECTED_TEMPLATE_ID, newTemplate.id);
    
    return newTemplate.id;
  };

  // 更新模板
  const updateTemplate = (templateId, name, content) => {
    const updatedTemplates = systemPromptTemplates.map(template => 
      template.id === templateId ? { ...template, name, content } : template
    );
    setSystemPromptTemplates(updatedTemplates);
    
    // 如果更新的是当前选中的模板，同步更新系统提示词
    if (selectedTemplateId === templateId) {
      setSystemPrompt(content);
      localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, content);
    }
  };

  // 删除模板
  const deleteTemplate = (templateId) => {
    const updatedTemplates = systemPromptTemplates.filter(template => template.id !== templateId);
    setSystemPromptTemplates(updatedTemplates);
    
    // 如果删除的是当前选中的模板，重置为默认模板
    if (selectedTemplateId === templateId) {
      const defaultTemplate = updatedTemplates[0] || DEFAULT_SYSTEM_PROMPT_TEMPLATES[0];
      setSelectedTemplateId(defaultTemplate.id);
      setSystemPrompt(defaultTemplate.content);
      localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, defaultTemplate.content);
      localStorage.setItem(STORAGE_KEYS.SELECTED_TEMPLATE_ID, defaultTemplate.id);
    }
  };

  // 重置模板到默认值
  const resetTemplates = () => {
    setSystemPromptTemplates(DEFAULT_SYSTEM_PROMPT_TEMPLATES);
    const defaultTemplate = DEFAULT_SYSTEM_PROMPT_TEMPLATES[0];
    setSelectedTemplateId(defaultTemplate.id);
    setSystemPrompt(defaultTemplate.content);
    localStorage.setItem(STORAGE_KEYS.SYSTEM_PROMPT, defaultTemplate.content);
    localStorage.setItem(STORAGE_KEYS.SELECTED_TEMPLATE_ID, defaultTemplate.id);
  };

  return {
    systemPrompt,
    setSystemPrompt,
    systemPromptEnabled,
    setSystemPromptEnabled,
    systemPromptTemplates,
    setSystemPromptTemplates,
    selectedTemplateId,
    setSelectedTemplateId,
    applyTemplate,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    resetTemplates
  };
}; 