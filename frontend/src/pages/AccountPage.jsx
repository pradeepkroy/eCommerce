import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { api, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { User, Package, Heart, Settings } from 'lucide-react';

export default function AccountPage() {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  useEffect(() => {
    fetchOrders();
    
    // Check URL hash for tab
    const hash = window.location.hash.slice(1);
    if (hash === 'orders') setActiveTab('orders');
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await api.get('/api/orders', token);
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    toast.info('Profile update coming soon!');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'wishlist', label: 'Wishlist', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <Layout>
      <div className="bg-gray-100 py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-800">My Account</h1>
        </div>
      </div>

      <div className="section-container bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                  {user?.picture ? (
                    <img src={user.picture} alt="" className="w-16 h-16 rounded-full" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center">
                      <User className="w-8 h-8 text-teal-600" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-gray-800">{user?.name}</h3>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>

                <nav className="space-y-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        activeTab === tab.id 
                          ? 'bg-teal-50 text-teal-700' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      data-testid={`tab-${tab.id}`}
                    >
                      <tab.icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  ))}
                </nav>

                <Button
                  variant="outline"
                  className="w-full mt-6 text-red-500 border-red-200 hover:bg-red-50"
                  onClick={logout}
                  data-testid="logout-button"
                >
                  Logout
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              {activeTab === 'profile' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-6">Profile Information</h2>
                  
                  <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-lg">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="profile-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        data-testid="profile-phone"
                      />
                    </div>
                    <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
                      Update Profile
                    </Button>
                  </form>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="p-6 border-b">
                    <h2 className="text-lg font-bold text-gray-800">My Orders</h2>
                  </div>
                  
                  {loading ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-600 mx-auto"></div>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="p-12 text-center">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">No orders yet</p>
                      <Link to="/products">
                        <Button className="bg-teal-600 hover:bg-teal-700">
                          Start Shopping
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {orders.map(order => (
                        <div key={order.order_id} className="p-6" data-testid={`order-${order.order_id}`}>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="font-medium text-gray-800">{order.order_number}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(order.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className={`badge ${
                                order.status === 'delivered' ? 'badge-success' :
                                order.status === 'cancelled' ? 'badge-error' :
                                'badge-info'
                              }`}>
                                {order.status}
                              </span>
                              <p className="text-lg font-bold text-teal-600 mt-1">
                                ${order.total?.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex gap-3 overflow-x-auto pb-2">
                            {order.items?.slice(0, 4).map((item, i) => (
                              <div key={i} className="w-16 h-16 rounded bg-gray-100 flex-shrink-0">
                                <img 
                                  src={item.image_url || 'https://via.placeholder.com/64'} 
                                  alt={item.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              </div>
                            ))}
                            {order.items?.length > 4 && (
                              <div className="w-16 h-16 rounded bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                                +{order.items.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Your wishlist is empty</h3>
                  <p className="text-gray-500 mb-4">Save items you like to your wishlist</p>
                  <Link to="/products">
                    <Button className="bg-teal-600 hover:bg-teal-700">
                      Browse Products
                    </Button>
                  </Link>
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-6">Account Settings</h2>
                  <p className="text-gray-500">Settings page coming soon...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
