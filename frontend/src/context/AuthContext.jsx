import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from localStorage on initial load
  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      
      // Check if token exists in localStorage
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('No token found in localStorage');
        setLoading(false);
        return;
      }
      
      // Set default headers for all axios requests
      axios.defaults.headers.common['x-auth-token'] = token;
      
      try {
        // First try to load user data from localStorage for immediate UI rendering
        const cachedUserData = localStorage.getItem('userData');
        if (cachedUserData) {
          try {
            const parsedUserData = JSON.parse(cachedUserData);
            console.log('Loaded user data from localStorage:', parsedUserData);
            
            if (parsedUserData && typeof parsedUserData === 'object') {
              // Ensure the user object has all required fields
              const validUserData = {
                id: parsedUserData.id || '',
                name: parsedUserData.name || 'User',
                email: parsedUserData.email || '',
                role: parsedUserData.role || 'delivery_partner',
                isAvailable: parsedUserData.isAvailable !== undefined ? parsedUserData.isAvailable : true
              };
              
              setUser(validUserData);
              setIsAuthenticated(true);
            }
          } catch (parseError) {
            console.error('Error parsing user data from localStorage:', parseError);
          }
        }
        
        // Then try to get fresh user data from server
        console.log('Fetching fresh user data from server...');
        const res = await axios.get('/api/auth/user');
        
        if (res.data) {
          console.log('Received fresh user data from server:', res.data);
          
          // Update user data in state and localStorage
          setUser(res.data);
          setIsAuthenticated(true);
          localStorage.setItem('userData', JSON.stringify(res.data));
        }
      } catch (err) {
        console.error('Error loading user:', err);
        
        // If token is invalid, remove it from localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        delete axios.defaults.headers.common['x-auth-token'];
        
        setUser(null);
        setIsAuthenticated(false);
        setError(err.response?.data?.msg || 'Authentication error');
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Register user
  const register = async (name, email, password, role) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.post('/api/auth/register', { 
        name, 
        email, 
        password, 
        role 
      });
      
      // Save token to localStorage
      localStorage.setItem('token', res.data.token);
      
      // Set default headers for all axios requests
      axios.defaults.headers.common['x-auth-token'] = res.data.token;
      
      setUser(res.data.user);
      setIsAuthenticated(true);
      
      return res.data.user;
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Attempting login with:', { email, password });
      
      // Make sure we're sending the correct data format
      const loginData = { email, password };
      console.log('Login payload:', loginData);
      
      // Use the correct API endpoint with the /api prefix
      const res = await axios.post('/api/auth/login', loginData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Login response:', res.data);
      
      // Check if we have a valid response with token and user data
      if (!res.data || !res.data.token) {
        console.error('Invalid response format - missing token:', res.data);
        throw new Error('Invalid response format from server - missing token');
      }
      
      // Ensure we have a valid user object
      if (!res.data.user || typeof res.data.user !== 'object') {
        console.error('Invalid user data in response:', res.data);
        throw new Error('Invalid user data received from server');
      }
      
      // Save token to localStorage
      localStorage.setItem('token', res.data.token);
      
      // Set default headers for all axios requests
      axios.defaults.headers.common['x-auth-token'] = res.data.token;
      
      // Make sure we have a valid user object with required fields
      const userData = {
        id: res.data.user.id || '',
        name: res.data.user.name || 'User', // Provide a default name
        email: res.data.user.email || email, // Fallback to the email used for login
        role: res.data.user.role || 'delivery_partner', // Provide a default role
        isAvailable: res.data.user.isAvailable !== undefined ? res.data.user.isAvailable : true
      };
      
      console.log('Setting user data:', userData);
      
      // Save user data to localStorage for persistence across refreshes
      localStorage.setItem('userData', JSON.stringify(userData));
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return userData;
    } catch (err) {
      console.error('Login error:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.msg || err.message || 'Login failed');
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('userData');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    console.log('Logging out user');
    
    // Remove token and user data from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    
    // Remove default header
    delete axios.defaults.headers.common['x-auth-token'];
    
    // Clear user state
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    
    console.log('User logged out successfully');
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.put('/api/auth/password', { 
        currentPassword, 
        newPassword 
      });
      
      return res.data;
    } catch (err) {
      setError(err.response?.data?.msg || 'Password change failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update user data
  const updateUserData = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        error,
        register,
        login,
        logout,
        changePassword,
        updateUserData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
