import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Grid, List, Search } from 'lucide-react';

export default function ProductsPage() {
  const { category } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    category_id: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    min_price: '',
    max_price: '',
    is_featured: searchParams.get('featured') === 'true'
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [filters, category]);

  const fetchCategories = async () => {
    try {
      const data = await api.get('/api/categories');
      setCategories(data);
      
      // Set category_id if category slug is provided
      if (category) {
        const cat = data.find(c => c.slug === category);
        if (cat) {
          setFilters(prev => ({ ...prev, category_id: cat.category_id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.min_price) params.append('min_price', filters.min_price);
      if (filters.max_price) params.append('max_price', filters.max_price);
      if (filters.is_featured) params.append('is_featured', 'true');
      params.append('sort_by', filters.sort_by);
      params.append('sort_order', filters.sort_order);
      params.append('page', pagination.page);
      params.append('limit', '20');

      const data = await api.get(`/api/products?${params.toString()}`);
      setProducts(data.products);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch (error) {
      console.error('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const currentCategory = categories.find(c => c.category_id === filters.category_id);

  return (
    <Layout>
      {/* Page Header */}
      <div className="bg-gray-100 py-6">
        <div className="container mx-auto px-4">
          <nav className="text-sm text-gray-500 mb-2">
            <Link to="/" className="hover:text-teal-600">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800">
              {currentCategory ? currentCategory.name : 'All Products'}
            </span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800">
            {currentCategory ? currentCategory.name : filters.is_featured ? 'New Arrivals' : 'All Products'}
          </h1>
          <p className="text-gray-600 mt-1">{pagination.total} products found</p>
        </div>
      </div>

      <div className="section-container bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex gap-6">
            {/* Sidebar Filters */}
            <aside className="category-sidebar hidden lg:block w-64 flex-shrink-0">
              <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-3">Categories</h3>
                <ul className="category-list">
                  <li>
                    <button
                      onClick={() => handleFilterChange('category_id', '')}
                      className={`w-full text-left ${!filters.category_id ? 'text-teal-600 font-medium' : ''}`}
                    >
                      All Categories
                    </button>
                  </li>
                  {categories.map(cat => (
                    <li key={cat.category_id}>
                      <button
                        onClick={() => handleFilterChange('category_id', cat.category_id)}
                        className={`w-full text-left ${filters.category_id === cat.category_id ? 'text-teal-600 font-medium' : ''}`}
                      >
                        {cat.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Price Filter */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-3">Price Range</h3>
                <div className="space-y-3">
                  <Input
                    type="number"
                    placeholder="Min Price"
                    value={filters.min_price}
                    onChange={(e) => handleFilterChange('min_price', e.target.value)}
                    className="w-full"
                    data-testid="filter-min-price"
                  />
                  <Input
                    type="number"
                    placeholder="Max Price"
                    value={filters.max_price}
                    onChange={(e) => handleFilterChange('max_price', e.target.value)}
                    className="w-full"
                    data-testid="filter-max-price"
                  />
                  <Button 
                    onClick={fetchProducts} 
                    className="w-full bg-teal-600 hover:bg-teal-700"
                    data-testid="apply-price-filter"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between">
                {/* Search */}
                <form onSubmit={handleSearch} className="flex-1 max-w-md">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                      data-testid="products-search"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </form>

                {/* Sort */}
                <div className="flex items-center gap-3">
                  <Select
                    value={`${filters.sort_by}-${filters.sort_order}`}
                    onValueChange={(value) => {
                      const [sort_by, sort_order] = value.split('-');
                      setFilters(prev => ({ ...prev, sort_by, sort_order }));
                    }}
                  >
                    <SelectTrigger className="w-48" data-testid="sort-select">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at-desc">Newest First</SelectItem>
                      <SelectItem value="created_at-asc">Oldest First</SelectItem>
                      <SelectItem value="price-asc">Price: Low to High</SelectItem>
                      <SelectItem value="price-desc">Price: High to Low</SelectItem>
                      <SelectItem value="name-asc">Name: A to Z</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Mode Toggle */}
                  <div className="flex border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}
                      data-testid="view-grid"
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${viewMode === 'list' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600'}`}
                      data-testid="view-list"
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Products Grid/List */}
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                      <div className="aspect-square bg-gray-200 rounded mb-4"></div>
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="bg-white rounded-lg p-12 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No products found</h3>
                  <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
                  <Button onClick={() => setFilters({ search: '', category_id: '', sort_by: 'created_at', sort_order: 'desc', min_price: '', max_price: '', is_featured: false })}>
                    Clear Filters
                  </Button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map(product => (
                    <ProductCard key={product.product_id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {products.map(product => (
                    <ProductListItem key={product.product_id} product={product} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {[...Array(pagination.pages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPagination(prev => ({ ...prev, page: i + 1 }))}
                      className={`w-10 h-10 rounded ${
                        pagination.page === i + 1 
                          ? 'bg-teal-600 text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ProductCard({ product }) {
  const discount = product.compare_at_price 
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : 0;
  
  const primaryImage = product.images?.find(img => img.is_primary)?.url 
    || product.images?.[0]?.url 
    || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';

  return (
    <Link 
      to={`/product/${product.slug}`}
      className="product-card group"
      data-testid={`product-card-${product.product_id}`}
    >
      <div className="product-image">
        <img src={primaryImage} alt={product.name} />
        {discount > 0 && (
          <span className="discount-badge">{discount}% OFF</span>
        )}
      </div>
      <div className="product-info">
        <h4 className="product-title line-clamp-2">{product.name}</h4>
        <p className="text-sm text-gray-500 mb-2 line-clamp-1">{product.short_description}</p>
        <div className="flex items-center">
          <span className="product-price">${product.price?.toFixed(2)}</span>
          {product.compare_at_price && (
            <span className="original-price">${product.compare_at_price?.toFixed(2)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProductListItem({ product }) {
  const discount = product.compare_at_price 
    ? Math.round((1 - product.price / product.compare_at_price) * 100)
    : 0;
  
  const primaryImage = product.images?.find(img => img.is_primary)?.url 
    || product.images?.[0]?.url 
    || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';

  return (
    <Link 
      to={`/product/${product.slug}`}
      className="bg-white rounded-lg p-4 flex gap-4 hover:shadow-md transition"
      data-testid={`product-list-${product.product_id}`}
    >
      <div className="w-32 h-32 flex-shrink-0 rounded overflow-hidden">
        <img src={primaryImage} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-gray-800 mb-1">{product.name}</h4>
        <p className="text-gray-500 text-sm mb-2 line-clamp-2">{product.description || product.short_description}</p>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-teal-600">${product.price?.toFixed(2)}</span>
          {product.compare_at_price && (
            <>
              <span className="text-gray-400 line-through">${product.compare_at_price?.toFixed(2)}</span>
              <span className="text-sm text-red-500 font-medium">{discount}% OFF</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
