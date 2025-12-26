import React, { useEffect, useRef, useState } from "react";
import { tokens } from "@fluentui/react-components";
import { BASE_URL } from "../../config";

const StoryModal = ({
  showStoryModal,
  dailyTasks,
  currentStoryIndex,
  setCurrentStoryIndex,
  loadingTasks,
  currentUser,
  avatarUrl,
  onCloseStories,
  storyEditMode,
  setStoryEditMode,
  editingImagePosition,
  setEditingImagePosition,
  editingImageScale,
  setEditingImageScale,
  editingImageOffset,
  setEditingImageOffset,
  editingTitleOffset,
  setEditingTitleOffset,
  editingTitleFontSize,
  setEditingTitleFontSize,
  editingTitleColor,
  setEditingTitleColor,
  editingTitleFontFamily,
  setEditingTitleFontFamily,
  editingTitleText,
  setEditingTitleText,
  isEditingText,
  setIsEditingText,
  editingNotes,
  setEditingNotes,
  handleSaveImageSettings,
  adjustEditingScale,
  resetImageOffset,
  resetTitleOffset,
  normalizeScale,
  handleImageWheel,
  beginImagePan,
  moveImagePan,
  endImagePan,
  isPanningImage,
  beginTitlePan,
  moveTitlePan,
  endTitlePan,
  isPanningTitle,
}) => {
  const [viewportHeight, setViewportHeight] = React.useState(() => (
    typeof window !== 'undefined' ? window.innerHeight : 800
  ));

  React.useEffect(() => {
    const handleResize = () => setViewportHeight(
      typeof window !== 'undefined' ? window.innerHeight : viewportHeight
    );
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
    return () => {};
  }, []);

  if (!showStoryModal) return null;

  const handleClose = () => {
    if (onCloseStories) {
      onCloseStories();
    }
    setCurrentStoryIndex(0);
    setStoryEditMode(false);
  };

  // Handle adding a note (chat-like)
  const handleAddNote = () => {
    if (!currentNoteInput.trim()) return;
    
    const currentNotes = dailyTasks[currentStoryIndex].notes || '';
    const newNotes = currentNotes 
      ? currentNotes + '\n' + currentNoteInput.trim()
      : currentNoteInput.trim();
    
    setEditingNotes(newNotes);
    setCurrentNoteInput('');
    
    // Save immediately
    if (handleSaveImageSettings) {
      handleSaveImageSettings(newNotes);
    }
  };

  // Autoplay + progress (5s per story)
  const AUTOPLAY_MS = 5000;
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [currentNoteInput, setCurrentNoteInput] = useState(''); // Chat-like note input
  const [disableGestures, setDisableGestures] = useState(false);
  const rafRef = useRef(null);
  const startTsRef = useRef(0);

  const cancelRAF = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const step = (ts) => {
    if (startTsRef.current === 0) startTsRef.current = ts;
    const elapsed = ts - startTsRef.current;
    const p = Math.min(1, elapsed / AUTOPLAY_MS);
    setProgress(p);
    if (p < 1) {
      rafRef.current = requestAnimationFrame(step);
    } else {
      // advance
      if (!storyEditMode) {
        if (currentStoryIndex < dailyTasks.length - 1) {
          navigator?.vibrate?.(10);
          setCurrentStoryIndex(currentStoryIndex + 1);
        } else {
          handleClose();
        }
      }
    }
  };

  // restart progress when story changes or when unpaused
  useEffect(() => {
    cancelRAF();
    setProgress(0);
    startTsRef.current = 0;
    if (!storyEditMode && !isPaused && dailyTasks.length > 0) {
      rafRef.current = requestAnimationFrame(step);
    }
    return cancelRAF;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStoryIndex, isPaused, storyEditMode, dailyTasks.length]);

  // Pause on hold anywhere (except while editing)
  const onPointerDownHold = () => {
    if (storyEditMode) return;
    setIsPaused(true);
  };
  const onPointerUpHold = () => {
    if (storyEditMode) return;
    setIsPaused(false);
  };

  // Gesture: swipe left/right/down
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchLastRef = useRef({ x: 0, y: 0 });
  const SWIPE_THRESHOLD = 60;
  const CLOSE_THRESHOLD = 80;

  const handleGestureTouchStart = (e) => {
    if (storyEditMode) return;
    const t = e.touches?.[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    touchLastRef.current = { x: t.clientX, y: t.clientY };
    onPointerDownHold(); // holding on mobile also pauses
  };
  const handleGestureTouchMove = (e) => {
    if (storyEditMode) return;
    const t = e.touches?.[0];
    if (!t) return;
    touchLastRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleGestureTouchEnd = () => {
    if (storyEditMode) return;
    onPointerUpHold();
    const dx = touchLastRef.current.x - touchStartRef.current.x;
    const dy = touchLastRef.current.y - touchStartRef.current.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDy >= CLOSE_THRESHOLD && dy > 0 && absDy > absDx) {
      // swipe down to close
      handleClose();
      return;
    }
    if (absDx >= SWIPE_THRESHOLD && absDx > absDy) {
      if (dx < 0) {
        // swipe left -> next
        if (currentStoryIndex < dailyTasks.length - 1) {
          navigator?.vibrate?.(10);
          setCurrentStoryIndex(currentStoryIndex + 1);
        } else {
          handleClose();
        }
      } else {
        // swipe right -> previous
        if (currentStoryIndex > 0) {
          navigator?.vibrate?.(10);
          setCurrentStoryIndex(currentStoryIndex - 1);
        }
      }
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease-in',
        touchAction: 'none'
      }}
      onClick={handleClose}
      onPointerDown={!storyEditMode && !disableGestures ? onPointerDownHold : undefined}
      onPointerUp={!storyEditMode && !disableGestures ? onPointerUpHold : undefined}
      onTouchStart={!storyEditMode && !disableGestures ? handleGestureTouchStart : undefined}
      onTouchMove={!storyEditMode && !disableGestures ? handleGestureTouchMove : undefined}
      onTouchEnd={!storyEditMode && !disableGestures ? handleGestureTouchEnd : undefined}
    >
      <div 
        style={{
          maxWidth: '500px',
          width: '90%',
          height: '90vh',
          backgroundColor: '#1a1a1a',
          borderRadius: '16px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={!storyEditMode ? handleGestureTouchStart : undefined}
        onTouchMove={!storyEditMode ? handleGestureTouchMove : undefined}
        onTouchEnd={!storyEditMode ? handleGestureTouchEnd : undefined}
      >
        {/* Progress Bars */}
        {dailyTasks.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '8px',
            background: 'rgba(0,0,0,0.6)',
          }}>
            {dailyTasks.map((_, index) => {
              const filled = index < currentStoryIndex ? 1 : index === currentStoryIndex ? progress : 0;
              return (
                <div key={index} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.25)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${filled * 100}%`, height: '100%', background: '#fff', transition: 'width 0.1s linear' }} />
                </div>
              );
            })}
          </div>
        )}

        {/* Header */}
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: tokens.colorBrandBackground,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 'bold',
              overflow: 'hidden',
              border: '2px solid #fff',
            }}>
              {avatarUrl ? (
                <img src={avatarUrl.startsWith('data:') ? avatarUrl : `${BASE_URL}${avatarUrl}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                (currentUser?.name || currentUser?.username || 'Х').charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>
                {currentUser?.name || currentUser?.username || 'Хэрэглэгч'}
              </div>
              <div style={{ color: '#ddd', fontSize: '12px' }}>
                Даалгавар {currentStoryIndex + 1} / {dailyTasks.length}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => {
                if (storyEditMode) {
                  handleSaveImageSettings();
                } else {
                  setStoryEditMode(true);
                  setIsPaused(true); // disable autoplay in edit mode
                  setEditingImagePosition(dailyTasks[currentStoryIndex].image_position || 'contain');
                  setEditingImageScale(normalizeScale(dailyTasks[currentStoryIndex].image_scale || 1));
                  setEditingImageOffset({
                    x: dailyTasks[currentStoryIndex].image_offset_x || 0,
                    y: dailyTasks[currentStoryIndex].image_offset_y || 0,
                  });
                  setEditingTitleOffset({
                    x: dailyTasks[currentStoryIndex].title_offset_x || 0,
                    y: dailyTasks[currentStoryIndex].title_offset_y || 0,
                  });
                  setEditingTitleFontSize(dailyTasks[currentStoryIndex].title_font_size || 17);
                  setEditingTitleColor(dailyTasks[currentStoryIndex].title_color || '#ffffff');
                  setEditingTitleFontFamily(dailyTasks[currentStoryIndex].title_font_family || 'Headline');
                }
              }}
              style={{
                background: storyEditMode ? '#0078d4' : 'rgba(255,255,255,0.15)',
                border: 'none',
                color: '#fff',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '6px',
                fontWeight: 'bold',
              }}
            >
              {storyEditMode ? '✓ Хадгалах' : '✏️ Засах'}
            </button>
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Story Content - Single Task */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: storyEditMode ? 'flex-start' : 'center',
          alignItems: 'center',
          padding: storyEditMode ? '6px' : '10px',
          color: '#fff',
          overflowY: 'hidden',
          overflowX: 'hidden',
          maxHeight: `${viewportHeight - 150}px`,
        }}>
          {loadingTasks ? (
            <p style={{ textAlign: 'center', color: '#aaa' }}>Уншиж байна...</p>
          ) : dailyTasks.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p style={{ color: '#aaa' }}>
                Өнөөдрийн ажил алга байна.<br/>
                Эхлэе!
              </p>
            </div>
          ) : dailyTasks[currentStoryIndex] && (
            <div 
              style={{ 
                width: '100%',
                maxWidth: '460px',
                animation: `slideIn 0.3s ease-out`,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}
            >
              {/* Task card */}
              <div style={{ 
                flex: 1,
                padding: storyEditMode ? '6px' : '10px',
                backgroundColor: dailyTasks[currentStoryIndex].completed 
                  ? 'rgba(76, 175, 80, 0.15)' 
                  : 'rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                border: `1px solid ${dailyTasks[currentStoryIndex].completed ? '#4CAF50' : 'rgba(255,255,255,0.2)'}`,
                textAlign: 'center',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                
                {!dailyTasks[currentStoryIndex].image_url && (
                  <div 
                    style={{ 
                      fontSize: storyEditMode ? `${editingTitleFontSize}px` : '17px',
                      fontWeight: '600',
                      color: storyEditMode ? editingTitleColor : (dailyTasks[currentStoryIndex].title_color || '#fff'),
                      fontFamily: storyEditMode ? editingTitleFontFamily : (dailyTasks[currentStoryIndex].title_font_family || 'Headline'),
                      marginBottom: '14px',
                      lineHeight: '1.3',
                      textDecoration: dailyTasks[currentStoryIndex].completed ? 'line-through' : 'none',
                      opacity: dailyTasks[currentStoryIndex].completed ? 0.8 : 1,
                      cursor: storyEditMode ? (isEditingText ? 'text' : 'grab') : 'default',
                      padding: storyEditMode ? '8px' : '0',
                      borderRadius: '8px',
                      border: storyEditMode ? '1px dashed rgba(255,255,255,0.3)' : 'none',
                      position: 'relative',
                      transform: storyEditMode ? `translate(${editingTitleOffset.x}px, ${editingTitleOffset.y}px)` : 'none',
                      transition: storyEditMode ? 'transform 0.05s linear' : 'transform 0.2s ease',
                      userSelect: storyEditMode ? 'none' : 'auto'
                    }}
                    onClick={(e) => {
                      if (storyEditMode && !isEditingText) {
                        e.stopPropagation();
                        setIsEditingText(true);
                      }
                    }}
                    onMouseDown={(e) => {
                      if (!storyEditMode || isEditingText) return;
                      e.preventDefault();
                      e.stopPropagation();
                      beginTitlePan(e.clientX, e.clientY);
                    }}
                    onTouchStart={(e) => {
                      if (!storyEditMode || isEditingText) return;
                      e.stopPropagation();
                      if (e.touches[0]) beginTitlePan(e.touches[0].clientX, e.touches[0].clientY);
                    }}
                    onTouchMove={(e) => {
                      if (!storyEditMode || isEditingText) return;
                      e.stopPropagation();
                      if (e.touches[0]) moveTitlePan(e.touches[0].clientX, e.touches[0].clientY);
                    }}
                  >
                    {storyEditMode && isEditingText ? (
                      <textarea
                        value={editingTitleText || ''}
                        onChange={(e) => setEditingTitleText(e.target.value)}
                        placeholder={dailyTasks[currentStoryIndex].task}
                        onBlur={() => setIsEditingText(false)}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        autoFocus
                        style={{
                          background: 'transparent',
                          border: '1px dashed rgba(255,255,255,0.5)',
                          color: 'inherit',
                          fontSize: 'inherit',
                          fontFamily: 'inherit',
                          fontWeight: 'inherit',
                          width: '100%',
                          minHeight: '60px',
                          padding: '8px',
                          borderRadius: '6px',
                          resize: 'none',
                          outline: 'none',
                          textAlign: 'center',
                          cursor: 'text'
                        }}
                        rows={3}
                      />
                    ) : (
                      storyEditMode ? editingTitleText : dailyTasks[currentStoryIndex].task
                    )}
                  </div>
                )}
                
                {/* Edit Controls for Text-Only Stories */}
                {!dailyTasks[currentStoryIndex].image_url && isEditingText && (
                  <div style={{
                    marginTop: '16px',
                    padding: '10px',
                    background: 'rgba(0,0,0,0.85)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                      {['#FFFFFF', '#000000', '#FF6347', '#FFD700', '#4A90E2', '#90EE90', '#FF1493', '#FFA500', '#8B4513', '#FF69B4', '#00CED1', '#9370DB', '#32CD32', '#FF4500', '#4169E1', '#FFB6C1'].map(color => (
                        <button 
                          key={color} 
                          onClick={() => setEditingTitleColor(color)}
                          onMouseDown={(e) => e.preventDefault()}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: color,
                            border: editingTitleColor === color ? '3px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                            cursor: 'pointer',
                            boxShadow: editingTitleColor === color ? '0 0 10px rgba(255,255,255,0.8)' : 'none',
                            transition: 'all 0.2s ease',
                            transform: editingTitleColor === color ? 'scale(1.15)' : 'scale(1)'
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '12px', color: '#fff', marginBottom: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                          {editingTitleFontSize}px
                        </div>
                        <input 
                          type="range" 
                          min="14" 
                          max="28" 
                          value={editingTitleFontSize}
                          onChange={(e) => setEditingTitleFontSize(parseInt(e.target.value))}
                          onMouseDown={(e) => e.preventDefault()}
                          style={{
                            width: '100%',
                            height: '5px',
                            background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, #0078d4 100%)',
                            borderRadius: '3px',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Task Image */}
                {dailyTasks[currentStoryIndex].image_url && (
                  <div style={{ marginTop: '14px', marginBottom: '14px' }}>
                    <div 
                      style={{ overflow: 'hidden', borderRadius: '10px', position: 'relative' }}
                      onWheel={handleImageWheel}
                      onMouseDown={(e) => {
                        if (!storyEditMode) return;
                        e.preventDefault();
                        beginImagePan(e.clientX, e.clientY);
                      }}
                      onMouseMove={(e) => {
                        if (!storyEditMode) return;
                        moveImagePan(e.clientX, e.clientY);
                      }}
                      onMouseUp={endImagePan}
                      onMouseLeave={endImagePan}
                      onTouchStart={(e) => {
                        if (!storyEditMode) return;
                        if (e.touches[0]) {
                          beginImagePan(e.touches[0].clientX, e.touches[0].clientY);
                        }
                      }}
                      onTouchMove={(e) => {
                        if (!storyEditMode) return;
                        if (e.touches[0]) {
                          moveImagePan(e.touches[0].clientX, e.touches[0].clientY);
                        }
                      }}
                      onTouchEnd={endImagePan}
                    >
                      {/* Title overlay on image */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: `translate(-50%, -50%) translate(${
                            storyEditMode ? editingTitleOffset.x : (dailyTasks[currentStoryIndex].title_offset_x ?? 0)
                          }px, ${
                            storyEditMode ? editingTitleOffset.y : (dailyTasks[currentStoryIndex].title_offset_y ?? 0)
                          }px)`,
                          transition: storyEditMode ? 'transform 0.05s linear' : 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          color: storyEditMode ? editingTitleColor : (dailyTasks[currentStoryIndex].title_color || '#fff'),
                          fontWeight: 700,
                          fontSize: storyEditMode ? `${editingTitleFontSize}px` : `${(dailyTasks[currentStoryIndex].title_font_size || 17)}px`,
                          fontFamily: storyEditMode ? editingTitleFontFamily : (dailyTasks[currentStoryIndex].title_font_family || 'Headline'),
                          padding: '8px 12px',
                          background: 'rgba(0,0,0,0.45)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.35)',
                          boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
                          cursor: storyEditMode ? (isPanningTitle ? 'grabbing' : 'grab') : 'pointer',
                          userSelect: storyEditMode ? 'none' : 'auto',
                          zIndex: 5,
                          pointerEvents: 'auto'
                        }}
                        onClick={(e) => {
                          if (!storyEditMode) {
                            e.stopPropagation();
                            setStoryEditMode(true);
                            setEditingImagePosition(dailyTasks[currentStoryIndex].image_position || 'contain');
                            setEditingImageScale(normalizeScale(dailyTasks[currentStoryIndex].image_scale || 1));
                            setEditingImageOffset({
                              x: dailyTasks[currentStoryIndex].image_offset_x || 0,
                              y: dailyTasks[currentStoryIndex].image_offset_y || 0,
                            });
                            setEditingTitleOffset({
                              x: dailyTasks[currentStoryIndex].title_offset_x || 0,
                              y: dailyTasks[currentStoryIndex].title_offset_y || 0,
                            });
                            setEditingTitleFontSize(dailyTasks[currentStoryIndex].title_font_size || 17);
                            setEditingTitleColor(dailyTasks[currentStoryIndex].title_color || '#ffffff');
                            setEditingTitleFontFamily(dailyTasks[currentStoryIndex].title_font_family || 'Headline');
                            setEditingTitleText(dailyTasks[currentStoryIndex].task || '');
                          }
                        }}
                        onMouseDown={(e) => {
                          if (!storyEditMode) return;
                          if (isEditingText) return;
                          e.preventDefault();
                          e.stopPropagation();
                          beginTitlePan(e.clientX, e.clientY);
                        }}
                        onTouchStart={(e) => {
                          if (!storyEditMode) return;
                          if (isEditingText) return;
                          e.stopPropagation();
                          if (e.touches[0]) beginTitlePan(e.touches[0].clientX, e.touches[0].clientY);
                        }}
                        onTouchMove={(e) => {
                          if (!storyEditMode) return;
                          if (isEditingText) return;
                          e.stopPropagation();
                          if (e.touches[0]) moveTitlePan(e.touches[0].clientX, e.touches[0].clientY);
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                          endTitlePan();
                        }}
                      >
                        {storyEditMode && isEditingText ? (
                          <textarea
                            value={editingTitleText || ''}
                            onChange={(e) => setEditingTitleText(e.target.value)}
                            placeholder={dailyTasks[currentStoryIndex].task}
                            onBlur={() => setIsEditingText(false)}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            onMouseMove={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                            }}
                            onTouchMove={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                            autoFocus
                            style={{
                              background: 'transparent',
                              border: '1px dashed rgba(255,255,255,0.5)',
                              color: 'inherit',
                              fontSize: 'inherit',
                              fontFamily: 'inherit',
                              fontWeight: 'inherit',
                              width: '100%',
                              minHeight: '40px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              resize: 'none',
                              outline: 'none',
                              textAlign: 'center',
                              cursor: 'text',
                              position: 'relative',
                              margin: 0
                            }}
                            rows={2}
                          />
                        ) : (
                          <div
                            onClick={(e) => {
                              if (storyEditMode) {
                                e.stopPropagation();
                                setIsEditingText(true);
                              }
                            }}
                            onMouseDown={(e) => {
                              if (storyEditMode) {
                                e.stopPropagation();
                              }
                            }}
                            style={{
                              cursor: storyEditMode ? 'text' : 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              border: storyEditMode ? '1px dashed rgba(255,255,255,0.3)' : 'none',
                              position: 'relative',
                              width: '100%',
                              textAlign: 'center'
                            }}
                          >
                            {storyEditMode ? editingTitleText : dailyTasks[currentStoryIndex].task}
                          </div>
                        )}
                      </div>
                      {storyEditMode && (
                        <div style={{
                          position: 'absolute',
                          bottom: '8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          gap: '6px',
                          zIndex: 6,
                          background: 'rgba(0,0,0,0.55)',
                          padding: '6px',
                          borderRadius: '10px',
                          backdropFilter: 'blur(6px)'
                        }}>
                          <button
                            onClick={() => adjustEditingScale(-0.1)}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.4)',
                              background: 'rgba(255,255,255,0.1)',
                              color: '#fff',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            −
                          </button>
                          <div style={{
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            minWidth: '78px',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 8px'
                          }}>
                            {Math.round(editingImageScale * 100)}%
                          </div>
                          <button
                            onClick={() => adjustEditingScale(0.1)}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.4)',
                              background: 'rgba(255,255,255,0.1)',
                              color: '#fff',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                      <img 
                        src={dailyTasks[currentStoryIndex].image_url.startsWith('data:') ? dailyTasks[currentStoryIndex].image_url : `${BASE_URL}${dailyTasks[currentStoryIndex].image_url}`} 
                        alt="Task" 
                        onMouseDown={(e) => {
                          if (!storyEditMode) return;
                          e.preventDefault();
                          beginImagePan(e.clientX, e.clientY);
                        }}
                        onTouchStart={(e) => {
                          if (!storyEditMode) return;
                          if (e.touches[0]) beginImagePan(e.touches[0].clientX, e.touches[0].clientY);
                        }}
                        onTouchMove={(e) => {
                          if (!storyEditMode) return;
                          if (e.touches[0]) moveImagePan(e.touches[0].clientX, e.touches[0].clientY);
                        }}
                        onTouchEnd={endImagePan}
                        onWheel={handleImageWheel}
                        style={{ 
                          maxWidth: '100%',
                          maxHeight: `${viewportHeight * 0.6}px`,
                          width: '100%',
                          borderRadius: '10px',
                          objectFit: storyEditMode ? editingImagePosition : (dailyTasks[currentStoryIndex].image_position || 'contain'),
                          transform: storyEditMode
                            ? `translate(${editingImageOffset.x}px, ${editingImageOffset.y}px) scale(${editingImageScale})`
                            : `translate(${dailyTasks[currentStoryIndex].image_offset_x || 0}px, ${dailyTasks[currentStoryIndex].image_offset_y || 0}px) scale(${dailyTasks[currentStoryIndex].image_scale || 1})`,
                          transition: storyEditMode ? 'transform 0.05s linear, object-fit 0.3s ease' : 'transform 0.3s ease, object-fit 0.3s ease',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          cursor: storyEditMode ? (isPanningImage ? 'grabbing' : 'grab') : 'default'
                        }} 
                      />
                    </div>

                    {/* Edit Controls - Bottom Right of Text Area */}
                    {isEditingText && (
                      <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        padding: '10px',
                        background: 'rgba(0,0,0,0.85)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        zIndex: 10,
                        maxWidth: '300px'
                      }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                          {['#FFFFFF', '#000000', '#FF6347', '#FFD700', '#4A90E2', '#90EE90', '#FF1493', '#FFA500', '#8B4513', '#FF69B4', '#00CED1', '#9370DB', '#32CD32', '#FF4500', '#4169E1', '#FFB6C1'].map(color => (
                            <button 
                              key={color} 
                              onClick={() => setEditingTitleColor(color)}
                              onMouseDown={(e) => e.preventDefault()}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: color,
                                border: editingTitleColor === color ? '3px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                                cursor: 'pointer',
                                boxShadow: editingTitleColor === color ? '0 0 10px rgba(255,255,255,0.8)' : 'none',
                                transition: 'all 0.2s ease',
                                transform: editingTitleColor === color ? 'scale(1.15)' : 'scale(1)'
                              }}
                            />
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '12px', color: '#fff', marginBottom: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                              {editingTitleFontSize}px
                            </div>
                            <input 
                              type="range" 
                              min="14" 
                              max="28" 
                              value={editingTitleFontSize}
                              onChange={(e) => setEditingTitleFontSize(parseInt(e.target.value))}
                              onMouseDown={(e) => e.preventDefault()}
                              style={{
                                width: '100%',
                                height: '5px',
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.3) 0%, #0078d4 100%)',
                                borderRadius: '3px',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                          <button
                            onClick={() => setEditingImagePosition(editingImagePosition === 'contain' ? 'cover' : 'contain')}
                            onMouseDown={(e) => e.preventDefault()}
                            style={{
                              padding: '10px 14px',
                              background: '#0078d4',
                              border: 'none',
                              color: '#fff',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {editingImagePosition === 'contain' ? '🖼️ Бүтэн' : '✂️ Дүүргэх'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}               
                <div style={{
                  fontSize: '11px',
                  color: dailyTasks[currentStoryIndex].completed ? '#4CAF50' : '#aaa',
                  marginTop: '6px',
                  fontWeight: 'bold',
                }}>
                  {dailyTasks[currentStoryIndex].completed ? '🎉 Дууссан' : '⏳ Хүлээгдэж байна'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat-like Notes Input */}
        {!storyEditMode && (
          <div
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => { setDisableGestures(true); e.stopPropagation(); e.preventDefault(); }}
            onTouchMove={(e) => { setDisableGestures(true); e.stopPropagation(); e.preventDefault(); }}
            onTouchEnd={(e) => { setDisableGestures(false); e.stopPropagation(); e.preventDefault(); }}
            onPointerDown={(e) => { setDisableGestures(true); e.stopPropagation(); }}
            onPointerMove={(e) => { setDisableGestures(true); e.stopPropagation(); }}
            onPointerUp={(e) => { setDisableGestures(false); e.stopPropagation(); }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              background: 'rgba(0,0,0,0.7)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              touchAction: 'none',
            }}
          >
            {/* Display existing notes */}
            {editingNotes && (
              <div style={{
                padding: '10px 12px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                maxHeight: '60px',
                overflowY: 'auto',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {editingNotes}
              </div>
            )}
            
            {/* Input area */}
            <div
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => { setDisableGestures(true); e.stopPropagation(); e.preventDefault(); }}
              onTouchMove={(e) => { setDisableGestures(true); e.stopPropagation(); e.preventDefault(); }}
              onTouchEnd={(e) => { setDisableGestures(false); e.stopPropagation(); e.preventDefault(); }}
              onPointerDown={(e) => { setDisableGestures(true); e.stopPropagation(); }}
              onPointerMove={(e) => { setDisableGestures(true); e.stopPropagation(); }}
              onPointerUp={(e) => { setDisableGestures(false); e.stopPropagation(); }}
              style={{
                padding: '10px 12px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-end',
                touchAction: 'none',
              }}
            >
            <input
              type="text"
              value={currentNoteInput}
              onChange={(e) => setCurrentNoteInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => { setDisableGestures(true); e.stopPropagation(); }}
              onTouchMove={(e) => { setDisableGestures(true); e.stopPropagation(); }}
              onTouchEnd={(e) => { setDisableGestures(false); e.stopPropagation(); }}
              onPointerDown={(e) => { setDisableGestures(true); e.stopPropagation(); }}
              onPointerMove={(e) => { setDisableGestures(true); e.stopPropagation(); }}
              onPointerUp={(e) => { setDisableGestures(false); e.stopPropagation(); }}
              placeholder="Тэмдэглэл нэмэх..."
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '20px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                touchAction: 'none',
              }}
            />
            <button
              onClick={handleAddNote}
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => { setDisableGestures(true); e.stopPropagation(); }}
              onTouchMove={(e) => { setDisableGestures(true); e.stopPropagation(); }}
              onTouchEnd={(e) => { setDisableGestures(false); e.stopPropagation(); }}
              onPointerDown={(e) => { setDisableGestures(true); e.stopPropagation(); }}
              onPointerMove={(e) => { setDisableGestures(true); e.stopPropagation(); }}
              onPointerUp={(e) => { setDisableGestures(false); e.stopPropagation(); }}
              style={{
                background: '#0078d4',
                border: 'none',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '36px',
                minHeight: '36px',
                transition: 'background 0.2s',
                fontWeight: 'bold',
                touchAction: 'none',
              }}
            >
              ➤
            </button>
            </div>
          </div>
        )}

        {/* Navigation zones */}
        {dailyTasks.length > 1 && !storyEditMode && (
          <>
            <div
              onClick={() => {
                if (currentStoryIndex > 0) {
                  navigator?.vibrate?.(10);
                  setCurrentStoryIndex(currentStoryIndex - 1);
                }
              }}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '30%',
                cursor: 'pointer',
                zIndex: 10,
              }}
            />
            <div
              onClick={() => {
                if (currentStoryIndex < dailyTasks.length - 1) {
                  navigator?.vibrate?.(10);
                  setCurrentStoryIndex(currentStoryIndex + 1);
                } else {
                  handleClose();
                }
              }}
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '30%',
                cursor: 'pointer',
                zIndex: 10,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default StoryModal;
