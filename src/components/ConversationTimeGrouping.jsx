/**
 * 对话时间分组功能
 * 用于在Sidebar中按时间段(今天、昨天、过去7天等)对对话进行分组显示
 */
import React, { useState, useEffect } from 'react';

// 添加截断名称的辅助组件
export const TruncatedName = ({ name, maxLength = 18 }) => {
  // 确保输入值是字符串
  let nameStr = String(name || '');
  
  // 确保nameStr是有效值
  nameStr = nameStr || '未命名';
  
  // 手动截断逻辑，确保超长文本一定会被截断
  const forceDisplayName = nameStr.length > maxLength
    ? `${nameStr.substring(0, maxLength - 3)}\u2026` 
    : nameStr;
  
  // 返回渲染的名称
  return (
    <span
      className="whitespace-nowrap overflow-hidden"
      style={{ 
        color: 'hsl(180, 0%, 85%)',
        display: 'block',
        textOverflow: 'ellipsis',
        maxWidth: '125px'
      }}
      title={nameStr}
    >
      {forceDisplayName}
    </span>
  );
};

/**
 * 按日期将对话分组
 * @param {Array} conversations - 对话列表
 * @returns {Object} 分组后的对话对象
 */
export const groupConversationsByDate = (conversations) => {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: {}
    };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const groups = {
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: {}
  };
  
  conversations.forEach(conv => {
    
    // 优先使用modifiedTime，然后是timestamp、folderMtime，最后尝试从id提取
    const timestamp = conv.modifiedTime ? conv.modifiedTime :
                    (conv.timestamp ? parseInt(conv.timestamp) : 
                    (conv.folderMtime ? new Date(conv.folderMtime).getTime() :
                    (conv.id && !isNaN(parseInt(conv.id.substring(0, 13))) ? 
                     parseInt(conv.id.substring(0, 13)) : Date.now())));
    
    const convDate = new Date(timestamp);
    
    if (convDate >= today) {
      groups.today.push(conv);
    } else if (convDate >= yesterday) {
      groups.yesterday.push(conv);
    } else if (convDate >= sevenDaysAgo) {
      groups.lastWeek.push(conv);
    } else if (convDate >= thirtyDaysAgo) {
      groups.lastMonth.push(conv);
    } else {
      // 按月分组
      const yearMonth = `${convDate.getFullYear()}-${(convDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!groups.older[yearMonth]) {
        groups.older[yearMonth] = [];
      }
      groups.older[yearMonth].push(conv);
    }
  });
  
  // 对每个组内的对话按时间戳倒序排序（新的在前面）
  const sortByTimestamp = (a, b) => {
    const aTime = a.modifiedTime ? a.modifiedTime :
                 (a.timestamp ? parseInt(a.timestamp) : 
                 (a.folderMtime ? new Date(a.folderMtime).getTime() :
                 (a.id && !isNaN(parseInt(a.id.substring(0, 13))) ? 
                  parseInt(a.id.substring(0, 13)) : 0)));
    
    const bTime = b.modifiedTime ? b.modifiedTime :
                 (b.timestamp ? parseInt(b.timestamp) : 
                 (b.folderMtime ? new Date(b.folderMtime).getTime() :
                 (b.id && !isNaN(parseInt(b.id.substring(0, 13))) ? 
                  parseInt(b.id.substring(0, 13)) : 0)));
    
    return bTime - aTime; // 倒序排列
  };
  
  groups.today.sort(sortByTimestamp);
  groups.yesterday.sort(sortByTimestamp);
  groups.lastWeek.sort(sortByTimestamp);
  groups.lastMonth.sort(sortByTimestamp);
  
  // 对older中的每个月份组也进行排序
  Object.keys(groups.older).forEach(month => {
    groups.older[month].sort(sortByTimestamp);
  });
  
  // 对月份键进行排序（新的月份在前）
  const sortedMonths = Object.keys(groups.older).sort().reverse();
  const sortedOlder = {};
  sortedMonths.forEach(month => {
    sortedOlder[month] = groups.older[month];
  });
  groups.older = sortedOlder;
  
  return groups;
};

/**
 * 时间分组渲染组件
 * @param {Object} props - 组件属性
 * @returns {JSX.Element} 渲染的组件
 */
export const ConversationTimeGrouping = ({
  conversations,
  currentConversation,
  draggedConversation,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleConversationClick,
  handleConversationRename,
  handleConversationDelete,
  setDraggedConversation,
  editingFolderName,
  setEditingFolderName,
  folderNameInput,
  setFolderNameInput,
  setContextMenu,
  expandedFolderId,
  setDeletingFolder,
  isKeyboardNavigating,
  keyboardSelectedConversationId,
  handleRenameConfirm
}) => {
  // 状态管理
  const [groupCollapsedState, setGroupCollapsedState] = useState(() => {
    try {
      const saved = localStorage.getItem('aichat_group_collapsed');
      return saved ? JSON.parse(saved) : {
        today: false,
        yesterday: false,
        lastWeek: false,
        lastMonth: false
      };
    } catch (e) {
      return {
        today: false,
        yesterday: false,
        lastWeek: false,
        lastMonth: false
      };
    }
  });
  
  // 月份分组折叠状态
  const [monthsCollapsedState, setMonthsCollapsedState] = useState(() => {
    try {
      const saved = localStorage.getItem('aichat_months_collapsed');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // 处理分组折叠状态变化
  const toggleGroupCollapsed = (group) => {
    const newState = {
      ...groupCollapsedState,
      [group]: !groupCollapsedState[group]
    };
    setGroupCollapsedState(newState);
    localStorage.setItem('aichat_group_collapsed', JSON.stringify(newState));
  };
  
  // 处理月份分组折叠状态变化
  const toggleMonthCollapsed = (month) => {
    const newState = {
      ...monthsCollapsedState,
      [month]: !monthsCollapsedState[month]
    };
    setMonthsCollapsedState(newState);
    localStorage.setItem('aichat_months_collapsed', JSON.stringify(newState));
  };
  
  // 格式化月份标题
  const formatMonthTitle = (yearMonth) => {
    try {
      const [year, month] = yearMonth.split('-');
      return `${year}年${month}月`;
    } catch (e) {
      return yearMonth;
    }
  };
  
  // 对话分组处理
  const groupedConversations = groupConversationsByDate(conversations);
  
  // 判断分组是否为空的辅助函数
  const isGroupEmpty = (group) => {
    if (Array.isArray(group)) {
      return group.length === 0;
    }
    if (typeof group === 'object') {
      return Object.keys(group).length === 0;
    }
    return true;
  };

  /**
   * 渲染单个对话项
   * @param {Object} conversation - 对话对象
   * @returns {JSX.Element} 渲染的对话项
   */
  const renderConversationItem = (conversation) => {
    return (
      <div
        key={conversation.id}
        className={`btn btn-ghost justify-between mb-2
          ${currentConversation?.id === conversation.id ? 'btn-active' : ''} 
          ${draggedConversation?.id === conversation.id ? 'opacity-50' : ''}
          ${isKeyboardNavigating && keyboardSelectedConversationId === conversation.id ? 'keyboard-selected-conversation' : ''}
          ${expandedFolderId === conversation.id ? 'expanded' : ''}
          conversation-item conversation-item-${conversation.id}`}
        draggable={editingFolderName === null}
        onDragStart={() => {
          if (editingFolderName !== null) return;
          handleDragStart(conversation, setDraggedConversation);
        }}
        onDragOver={(e) => {
          if (editingFolderName !== null) return;
          handleDragOver(e);
        }}
        onDrop={(e) => {
          if (editingFolderName !== null) return;
          handleDrop(e, conversation, draggedConversation, conversations, setDraggedConversation);
        }}
        onClick={() => handleConversationClick(conversation)}
        onContextMenu={(e) => setContextMenu && setContextMenu(e, conversation)}
        style={isKeyboardNavigating && keyboardSelectedConversationId === conversation.id ? {
          borderColor: 'gold',
          borderWidth: '2px',
          boxShadow: '0 0 4px gold'
        } : {}}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          {editingFolderName === conversation.id ? (
            <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                className="input input-xs input-bordered w-full"
                placeholder="输入新的文件夹名称"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameConfirm(
                      conversation,
                      folderNameInput
                    );
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <button
                  className="btn btn-xs btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameConfirm(
                      conversation,
                      folderNameInput
                    );
                  }}
                >
                  确认
                </button>
                <button
                  className="btn btn-xs"
                  onClick={() => {
                    setEditingFolderName(null);
                    setFolderNameInput('');
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-w-0 overflow-hidden">
              <TruncatedName name={conversation.name} />
            </div>
          )}
        </div>
        {!editingFolderName && expandedFolderId === conversation.id && (
          <div 
            className="folder-actions absolute left-0 right-0 p-1 flex justify-center gap-2" 
            style={{zIndex: 100, borderTop: '1px solid rgba(255, 215, 0, 0.1)', bottom: '-32px'}}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="btn btn-xs flex items-center gap-1 hover:bg-gold hover:bg-opacity-30 hover:text-white hover:border-gold hover:border-opacity-40"
              onClick={(e) => {
                e.stopPropagation();
                handleConversationRename(conversation);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              重命名
            </button>
            <button 
              className="btn btn-xs btn-ghost flex items-center gap-1 hover:bg-gold hover:bg-opacity-30 hover:text-white hover:border-gold hover:border-opacity-40"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingFolder(conversation);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m5-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              删除
            </button>
          </div>
        )}
      </div>
    );
  };

  // 渲染时间分组的内容
  const renderGroupContent = (title, conversations, groupKey) => {
    return (
      <div className="mb-2">
        <div 
          className="flex justify-between items-center px-2 py-1 rounded cursor-pointer" 
          onClick={() => toggleGroupCollapsed(groupKey)}
        >
          <span className="font-semibold text-sm flex items-center">
            <span className="mr-2">{title}</span>
            <span className="text-xs opacity-70">{conversations.length}</span>
          </span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 transition-transform ${groupCollapsedState[groupKey] ? 'rotate-180' : ''}`} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {!groupCollapsedState[groupKey] && (
          <div className="mt-1">
            {conversations.map(conversation => renderConversationItem(conversation))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1 p-2">
      {/* 今天的对话 */}
      {!isGroupEmpty(groupedConversations.today) && renderGroupContent('Today', groupedConversations.today, 'today')}
      
      {/* 昨天的对话 */}
      {!isGroupEmpty(groupedConversations.yesterday) && renderGroupContent('Yesterday', groupedConversations.yesterday, 'yesterday')}
      
      {/* A过去7天的对话 */}
      {!isGroupEmpty(groupedConversations.lastWeek) && renderGroupContent('LastWeek', groupedConversations.lastWeek, 'lastWeek')}
      
      {/* 过去30天的对话 */}
      {!isGroupEmpty(groupedConversations.lastMonth) && renderGroupContent('LastMonth', groupedConversations.lastMonth, 'lastMonth')}
      
      {/* 按月份分组的更早的对话 */}
      {Object.keys(groupedConversations.older).length > 0 && Object.keys(groupedConversations.older).map(month => (
        <div key={month} className="mb-2">
          <div 
            className="flex justify-between items-center px-2 py-1 rounded cursor-pointer" 
            onClick={() => toggleMonthCollapsed(month)}
          >
            <span className="font-semibold text-sm flex items-center">
              <span className="mr-2">{formatMonthTitle(month)}</span>
              <span className="text-xs opacity-70">{groupedConversations.older[month].length}</span>
            </span>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-4 w-4 transition-transform ${monthsCollapsedState[month] ? 'rotate-180' : ''}`} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          
          {!monthsCollapsedState[month] && (
            <div className="mt-1">
              {groupedConversations.older[month].map(conversation => renderConversationItem(conversation))}
            </div>
          )}
        </div>
      ))}
      
      {/* 如果没有对话，显示空状态 */}
      {conversations.length === 0 && (
        <div className="text-center p-4 text-base-content opacity-60">
          <p>没有对话记录</p>
          <p className="text-xs mt-2">点击上方 + 创建新对话</p>
        </div>
      )}
    </div>
  );
};

export default ConversationTimeGrouping; 