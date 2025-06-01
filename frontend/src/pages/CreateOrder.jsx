import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import CreateOrderForm from '../components/CreateOrderForm.jsx';
import Notification from '../components/Notification.jsx';

const CreateOrder = () => {
  const [showNotification, setShowNotification] = useState(false);
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Create New Order</h1>
        
        <Link to="/manager" className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100 px-4 py-2 rounded-lg transition duration-200 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/30 p-6">
        <CreateOrderForm onOrderCreated={() => {
          // Show custom notification instead of basic alert
          setShowNotification(true);
        }} />
        
        {showNotification && (
          <Notification 
            message="Order created successfully!" 
            type="success" 
            duration={4000}
            onClose={() => setShowNotification(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CreateOrder;