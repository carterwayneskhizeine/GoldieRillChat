/**
 * 浏览器工具函数
 * 
 * 此文件包含与浏览器和URL处理相关的通用工具函数
 * 主要功能是统一处理URL打开方式，优先使用内部浏览器(electron-as-browser)打开链接，
 * 如果内部浏览器无法使用，则回退到外部浏览器打开。
 */

// 创建一个自定义事件，用于通知应用程序切换到浏览器工具
export const switchToBrowserEvent = new CustomEvent('switchToBrowser');

/**
 * 显示一个对话框，让用户选择如何打开链接
 * 
 * @param {string} url - 要打开的URL
 * @returns {Promise<string>} - 返回用户的选择 ('internal', 'external' 或 'cancel')
 */
export const showLinkOpenDialog = (url) => {
  return new Promise((resolve) => {
    // 创建淡出动画样式
    const animationStyle = document.createElement('style');
    animationStyle.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      .animate-fadeout {
        animation: fadeOut 0.15s ease-out forwards;
      }
    `;
    document.head.appendChild(animationStyle);
    
    // 创建对话框元素
    const dialog = document.createElement('div');
    // 提高z-index到最高，增加背景不透明度，添加特定于bg-theme的类名
    dialog.className = 'fixed inset-0 bg-black bg-opacity-70 z-[10000] flex justify-center items-center link-dialog-overlay';
    
    // 对话框内容 - 使用DaisyUI样式并添加特定类用于bg-theme模式下的样式
    dialog.innerHTML = `
      <div class="modal-box bg-base-100 shadow-xl max-w-md w-11/12 link-dialog-content">
        <h3 class="font-bold text-lg text-base-content">打开链接</h3>
        <p class="py-4 text-base-content break-all">${url}</p>
        <div class="modal-action">
          <button id="cancel-btn" class="btn btn-ghost">取消</button>
          <button id="external-btn" class="btn btn-outline">外部浏览器</button>
          <button id="internal-btn" class="btn btn-primary">内部浏览器</button>
        </div>
      </div>
    `;
    
    // 添加到文档
    document.body.appendChild(dialog);
    
    // 添加事件监听器
    const cancelBtn = dialog.querySelector('#cancel-btn');
    const externalBtn = dialog.querySelector('#external-btn');
    const internalBtn = dialog.querySelector('#internal-btn');
    
    // 增强的点击事件处理 - 确保在背景模式下也能正确捕获点击
    const setupButtonEvent = (button, action) => {
      const handleClick = () => {
        // 立即移除所有事件监听
        cancelBtn.removeEventListener('click', handleCancelClick);
        externalBtn.removeEventListener('click', handleExternalClick);
        internalBtn.removeEventListener('click', handleInternalClick);
        
        // 添加移除特效
        dialog.classList.add('animate-fadeout');
        
        // 延迟移除对话框
        setTimeout(() => {
          if (document.body.contains(dialog)) {
            document.body.removeChild(dialog);
          }
          // 清理动画样式
          if (document.head.contains(animationStyle)) {
            document.head.removeChild(animationStyle);
          }
          resolve(action);
        }, 150);
      };
      
      return handleClick;
    };
    
    // 设置各按钮的事件
    const handleCancelClick = setupButtonEvent(cancelBtn, 'cancel');
    const handleExternalClick = setupButtonEvent(externalBtn, 'external');
    const handleInternalClick = setupButtonEvent(internalBtn, 'internal');
    
    cancelBtn.addEventListener('click', handleCancelClick);
    externalBtn.addEventListener('click', handleExternalClick);
    internalBtn.addEventListener('click', handleInternalClick);
    
    // 添加ESC键关闭功能
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCancelClick();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  });
};

/**
 * 在外部浏览器中打开URL
 * 
 * @param {string} url - 要打开的URL
 */
export const openExternalUrl = (url) => {
  // 确保URL有http/https前缀
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // 尝试使用Electron的shell.openExternal
  if (window.electron?.shell?.openExternal) {
    window.electron.shell.openExternal(url);
    return;
  }
  
  if (window.electron?.openExternal) {
    window.electron.openExternal(url);
    return;
  }
  
  // 尝试使用新的方式打开外部浏览器
  try {
    // 使用iframe技巧强制打开外部浏览器
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // 使用iframe的window.open来避免被当前应用拦截
    const externalWindow = iframe.contentWindow.open(url, '_system');
    if (externalWindow) {
      externalWindow.opener = null;
    } else {
      // 如果仍然不行，退回到常规方法
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    
    // 清理iframe
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 100);
  } catch (error) {
    console.error('尝试打开外部链接失败:', error);
    // 最后的回退方案
    alert(`无法在外部浏览器中打开链接: ${url}\n可以手动复制此地址到浏览器打开`);
  }
};

/**
 * 使用内部浏览器打开URL
 * 
 * @param {string} url - 要打开的URL
 * @param {boolean} useInternalBrowser - 是否使用内部浏览器打开URL，默认为true
 * @param {boolean} showDialog - 是否显示选择对话框，默认为false，但此参数被忽略，总是显示对话框
 */
export const openUrl = async (url, useInternalBrowser = true, showDialog = false) => {
  console.log('openUrl被调用:', url, useInternalBrowser, showDialog);
  
  try {
    // 确保URL有http/https前缀
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    // 移除可能影响对话框显示的元素
    const existingDialogs = document.querySelectorAll('.link-dialog-overlay');
    existingDialogs.forEach(dialog => {
      if (document.body.contains(dialog)) {
        document.body.removeChild(dialog);
      }
    });
    
    // 确保总是显示对话框
    console.log('显示链接对话框:', url);
    const choice = await showLinkOpenDialog(url);
    console.log('用户选择:', choice);
    
    if (choice === 'cancel') {
      console.log('用户取消打开链接');
      return;
    }
    
    if (choice === 'external') {
      console.log('用户选择外部浏览器打开');
      openExternalUrl(url);
      return;
    }
    
    console.log('用户选择内部浏览器打开');
    if (window.electron?.browser?.newTab) {
      try {
        window.electron.browser.newTab(url);
        if (window.electron.browser.setVisibility) {
          window.electron.browser.setVisibility(true);
        }
        window.dispatchEvent(switchToBrowserEvent);
      } catch (error) {
        console.error('内部浏览器打开URL失败:', error);
        openExternalUrl(url);
      }
    } else {
      console.log('内部浏览器API不可用，使用外部浏览器');
      openExternalUrl(url);
    }
  } catch (error) {
    console.error('链接处理过程中发生错误:', error);
    // 出错时，尝试使用外部浏览器打开
    try {
      openExternalUrl(url);
    } catch (e) {
      console.error('使用外部浏览器打开链接也失败:', e);
      alert(`无法打开链接: ${url}\n可能需要手动复制到浏览器中打开。`);
    }
  }
};

/**
 * 直接在内部浏览器中打开URL（无对话框）
 * 该函数专门用于Browser标题栏的"翻译当前页面为中文"按钮
 * 
 * @param {string} url - 要打开的URL
 */
export const openUrlDirectly = (url) => {
  try {
    // 确保URL有http/https前缀
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    console.log('直接在内部浏览器中打开URL:', url);
    
    // 直接使用内部浏览器打开URL
    if (window.electron?.browser?.newTab) {
      window.electron.browser.newTab(url);
      if (window.electron.browser.setVisibility) {
        window.electron.browser.setVisibility(true);
      }
      window.dispatchEvent(switchToBrowserEvent);
    } else {
      console.log('内部浏览器API不可用，使用外部浏览器');
      openExternalUrl(url);
    }
  } catch (error) {
    console.error('直接打开链接失败:', error);
    // 出错时，尝试使用外部浏览器打开
    try {
      openExternalUrl(url);
    } catch (e) {
      console.error('使用外部浏览器打开链接也失败:', e);
      alert(`无法打开链接: ${url}\n可能需要手动复制到浏览器中打开。`);
    }
  }
}; 