"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Save, TestTube } from "lucide-react";
import toast from "react-hot-toast";

interface ProfileData {
  business_name: string;
  email: string;
  phone?: string;
  website?: string;
  callback_url?: string;
  webhook_secret?: string;
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    business_name: "",
    email: "",
    phone: "",
    website: "",
    callback_url: "",
    webhook_secret: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    // TODO: Fetch from GET /api/v1/merchants/me
    setTimeout(() => {
      setFormData({
        business_name: "My Business",
        email: "merchant@example.com",
        phone: "+237690000000",
        website: "https://mybusiness.com",
        callback_url: "https://mybusiness.com/webhooks/ltcpay",
        webhook_secret: "whsec_" + "x".repeat(40),
      });
      setIsLoading(false);
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      // TODO: Call PUT /api/v1/merchants/me
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const testWebhook = async () => {
    try {
      // TODO: Call POST /api/v1/webhooks/test
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Test webhook sent successfully!");
    } catch (error) {
      toast.error("Failed to send test webhook");
    }
  };

  if (isLoading) {
    return <div className="py-20 text-center">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your merchant profile and webhook configuration
        </p>
      </div>

      {/* Business Information */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Business Information
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Name *
              </label>
              <input
                type="text"
                required
                value={formData.business_name}
                onChange={(e) =>
                  setFormData({ ...formData, business_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+237690000000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://mybusiness.com"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Webhook Configuration
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure where to receive payment notifications
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={testWebhook}>
              <TestTube className="w-4 h-4 mr-2" />
              Test Webhook
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Callback URL
              </label>
              <input
                type="url"
                value={formData.callback_url}
                onChange={(e) =>
                  setFormData({ ...formData, callback_url: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://yoursite.com/webhooks/ltcpay"
              />
              <p className="mt-1 text-sm text-gray-500">
                We'll send POST requests to this URL when payment status changes
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook Secret
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={formData.webhook_secret}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Use this to verify webhook signatures (HMAC-SHA256)
              </p>
            </div>

            {/* Webhook Payload Example */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Example Webhook Payload
              </h4>
              <pre className="text-xs text-gray-700 overflow-x-auto">
{`POST ${formData.callback_url || 'https://yoursite.com/webhooks/ltcpay'}
Headers:
  X-LtcPay-Signature: <HMAC-SHA256 signature>
  X-LtcPay-Event: payment.completed
  Content-Type: application/json

Body:
{
  "payment_id": "uuid",
  "reference": "PAY-xxx",
  "status": "COMPLETED",
  "amount": "10000.00",
  "merchant_reference": "ORDER-123",
  "timestamp": "2026-04-02T10:00:00Z"
}`}
              </pre>
            </div>

            {/* Verification Code Example */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Verifying Webhooks (Python)
              </h4>
              <pre className="text-xs text-gray-700 overflow-x-auto">
{`import hmac
import hashlib

def verify_webhook(payload_body, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload_body.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
