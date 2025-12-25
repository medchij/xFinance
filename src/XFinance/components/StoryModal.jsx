import React from "react";
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
  editingTitleOffset,
  setEditingTitleOffset,
  editingTitleFontSize,
  setEditingTitleFontSize,
  editingTitleColor,
  setEditingTitleColor,
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
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
}) => {
  if (!showStoryModal) return null;

  const handleClose = () => {
    if (onCloseStories) {
      onCloseStories();
    }
    setCurrentStoryIndex(0);
    setStoryEditMode(false);
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
      }}
      onClick={handleClose}
      onTouchStart={!storyEditMode ? handleTouchStart : undefined}
      onTouchMove={!storyEditMode ? handleTouchMove : undefined}
      onTouchEnd={!storyEditMode ? handleTouchEnd : undefined}
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
        onTouchStart={!storyEditMode ? handleTouchStart : undefined}
        onTouchMove={!storyEditMode ? handleTouchMove : undefined}
        onTouchEnd={!storyEditMode ? handleTouchEnd : undefined}
      >
        {/* Progress Bars */}
        {dailyTasks.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '4px',
            padding: '8px',
            background: 'rgba(0,0,0,0.6)',
          }}>
            {dailyTasks.map((_, index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: '3px',
                  backgroundColor: index < currentStoryIndex ? '#4CAF50' : index === currentStoryIndex ? '#fff' : 'rgba(255,255,255,0.3)',
                  borderRadius: '2px',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
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
                <img src={`${BASE_URL}${avatarUrl}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
            {dailyTasks[currentStoryIndex]?.image_url && (
              <button
                onClick={() => {
                  if (storyEditMode) {
                    handleSaveImageSettings();
                  } else {
                    setStoryEditMode(true);
                    setEditingImagePosition(dailyTasks[currentStoryIndex].image_position || 'contain');
                    setEditingImageScale(normalizeScale(dailyTasks[currentStoryIndex].image_scale || 1));
                    setEditingImageOffset({ x: 0, y: 0 });
                    setEditingTitleOffset({
                      x: dailyTasks[currentStoryIndex].title_offset_x || 0,
                      y: dailyTasks[currentStoryIndex].title_offset_y || 0,
                    });
                    setEditingTitleFontSize(dailyTasks[currentStoryIndex].title_font_size || 17);
                    setEditingTitleColor(dailyTasks[currentStoryIndex].title_color || '#ffffff');
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
            )}
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
          justifyContent: 'center',
          alignItems: 'center',
          padding: '12px',
          color: '#fff',
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
              }}
            >
              {/* Task card */}
              <div style={{ 
                padding: '16px',
                backgroundColor: dailyTasks[currentStoryIndex].completed 
                  ? 'rgba(76, 175, 80, 0.15)' 
                  : 'rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                border: `2px solid ${dailyTasks[currentStoryIndex].completed ? '#4CAF50' : 'rgba(255,255,255,0.2)'}`,
                textAlign: 'center',
              }}>
                {!dailyTasks[currentStoryIndex].image_url && (
                  <div 
                    style={{ 
                      fontSize: '17px',
                      fontWeight: '600',
                      color: '#fff',
                      marginBottom: '14px',
                      lineHeight: '1.3',
                      textDecoration: dailyTasks[currentStoryIndex].completed ? 'line-through' : 'none',
                      opacity: dailyTasks[currentStoryIndex].completed ? 0.8 : 1,
                    }}
                  >
                    {dailyTasks[currentStoryIndex].task}
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
                          padding: '8px 12px',
                          background: 'rgba(0,0,0,0.45)',
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.35)',
                          boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
                          cursor: storyEditMode ? (isPanningTitle ? 'grabbing' : 'grab') : 'default',
                          userSelect: storyEditMode ? 'none' : 'auto',
                          zIndex: 5,
                          pointerEvents: storyEditMode ? 'auto' : 'none'
                        }}
                        onMouseDown={(e) => {
                          if (!storyEditMode) return;
                          e.preventDefault();
                          beginTitlePan(e.clientX, e.clientY);
                        }}
                        onMouseMove={(e) => {
                          if (!storyEditMode) return;
                          moveTitlePan(e.clientX, e.clientY);
                        }}
                        onMouseUp={endTitlePan}
                        onMouseLeave={endTitlePan}
                        onTouchStart={(e) => {
                          if (!storyEditMode) return;
                          if (e.touches[0]) beginTitlePan(e.touches[0].clientX, e.touches[0].clientY);
                        }}
                        onTouchMove={(e) => {
                          if (!storyEditMode) return;
                          if (e.touches[0]) moveTitlePan(e.touches[0].clientX, e.touches[0].clientY);
                        }}
                        onTouchEnd={endTitlePan}
                      >
                        {dailyTasks[currentStoryIndex].task}
                      </div>
                      {storyEditMode && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
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
                          <button
                            onClick={resetImageOffset}
                            style={{
                              height: '36px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.4)',
                              background: 'rgba(255,255,255,0.08)',
                              color: '#fff',
                              fontWeight: 'bold',
                              padding: '0 10px',
                              cursor: 'pointer'
                            }}
                          >
                            Төвлөрүүлэх
                          </button>
                          <button
                            onClick={resetTitleOffset}
                            style={{
                              height: '36px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.4)',
                              background: 'rgba(255,255,255,0.08)',
                              color: '#fff',
                              fontWeight: 'bold',
                              padding: '0 10px',
                              cursor: 'pointer'
                            }}
                          >
                            Гарчиг төвлөрүүлэх
                          </button>
                        </div>
                      )}
                      <img 
                        src={`${BASE_URL}${dailyTasks[currentStoryIndex].image_url}`} 
                        alt="Task" 
                        style={{ 
                          maxWidth: '100%',
                          maxHeight: '580px',
                          width: '100%',
                          borderRadius: '10px',
                          objectFit: storyEditMode ? editingImagePosition : (dailyTasks[currentStoryIndex].image_position || 'contain'),
                          transform: storyEditMode
                            ? `translate(${editingImageOffset.x}px, ${editingImageOffset.y}px) scale(${editingImageScale})`
                            : `scale(${dailyTasks[currentStoryIndex].image_scale || 1})`,
                          transition: storyEditMode ? 'transform 0.05s linear, object-fit 0.3s ease' : 'transform 0.3s ease, object-fit 0.3s ease',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                          cursor: storyEditMode ? (isPanningImage ? 'grabbing' : 'grab') : 'default'
                        }} 
                      />
                    </div>
                    
                    {/* Edit Controls */}
                    {storyEditMode && (
                      <div style={{
                        marginTop: '16px',
                        padding: '16px',
                        background: 'rgba(0,0,0,0.5)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)'
                      }}>
                        {/* Text Styling */}
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ 
                            display: 'block', 
                            fontSize: '13px', 
                            color: '#ddd',
                            marginBottom: '8px',
                            fontWeight: 'bold'
                          }}>
                            ✏️ Гарчигийн хэмжээ: {editingTitleFontSize}px
                          </label>
                          <input
                            type="range"
                            min="12"
                            max="32"
                            value={editingTitleFontSize}
                            onChange={(e) => setEditingTitleFontSize(parseInt(e.target.value))}
                            style={{
                              width: '100%',
                              height: '6px',
                              background: 'rgba(255,255,255,0.2)',
                              borderRadius: '3px',
                              outline: 'none',
                              cursor: 'pointer',
                              marginBottom: '12px'
                            }}
                          />
                          <label style={{ 
                            display: 'block', 
                            fontSize: '13px', 
                            color: '#ddd',
                            marginBottom: '8px',
                            fontWeight: 'bold'
                          }}>
                            🎨 Өнгө:
                          </label>
                          <input
                            type="color"
                            value={editingTitleColor}
                            onChange={(e) => setEditingTitleColor(e.target.value)}
                            style={{
                              width: '100%',
                              height: '40px',
                              border: '1px solid rgba(255,255,255,0.3)',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              marginBottom: '12px'
                            }}
                          />
                        </div>

                        {/* Image Position */}
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ 
                            display: 'block', 
                            fontSize: '13px', 
                            color: '#ddd',
                            marginBottom: '8px',
                            fontWeight: 'bold'
                          }}>
                            📐 Зургийн байршил:
                          </label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => setEditingImagePosition('contain')}
                              style={{
                                flex: 1,
                                padding: '8px',
                                background: editingImagePosition === 'contain' ? '#0078d4' : 'rgba(255,255,255,0.1)',
                                border: editingImagePosition === 'contain' ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                                color: '#fff',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}
                            >
                              🖼️ Бүтэн
                            </button>
                            <button
                              onClick={() => setEditingImagePosition('cover')}
                              style={{
                                flex: 1,
                                padding: '8px',
                                background: editingImagePosition === 'cover' ? '#0078d4' : 'rgba(255,255,255,0.1)',
                                border: editingImagePosition === 'cover' ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                                color: '#fff',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}
                            >
                              ✂️ Дүүргэх
                            </button>
                            <button
                              onClick={() => setEditingImagePosition('fill')}
                              style={{
                                flex: 1,
                                padding: '8px',
                                background: editingImagePosition === 'fill' ? '#0078d4' : 'rgba(255,255,255,0.1)',
                                border: editingImagePosition === 'fill' ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                                color: '#fff',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}
                            >
                              ↔️ Сунгах
                            </button>
                          </div>
                        </div>
                        
                        {/* Image Scale */}
                        <div>
                          <label style={{ 
                            display: 'block', 
                            fontSize: '13px', 
                            color: '#ddd',
                            marginBottom: '8px',
                            fontWeight: 'bold'
                          }}>
                            🔍 Хэмжээ: {Math.round(editingImageScale * 100)}%
                          </label>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button
                              onClick={() => setEditingImageScale(Math.max(0.5, editingImageScale - 0.1))}
                              style={{
                                width: '40px',
                                height: '40px',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: '#fff',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px',
                                fontWeight: 'bold'
                              }}
                            >
                              −
                            </button>
                            <input
                              type="range"
                              min="0.5"
                              max="2"
                              step="0.1"
                              value={editingImageScale}
                              onChange={(e) => setEditingImageScale(normalizeScale(e.target.value))}
                              style={{
                                flex: 1,
                                height: '6px',
                                background: 'rgba(255,255,255,0.2)',
                                borderRadius: '3px',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            />
                            <button
                              onClick={() => setEditingImageScale(Math.min(2, editingImageScale + 0.1))}
                              style={{
                                width: '40px',
                                height: '40px',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: '#fff',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '20px',
                                fontWeight: 'bold'
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        
                        {/* Save Button */}
                        <button
                          onClick={handleSaveImageSettings}
                          style={{
                            width: '100%',
                            marginTop: '16px',
                            padding: '12px',
                            background: '#0078d4',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}
                        >
                          ✓ Хадгалах
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <div style={{
                  fontSize: '13px',
                  color: dailyTasks[currentStoryIndex].completed ? '#4CAF50' : '#aaa',
                  marginTop: '12px',
                  fontWeight: 'bold',
                }}>
                  {dailyTasks[currentStoryIndex].completed ? '🎉 Дууссан' : '⏳ Хүлээгдэж байна'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation zones */}
        {dailyTasks.length > 1 && !storyEditMode && (
          <>
            <div
              onClick={() => {
                if (currentStoryIndex > 0) {
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
