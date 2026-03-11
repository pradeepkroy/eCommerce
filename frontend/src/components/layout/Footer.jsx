import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../App';

export default function Footer() {
  const [settings, setSettings] = useState({ website_name: 'ShopStore' });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsData, categoriesData] = await Promise.all([
        api.get('/api/settings'),
        api.get('/api/categories')
      ]);
      setSettings(settingsData);
      setCategories(categoriesData.slice(0, 6));
    } catch (error) {
      console.error('Failed to fetch footer data');
    }
  };

  return (
    <>
      {/* Newsletter Section */}
      <div className="bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex-1">
              <h4 className="text-lg font-bold text-gray-800 mb-1">LET'S STAY IN TOUCH</h4>
              <p className="text-gray-600">Get updates on sales specials and more</p>
            </div>
            <form className="flex-1 max-w-md w-full">
              <div className="flex">
                <input
                  type="email"
                  placeholder="Enter Email Address"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  data-testid="newsletter-email"
                />
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-gray-800 text-white rounded-r-lg hover:bg-gray-700 transition"
                  data-testid="newsletter-submit"
                >
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </form>
            <div className="flex-1 flex justify-end">
              <div>
                <h4 className="text-lg font-bold text-gray-800 mb-1">FOLLOW US</h4>
                <p className="text-gray-600 mb-2">We want to hear from you!</p>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-teal-600 transition">
                    <i className="fab fa-facebook-f"></i>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-teal-600 transition">
                    <i className="fab fa-twitter"></i>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-teal-600 transition">
                    <i className="fab fa-instagram"></i>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-teal-600 transition">
                    <i className="fab fa-dribbble"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <footer className="footer">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* About */}
            <div>
              <h4 className="text-white">ABOUT US</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                {settings.website_name} is your one-stop destination for quality products at amazing prices. 
                We offer a wide range of electronics, fashion, home goods and more with fast delivery and excellent customer service.
              </p>
              <p className="text-gray-400 text-sm mt-4">
                Shop with confidence knowing that your satisfaction is our priority.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-white">RELATED LINKS</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/about" className="flex items-center gap-2 text-sm">
                    <i className="fas fa-angle-right text-teal-500"></i> About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="flex items-center gap-2 text-sm">
                    <i className="fas fa-angle-right text-teal-500"></i> Contact Us
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="flex items-center gap-2 text-sm">
                    <i className="fas fa-angle-right text-teal-500"></i> FAQ
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="flex items-center gap-2 text-sm">
                    <i className="fas fa-angle-right text-teal-500"></i> Terms of Use
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="flex items-center gap-2 text-sm">
                    <i className="fas fa-angle-right text-teal-500"></i> Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/shipping" className="flex items-center gap-2 text-sm">
                    <i className="fas fa-angle-right text-teal-500"></i> Shipping Info
                  </Link>
                </li>
                <li>
                  <Link to="/returns" className="flex items-center gap-2 text-sm">
                    <i className="fas fa-angle-right text-teal-500"></i> Returns & Refunds
                  </Link>
                </li>
              </ul>
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-white">CATEGORIES</h4>
              <ul className="space-y-2">
                {categories.map(cat => (
                  <li key={cat.category_id}>
                    <Link to={`/products/${cat.slug}`} className="flex items-center gap-2 text-sm">
                      <i className="fas fa-angle-right text-teal-500"></i> {cat.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/products" className="flex items-center gap-2 text-sm">
                    <i className="fas fa-angle-right text-teal-500"></i> All Categories
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-white">OUR CONTACT</h4>
              <address className="text-gray-400 text-sm not-italic space-y-2">
                <p className="font-semibold text-white">{settings.website_name}</p>
                <p>1355 Market Street, Suite 900</p>
                <p>San Francisco, CA 94103</p>
                <p className="mt-4">
                  <span className="text-gray-500">Phone:</span> (123) 456-7890
                </p>
                <p>
                  <span className="text-gray-500">Email:</span>{' '}
                  <a href={`mailto:${settings.email_from_address || 'contact@store.com'}`} className="text-teal-400 hover:text-teal-300">
                    {settings.email_from_address || 'contact@store.com'}
                  </a>
                </p>
              </address>
            </div>
          </div>
        </div>
      </footer>

      {/* Copyright */}
      <div className="footer-copyright">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-2">
            <img src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/logos/visa.jpg" alt="Visa" className="h-6" />
            <img src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/logos/mastercard.jpg" alt="Mastercard" className="h-6" />
            <img src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/logos/paypal.jpg" alt="PayPal" className="h-6" />
            <img src="https://cdn.jsdelivr.net/gh/creativetimofficial/public-assets@master/logos/amex.jpg" alt="Amex" className="h-6" />
          </div>
          <p>Copyright &copy; {new Date().getFullYear()} {settings.website_name}. All rights reserved.</p>
        </div>
      </div>
    </>
  );
}
