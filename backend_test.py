#!/usr/bin/env python3
"""
E-Commerce Backend API Testing Suite
Tests all major API endpoints including authentication, products, cart, orders, and admin functions.
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class ECommerceAPITester:
    def __init__(self, base_url="https://shop-builder-363.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data
        self.test_user_email = f"testuser_{datetime.now().strftime('%H%M%S')}@test.com"
        self.test_user_password = "TestPass123!"
        self.admin_email = "admin@store.com"
        self.admin_password = "admin123"
        
        # Store created IDs for cleanup
        self.created_product_id = None
        self.created_category_id = None
        self.created_order_id = None

    def log_test(self, name: str, success: bool, details: str = "", endpoint: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "endpoint": endpoint
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, token: str = None, expected_status: int = 200) -> tuple:
        """Make HTTP request and return success status and response"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text[:200]}
            
            return success, response_data
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_health_endpoints(self):
        """Test basic health and info endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        success, data = self.make_request('GET', '/api/')
        self.log_test("API Root Endpoint", success, 
                     "" if success else f"Failed: {data}", "/api/")
        
        # Test health endpoint
        success, data = self.make_request('GET', '/api/health')
        self.log_test("Health Check Endpoint", success, 
                     "" if success else f"Failed: {data}", "/api/health")

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n🔍 Testing Authentication...")
        
        # Test admin login
        success, data = self.make_request('POST', '/api/auth/login', {
            "email": self.admin_email,
            "password": self.admin_password
        })
        
        if success and 'token' in data:
            self.admin_token = data['token']
            self.log_test("Admin Login", True, f"Role: {data.get('user', {}).get('role')}")
        else:
            self.log_test("Admin Login", False, f"Failed: {data}", "/api/auth/login")
        
        # Test user registration
        success, data = self.make_request('POST', '/api/auth/register', {
            "email": self.test_user_email,
            "password": self.test_user_password,
            "name": "Test User",
            "phone": "+61400000000"
        })
        
        if success and 'token' in data:
            self.user_token = data['token']
            self.log_test("User Registration", True, f"User ID: {data.get('user', {}).get('user_id')}")
        else:
            self.log_test("User Registration", False, f"Failed: {data}", "/api/auth/register")
        
        # Test user login
        if self.user_token:
            success, data = self.make_request('POST', '/api/auth/login', {
                "email": self.test_user_email,
                "password": self.test_user_password
            })
            self.log_test("User Login", success, 
                         "" if success else f"Failed: {data}", "/api/auth/login")
        
        # Test /me endpoint
        if self.admin_token:
            success, data = self.make_request('GET', '/api/auth/me', token=self.admin_token)
            self.log_test("Get Current User (Admin)", success, 
                         f"Email: {data.get('email')}" if success else f"Failed: {data}", "/api/auth/me")

    def test_categories(self):
        """Test category endpoints"""
        print("\n🔍 Testing Categories...")
        
        # Test get categories
        success, data = self.make_request('GET', '/api/categories')
        self.log_test("Get Categories", success, 
                     f"Found {len(data) if isinstance(data, list) else 0} categories" if success else f"Failed: {data}", 
                     "/api/categories")
        
        # Test create category (admin only)
        if self.admin_token:
            category_data = {
                "name": "Test Category",
                "slug": f"test-category-{datetime.now().strftime('%H%M%S')}",
                "description": "Test category description",
                "is_active": True
            }
            
            success, data = self.make_request('POST', '/api/admin/categories', 
                                            category_data, self.admin_token)
            
            if success and 'category_id' in data:
                self.created_category_id = data['category_id']
                self.log_test("Create Category (Admin)", True, f"Category ID: {self.created_category_id}")
            else:
                self.log_test("Create Category (Admin)", False, f"Failed: {data}", "/api/admin/categories")

    def test_products(self):
        """Test product endpoints"""
        print("\n🔍 Testing Products...")
        
        # Test get products
        success, data = self.make_request('GET', '/api/products')
        self.log_test("Get Products", success, 
                     f"Found {data.get('total', 0)} products" if success else f"Failed: {data}", 
                     "/api/products")
        
        # Test get featured products
        success, data = self.make_request('GET', '/api/products/featured')
        self.log_test("Get Featured Products", success, 
                     f"Found {len(data) if isinstance(data, list) else 0} featured products" if success else f"Failed: {data}", 
                     "/api/products/featured")
        
        # Test create product (admin only)
        if self.admin_token:
            product_data = {
                "name": "Test Product",
                "slug": f"test-product-{datetime.now().strftime('%H%M%S')}",
                "short_description": "Test product description",
                "description": "Detailed test product description",
                "price": 99.99,
                "compare_at_price": 129.99,
                "stock": 10,
                "sku": f"TEST-{datetime.now().strftime('%H%M%S')}",
                "tags": ["test", "electronics"],
                "is_active": True,
                "is_featured": True,
                "images": [{
                    "url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
                    "alt": "Test product image",
                    "is_primary": True
                }]
            }
            
            if self.created_category_id:
                product_data["category_id"] = self.created_category_id
            
            success, data = self.make_request('POST', '/api/admin/products', 
                                            product_data, self.admin_token)
            
            if success and 'product_id' in data:
                self.created_product_id = data['product_id']
                self.log_test("Create Product (Admin)", True, f"Product ID: {self.created_product_id}")
                
                # Test get single product
                success, data = self.make_request('GET', f'/api/products/{self.created_product_id}')
                self.log_test("Get Single Product", success, 
                             f"Product: {data.get('name')}" if success else f"Failed: {data}", 
                             f"/api/products/{self.created_product_id}")
            else:
                self.log_test("Create Product (Admin)", False, f"Failed: {data}", "/api/admin/products")

    def test_cart_functionality(self):
        """Test cart endpoints"""
        print("\n🔍 Testing Cart Functionality...")
        
        # Test get empty cart
        success, data = self.make_request('GET', '/api/cart', token=self.user_token)
        self.log_test("Get Cart", success, 
                     f"Cart items: {len(data.get('items', []))}" if success else f"Failed: {data}", 
                     "/api/cart")
        
        # Test add to cart (if we have a product)
        if self.created_product_id and self.user_token:
            cart_item = {
                "product_id": self.created_product_id,
                "quantity": 2
            }
            
            success, data = self.make_request('POST', '/api/cart/add', 
                                            cart_item, self.user_token)
            self.log_test("Add to Cart", success, 
                         f"Cart subtotal: ${data.get('subtotal', 0)}" if success else f"Failed: {data}", 
                         "/api/cart/add")
            
            # Test update cart item
            if success:
                update_item = {
                    "product_id": self.created_product_id,
                    "quantity": 3
                }
                
                success, data = self.make_request('PUT', '/api/cart/update', 
                                                update_item, self.user_token)
                self.log_test("Update Cart Item", success, 
                             f"Updated quantity to 3" if success else f"Failed: {data}", 
                             "/api/cart/update")

    def test_order_functionality(self):
        """Test order endpoints"""
        print("\n🔍 Testing Order Functionality...")
        
        # Test create order (if we have items in cart)
        if self.user_token:
            order_data = {
                "shipping_address": {
                    "first_name": "Test",
                    "last_name": "User",
                    "email": self.test_user_email,
                    "phone": "+61400000000",
                    "address_line1": "123 Test Street",
                    "city": "Sydney",
                    "state": "NSW",
                    "postal_code": "2000",
                    "country": "Australia"
                },
                "payment_method": "stripe",
                "notes": "Test order"
            }
            
            success, data = self.make_request('POST', '/api/orders', 
                                            order_data, self.user_token)
            
            if success and 'order_id' in data:
                self.created_order_id = data['order_id']
                self.log_test("Create Order", True, f"Order ID: {self.created_order_id}")
                
                # Test get user orders
                success, data = self.make_request('GET', '/api/orders', token=self.user_token)
                self.log_test("Get User Orders", success, 
                             f"Found {data.get('total', 0)} orders" if success else f"Failed: {data}", 
                             "/api/orders")
            else:
                self.log_test("Create Order", False, f"Failed: {data}", "/api/orders")

    def test_admin_functionality(self):
        """Test admin-specific endpoints"""
        print("\n🔍 Testing Admin Functionality...")
        
        if not self.admin_token:
            self.log_test("Admin Dashboard Stats", False, "No admin token available")
            return
        
        # Test admin dashboard stats
        success, data = self.make_request('GET', '/api/admin/dashboard/stats', token=self.admin_token)
        self.log_test("Admin Dashboard Stats", success, 
                     f"Revenue: ${data.get('total_revenue', 0)}, Orders: {data.get('total_orders', 0)}" if success else f"Failed: {data}", 
                     "/api/admin/dashboard/stats")
        
        # Test get all orders (admin)
        success, data = self.make_request('GET', '/api/admin/orders', token=self.admin_token)
        self.log_test("Get All Orders (Admin)", success, 
                     f"Found {data.get('total', 0)} orders" if success else f"Failed: {data}", 
                     "/api/admin/orders")
        
        # Test get users (admin)
        success, data = self.make_request('GET', '/api/admin/users', token=self.admin_token)
        self.log_test("Get Users (Admin)", success, 
                     f"Found {data.get('total', 0)} users" if success else f"Failed: {data}", 
                     "/api/admin/users")
        
        # Test get admin settings
        success, data = self.make_request('GET', '/api/admin/settings', token=self.admin_token)
        self.log_test("Get Admin Settings", success, 
                     f"Website: {data.get('website_name', 'N/A')}" if success else f"Failed: {data}", 
                     "/api/admin/settings")

    def test_ai_features(self):
        """Test AI-powered features"""
        print("\n🔍 Testing AI Features...")
        
        # Test AI recommendations
        if self.created_product_id:
            ai_data = {"product_id": self.created_product_id}
            success, data = self.make_request('POST', '/api/ai/recommendations', ai_data)
            self.log_test("AI Product Recommendations", success, 
                         f"Found {len(data.get('recommendations', []))} recommendations" if success else f"Failed: {data}", 
                         "/api/ai/recommendations")
        
        # Test search suggestions
        success, data = self.make_request('GET', '/api/ai/search-suggestions?q=test')
        self.log_test("AI Search Suggestions", success, 
                     f"Found {len(data.get('suggestions', []))} suggestions" if success else f"Failed: {data}", 
                     "/api/ai/search-suggestions")

    def test_settings_endpoints(self):
        """Test organization settings endpoints"""
        print("\n🔍 Testing Settings...")
        
        # Test public settings
        success, data = self.make_request('GET', '/api/settings')
        self.log_test("Get Public Settings", success, 
                     f"Website: {data.get('website_name', 'N/A')}" if success else f"Failed: {data}", 
                     "/api/settings")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting E-Commerce API Testing Suite")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run test suites
        self.test_health_endpoints()
        self.test_authentication()
        self.test_categories()
        self.test_products()
        self.test_cart_functionality()
        self.test_order_functionality()
        self.test_admin_functionality()
        self.test_ai_features()
        self.test_settings_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            
            # Print failed tests
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  ❌ {result['test']}: {result['details']}")
            
            return 1

    def get_test_summary(self):
        """Get test summary for reporting"""
        failed_tests = [r for r in self.test_results if not r['success']]
        passed_tests = [r for r in self.test_results if r['success']]
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": len(failed_tests),
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "failed_test_details": failed_tests,
            "passed_test_names": [t['test'] for t in passed_tests]
        }

def main():
    """Main test runner"""
    tester = ECommerceAPITester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results for reporting
    summary = tester.get_test_summary()
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    return exit_code

if __name__ == "__main__":
    sys.exit(main())