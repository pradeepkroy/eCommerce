import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, useAuth } from '../../App';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, Settings, 
  TrendingUp, DollarSign, ShoppingBag, UserCheck, ChevronRight
} from 'lucide-react';
import Header from '../../components/layout/Header';

// Admin Layout Component
export function AdminLayout({ children, title }) {
  const location = useLocation();
  
  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/products', label: 'Products', icon: Package },
    { path: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="flex">
        {/* Sidebar */}
        <aside className="admin-sidebar hidden lg:block">
          <nav className="py-4">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={location.pathname === item.path ? 'active' : ''}
                data-testid={`admin-nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {title && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

// Admin Dashboard Page
export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.get('/api/admin/dashboard/stats', token);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Revenue', value: stats?.total_revenue, format: 'currency', icon: DollarSign, color: 'bg-green-500' },
    { label: 'Total Orders', value: stats?.total_orders, icon: ShoppingBag, color: 'bg-blue-500' },
    { label: 'Pending Orders', value: stats?.pending_orders, icon: ShoppingCart, color: 'bg-yellow-500' },
    { label: 'Total Products', value: stats?.total_products, icon: Package, color: 'bg-purple-500' },
    { label: 'Total Users', value: stats?.total_users, icon: UserCheck, color: 'bg-teal-500' },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card" data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
            <div className={`stat-icon ${stat.color} text-white`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="stat-value">
              {loading ? (
                <div className="h-8 bg-gray-200 rounded animate-pulse w-24"></div>
              ) : stat.format === 'currency' ? (
                `$${(stat.value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              ) : (
                stat.value || 0
              )}
            </div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="font-bold text-gray-800">Recent Orders</h2>
          <Link to="/admin/orders" className="text-teal-600 hover:underline text-sm flex items-center">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        {loading ? (
          <div className="p-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded mb-3 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recent_orders?.map(order => (
                <tr key={order.order_id} data-testid={`recent-order-${order.order_id}`}>
                  <td className="font-medium">{order.order_number}</td>
                  <td>{order.shipping_address?.first_name} {order.shipping_address?.last_name}</td>
                  <td>
                    <span className={`badge ${
                      order.status === 'delivered' ? 'badge-success' :
                      order.status === 'cancelled' ? 'badge-error' :
                      order.status === 'confirmed' ? 'badge-info' :
                      'badge-warning'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="font-medium text-teal-600">${order.total?.toFixed(2)}</td>
                  <td className="text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!stats?.recent_orders || stats.recent_orders.length === 0) && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No orders yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
