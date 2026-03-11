import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { api } from '../App';
import { Button } from '../components/ui/button';
import { ChevronLeft, ChevronRight, Truck, Shield, Headphones } from 'lucide-react';

// Hero Slider Images
const heroSlides = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1483058712412-4245e9b90334?w=1600',
    title: 'Premium Electronics',
    subtitle: 'Discover the latest technology',
    price: 'from $299.00',
    link: '/products/electronics'
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600',
    title: 'Fashion Collection',
    subtitle: 'New season styles',
    price: 'from $49.00',
    link: '/products/fashion'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1600',
    title: 'Home & Living',
    subtitle: 'Transform your space',
    price: 'from $99.00',
    link: '/products/home'
  }
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    // Auto-advance slider
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/api/products/featured?limit=8'),
        api.get('/api/categories')
      ]);
      setFeaturedProducts(productsRes);
      setCategories(categoriesRes);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % heroSlides.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + heroSlides.length) % heroSlides.length);

  return (
    <Layout>
      {/* Hero Carousel */}
      <section className="hero-carousel relative overflow-hidden" data-testid="hero-carousel">
        <div className="relative h-[500px]">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`hero-slide absolute inset-0 transition-all duration-700 ease-in-out ${
                index === currentSlide 
                  ? 'opacity-100 z-10' 
                  : 'opacity-0 z-0'
              }`}
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="container mx-auto px-4 h-full flex items-center">
                <div className={`hero-content ${index === currentSlide ? 'animate-fadeIn' : ''}`}>
                  <h2>{slide.title}</h2>
                  <p>{slide.subtitle}</p>
                  <div className="price">
                    <small>from</small> <span className="text-2xl font-bold">{slide.price.replace('from ', '')}</span>
                  </div>
                  <Link to={slide.link}>
                    <Button className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 py-6 text-lg">
                      Shop Now
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Carousel Controls */}
        <button 
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition"
          data-testid="carousel-prev"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition"
          data-testid="carousel-next"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition ${
                index === currentSlide ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Promotions Section */}
      <section className="section-container bg-white">
        <div className="container mx-auto px-4">
          <h4 className="section-title">
            Exclusive Promotions
            <small>Special deals just for you</small>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Large Promo */}
            <div className="md:col-span-2 promotion-card bg-dark">
              <div className="promotion-content">
                <h3 className="text-xl font-bold mb-2">Premium Headphones</h3>
                <p className="text-sm opacity-80 mb-3">Experience studio-quality sound</p>
                <div className="text-lg font-bold text-teal-400 mb-4">from $199.00</div>
                <Link to="/products/electronics" className="text-sm text-teal-400 hover:underline">
                  View More →
                </Link>
              </div>
              <div className="promotion-image">
                <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400" alt="Headphones" />
              </div>
            </div>

            {/* Small Promos */}
            <div className="promotion-card bg-blue flex flex-col justify-between">
              <div>
                <h3 className="font-bold mb-1">Smart Watch</h3>
                <p className="text-sm opacity-80">Stay connected</p>
                <div className="font-bold text-lg mt-2">from $299.00</div>
              </div>
              <Link to="/products/electronics" className="text-sm opacity-80 hover:opacity-100 mt-4">
                View More →
              </Link>
            </div>

            <div className="promotion-card bg-silver flex flex-col justify-between">
              <div>
                <h3 className="font-bold mb-1">Accessories</h3>
                <p className="text-sm text-gray-600">Complete your look</p>
                <div className="font-bold text-lg mt-2 text-teal-600">from $29.00</div>
              </div>
              <Link to="/products/accessories" className="text-sm text-gray-600 hover:text-teal-600 mt-4">
                View More →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Items */}
      <section className="section-container bg-silver">
        <div className="container mx-auto px-4">
          <h4 className="section-title flex justify-between items-center">
            <div>
              Trending Items
              <small>Shop and get your favourite items at amazing prices!</small>
            </div>
            <Link to="/products" className="text-teal-600 text-sm font-medium hover:underline">
              SHOW ALL
            </Link>
          </h4>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                  <div className="aspect-square bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {(featuredProducts.length > 0 ? featuredProducts : defaultProducts).map(product => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="section-container bg-silver pt-0">
        <div className="container mx-auto px-4">
          <h4 className="section-title flex justify-between items-center">
            <div>
              Shop By Category
              <small>Browse our wide selection</small>
            </div>
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(categories.length > 0 ? categories : defaultCategories).slice(0, 4).map((cat, index) => (
              <Link 
                key={cat.category_id || index}
                to={`/products/${cat.slug}`}
                className="group relative h-48 rounded-lg overflow-hidden bg-gray-200"
                data-testid={`category-${cat.slug}`}
              >
                <img 
                  src={cat.image_url || categoryImages[index % categoryImages.length]}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                  <div className="text-white">
                    <h3 className="font-bold text-lg">{cat.name}</h3>
                    <p className="text-sm opacity-80">Shop Now →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Policy Section */}
      <section className="section-container py-8 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="policy-item">
              <div className="policy-icon">
                <Truck className="w-6 h-6" />
              </div>
              <div className="policy-info">
                <h4>Free Delivery Over $100</h4>
                <p>Enjoy free shipping on all orders above $100. Fast and reliable delivery.</p>
              </div>
            </div>
            <div className="policy-item">
              <div className="policy-icon">
                <Shield className="w-6 h-6" />
              </div>
              <div className="policy-info">
                <h4>1 Year Warranty</h4>
                <p>All products come with manufacturer warranty. Shop with confidence.</p>
              </div>
            </div>
            <div className="policy-item">
              <div className="policy-icon">
                <Headphones className="w-6 h-6" />
              </div>
              <div className="policy-info">
                <h4>24/7 Customer Support</h4>
                <p>Our support team is here to help you anytime, anywhere.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

// Product Card Component
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

// Default data for initial display
const defaultProducts = [
  { product_id: '1', name: 'Wireless Headphones', slug: 'wireless-headphones', price: 149.99, compare_at_price: 199.99, short_description: 'Premium sound quality', images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', is_primary: true }] },
  { product_id: '2', name: 'Smart Watch Pro', slug: 'smart-watch-pro', price: 299.99, short_description: 'Stay connected', images: [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', is_primary: true }] },
  { product_id: '3', name: 'Bluetooth Speaker', slug: 'bluetooth-speaker', price: 79.99, compare_at_price: 99.99, short_description: 'Portable audio', images: [{ url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400', is_primary: true }] },
  { product_id: '4', name: 'Laptop Stand', slug: 'laptop-stand', price: 49.99, short_description: 'Ergonomic design', images: [{ url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', is_primary: true }] },
  { product_id: '5', name: 'USB-C Hub', slug: 'usb-c-hub', price: 59.99, compare_at_price: 79.99, short_description: 'Multi-port connectivity', images: [{ url: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400', is_primary: true }] },
  { product_id: '6', name: 'Mechanical Keyboard', slug: 'mechanical-keyboard', price: 129.99, short_description: 'RGB backlit', images: [{ url: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400', is_primary: true }] },
];

const defaultCategories = [
  { category_id: '1', name: 'Electronics', slug: 'electronics' },
  { category_id: '2', name: 'Fashion', slug: 'fashion' },
  { category_id: '3', name: 'Home & Living', slug: 'home' },
  { category_id: '4', name: 'Accessories', slug: 'accessories' },
];

const categoryImages = [
  'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600',
  'https://images.unsplash.com/photo-1445205170230-053b83016050?w=600',
  'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600',
];
