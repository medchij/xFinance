import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';

const LogViewer = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      const allLogs = logger.getLogs();
      setLogs(allLogs);
    }
  }, [isOpen]);

  const refreshLogs = () => {
    const allLogs = logger.getLogs();
    setLogs(allLogs);
  };

  const clearAllLogs = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const exportLogs = () => {
    logger.exportLogs();
  };

  const filteredLogs = logs
    .filter(log => filter === 'all' || log.level.toLowerCase() === filter)
    .filter(log => 
      searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .slice(-100) // Хамгийн сүүлийн 100
    .reverse(); // Шинэ логийг эхэнд харуулах

  const getLevelColor = (level) => {
    switch (level.toLowerCase()) {
      case 'error': return '#ff4444';
      case 'warn': return '#ffaa00';
      case 'info': return '#4444ff';
      case 'debug': return '#888888';
      default: return '#000000';
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 10000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        width: '90%',
        height: '90%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ margin: 0 }}>📋 Програмын Лог</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              style={{ padding: '4px 8px' }}
            >
              <option value="all">Бүгд</option>
              <option value="error">Алдаа</option>
              <option value="warn">Сэрэмжлүүлэг</option>
              <option value="info">Мэдээлэл</option>
              <option value="debug">Debug</option>
            </select>
            
            <input
              type="text"
              placeholder="Хайх..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '4px 8px', width: '150px' }}
            />
            
            <button onClick={refreshLogs} style={{ padding: '4px 8px' }}>
              🔄 Сэргээх
            </button>
            
            <button onClick={exportLogs} style={{ padding: '4px 8px' }}>
              💾 Экспорт
            </button>
            
            <button 
              onClick={clearAllLogs} 
              style={{ padding: '4px 8px', backgroundColor: '#ff4444', color: 'white' }}
            >
              🗑️ Цэвэрлэх
            </button>
            
            <button onClick={onClose} style={{ padding: '4px 8px' }}>
              ✖️ Хаах
            </button>
          </div>
        </div>

        {/* Logs container */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {filteredLogs.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Лог олдсонгүй
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div 
                key={log.id || index}
                style={{
                  padding: '8px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{ color: '#666', minWidth: '140px' }}>
                    {log.timestamp}
                  </span>
                  <span style={{
                    color: getLevelColor(log.level),
                    fontWeight: 'bold',
                    minWidth: '60px'
                  }}>
                    [{log.level}]
                  </span>
                  <span>{log.message}</span>
                </div>
                
                {log.data && (
                  <div style={{
                    marginLeft: '156px',
                    color: '#666',
                    backgroundColor: '#f8f8f8',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    maxHeight: '100px',
                    overflow: 'auto'
                  }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                      {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid #ddd',
          fontSize: '12px',
          color: '#666',
          textAlign: 'center'
        }}>
          Нийт {logs.length} лог, харуулж байгаа {filteredLogs.length}
        </div>
      </div>
    </div>
  );
};

export default LogViewer;