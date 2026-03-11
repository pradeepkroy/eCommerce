import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { api, useAuth } from '../App';
import { Button } from '../components/ui/button';
import { CheckCircle, Loader2, Package, Mail } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('loading');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (sessionId) {
      verifyPayment();
    } else {
      setStatus('success'); // Assume success if no session_id
    }
    
    // Clear pending order from session storage
    sessionStorage.removeItem('pending_order');
  }, [sessionId]);

  const verifyPayment = async () => {
    try {
      const result = await api.get(`/api/checkout/stripe/status/${sessionId}`, token);
      
      if (result.payment_status === 'paid') {
        setStatus('success');
        // Fetch order details
        if (result.metadata?.order_id) {
          try {
            const orderData = await api.get(`/api/orders/${result.metadata.order_id}`, token);
            setOrder(orderData);
          } catch (e) {
            // Order fetch failed, but payment was successful
          }
        }
      } else {
        setStatus('pending');
      }
    } catch (error) {
      setStatus('error');
    }
  };

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
            <span className="text-gray-500">3. Payment</span>
            <span className="w-8 h-px bg-gray-300"></span>
            <span className="text-teal-600 font-medium">4. Complete</span>
          </div>
        </div>
      </div>

      <div className="section-container bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="w-16 h-16 text-teal-600 mx-auto mb-4 animate-spin" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Processing Payment...</h1>
                <p className="text-gray-600">Please wait while we confirm your payment.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2" data-testid="success-title">
                  Thank You for Your Order!
                </h1>
                <p className="text-gray-600 mb-6">
                  Your payment was successful and your order has been confirmed.
                </p>

                {order && (
                  <div className="bg-gray-50 rounded-lg p-6 text-left mb-6">
                    <h3 className="font-medium text-gray-800 mb-3">Order Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order Number:</span>
                        <span className="font-medium">{order.order_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-medium text-teal-600">${order.total?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="badge badge-success">{order.status}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <Mail className="w-8 h-8 text-teal-600" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Order Confirmation</p>
                      <p className="text-xs text-gray-500">Sent to your email</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                    <Package className="w-8 h-8 text-teal-600" />
                    <div className="text-left">
                      <p className="font-medium text-sm">Track Your Order</p>
                      <p className="text-xs text-gray-500">In your account</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/account#orders">
                    <Button variant="outline" data-testid="view-orders">
                      View My Orders
                    </Button>
                  </Link>
                  <Link to="/products">
                    <Button className="bg-teal-600 hover:bg-teal-700" data-testid="continue-shopping">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {status === 'pending' && (
              <>
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-12 h-12 text-yellow-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Pending</h1>
                <p className="text-gray-600 mb-6">
                  Your payment is being processed. You'll receive a confirmation email once it's complete.
                </p>
                <Link to="/">
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    Return Home
                  </Button>
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">❌</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h1>
                <p className="text-gray-600 mb-6">
                  There was an issue processing your payment. Please try again.
                </p>
                <Link to="/cart">
                  <Button className="bg-teal-600 hover:bg-teal-700">
                    Return to Cart
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
