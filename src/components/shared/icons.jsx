import React from 'react';

// 添加TTS相关图标
export const SpeakerWaveIcon = ({ className }) => {
  return React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: className
  }, [
    React.createElement('path', {
      key: 'path1',
      d: "M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 00-1.06 1.06 5.5 5.5 0 010 7.778.75.75 0 001.06 1.06 7 7 0 000-9.898z"
    }),
    React.createElement('path', {
      key: 'path2',
      d: "M15.932 7.757a.75.75 0 00-1.061 1.061 2.5 2.5 0 010 3.535.75.75 0 001.06 1.06 4 4 0 000-5.656z"
    })
  ]);
};

export const StopIcon = ({ className }) => {
  return React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: className
  }, [
    React.createElement('path', {
      key: 'path1',
      fillRule: "evenodd",
      clipRule: "evenodd",
      d: "M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z"
    })
  ]);
};

// 添加Thumbs相关图标
export const ThumbUpIcon = ({ className }) => {
  return React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: className
  }, [
    React.createElement('path', {
      key: 'path1',
      d: "M7.5 6.5C7.5 8.981 9.519 11 12 11s4.5-2.019 4.5-4.5S14.481 2 12 2 7.5 4.019 7.5 6.5zM20 21h1v-1c0-3.859-3.141-7-7-7h-4c-3.86 0-7 3.141-7 7v1h17z"
    })
  ]);
};

export const ThumbDownIcon = ({ className }) => {
  return React.createElement('svg', {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className: className
  }, [
    React.createElement('path', {
      key: 'path1',
      d: "M9.172 16.242 12 13.414l2.828 2.828 1.414-1.414L13.414 12l2.828-2.828-1.414-1.414L12 10.586 9.172 7.758 7.758 9.172 10.586 12l-2.828 2.828z"
    }),
    React.createElement('path', {
      key: 'path2',
      d: "M12 22c5.514 0 10-4.486 10-10S17.514 2 12 2 2 6.486 2 12s4.486 10 10 10zm0-18c4.411 0 8 3.589 8 8s-3.589 8-8 8-8-3.589-8-8 3.589-8 8-8z"
    })
  ]);
}; 