import React, { useState, useEffect } from 'react';
import { api, useAuth } from '../../App';
import { AdminLayout } from './AdminDashboard';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Eye, Truck } from 'lucide-react';

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrders() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, statusFilter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', pagination.page);
      params.append('limit', '20');
      
      const data = await api.get(`/api/admin/orders?${params.toString()}`, token);
      setOrders(data.orders);
      setPagination({ page: data.page, pages: data.pages });
    } catch (error) {
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await api.put(`/api/admin/orders/${orderId}/status?status=${status}`, {}, token);
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'delivered': return 'badge-success';
      case 'cancelled': return 'badge-error';
      case 'confirmed':
      case 'processing': return 'badge-info';
      case 'shipped': return 'badge-info';
      default: return 'badge-warning';
    }
  };

  return (
    <AdminLayout title="Orders">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex gap-4 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            {ORDER_STATUSES.map(status => (
              <SelectItem key={status} value={status} className="capitalize">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-gray-500">
          {orders.length} orders found
        </span>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded mb-3 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.order_id} data-testid={`order-row-${order.order_id}`}>
                  <td>
                    <div>
                      <p className="font-medium">{order.order_number}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </td>
                  <td>
                    <div>
                      <p>{order.shipping_address?.first_name} {order.shipping_address?.last_name}</p>
                      <p className="text-xs text-gray-500">{order.shipping_address?.email}</p>
                    </div>
                  </td>
                  <td>{order.items?.length || 0} items</td>
                  <td className="font-medium text-teal-600">${order.total?.toFixed(2)}</td>
                  <td>
                    <span className={`badge ${order.payment_status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td>
                    <Select 
                      value={order.status} 
                      onValueChange={(value) => updateOrderStatus(order.order_id, value)}
                    >
                      <SelectTrigger className="w-32" data-testid={`status-select-${order.order_id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map(status => (
                          <SelectItem key={status} value={status} className="capitalize">
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                      data-testid={`view-order-${order.order_id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t flex justify-center gap-2">
            {[...Array(pagination.pages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                className={`w-8 h-8 rounded ${
                  pagination.page === i + 1 
                    ? 'bg-teal-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="font-bold text-lg">Order Details</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-medium">{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment</p>
                  <span className={`badge ${selectedOrder.payment_status === 'completed' ? 'badge-success' : 'badge-warning'}`}>
                    {selectedOrder.payment_status}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-2">Shipping Address</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p>{selectedOrder.shipping_address?.first_name} {selectedOrder.shipping_address?.last_name}</p>
                  <p className="text-gray-600">{selectedOrder.shipping_address?.address_line1}</p>
                  {selectedOrder.shipping_address?.address_line2 && (
                    <p className="text-gray-600">{selectedOrder.shipping_address?.address_line2}</p>
                  )}
                  <p className="text-gray-600">
                    {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state} {selectedOrder.shipping_address?.postal_code}
                  </p>
                  <p className="text-gray-600">{selectedOrder.shipping_address?.country}</p>
                  <p className="text-gray-600 mt-2">{selectedOrder.shipping_address?.phone}</p>
                  <p className="text-gray-600">{selectedOrder.shipping_address?.email}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-medium mb-2">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex gap-3 bg-gray-50 p-3 rounded">
                      <div className="w-16 h-16 rounded bg-gray-200 overflow-hidden">
                        <img 
                          src={item.image_url || 'https://via.placeholder.com/64'} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                        <p className="text-teal-600 font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Subtotal</span>
                  <span>${selectedOrder.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Shipping</span>
                  <span>${selectedOrder.shipping_cost?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Tax</span>
                  <span>${selectedOrder.tax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-teal-600">${selectedOrder.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
