import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

let netlifyIdentity = null;
let widgetInitialized = false;
let widgetListenersBound = false;
let widgetObserver = null;

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
  // Remove ALL widget iframes — the widget can inject duplicates, and !important
  // styles mean hiding via removeAttribute('style') won't work. Only removal does.
  document.querySelectorAll(
    'iframe[id="netlify-identity-widget"], iframe[title="Netlify identity widget"], iframe[src*="identity.netlify.com"]'
  ).forEach(el => el.remove());
  document.querySelectorAll('[class*="netlify-identity"]').forEach(el => el.remove());
  document.querySelectorAll('[id="netlify-identity-widget"]').forEach(el => el.remove());

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

  // Force-clear any body styles that block interaction
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.pointerEvents = '';
  document.body.style.touchAction = '';
  document.body.style.userSelect = '';
  document.body.removeAttribute('style');
}

// Watch for late-injected widget elements and remove them immediately.
// This catches overlays the widget injects after all timed cleanup passes.
function startWidgetObserver() {
  if (widgetObserver) return; // already watching
  const root = document.getElementById('root');
  widgetObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue; // skip text nodes
        // Identify Netlify Identity widget elements injected outside #root
        if (node === root || root?.contains(node)) continue;
        const isWidget =
          node.tagName === 'IFRAME' ||
          (node.id && node.id.includes('netlify-identity')) ||
          (node.className && typeof node.className === 'string' && node.className.includes('netlify-identity'));
        if (isWidget) {
          node.remove();
          // Also force-clear body styles the widget may have set
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.body.style.pointerEvents = '';
          document.body.removeAttribute('style');
        }
      }
    }
  });
  widgetObserver.observe(document.body, { childList: true, subtree: true });
  // Auto-disconnect after 10 seconds — the widget won't inject anything after that
  setTimeout(() => {
    widgetObserver?.disconnect();
    widgetObserver = null;
  }, 10000);
}

function clearAuthStorage() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('gotrue') || key.startsWith('netlify'))) keysToRemove.push(key);
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch { /* localStorage not available */ }
  try {
    // Collect keys first — removing during forward iteration shifts indices and skips entries.
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('gotrue') || key.startsWith('netlify'))) sessionKeysToRemove.push(key);
    }
    sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch { /* sessionStorage not available */ }
  try {
    const cookieNames = ['nf_jwt', 'gotrue.user'];
    const paths = ['/', ''];
    const domains = ['', `; domain=${window.location.hostname}`, `; domain=.${window.location.hostname}`];
    cookieNames.forEach(name => {
      paths.forEach(path => {
        domains.forEach(domain => {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT${path ? `; path=${path}` : ''}${domain}`;
        });
      });
    });
  } catch { /* cookies not available */ }
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

  useEffect(() => {
    loadIdentityWidget().then((identity) => {
      // Guard against double-init — StrictMode runs effects twice in dev,
      // and each init() call injects another widget iframe.
      if (!widgetInitialized) {
        identity.init();
        widgetInitialized = true;
      }

      // Retry reading user metadata if initial data is incomplete
      const setUserWithRetry = (netlifyUser) => {
        const normalized = normalizeUser(netlifyUser);
        setUser(normalized);
        // If metadata wasn't ready (name fell back to email prefix or 'User'), retry
        const hasFullMeta = netlifyUser?.user_metadata?.full_name || netlifyUser?.user_metadata?.name;
        if (!hasFullMeta) {
          const retryDelays = [300, 800, 1500];
          retryDelays.forEach(ms => setTimeout(() => {
            const refreshed = identity.currentUser();
            if (refreshed) {
              const refreshedMeta = refreshed.user_metadata || {};
              if (refreshedMeta.full_name || refreshedMeta.name) {
                setUser(normalizeUser(refreshed));
              }
            }
          }, ms));
        }
      };

      const currentUser = identity.currentUser();
      if (currentUser) setUserWithRetry(currentUser);

      // Guard listener binding too — StrictMode re-runs effects and would
      // otherwise register each handler twice, firing login/logout twice.
      if (!widgetListenersBound) {
        identity.on('init', (initUser) => {
          if (initUser) {
            setUserWithRetry(initUser);
            try { identity.close(); } catch { /* ignore */ }
            cleanupIdentityWidget();
            startWidgetObserver();
            // Same delayed cleanup passes as login — during OAuth redirect the
            // widget fires 'init' (not 'login'), and it keeps injecting overlay
            // elements after close(). Without these passes the page stays
            // non-interactive until the user manually refreshes.
            setTimeout(cleanupIdentityWidget, 200);
            setTimeout(cleanupIdentityWidget, 600);
            setTimeout(cleanupIdentityWidget, 1500);
          }
          setLoading(false);
        });

        identity.on('login', (loginUser) => {
          setUserWithRetry(loginUser);
          try { identity.close(); } catch { /* ignore */ }
          cleanupIdentityWidget();
          startWidgetObserver();
          // Repeated cleanup passes — the widget sometimes injects elements after close()
          setTimeout(cleanupIdentityWidget, 200);
          setTimeout(cleanupIdentityWidget, 600);
          setTimeout(cleanupIdentityWidget, 1500);
        });

        identity.on('logout', () => { setUser(null); clearAuthStorage(); });
        identity.on('error', (err) => console.error('Auth error:', err));
        widgetListenersBound = true;
      }

      setTimeout(() => setLoading(false), 2000);
    });
  }, []);

  const login = () => {
    window.location.href = '/.netlify/identity/authorize?provider=google&prompt=select_account';
  };

  const logout = async () => {
    // Capture the access token BEFORE clearing storage — we need it to revoke server-side.
    let accessToken = null;
    try {
      const cu = window.netlifyIdentity?.currentUser?.();
      accessToken = cu?.token?.access_token || null;
      // If the token is expired, cu.jwt(true) refreshes and returns a valid one.
      if (!accessToken && cu?.jwt) {
        try { accessToken = await cu.jwt(true); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
    if (!accessToken) {
      try {
        const stored = localStorage.getItem('gotrue.user');
        if (stored) accessToken = JSON.parse(stored)?.token?.access_token || null;
      } catch { /* ignore */ }
    }

    // Server-side revocation — tell GoTrue to invalidate the session before we clear
    // the client. Without this, the cookie/token can still be honored on subsequent
    // requests until natural expiry.
    if (accessToken) {
      try {
        await fetch('/.netlify/identity/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          keepalive: true,
        });
      } catch { /* network failure — proceed with client cleanup anyway */ }
    }

    setUser(null);

    // Unbind all widget event listeners BEFORE clearing — prevents the widget
    // from re-triggering its own logout flow (which would redirect to Google).
    try {
      const identity = window.netlifyIdentity;
      if (identity && typeof identity.off === 'function') {
        ['login', 'logout', 'init', 'error', 'open', 'close'].forEach(evt => {
          try { identity.off(evt); } catch { /* ignore */ }
        });
      }
    } catch { /* ignore */ }

    clearAuthStorage();
    cleanupIdentityWidget();

    // Destroy the widget instance entirely so nothing can call GoTrue endpoints.
    // Reset the module-level init flags too, so if the user logs back in in the
    // same tab the widget rebinds cleanly instead of assuming it's already set up.
    try { window.netlifyIdentity = null; } catch { /* ignore */ }
    netlifyIdentity = null;
    widgetInitialized = false;
    widgetListenersBound = false;

    // replace() — no back-button return to the authenticated state
    window.location.replace('/');
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
