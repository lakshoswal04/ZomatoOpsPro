import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const { login, isAuthenticated, error, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (user.role === 'manager') {
        navigate('/manager');
      } else if (user.role === 'delivery_partner') {
        navigate('/delivery');
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Clear any existing token on component mount
  useEffect(() => {
    // This helps prevent the "Token is not valid" error
    localStorage.removeItem('token');
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Validate form
    if (!formData.email || !formData.password) {
      setFormError('Please enter both email and password');
      return;
    }

    try {
      // Attempt login
      const userData = await login(formData.email, formData.password);
      
      console.log('Login successful, received user data:', userData);
      
      // Validate user data
      if (!userData || typeof userData !== 'object') {
        throw new Error('Invalid user data received');
      }
      
      // Show success message
      setSuccess('Login successful! Redirecting...');
      
      // Redirect based on user role with fallback
      setTimeout(() => {
        // Default to delivery partner page if role is missing
        const role = userData?.role || 'delivery_partner';
        
        console.log('Redirecting based on role:', role);
        
        if (role === 'manager') {
          navigate('/manager');
        } else {
          navigate('/delivery');
        }
      }, 1000);
    } catch (err) {
      console.error('Login component error:', err);
      setFormError(error || err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:shadow-xl animate-fadeIn">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-600 dark:text-gray-300">Sign in to your Zomato Ops Pro account</p>
        </div>
        
        {formError && (
          <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg mb-4 animate-slideIn">
            {formError}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-3 rounded-lg mb-4 animate-slideIn">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </div>
              <input
                className="shadow-sm appearance-none border rounded-lg w-full py-3 px-3 pl-10 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 transition-all duration-200"
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                className="shadow-sm appearance-none border rounded-lg w-full py-3 px-3 pl-10 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 transition-all duration-200"
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div>
            <button
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg"
              type="submit"
            >
              Sign In
            </button>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium transition-colors duration-200">
                Sign Up
              </Link>
            </p>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Demo Credentials:</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Manager: manager@zomato.com / password123</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Delivery: delivery1@zomato.com / password123</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
