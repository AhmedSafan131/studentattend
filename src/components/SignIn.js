import React, { useState } from 'react';

/**
 * Mock doctor accounts
 * In a real app these would come from an API/auth service
 */
const MOCK_ACCOUNTS = [
  { email: 'ahmed@university.edu',  password: '1234', name: 'Dr. Ahmed Al-Rashid',  role: 'Algorithms & AI',        avatar: 'AA' },
  { email: 'sara@university.edu',   password: '1234', name: 'Dr. Sara Khalil',       role: 'Software Engineering',   avatar: 'SK' },
  { email: 'omar@university.edu',   password: '1234', name: 'Dr. Omar Hassan',       role: 'Data Structures',        avatar: 'OH' },
];

const SignIn = ({ onSignIn }) => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    // Simulate network delay
    setTimeout(() => {
      const account = MOCK_ACCOUNTS.find(
        a => a.email.toLowerCase() === email.toLowerCase() && a.password === password
      );

      if (account) {
        onSignIn(account);
      } else {
        setError('Invalid email or password. Please try again.');
        setLoading(false);
      }
    }, 900);
  };

  // Quick-fill a demo account
  const fillDemo = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
  };

  return (
    <div className="signin-page">
      {/* Animated background blobs */}
      <div className="signin-blob signin-blob-1" />
      <div className="signin-blob signin-blob-2" />
      <div className="signin-blob signin-blob-3" />

      <div className="signin-card">
        {/* Logo / Branding */}
        <div className="signin-logo">
          <div className="signin-logo-icon">🎓</div>
          <h1>UniAttend</h1>
          <p>University Smart Attendance System</p>
        </div>

        <div className="signin-divider" />

        <h2 className="signin-heading">Doctor Sign In</h2>
        <p className="signin-subheading">Sign in to manage lectures and attendance</p>

        {/* Sign-in form */}
        <form className="signin-form" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="signin-field">
            <label className="signin-label" htmlFor="signin-email">EMAIL ADDRESS</label>
            <div className="signin-input-wrap">
              <span className="signin-input-icon">✉️</span>
              <input
                id="signin-email"
                type="email"
                className="signin-input"
                placeholder="doctor@university.edu"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="signin-field">
            <label className="signin-label" htmlFor="signin-password">PASSWORD</label>
            <div className="signin-input-wrap">
              <span className="signin-input-icon">🔐</span>
              <input
                id="signin-password"
                type={showPass ? 'text' : 'password'}
                className="signin-input"
                placeholder="Enter your password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="signin-eye-btn"
                onClick={() => setShowPass(p => !p)}
                tabIndex={-1}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="signin-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="signin-btn" disabled={loading}>
            {loading ? (
              <span className="signin-spinner" />
            ) : (
              '→ Sign In to Dashboard'
            )}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="signin-demo">
          <p className="signin-demo-label">DEMO ACCOUNTS (password: 1234)</p>
          <div className="signin-demo-accounts">
            {MOCK_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                className="signin-demo-btn"
                onClick={() => fillDemo(acc)}
                type="button"
              >
                <div className="signin-demo-avatar">{acc.avatar}</div>
                <div className="signin-demo-info">
                  <span>{acc.name}</span>
                  <span>{acc.role}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="signin-footer">
          © 2026 University Smart Attendance System. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default SignIn;
