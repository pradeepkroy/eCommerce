import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { api, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Minus, Plus, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw } from 'lucide-react';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/products/slug/${slug}`);
      setProduct(data);
      
      if (data.variants?.length > 0) {
        setSelectedVariant(data.variants[0]);
      }
      
      // Fetch recommendations
      try {
        const recs = await api.post('/api/ai/recommendations', { product_id: data.product_id });
        setRecommendations(recs.recommendations || []);
      } catch (e) {
        console.log('Recommendations not available');
      }
    } catch (error) {
      toast.error('Product not found');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    try {
      await api.post('/api/cart/add', {
        product_id: product.product_id,
        variant_id: selectedVariant?.variant_id,
        quantity
      }, token);
      toast.success(`${product.name} added to cart!`);
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const currentPrice = selectedVariant?.price || product?.price;
  const comparePrice = selectedVariant?.compare_at_price || product?.compare_at_price;
  const discount = comparePrice ? Math.round((1 - currentPrice / comparePrice) * 100) : 0;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 animate-pulse rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              <div className="h-12 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) return null;

  const images = product.images?.length > 0 
    ? product.images 
    : [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', alt: product.name }];

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="bg-gray-100 py-4">
        <div className="container mx-auto px-4">
          <nav className="text-sm text-gray-500">
            <Link to="/" className="hover:text-teal-600">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/products" className="hover:text-teal-600">Products</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img 
                src={images[selectedImage]?.url} 
                alt={images[selectedImage]?.alt || product.name}
                className="w-full h-full object-cover"
                data-testid="product-main-image"
              />
            </div>
            
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${
                      selectedImage === index ? 'border-teal-600' : 'border-transparent'
                    }`}
                    data-testid={`product-thumbnail-${index}`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {discount > 0 && (
              <span className="inline-block bg-red-100 text-red-600 text-sm font-medium px-3 py-1 rounded-full mb-4">
                {discount}% OFF
              </span>
            )}
            
            <h1 className="text-3xl font-bold text-gray-800 mb-2" data-testid="product-name">
              {product.name}
            </h1>
            
            <p className="text-gray-600 mb-4">{product.short_description}</p>
            
            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-teal-600" data-testid="product-price">
                ${currentPrice?.toFixed(2)}
              </span>
              {comparePrice && (
                <span className="text-xl text-gray-400 line-through">
                  ${comparePrice?.toFixed(2)}
                </span>
              )}
            </div>

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div className="mb-6">
                <label className="block font-medium text-gray-700 mb-2">Options</label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map(variant => (
                    <button
                      key={variant.variant_id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-2 rounded-lg border-2 transition ${
                        selectedVariant?.variant_id === variant.variant_id
                          ? 'border-teal-600 bg-teal-50 text-teal-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid={`variant-${variant.variant_id}`}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <label className="block font-medium text-gray-700 mb-2">Quantity</label>
              <div className="quantity-selector inline-flex">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  data-testid="quantity-decrease"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span data-testid="quantity-value">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  data-testid="quantity-increase"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-8">
              <Button 
                onClick={handleAddToCart}
                className="flex-1 bg-teal-600 hover:bg-teal-700 py-6 text-lg"
                data-testid="add-to-cart"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Add to Cart
              </Button>
              <Button variant="outline" className="p-3" data-testid="add-to-wishlist">
                <Heart className="w-5 h-5" />
              </Button>
              <Button variant="outline" className="p-3" data-testid="share-product">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Features */}
            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Truck className="w-5 h-5 text-teal-600" />
                <span>Free delivery on orders over $100</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Shield className="w-5 h-5 text-teal-600" />
                <span>1 Year Manufacturer Warranty</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <RotateCcw className="w-5 h-5 text-teal-600" />
                <span>30-Day Easy Returns</span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        {product.description && (
          <div className="mt-12 border-t pt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Product Description</h2>
            <div className="prose max-w-none text-gray-600">
              <p>{product.description}</p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-12 border-t pt-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendations.map(rec => (
                <Link
                  key={rec.product_id}
                  to={`/product/${rec.slug}`}
                  className="product-card"
                  data-testid={`recommendation-${rec.product_id}`}
                >
                  <div className="product-image">
                    <img 
                      src={rec.images?.[0]?.url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'} 
                      alt={rec.name} 
                    />
                  </div>
                  <div className="product-info">
                    <h4 className="product-title line-clamp-2">{rec.name}</h4>
                    <span className="product-price">${rec.price?.toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
