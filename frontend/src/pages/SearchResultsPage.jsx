import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { api } from '../App';
import { Search } from 'lucide-react';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query) {
      searchProducts();
    }
  }, [query]);

  const searchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/products?search=${encodeURIComponent(query)}`);
      setProducts(data.products || []);
    } catch (error) {
      console.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="bg-gray-100 py-6">
        <div className="container mx-auto px-4">
          <nav className="text-sm text-gray-500 mb-2">
            <Link to="/" className="hover:text-teal-600">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800">Search Results</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800">
            Search Results for "{query}"
          </h1>
          <p className="text-gray-600 mt-1">
            {products.length} {products.length === 1 ? 'result' : 'results'} found
          </p>
        </div>
      </div>

      <div className="section-container bg-gray-50">
        <div className="container mx-auto px-4">
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
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">No results found</h3>
              <p className="text-gray-600 mb-4">
                We couldn't find any products matching "{query}"
              </p>
              <Link to="/products" className="text-teal-600 hover:underline">
                Browse all products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => {
                const primaryImage = product.images?.find(img => img.is_primary)?.url 
                  || product.images?.[0]?.url 
                  || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';
                const discount = product.compare_at_price 
                  ? Math.round((1 - product.price / product.compare_at_price) * 100)
                  : 0;

                return (
                  <Link 
                    key={product.product_id}
                    to={`/product/${product.slug}`}
                    className="product-card group"
                    data-testid={`search-result-${product.product_id}`}
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
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
