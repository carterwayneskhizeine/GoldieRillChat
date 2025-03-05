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
    // 创建对话框元素
    const dialog = document.createElement('div');
    dialog.className = 'fixed inset-0 bg-black bg-opacity-50 z-[9999] flex justify-center items-center';
    
    // 对话框内容 - 使用DaisyUI样式
    dialog.innerHTML = `
      <div class="modal-box bg-base-100 shadow-lg max-w-md w-11/12">
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
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
      resolve('cancel');
    });
    
    externalBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
      resolve('external');
    });
    
    internalBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
      resolve('internal');
    });
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
 * @param {boolean} showDialog - 是否显示选择对话框，默认为false
 */
export const openUrl = async (url, useInternalBrowser = true, showDialog = false) => {
  // 确保URL有http/https前缀
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // 如果需要显示对话框，让用户选择
  if (showDialog && window.electron?.browser?.newTab) {
    const choice = await showLinkOpenDialog(url);
    
    if (choice === 'cancel') {
      return;
    }
    
    if (choice === 'external') {
      openExternalUrl(url);
      return;
    }
    
    // 如果选择内部浏览器，下面的代码会继续执行
    useInternalBrowser = true;
  }

  // 使用内部浏览器打开URL
  if (useInternalBrowser && window.electron?.browser?.newTab) {
    try {
      window.electron.browser.newTab(url);
      // 确保浏览器组件可见
      if (window.electron.browser.setVisibility) {
        window.electron.browser.setVisibility(true);
      }
      // 触发切换到浏览器工具的事件
      window.dispatchEvent(switchToBrowserEvent);
      return;
    } catch (error) {
      console.error('使用内部浏览器打开URL失败:', error);
      // 如果内部浏览器打开失败，回退到外部浏览器
    }
  }

  // 使用外部浏览器打开URL
  openExternalUrl(url);
}; 