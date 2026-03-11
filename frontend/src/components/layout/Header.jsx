import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, api } from '../../App';
import { ShoppingBag, Search, User, Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [settings, setSettings] = useState({ website_name: 'ShopStore' });
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchSettings();
    fetchCart();
    fetchCategories();
  }, [user]);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/api/settings');
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings');
    }
  };

  const fetchCart = async () => {
    try {
      const cart = await api.get('/api/cart');
      setCartCount(cart.items?.length || 0);
    } catch (error) {
      setCartCount(0);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.get('/api/categories');
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Top Navigation */}
      <div className="top-nav hidden md:block">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6 text-sm">
              <span className="flex items-center gap-2">
                <i className="fas fa-globe text-xs"></i> English
              </span>
              <Link to="/contact" className="hover:text-white transition">Customer Care</Link>
              <Link to="/orders" className="hover:text-white transition">Order Tracker</Link>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/about" className="hover:text-white transition">About Us</Link>
              <Link to="/newsletter" className="hover:text-white transition">Newsletter</Link>
              <div className="flex items-center gap-3">
                <a href="#" className="hover:text-white transition"><i className="fab fa-facebook-f"></i></a>
                <a href="#" className="hover:text-white transition"><i className="fab fa-twitter"></i></a>
                <a href="#" className="hover:text-white transition"><i className="fab fa-instagram"></i></a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="header py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2" data-testid="header-logo">
              <div className="w-8 h-8 bg-teal-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <span className="font-bold text-xl text-gray-800">{settings.website_name}</span>
                <span className="hidden md:block text-xs text-gray-500">e-commerce platform</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} data-testid="nav-home">
                Home
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="nav-link flex items-center gap-1" data-testid="nav-store">
                    Our Store <ChevronDown className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/products">All Products</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {categories.map(cat => (
                    <DropdownMenuItem key={cat.category_id} asChild>
                      <Link to={`/products/${cat.slug}`}>{cat.name}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to="/products?featured=true" className="nav-link" data-testid="nav-featured">
                New Arrivals
              </Link>
              
              {/* Search */}
              <form onSubmit={handleSearch} className="relative ml-4">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-4 py-2 pl-10 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
                  data-testid="search-input"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </form>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {/* Cart */}
              <Link 
                to="/cart" 
                className="relative p-2 hover:bg-gray-100 rounded-lg transition"
                data-testid="header-cart"
              >
                <ShoppingBag className="w-6 h-6 text-gray-700" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-teal-600 text-white text-xs rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition" data-testid="user-menu">
                      {user.picture ? (
                        <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <User className="w-6 h-6 text-gray-700" />
                      )}
                      <span className="hidden md:block text-sm font-medium">{user.name}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/account" data-testid="menu-account">My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account#orders">My Orders</Link>
                    </DropdownMenuItem>
                    {['admin', 'super_admin'].includes(user.role) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" data-testid="menu-admin">Admin Dashboard</Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout">
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to="/login" data-testid="header-login">
                  <Button variant="outline" className="border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white">
                    Login
                  </Button>
                </Link>
              )}

              {/* Mobile Menu Toggle */}
              <button 
                className="lg:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-toggle"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t mt-4 pt-4 animate-slideIn">
            <div className="container mx-auto px-4">
              <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 pl-10 bg-gray-100 border-0 rounded-lg"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </form>
              <nav className="flex flex-col gap-2">
                <Link to="/" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                <Link to="/products" className="nav-link" onClick={() => setMobileMenuOpen(false)}>All Products</Link>
                {categories.map(cat => (
                  <Link 
                    key={cat.category_id} 
                    to={`/products/${cat.slug}`} 
                    className="nav-link pl-4"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {cat.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
