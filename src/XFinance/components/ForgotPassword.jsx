import React, { useState } from 'react';
import { Input, Button, MessageBar, MessageBarIntent } from '@fluentui/react-components';
import { BASE_URL } from '../../config';

const ForgotPassword = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIntent, setMessageIntent] = useState('info');
  const [showTokenInput, setShowTokenInput] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessageIntent('success');
        setMessage('✅ ' + data.message + ' Токеныг имэйлээс хуулж доор оруулна уу.');
        setEmail('');
        setShowTokenInput(true);
      } else {
        setMessageIntent('error');
        setMessage(data.message || 'Алдаа гарлаа');
      }
    } catch (error) {
      setMessageIntent('error');
      setMessage('Серверт холбогдоход алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2>Нууц үг сэргээх</h2>
        
        {!showTokenInput ? (
          <>
            <p style={{ color: '#666' }}>
              Бүртгэлтэй имэйл хаягаа оруулна уу. Нууц үг сэргээх токен илгээх болно.
            </p>

            {message && (
              <MessageBar intent={messageIntent}>
                {message}
              </MessageBar>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <Input
                  placeholder="Имэйл хаяг"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />

                <Button appearance="primary" type="submit" disabled={loading || !email}>
                  {loading ? 'Илгээж байна...' : 'Токен илгээх'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <p style={{ color: '#666' }}>
              Имэйлээс ирсэн токеныг доор оруулна уу:
            </p>

            {message && (
              <MessageBar intent={messageIntent}>
                {message}
              </MessageBar>
            )}

            <Input
              placeholder="Токен (имэйлээс хуулна уу)"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />

            <Button 
              appearance="primary" 
              onClick={() => {
                if (token) {
                  window.location.href = `/XFinance.html?token=${token}`;
                }
              }}
              disabled={!token}
            >
              Үргэлжлүүлэх
            </Button>

            <button
              type="button"
              onClick={() => {
                setShowTokenInput(false);
                setMessage('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0078d4',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
                fontSize: '14px',
              }}
            >
              ← Буцах
            </button>
          </>
        )}

        {onBackToLogin && !showTokenInput && (
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#0078d4',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
              fontSize: '14px',
              marginTop: '10px',
            }}
          >
            ← Нэвтрэх хуудас руу буцах
          </button>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
