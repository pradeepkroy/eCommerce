import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { api, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: user?.email || '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Australia',
    payment_method: 'stripe',
    notes: ''
  });

  useEffect(() => {
    fetchCart();
    if (user) {
      setFormData(prev => ({
        ...prev,
        email: user.email,
        first_name: user.name?.split(' ')[0] || '',
        last_name: user.name?.split(' ').slice(1).join(' ') || ''
      }));
    }
  }, [user]);

  const fetchCart = async () => {
    try {
      const data = await api.get('/api/cart', token);
      if (!data.items || data.items.length === 0) {
        navigate('/cart');
        return;
      }
      setCart(data);
    } catch (error) {
      navigate('/cart');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate
    const required = ['first_name', 'last_name', 'email', 'phone', 'address_line1', 'city', 'state', 'postal_code'];
    for (const field of required) {
      if (!formData[field]) {
        toast.error(`Please fill in ${field.replace('_', ' ')}`);
        return;
      }
    }
    
    setSubmitting(true);
    try {
      const orderData = {
        shipping_address: {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          state: formData.state,
          postal_code: formData.postal_code,
          country: formData.country
        },
        payment_method: formData.payment_method,
        notes: formData.notes
      };
      
      const order = await api.post('/api/orders', orderData, token);
      
      // Store order data for payment page
      sessionStorage.setItem('pending_order', JSON.stringify(order));
      navigate(`/checkout/payment?order_id=${order.order_id}`);
    } catch (error) {
      toast.error(error.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
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
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Progress Bar */}
      <div className="bg-gray-100 py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-4 text-sm">
            <Link to="/cart" className="text-gray-500 hover:text-teal-600">1. Cart</Link>
            <span className="w-8 h-px bg-gray-300"></span>
            <span className="text-teal-600 font-medium">2. Shipping</span>
            <span className="w-8 h-px bg-gray-300"></span>
            <span className="text-gray-400">3. Payment</span>
            <span className="w-8 h-px bg-gray-300"></span>
            <span className="text-gray-400">4. Complete</span>
          </div>
        </div>
      </div>

      <div className="section-container bg-gray-50">
        <div className="container mx-auto px-4">
          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Shipping Form */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="font-bold text-gray-800 mb-6">Shipping Information</h2>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        required
                        data-testid="checkout-first-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        required
                        data-testid="checkout-last-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        data-testid="checkout-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        data-testid="checkout-phone"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address_line1">Address Line 1 *</Label>
                      <Input
                        id="address_line1"
                        name="address_line1"
                        value={formData.address_line1}
                        onChange={handleChange}
                        required
                        data-testid="checkout-address1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address_line2">Address Line 2</Label>
                      <Input
                        id="address_line2"
                        name="address_line2"
                        value={formData.address_line2}
                        onChange={handleChange}
                        data-testid="checkout-address2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        data-testid="checkout-city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        required
                        data-testid="checkout-state"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_code">Postal Code *</Label>
                      <Input
                        id="postal_code"
                        name="postal_code"
                        value={formData.postal_code}
                        onChange={handleChange}
                        required
                        data-testid="checkout-postal"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Select 
                        value={formData.country} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
                      >
                        <SelectTrigger data-testid="checkout-country">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Australia">Australia</SelectItem>
                          <SelectItem value="United States">United States</SelectItem>
                          <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                          <SelectItem value="Canada">Canada</SelectItem>
                          <SelectItem value="New Zealand">New Zealand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="font-bold text-gray-800 mb-6">Payment Method</h2>
                  
                  <div className="space-y-3">
                    {[
                      { value: 'stripe', label: 'Credit/Debit Card (Stripe)', icon: '💳' },
                      { value: 'paypal', label: 'PayPal', icon: '🅿️' },
                      { value: 'razorpay', label: 'Razorpay', icon: '💰' }
                    ].map(method => (
                      <label 
                        key={method.value}
                        className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition ${
                          formData.payment_method === method.value 
                            ? 'border-teal-600 bg-teal-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.value}
                          checked={formData.payment_method === method.value}
                          onChange={handleChange}
                          className="text-teal-600"
                          data-testid={`payment-${method.value}`}
                        />
                        <span className="text-2xl">{method.icon}</span>
                        <span className="font-medium">{method.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                  <h2 className="font-bold text-gray-800 mb-6">Order Summary</h2>
                  
                  <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                    {cart.items.map(item => (
                      <div key={`${item.product_id}-${item.variant_id}`} className="flex gap-3">
                        <div className="w-16 h-16 rounded bg-gray-100 overflow-hidden flex-shrink-0">
                          <img 
                            src={item.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200'} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 text-sm">
                          <p className="font-medium line-clamp-2">{item.name}</p>
                          <p className="text-gray-500">Qty: {item.quantity}</p>
                          <p className="text-teal-600 font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3 text-sm border-t pt-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">${cart.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">
                        {shipping === 0 ? <span className="text-green-600">FREE</span> : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax (10%)</span>
                      <span className="font-medium">${tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-teal-600">${total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit"
                    className="w-full mt-6 bg-teal-600 hover:bg-teal-700 py-6"
                    disabled={submitting}
                    data-testid="continue-to-payment"
                  >
                    {submitting ? 'Processing...' : 'Continue to Payment'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
