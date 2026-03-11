import React, { useState, useEffect } from 'react';
import { api, useAuth } from '../../App';
import { AdminLayout } from './AdminDashboard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Image } from 'lucide-react';

export default function AdminProducts() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [editProduct, setEditProduct] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [pagination.page, search]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('page', pagination.page);
      params.append('limit', '10');
      params.append('is_active', 'false'); // Get all products including inactive
      
      const data = await api.get(`/api/products?${params.toString()}`, token);
      setProducts(data.products);
      setPagination({ page: data.page, pages: data.pages });
    } catch (error) {
      toast.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await api.get('/api/categories', token);
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await api.delete(`/api/admin/products/${productId}`, token);
      toast.success('Product deleted');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const openEditDialog = (product = null) => {
    setEditProduct(product || {
      name: '',
      slug: '',
      short_description: '',
      description: '',
      category_id: '',
      price: '',
      compare_at_price: '',
      stock: 0,
      sku: '',
      images: [],
      is_active: true,
      is_featured: false
    });
    setIsDialogOpen(true);
  };

  return (
    <AdminLayout title="Products">
      {/* Toolbar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="admin-product-search"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        
        <Button 
          onClick={() => openEditDialog()} 
          className="bg-teal-600 hover:bg-teal-700"
          data-testid="add-product-button"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      {/* Products Table */}
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
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.product_id} data-testid={`product-row-${product.product_id}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden">
                        <img 
                          src={product.images?.[0]?.url || 'https://via.placeholder.com/48'} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-gray-500">SKU: {product.sku || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="font-medium text-teal-600">${product.price?.toFixed(2)}</span>
                    {product.compare_at_price && (
                      <span className="text-xs text-gray-400 line-through ml-2">
                        ${product.compare_at_price?.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={product.stock < 10 ? 'text-red-500' : ''}>
                      {product.stock}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${product.is_active ? 'badge-success' : 'badge-error'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {product.is_featured && (
                      <span className="badge badge-info ml-1">Featured</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(product)}
                        data-testid={`edit-product-${product.product_id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(product.product_id)}
                        data-testid={`delete-product-${product.product_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No products found
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

      {/* Product Dialog */}
      <ProductDialog 
        product={editProduct}
        categories={categories}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={fetchProducts}
        token={token}
      />
    </AdminLayout>
  );
}

function ProductDialog({ product, categories, isOpen, onClose, onSave, token }) {
  const [formData, setFormData] = useState(product || {});
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    setFormData(product || {});
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleAddImage = () => {
    if (!imageUrl) return;
    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), { url: imageUrl, is_primary: prev.images?.length === 0 }]
    }));
    setImageUrl('');
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Auto-generate slug if not provided
      const data = {
        ...formData,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      };

      if (formData.product_id) {
        await api.put(`/api/admin/products/${formData.product_id}`, data, token);
        toast.success('Product updated');
      } else {
        await api.post('/api/admin/products', data, token);
        toast.success('Product created');
      }
      
      onSave();
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {formData?.product_id ? 'Edit Product' : 'Add New Product'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData?.name || ''}
                onChange={handleChange}
                required
                data-testid="product-name-input"
              />
            </div>
            
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={formData?.slug || ''}
                onChange={handleChange}
                placeholder="auto-generated"
              />
            </div>
            
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                name="sku"
                value={formData?.sku || ''}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="category_id">Category</Label>
              <Select 
                value={formData?.category_id || ''} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                value={formData?.stock || 0}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                value={formData?.price || ''}
                onChange={handleChange}
                required
                data-testid="product-price-input"
              />
            </div>

            <div>
              <Label htmlFor="compare_at_price">Compare at Price</Label>
              <Input
                id="compare_at_price"
                name="compare_at_price"
                type="number"
                step="0.01"
                value={formData?.compare_at_price || ''}
                onChange={handleChange}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="short_description">Short Description</Label>
              <Input
                id="short_description"
                name="short_description"
                value={formData?.short_description || ''}
                onChange={handleChange}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description">Full Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={formData?.description || ''}
                onChange={handleChange}
              />
            </div>

            {/* Images */}
            <div className="col-span-2">
              <Label>Product Images</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Image URL"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={handleAddImage}>
                  <Image className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
              
              {formData?.images?.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative w-20 h-20 rounded border overflow-hidden group">
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {img.is_primary && (
                        <span className="absolute bottom-0 left-0 right-0 bg-teal-600 text-white text-xs text-center">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Toggles */}
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={formData?.is_active ?? true}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_featured">Featured</Label>
              <Switch
                id="is_featured"
                checked={formData?.is_featured ?? false}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving} data-testid="save-product">
              {saving ? 'Saving...' : formData?.product_id ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
