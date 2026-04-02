import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext(null);

let netlifyIdentity = null;

function loadIdentityWidget() {
  return new Promise((resolve) => {
    if (netlifyIdentity) { resolve(netlifyIdentity); return; }
    if (window.netlifyIdentity) { netlifyIdentity = window.netlifyIdentity; resolve(netlifyIdentity); return; }
    const script = document.createElement('script');
    script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
    script.async = true;
    script.onload = () => { netlifyIdentity = window.netlifyIdentity; resolve(netlifyIdentity); };
    document.head.appendChild(script);
  });
}

function cleanupIdentityWidget() {
  document.querySelectorAll('[class*="netlify-identity"]').forEach(el => el.remove());
  const container = document.getElementById('netlify-identity-widget');
  if (container) container.remove();

  document.querySelectorAll('style').forEach(el => {
    const text = el.textContent || '';
    if (text.includes('netlify') || text.includes('gotrue') || text.includes('identity')) el.remove();
  });

  document.querySelectorAll('body > iframe, body > div iframe').forEach(el => {
    if (!el.closest('#root')) el.remove();
  });

  // Remove blocking overlays
  const root = document.getElementById('root');
  for (const el of document.body.children) {
    if (el === root || el.tagName === 'SCRIPT' || el.tagName === 'LINK') continue;
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'absolute') {
      const z = parseInt(style.zIndex, 10);
      const coversViewport = style.inset === '0px'
        || (style.top === '0px' && style.left === '0px')
        || (el.offsetWidth >= window.innerWidth && el.offsetHeight >= window.innerHeight);
      if (z > 0 || coversViewport || style.opacity === '0') el.remove();
    }
  }

  ['overflow', 'position', 'pointerEvents', 'touchAction', 'userSelect'].forEach(prop => {
    if (document.body.style[prop]) document.body.style[prop] = '';
  });
}

function clearAuthStorage() {
  try {
    localStorage.removeItem('gotrue.user');
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('gotrue') || key.startsWith('netlify'))) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch { /* localStorage not available */ }
}

function normalizeUser(netlifyUser) {
  if (!netlifyUser) return null;
  const meta = netlifyUser.user_metadata || {};
  const appMeta = netlifyUser.app_metadata || {};
  const email = netlifyUser.email || '';
  const name = meta.full_name || meta.name || appMeta.full_name || appMeta.name
    || (meta.provider === 'google' && meta.email ? meta.email.split('@')[0] : null)
    || (email ? email.split('@')[0] : 'User');
  const avatar = meta.avatar_url || meta.picture || appMeta.avatar_url || null;
  return { id: netlifyUser.id, email, name, avatar, token: netlifyUser.token?.access_token || null };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const onLoginCallbackRef = useRef(null);

  useEffect(() => {
    loadIdentityWidget().then((identity) => {
      identity.init();

      const currentUser = identity.currentUser();
      if (currentUser) setUser(normalizeUser(currentUser));

      identity.on('init', (initUser) => {
        if (initUser) {
          setUser(normalizeUser(initUser));
          cleanupIdentityWidget();
          // Handle post-login redirect
          try {
            const redirect = sessionStorage.getItem('dmd_post_login_redirect');
            if (redirect) {
              sessionStorage.removeItem('dmd_post_login_redirect');
              setTimeout(() => { window.location.href = redirect; }, 300);
            }
          } catch { /* sessionStorage not available */ }
        }
        setLoading(false);
      });

      identity.on('login', (loginUser) => {
        setUser(normalizeUser(loginUser));
        identity.close();
        cleanupIdentityWidget();

        if (onLoginCallbackRef.current) {
          const cb = onLoginCallbackRef.current;
          onLoginCallbackRef.current = null;
          cb(normalizeUser(loginUser));
        }

        if (window.innerWidth < 1024) {
          setTimeout(() => window.location.reload(), 500);
        }
      });

      identity.on('logout', () => { setUser(null); clearAuthStorage(); });
      identity.on('error', (err) => console.error('Auth error:', err));

      setTimeout(() => setLoading(false), 2000);
    });
  }, []);

  const login = (callback) => {
    if (callback) {
      try {
        const match = callback.toString().match(/navigate\(['"]([^'"]+)['"]\)/);
        if (match) sessionStorage.setItem('dmd_post_login_redirect', match[1]);
        else sessionStorage.setItem('dmd_post_login_redirect', '/dashboard');
      } catch { /* ok */ }
      onLoginCallbackRef.current = callback;
    }
    window.location.href = '/.netlify/identity/authorize?provider=google&prompt=select_account';
  };

  const logout = () => {
    setUser(null);
    if (netlifyIdentity) {
      try { netlifyIdentity.logout(); } catch (e) { console.warn('[Auth] Widget logout error:', e); }
    }
    setTimeout(clearAuthStorage, 100);
    setTimeout(clearAuthStorage, 2000);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
