import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Login.css';

const BACKGROUND_IMAGE =
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1920&q=80';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [notices, setNotices] = useState([]);
  const [noticesLoading, setNoticesLoading] = useState(false);

  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const now = useClock();

  const from = location.state?.from?.pathname || '/dashboard';
  const timeString = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const NOTICE_LABELS = { update: 'Update', info: 'Info', urgent: 'Urgent' };

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setNoticesLoading(true);
      const response = await axios.get('/api/notices');
      setNotices(response.data.notices || []);
    } catch (err) {
      // Non-critical - just log error, don't show to user
      console.error('Failed to fetch notices:', err);
      setNotices([]);
    } finally {
      setNoticesLoading(false);
    }
  };

  const formatNoticeDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const result = await login(formData);

    if (result.success) {
      if (result.user?.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } else {
      setErrors({ general: result.error });
    }
  };

  return (
    <div className="lock-screen">
      <div className="lock-media" style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }} />
      <div className="lock-scrim" />

      <div className="lock-content">
        <div className="lock-clock">
          <div className="lock-time">{timeString}</div>
          <div className="lock-date">{dateString}</div>
        </div>

        <form onSubmit={handleSubmit} className="lock-card">
          <div className="lock-brand">
            <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <path
                d="M5 7a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v1H5V7Z"
                fill="none" stroke="white" strokeWidth="1.4"
              />
              <rect x="5" y="9.5" width="18" height="11.5" rx="1.5" fill="none" stroke="white" strokeWidth="1.4" />
            </svg>
            <span>Tender Care</span>
          </div>

          {errors.general && <div className="lock-error">{errors.general}</div>}

          <div className="lock-field">
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={`lock-input ${errors.username ? 'error' : ''}`}
              placeholder="Username"
              autoComplete="username"
              autoFocus
            />
            {errors.username && <div className="lock-field-error">{errors.username}</div>}
          </div>

          <div className="lock-field">
            <div className="lock-password-group">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`lock-input ${errors.password ? 'error' : ''}`}
                placeholder="Password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="lock-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path fillRule="evenodd" d="M10.79 12.912l-1.614-1.615a3.5 3.5 0 01-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.027 7.027 0 002.79-.588zM5.21 3.088A7.028 7.028 0 018 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 00-4.474-4.474L5.21 3.089z"/>
                    <path d="M5.525 7.646a2.5 2.5 0 002.829 2.829l-2.83-2.829zm4.95.708l-2.829-2.83a2.5 2.5 0 012.829 2.829zm3.171 6l-12-12 .708-.708 12 12-.708.708z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 011.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0114.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 011.172 8z"/>
                    <path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM4.5 8a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"/>
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <div className="lock-field-error">{errors.password}</div>}
          </div>

          <button type="submit" className="lock-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="lock-spinner" aria-hidden="true" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="lock-footnote">Tender Care Hospital &mdash; Staff System</p>

        {/* Notices Section */}
        {!noticesLoading && notices.length > 0 && (
          <div className="login-notices">
            <h3 className="login-notices-title">Staff Notices</h3>
            <div className="login-notices-list">
              {notices.slice(0, 3).map((notice, i) => (
                <div key={notice._id} className={`login-notice login-notice-${notice.type}`}>
                  <div className="login-notice-header">
                    <span className="login-notice-badge">{NOTICE_LABELS[notice.type]}</span>
                    <span className="login-notice-date">{formatNoticeDate(notice.createdAt)}</span>
                  </div>
                  <h4 className="login-notice-title">{notice.title}</h4>
                  <p className="login-notice-body">{notice.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;