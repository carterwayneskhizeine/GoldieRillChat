import React from 'react';
import { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } from './mouseEventHandlers';
import { handleCanvasDrop, handleCanvasDragOver } from './canvasDropHandlers';
import { handleResolutionChange } from './resolutionHandlers';
import { loadImage, drawImage, rotate, flip, resetTransform, setResolution, downloadImage } from './imageOperations';
import { sendCanvasToChat } from './canvasChatHandlers';

export default function Editor({
  editorState,
  setEditorState,
  canvasSize,
  setCanvasSize,
  tempCanvasSize,
  setTempCanvasSize,
  imageSize,
  setImageSize,
  isCtrlPressed,
  setIsCtrlPressed,
  canvasRef,
  canvasSizeTimeoutRef,
  currentConversation,
  messages,
  setMessages,
  setActiveTool,
  window,
  startAngle,
  setStartAngle,
  lastRotation,
  setLastRotation,
  isRotating,
  setIsRotating
}) {
  // 合并 onMouseUp 和 onMouseLeave 处理函数
  const handleMouseEvent = () => {
    handleMouseUp(setIsRotating, setEditorState);
  };

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
      {/* Tools row */}
      <div className="max-w-[1200px] w-full mx-auto flex flex-wrap gap-2 items-center">
        <div className="flex-1 flex justify-start items-center">
          <button
            className="btn btn-sm"
            disabled={!editorState.image || !currentConversation}
            onClick={() => sendCanvasToChat(currentConversation, canvasRef.current, messages, setMessages, setActiveTool, window)}
          >
            Send
          </button>
        </div>
        <div className="flex flex-wrap gap-2 justify-center items-center">
          <input
            type="file"
            id="imageInput"
            className="hidden"
            accept="image/*"
            onChange={(e) => loadImage(e.target.files[0], setImageSize, setEditorState)}
          />
          <button 
            className="btn btn-sm"
            onClick={() => document.getElementById('imageInput').click()}
          >
            Import
          </button>

          <div className="dropdown">
            <button tabIndex={0} className="btn btn-sm">Res</button>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-32">
              <li><button onClick={() => setResolution(1920, 1080, setCanvasSize, setTempCanvasSize)} className="whitespace-nowrap">1920 × 1080</button></li>
              <li><button onClick={() => setResolution(512, 512, setCanvasSize, setTempCanvasSize)} className="whitespace-nowrap">512 × 512</button></li>
              <li><button onClick={() => setResolution(512, 288, setCanvasSize, setTempCanvasSize)} className="whitespace-nowrap">512 × 288</button></li>
              <li><button onClick={() => setResolution(768, 320, setCanvasSize, setTempCanvasSize)} className="whitespace-nowrap">768 × 320</button></li>
              <li><button onClick={() => setResolution(768, 512, setCanvasSize, setTempCanvasSize)} className="whitespace-nowrap">768 × 512</button></li>
            </ul>
          </div>

          <button className="btn btn-sm btn-square" onClick={() => rotate(setEditorState)}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button className="btn btn-sm btn-square" onClick={() => flip('h', setEditorState)}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>

          <button className="btn btn-sm btn-square" onClick={() => flip('v', setEditorState)}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 8h16M4 16h16" />
            </svg>
          </button>

          <button className="btn btn-sm btn-square" onClick={() => resetTransform(editorState, canvasSize, setEditorState)}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          <div className="dropdown">
            <button tabIndex={0} className="btn btn-sm btn-square">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box">
              <li><button onClick={() => downloadImage('jpg', canvasRef.current)}>JPG Format</button></li>
              <li><button onClick={() => downloadImage('png', canvasRef.current)}>PNG Format</button></li>
            </ul>
          </div>

          <div className="dropdown">
            <button tabIndex={0} className="btn btn-sm">AR</button>
            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box">
              <li><button onClick={() => {
                const newHeight = Math.round(canvasSize.width * (9 / 16));
                setCanvasSize(prev => ({ ...prev, height: newHeight }));
                setTempCanvasSize(prev => ({ ...prev, height: newHeight }));
              }}>16:9</button></li>
              <li><button onClick={() => {
                const newHeight = Math.round(canvasSize.width * (16 / 9));
                setCanvasSize(prev => ({ ...prev, height: newHeight }));
                setTempCanvasSize(prev => ({ ...prev, height: newHeight }));
              }}>9:16</button></li>
              <li><button onClick={() => {
                const newHeight = Math.round(canvasSize.width * (3 / 4));
                setCanvasSize(prev => ({ ...prev, height: newHeight }));
                setTempCanvasSize(prev => ({ ...prev, height: newHeight }));
              }}>4:3</button></li>
              <li><button onClick={() => {
                setCanvasSize(prev => ({ ...prev, height: prev.width }));
                setTempCanvasSize(prev => ({ ...prev, height: prev.width }));
              }}>1:1</button></li>
            </ul>
          </div>

          <button className="btn btn-sm btn-square" onClick={() => {
            const canvas = canvasRef.current;
            if (canvas) {
              canvas.toBlob(blob => {
                navigator.clipboard.write([
                  new ClipboardItem({ 'image/png': blob })
                ]);
              });
            }
          }}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>

          <div className="join">
            <input 
              type="number" 
              value={tempCanvasSize.width}
              onChange={(e) => handleResolutionChange('width', e.target.value, setTempCanvasSize, setCanvasSize, canvasSizeTimeoutRef)}
              className="input input-bordered input-sm join-item w-20" 
            />
            <span className="join-item flex items-center px-2 bg-base-200">×</span>
            <input 
              type="number"
              value={tempCanvasSize.height}
              onChange={(e) => handleResolutionChange('height', e.target.value, setTempCanvasSize, setCanvasSize, canvasSizeTimeoutRef)}
              className="input input-bordered input-sm join-item w-20"
            />
          </div>
        </div>
        <div className="flex-1 flex justify-end items-center gap-2">
          <span className="text-sm opacity-70">Ctrl</span>
          <input
            type="checkbox"
            id="ctrlToggle"
            className="toggle toggle-sm"
            checked={isCtrlPressed}
            onChange={(e) => setIsCtrlPressed(e.target.checked)}
          />
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div 
          className="canvas-container max-w-[1200px] w-full mx-auto"
          onMouseDown={(e) => handleMouseDown(e, editorState, isCtrlPressed, canvasRef.current, setIsRotating, setStartAngle, setLastRotation, setEditorState)}
          onMouseMove={(e) => handleMouseMove(e, editorState, isRotating, canvasRef.current, startAngle, lastRotation, setEditorState)}
          onMouseUp={handleMouseEvent}
          onMouseLeave={handleMouseEvent}
          onWheel={(e) => handleWheel(e, editorState, setEditorState)}
          onDrop={(e) => handleCanvasDrop(e, loadImage, setImageSize, setEditorState)}
          onDragOver={handleCanvasDragOver}
        >
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="canvas-element"
          />
        </div>
      </div>

      {/* Resolution info */}
      <div className="max-w-[1200px] w-full mx-auto flex gap-4 text-sm justify-center">
        <span className="opacity-70">Canvas: {canvasSize.width} × {canvasSize.height}</span>
        <span className="opacity-70">Image: {imageSize.width} × {imageSize.height}</span>
      </div>
    </div>
  );
} 