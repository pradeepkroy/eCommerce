import React, { useState, useEffect } from 'react';
import { api, useAuth } from '../../App';
import { AdminLayout } from './AdminDashboard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { Save, CreditCard, Mail, MessageSquare, Building } from 'lucide-react';

export default function AdminSettings() {
  const { token } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/api/admin/settings', token);
      setSettings(data);
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name, value) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/settings', settings, token);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Settings">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-12 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <div className="bg-white rounded-lg shadow-sm">
        <Tabs defaultValue="general" className="w-full">
          <div className="border-b px-6 pt-4">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Building className="w-4 h-4" /> General
              </TabsTrigger>
              <TabsTrigger value="payment" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Payment
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> SMS
              </TabsTrigger>
            </TabsList>
          </div>

          {/* General Settings */}
          <TabsContent value="general" className="p-6">
            <h3 className="font-bold text-gray-800 mb-6">Organization Settings</h3>
            <div className="space-y-4 max-w-lg">
              <div>
                <Label htmlFor="website_name">Website Name</Label>
                <Input
                  id="website_name"
                  name="website_name"
                  value={settings.website_name || ''}
                  onChange={handleChange}
                  data-testid="settings-website-name"
                />
              </div>
              <div>
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  name="logo_url"
                  value={settings.logo_url || ''}
                  onChange={handleChange}
                  placeholder="https://example.com/logo.png"
                />
              </div>
              <div>
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    name="primary_color"
                    value={settings.primary_color || '#00ACAC'}
                    onChange={handleChange}
                  />
                  <input
                    type="color"
                    value={settings.primary_color || '#00ACAC'}
                    onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                </div>
              </div>
              
              <h4 className="font-medium text-gray-800 pt-4 border-t">Bank Details</h4>
              <div>
                <Label htmlFor="bank_account_name">Account Name</Label>
                <Input
                  id="bank_account_name"
                  name="bank_account_name"
                  value={settings.bank_account_name || ''}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  name="bank_account_number"
                  value={settings.bank_account_number || ''}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="bank_bsb">BSB</Label>
                <Input
                  id="bank_bsb"
                  name="bank_bsb"
                  value={settings.bank_bsb || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </TabsContent>

          {/* Payment Settings */}
          <TabsContent value="payment" className="p-6">
            <h3 className="font-bold text-gray-800 mb-6">Payment Gateway Settings</h3>
            <div className="space-y-6 max-w-lg">
              {/* Stripe */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💳</span>
                    <div>
                      <h4 className="font-medium">Stripe</h4>
                      <p className="text-sm text-gray-500">Credit/Debit Card Payments</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.stripe_enabled ?? true}
                    onCheckedChange={(checked) => handleToggle('stripe_enabled', checked)}
                    data-testid="stripe-toggle"
                  />
                </div>
                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                  Stripe is pre-configured and ready to use. API keys are managed securely.
                </p>
              </div>

              {/* PayPal */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🅿️</span>
                    <div>
                      <h4 className="font-medium">PayPal</h4>
                      <p className="text-sm text-gray-500">PayPal Checkout</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.paypal_enabled ?? false}
                    onCheckedChange={(checked) => handleToggle('paypal_enabled', checked)}
                    data-testid="paypal-toggle"
                  />
                </div>
                {settings.paypal_enabled && (
                  <div className="space-y-3 mt-4">
                    <div>
                      <Label htmlFor="paypal_client_id">Client ID</Label>
                      <Input
                        id="paypal_client_id"
                        name="paypal_client_id"
                        value={settings.paypal_client_id || ''}
                        onChange={handleChange}
                        type="password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="paypal_secret">Secret</Label>
                      <Input
                        id="paypal_secret"
                        name="paypal_secret"
                        value={settings.paypal_secret || ''}
                        onChange={handleChange}
                        type="password"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Razorpay */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <div>
                      <h4 className="font-medium">Razorpay</h4>
                      <p className="text-sm text-gray-500">Indian Payments</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.razorpay_enabled ?? false}
                    onCheckedChange={(checked) => handleToggle('razorpay_enabled', checked)}
                    data-testid="razorpay-toggle"
                  />
                </div>
                {settings.razorpay_enabled && (
                  <div className="space-y-3 mt-4">
                    <div>
                      <Label htmlFor="razorpay_key_id">Key ID</Label>
                      <Input
                        id="razorpay_key_id"
                        name="razorpay_key_id"
                        value={settings.razorpay_key_id || ''}
                        onChange={handleChange}
                        type="password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="razorpay_key_secret">Key Secret</Label>
                      <Input
                        id="razorpay_key_secret"
                        name="razorpay_key_secret"
                        value={settings.razorpay_key_secret || ''}
                        onChange={handleChange}
                        type="password"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email" className="p-6">
            <h3 className="font-bold text-gray-800 mb-6">Email Settings (SendGrid)</h3>
            <div className="space-y-4 max-w-lg">
              <div>
                <Label htmlFor="email_from_address">From Email Address</Label>
                <Input
                  id="email_from_address"
                  name="email_from_address"
                  type="email"
                  value={settings.email_from_address || ''}
                  onChange={handleChange}
                  placeholder="noreply@yourstore.com"
                />
              </div>
              <div>
                <Label htmlFor="email_from_name">From Name</Label>
                <Input
                  id="email_from_name"
                  name="email_from_name"
                  value={settings.email_from_name || ''}
                  onChange={handleChange}
                  placeholder="Your Store"
                />
              </div>
              <div>
                <Label htmlFor="sendgrid_api_key">SendGrid API Key</Label>
                <Input
                  id="sendgrid_api_key"
                  name="sendgrid_api_key"
                  type="password"
                  value={settings.sendgrid_api_key || ''}
                  onChange={handleChange}
                  placeholder="SG.xxxxxxxx"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from{' '}
                  <a href="https://sendgrid.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                    SendGrid Dashboard
                  </a>
                </p>
              </div>
            </div>
          </TabsContent>

          {/* SMS Settings */}
          <TabsContent value="sms" className="p-6">
            <h3 className="font-bold text-gray-800 mb-6">SMS Settings (Twilio)</h3>
            <div className="space-y-4 max-w-lg">
              <div>
                <Label htmlFor="twilio_account_sid">Account SID</Label>
                <Input
                  id="twilio_account_sid"
                  name="twilio_account_sid"
                  value={settings.twilio_account_sid || ''}
                  onChange={handleChange}
                  type="password"
                />
              </div>
              <div>
                <Label htmlFor="twilio_auth_token">Auth Token</Label>
                <Input
                  id="twilio_auth_token"
                  name="twilio_auth_token"
                  type="password"
                  value={settings.twilio_auth_token || ''}
                  onChange={handleChange}
                />
              </div>
              <div>
                <Label htmlFor="twilio_phone_number">Phone Number</Label>
                <Input
                  id="twilio_phone_number"
                  name="twilio_phone_number"
                  value={settings.twilio_phone_number || ''}
                  onChange={handleChange}
                  placeholder="+1234567890"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Get your credentials from{' '}
                  <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                    Twilio Console
                  </a>
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="p-6 border-t flex justify-end">
          <Button 
            onClick={handleSave} 
            className="bg-teal-600 hover:bg-teal-700"
            disabled={saving}
            data-testid="save-settings"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
