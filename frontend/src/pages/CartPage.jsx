import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { api, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export default function CartPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const data = await api.get('/api/cart', token);
      setCart(data);
    } catch (error) {
      console.error('Failed to fetch cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, variantId, newQuantity) => {
    setUpdating(productId);
    try {
      const data = await api.put('/api/cart/update', {
        product_id: productId,
        variant_id: variantId,
        quantity: newQuantity
      }, token);
      setCart(data);
      if (newQuantity <= 0) {
        toast.success('Item removed from cart');
      }
    } catch (error) {
      toast.error('Failed to update cart');
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (productId, variantId) => {
    setUpdating(productId);
    try {
      const data = await api.delete(`/api/cart/item/${productId}${variantId ? `?variant_id=${variantId}` : ''}`, token);
      setCart(data);
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    } finally {
      setUpdating(null);
    }
  };

  const shipping = cart.subtotal >= 100 ? 0 : 10;
  const tax = cart.subtotal * 0.1;
  const total = cart.subtotal + shipping + tax;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Page Header */}
      <div className="bg-gray-100 py-6">
        <div className="container mx-auto px-4">
          <nav className="text-sm text-gray-500 mb-2">
            <Link to="/" className="hover:text-teal-600">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-800">Shopping Cart</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-800">Shopping Cart</h1>
        </div>
      </div>

      <div className="section-container bg-gray-50">
        <div className="container mx-auto px-4">
          {cart.items.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h3>
              <p className="text-gray-600 mb-6">Looks like you haven't added any items yet.</p>
              <Link to="/products">
                <Button className="bg-teal-600 hover:bg-teal-700" data-testid="continue-shopping">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm">
                  <div className="p-6 border-b">
                    <h2 className="font-bold text-gray-800">Cart Items ({cart.items.length})</h2>
                  </div>
                  
                  <div className="divide-y">
                    {cart.items.map(item => (
                      <div 
                        key={`${item.product_id}-${item.variant_id}`}
                        className="p-6 flex gap-4"
                        data-testid={`cart-item-${item.product_id}`}
                      >
                        <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img 
                            src={item.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1">
                          <Link to={`/product/${item.product_id}`} className="font-semibold text-gray-800 hover:text-teal-600">
                            {item.name}
                          </Link>
                          {item.variant_id && (
                            <p className="text-sm text-gray-500">Variant: {item.variant_id}</p>
                          )}
                          <p className="text-teal-600 font-bold mt-1">${item.price?.toFixed(2)}</p>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="quantity-selector">
                              <button 
                                onClick={() => updateQuantity(item.product_id, item.variant_id, item.quantity - 1)}
                                disabled={updating === item.product_id}
                                data-testid={`decrease-${item.product_id}`}
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span>{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.product_id, item.variant_id, item.quantity + 1)}
                                disabled={updating === item.product_id}
                                data-testid={`increase-${item.product_id}`}
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span className="font-bold text-gray-800">
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                              <button
                                onClick={() => removeItem(item.product_id, item.variant_id)}
                                className="text-red-500 hover:text-red-700 p-2"
                                disabled={updating === item.product_id}
                                data-testid={`remove-${item.product_id}`}
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                  <h2 className="font-bold text-gray-800 mb-6">Order Summary</h2>
                  
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">${cart.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">
                        {shipping === 0 ? (
                          <span className="text-green-600">FREE</span>
                        ) : (
                          `$${shipping.toFixed(2)}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax (10%)</span>
                      <span className="font-medium">${tax.toFixed(2)}</span>
                    </div>
                    
                    {cart.subtotal < 100 && (
                      <div className="bg-teal-50 text-teal-700 p-3 rounded-lg text-xs">
                        Add ${(100 - cart.subtotal).toFixed(2)} more to get FREE shipping!
                      </div>
                    )}
                    
                    <div className="border-t pt-4 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-teal-600">${total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => navigate('/checkout')}
                    className="w-full mt-6 bg-teal-600 hover:bg-teal-700 py-6"
                    data-testid="proceed-to-checkout"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  
                  <Link to="/products" className="block text-center mt-4 text-teal-600 hover:underline text-sm">
                    Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
