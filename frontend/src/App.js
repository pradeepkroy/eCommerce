import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import './App.css';

// Create Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// API Helper
const API_URL = process.env.REACT_APP_BACKEND_URL;

// Cart session management
const getCartSession = () => localStorage.getItem('cart_session');
const setCartSession = (sessionId) => localStorage.setItem('cart_session', sessionId);

const api = {
  async get(endpoint, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const cartSession = getCartSession();
    if (cartSession) headers['X-Cart-Session'] = cartSession;
    const response = await fetch(`${API_URL}${endpoint}`, { headers, credentials: 'include' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || 'Request failed');
    // Store cart session from response
    if (data.session_id && endpoint.includes('/cart')) {
      setCartSession(data.session_id);
    }
    return data;
  },
  async post(endpoint, data = {}, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const cartSession = getCartSession();
    if (cartSession) headers['X-Cart-Session'] = cartSession;
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Request failed');
    // Store cart session from response
    if (result.session_id && endpoint.includes('/cart')) {
      setCartSession(result.session_id);
    }
    return result;
  },
  async put(endpoint, data = {}, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const cartSession = getCartSession();
    if (cartSession) headers['X-Cart-Session'] = cartSession;
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Request failed');
    if (result.session_id && endpoint.includes('/cart')) {
      setCartSession(result.session_id);
    }
    return result;
  },
  async delete(endpoint, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const cartSession = getCartSession();
    if (cartSession) headers['X-Cart-Session'] = cartSession;
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      credentials: 'include'
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Request failed');
    return response.json();
  }
};

// Auth Provider Component
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // CRITICAL: If returning from OAuth callback, skip the /me check
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      const userData = await api.get('/api/auth/me', savedToken);
      setUser(userData);
      setToken(savedToken);
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const register = async (email, password, name, phone) => {
    const response = await api.post('/api/auth/register', { email, password, name, phone });
    localStorage.setItem('token', response.token);
    setToken(response.token);
    setUser(response.user);
    return response;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const oauthLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, oauthLogin, setUser, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

// Lazy load pages
const HomePage = React.lazy(() => import('./pages/HomePage'));
const ProductsPage = React.lazy(() => import('./pages/ProductsPage'));
const ProductDetailPage = React.lazy(() => import('./pages/ProductDetailPage'));
const CartPage = React.lazy(() => import('./pages/CartPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const CheckoutPaymentPage = React.lazy(() => import('./pages/CheckoutPaymentPage'));
const CheckoutSuccessPage = React.lazy(() => import('./pages/CheckoutSuccessPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const AccountPage = React.lazy(() => import('./pages/AccountPage'));
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = React.lazy(() => import('./pages/admin/AdminProducts'));
const AdminOrders = React.lazy(() => import('./pages/admin/AdminOrders'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'));
const SearchResultsPage = React.lazy(() => import('./pages/SearchResultsPage'));

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, token } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!user || !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !['admin', 'super_admin'].includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// App Router
function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return (
      <React.Suspense fallback={<LoadingSpinner />}>
        <AuthCallback />
      </React.Suspense>
    );
  }

  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:category" element={<ProductsPage />} />
        <Route path="/product/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/checkout/payment" element={<CheckoutPaymentPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/search" element={<SearchResultsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/account" element={
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/products" element={
          <ProtectedRoute adminOnly>
            <AdminProducts />
          </ProtectedRoute>
        } />
        <Route path="/admin/orders" element={
          <ProtectedRoute adminOnly>
            <AdminOrders />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute adminOnly>
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute adminOnly>
            <AdminSettings />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
}

// Loading Spinner
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-teal-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app">
          <AppRouter />
          <Toaster 
            position="top-right" 
            richColors 
            closeButton
            toastOptions={{
              duration: 3000,
            }}
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export { api, API_URL };
export default App;
