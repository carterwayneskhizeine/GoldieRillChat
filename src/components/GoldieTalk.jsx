import React, { useEffect, useRef } from 'react';
import '../styles/goldie-talk.css';

const GoldieTalk = () => {
  const iframeRef = useRef(null);
  
  useEffect(() => {
    // 确保iframe正确加载
    if (iframeRef.current) {
      iframeRef.current.onload = () => {
        console.log('LiveTalking iframe loaded successfully');
      };
    }
  }, []);

  return (
    <div className="goldie-talk-container">
      <iframe
        ref={iframeRef}
        src="http://127.0.0.1:8010/webrtc-combined.html"
        title="LiveTalking Digital Human"
        className="goldie-talk-iframe"
        allow="camera; microphone; display-capture; autoplay"
      />
    </div>
  );
};

export default GoldieTalk; 