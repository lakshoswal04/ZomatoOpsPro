import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ManagerDashboard from './pages/ManagerDashboard.jsx';
import DeliveryPartnerDashboard from './pages/DeliveryPartnerDashboard.jsx';
import CreateOrder from './pages/CreateOrder.jsx';
import OrdersManagement from './pages/OrdersManagement.jsx';
import PartnerAnalytics from './pages/PartnerAnalytics.jsx';
import PartnersPage from './pages/PartnersPage.jsx';
import NotFound from './pages/NotFound.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';

// Protected route component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'manager') {
      return <Navigate to="/manager" />;
    } else if (user.role === 'delivery_partner') {
      return <Navigate to="/delivery" />;
    } else {
      return <Navigate to="/login" />;
    }
  }
  
  return children;
};

function App() {
  const { isAuthenticated, user } = useAuth();
  
  // Helper function to redirect based on role
  const redirectBasedOnRole = () => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }
    
    if (user.role === 'manager') {
      return <Navigate to="/manager" />;
    } else if (user.role === 'delivery_partner') {
      return <Navigate to="/delivery" />;
    } else {
      return <Navigate to="/login" />;
    }
  };
  
  return (
    <ThemeProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
            <Navbar />
            <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Manager Routes */}
          <Route path="/manager" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <ManagerDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/manager/create-order" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <CreateOrder />
            </ProtectedRoute>
          } />
          
          <Route path="/manager/orders" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <OrdersManagement />
            </ProtectedRoute>
          } />
          
          <Route path="/manager/analytics" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <PartnerAnalytics />
            </ProtectedRoute>
          } />
          
          <Route path="/manager/partners" element={
            <ProtectedRoute allowedRoles={['manager']}>
              <PartnersPage />
            </ProtectedRoute>
          } />
          
          {/* Delivery Partner Routes */}
          <Route path="/delivery" element={
            <ProtectedRoute allowedRoles={['delivery_partner']}>
              <DeliveryPartnerDashboard />
            </ProtectedRoute>
          } />
          
          {/* Redirect to appropriate dashboard based on role */}
          <Route path="/" element={redirectBasedOnRole()} />
          
          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
      </Router>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
