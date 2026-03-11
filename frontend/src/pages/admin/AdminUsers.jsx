import React, { useState, useEffect } from 'react';
import { api, useAuth } from '../../App';
import { AdminLayout } from './AdminDashboard';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { UserX, Shield } from 'lucide-react';

const USER_ROLES = ['customer', 'admin', 'super_admin'];

export default function AdminUsers() {
  const { token, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.append('role', roleFilter);
      params.append('page', pagination.page);
      params.append('limit', '20');
      
      const data = await api.get(`/api/admin/users?${params.toString()}`, token);
      setUsers(data.users);
      setPagination({ page: data.page, pages: data.pages });
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await api.put(`/api/admin/users/${userId}/role?role=${role}`, {}, token);
      toast.success('User role updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await api.delete(`/api/admin/users/${userId}`, token);
      toast.success('User deleted');
      fetchUsers();
    } catch (error) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  return (
    <AdminLayout title="Users">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex gap-4 items-center">
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48" data-testid="role-filter">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Roles</SelectItem>
            {USER_ROLES.map(role => (
              <SelectItem key={role} value={role} className="capitalize">
                {role.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-sm text-gray-500">
          {users.length} users found
        </span>
      </div>

      {/* Users Table */}
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
                <th>User</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.user_id} data-testid={`user-row-${user.user_id}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      {user.picture ? (
                        <img src={user.picture} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                          <span className="text-teal-600 font-medium">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="text-gray-600">{user.email}</td>
                  <td className="text-gray-600">{user.phone || '-'}</td>
                  <td>
                    <Select 
                      value={user.role} 
                      onValueChange={(value) => updateUserRole(user.user_id, value)}
                      disabled={user.user_id === currentUser?.user_id}
                    >
                      <SelectTrigger className="w-32" data-testid={`role-select-${user.user_id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map(role => (
                          <SelectItem key={role} value={role} className="capitalize">
                            {role.replace('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-gray-500 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {user.user_id !== currentUser?.user_id && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => deleteUser(user.user_id)}
                        data-testid={`delete-user-${user.user_id}`}
                      >
                        <UserX className="w-4 h-4" />
                      </Button>
                    )}
                    {user.user_id === currentUser?.user_id && (
                      <span className="text-xs text-gray-400">You</span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No users found
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
    </AdminLayout>
  );
}
