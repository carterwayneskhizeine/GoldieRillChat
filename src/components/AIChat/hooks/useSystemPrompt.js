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

  // 当前选中的模板ID，默认选中第一个模板
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => {
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
    }
  };

  // 添加新模板
  const addTemplate = (name, content) => {
    const newTemplate = {
      id: `template_${Date.now()}`,
      name,
      content
    };
    setSystemPromptTemplates([...systemPromptTemplates, newTemplate]);
    return newTemplate.id;
  };

  // 更新模板
  const updateTemplate = (templateId, name, content) => {
    const updatedTemplates = systemPromptTemplates.map(template => 
      template.id === templateId ? { ...template, name, content } : template
    );
    setSystemPromptTemplates(updatedTemplates);
  };

  // 删除模板
  const deleteTemplate = (templateId) => {
    const updatedTemplates = systemPromptTemplates.filter(template => template.id !== templateId);
    setSystemPromptTemplates(updatedTemplates);
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId('');
    }
  };

  // 重置模板到默认值
  const resetTemplates = () => {
    setSystemPromptTemplates(DEFAULT_SYSTEM_PROMPT_TEMPLATES);
    setSelectedTemplateId(DEFAULT_SYSTEM_PROMPT_TEMPLATES[0].id);
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT_TEMPLATES[0].content);
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