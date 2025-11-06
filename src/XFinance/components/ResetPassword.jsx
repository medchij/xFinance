import React, { useState, useEffect } from 'react';
import { Input, Button, MessageBar, MessageBarIntent } from '@fluentui/react-components';
import { BASE_URL } from '../../config';

const ResetPassword = () => {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageIntent, setMessageIntent] = useState('info');
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    // URL-аас token авах
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessageIntent('error');
      setMessage('Нууц үг таарахгүй байна');
      return;
    }

    if (newPassword.length < 6) {
      setMessageIntent('error');
      setMessage('Нууц үг дор хаяж 6 тэмдэгт байх ёстой');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessageIntent('success');
        setMessage(data.message);
        setResetSuccess(true);
        setNewPassword('');
        setConfirmPassword('');
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

  if (!token) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
        <MessageBar intent="error">
          Токен олдсонгүй. Нууц үг сэргээх линкээ дахин шалгана уу.
        </MessageBar>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2>Шинэ нууц үг үүсгэх</h2>

        {message && (
          <MessageBar intent={messageIntent}>
            {message}
          </MessageBar>
        )}

        {resetSuccess ? (
          <div>
            <p>Нууц үг амжилттай шинэчлэгдлээ. Та одоо шинэ нууц үгээрээ нэвтэрч болно.</p>
            <Button appearance="primary" onClick={() => window.location.href = '/'}>
              Нэвтрэх хуудас руу очих
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <Input
                placeholder="Шинэ нууц үг"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />

              <Input
                placeholder="Нууц үг баталгаажуулах"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />

              <Button appearance="primary" type="submit" disabled={loading || !newPassword || !confirmPassword}>
                {loading ? 'Хадгалж байна...' : 'Нууц үг шинэчлэх'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
