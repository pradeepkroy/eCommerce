import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { api, useAuth, API_URL } from '../App';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { CreditCard, Loader2 } from 'lucide-react';

export default function CheckoutPaymentPage() {
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const orderId = searchParams.get('order_id');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!orderId) {
      navigate('/checkout');
      return;
    }
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      // Try to get from session storage first
      const pendingOrder = sessionStorage.getItem('pending_order');
      if (pendingOrder) {
        const parsed = JSON.parse(pendingOrder);
        if (parsed.order_id === orderId) {
          setOrder(parsed);
          setLoading(false);
          return;
        }
      }
      
      // Fetch from API
      const data = await api.get(`/api/orders/${orderId}`, token);
      setOrder(data);
    } catch (error) {
      toast.error('Order not found');
      navigate('/checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    setProcessing(true);
    try {
      const response = await api.post('/api/checkout/stripe/create-session', {
        order_id: orderId,
        origin_url: window.location.origin
      }, token);
      
      // Redirect to Stripe
      window.location.href = response.url;
    } catch (error) {
      toast.error('Failed to create payment session');
      setProcessing(false);
    }
  };

  const handlePayPalPayment = async () => {
    toast.info('PayPal integration coming soon!');
  };

  const handleRazorpayPayment = async () => {
    toast.info('Razorpay integration coming soon!');
  };

  const handlePayment = () => {
    switch (order?.payment_method) {
      case 'stripe':
        handleStripePayment();
        break;
      case 'paypal':
        handlePayPalPayment();
        break;
      case 'razorpay':
        handleRazorpayPayment();
        break;
      default:
        handleStripePayment();
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12">
          <div className="flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) return null;

  return (
    <Layout>
      {/* Progress Bar */}
      <div className="bg-gray-100 py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="text-gray-500">1. Cart</span>
            <span className="w-8 h-px bg-gray-300"></span>
            <span className="text-gray-500">2. Shipping</span>
            <span className="w-8 h-px bg-gray-300"></span>
            <span className="text-teal-600 font-medium">3. Payment</span>
            <span className="w-8 h-px bg-gray-300"></span>
            <span className="text-gray-400">4. Complete</span>
          </div>
        </div>
      </div>

      <div className="section-container bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <CreditCard className="w-16 h-16 text-teal-600 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-800">Complete Your Payment</h1>
              <p className="text-gray-600 mt-2">Order #{order.order_number}</p>
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-medium text-gray-800 mb-4">Order Summary</h3>
              
              <div className="space-y-2 text-sm mb-4">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-gray-600">{item.name} x {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>${order.subtotal?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{order.shipping_cost === 0 ? 'FREE' : `$${order.shipping_cost?.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span>${order.tax?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-teal-600">${order.total?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-800 mb-2">Shipping To</h3>
              <p className="text-sm text-gray-600">
                {order.shipping_address?.first_name} {order.shipping_address?.last_name}<br />
                {order.shipping_address?.address_line1}<br />
                {order.shipping_address?.address_line2 && <>{order.shipping_address.address_line2}<br /></>}
                {order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.postal_code}<br />
                {order.shipping_address?.country}
              </p>
            </div>

            {/* Payment Method Info */}
            <div className="mb-8">
              <h3 className="font-medium text-gray-800 mb-2">Payment Method</h3>
              <p className="text-sm text-gray-600 capitalize">
                {order.payment_method === 'stripe' && '💳 Credit/Debit Card (Stripe)'}
                {order.payment_method === 'paypal' && '🅿️ PayPal'}
                {order.payment_method === 'razorpay' && '💰 Razorpay'}
              </p>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handlePayment}
              disabled={processing}
              className="w-full bg-teal-600 hover:bg-teal-700 py-6 text-lg"
              data-testid="pay-now-button"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Pay ${order.total?.toFixed(2)} Now</>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Your payment is secure. We use industry-standard encryption.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
