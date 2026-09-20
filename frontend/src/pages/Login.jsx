import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const usernameRef = useRef(null);

  const [fields, setFields] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
    else usernameRef.current?.focus();
  }, [isAuthenticated, navigate]);

  function handleChange(e) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!fields.username.trim() || !fields.password) {
      setError('Username and password are required.');
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 200));
    const result = login(fields.username.trim(), fields.password);
    setLoading(false);
    if (result.ok) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="login-root">
      <div className="login-left" aria-hidden="true">
        <div className="login-brand-mark">
          <span className="login-wordmark">KOHLER</span>
          <span className="login-tagline">Facility Command Center</span>
        </div>
      </div>

      <main className="login-right">
        <div className="login-form-wrap">
          <header className="login-header">
            <p className="login-pre-label">AIRPORT OPERATIONS</p>
            <h1 className="login-title">Administrator Sign In</h1>
          </header>

          <form onSubmit={handleSubmit} noValidate className="login-form" aria-label="Sign in form">
            <div className="field-group">
              <label htmlFor="username" className="field-label">Username</label>
              <input
                ref={usernameRef}
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={fields.username}
                onChange={handleChange}
                disabled={loading}
                className="field-input"
                placeholder="admin"
              />
            </div>

            <div className="field-group">
              <label htmlFor="password" className="field-label">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={fields.password}
                onChange={handleChange}
                disabled={loading}
                className="field-input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="login-btn"
            >
              {loading ? 'Authenticating…' : 'Sign In'}
            </button>
          </form>

          <footer className="login-footer">
            <span>Restricted Access · Authorized Personnel Only</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
