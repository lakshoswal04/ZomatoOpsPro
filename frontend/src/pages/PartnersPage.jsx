import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAvailableDeliveryPartners, getAllDeliveryPartners } from '../utils/api.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

// Helper function to determine status color based on partner status
const getStatusColor = (partner) => {
  // Check for explicit status values first
  if (partner.status === 'BUSY') {
    return 'bg-orange-500';
  } else if (partner.status === 'OFFLINE') {
    return 'bg-gray-400';
  } 
  
  // Check the isAvailable property directly from the partner object
  // This matches how availability is tracked in DeliveryPartnerDashboard
  if (partner.isAvailable === false) {
    return 'bg-red-500'; // Unavailable
  } else if (partner.isAvailable === true) {
    return 'bg-green-500'; // Available
  }
  
  // Default to gray if we can't determine status
  return 'bg-gray-400';
};

// Helper function to get status text
const getStatusText = (partner) => {
  // Check for explicit status values first
  if (partner.status === 'BUSY') {
    return 'Busy';
  } else if (partner.status === 'OFFLINE') {
    return 'Offline';
  }
  
  // Check the isAvailable property directly from the partner object
  // This matches how availability is tracked in DeliveryPartnerDashboard
  if (partner.isAvailable === false) {
    return 'Unavailable';
  } else if (partner.isAvailable === true) {
    return 'Available';
  }
  
  // Default to Unknown if we can't determine status
  return 'Unknown';
};

// Helper function to format last active timestamp
const formatLastActive = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  try {
    const date = new Date(timestamp);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Recently';
    }
    return date.toLocaleString();
  } catch (error) {
    return 'Recently';
  }
};

const PartnersPage = () => {
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  // Function to fetch delivery partners
  const fetchPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      // Always fetch all partners to have complete data
      const response = await getAllDeliveryPartners();
      
      // Debug log to understand the data structure
      console.log('Delivery partners data:', response.data);
      
      // Process the data to use the same availability logic as DeliveryPartnerDashboard
      const processedPartners = response.data.map(partner => {
        // Use the isAvailable property directly from the partner object
        // This matches how availability is tracked in DeliveryPartnerDashboard
        return partner;
      });
      
      // Filter partners based on showAll flag
      const filteredPartners = showAll ? 
        processedPartners : 
        processedPartners.filter(partner => partner.isAvailable === true);
      
      setDeliveryPartners(filteredPartners);
    } catch (err) {
      console.error('Error fetching delivery partners:', err);
      setError('Failed to load delivery partners. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load delivery partners on component mount and when showAll changes
  useEffect(() => {
    fetchPartners();
  }, [showAll]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Delivery Partners</h1>
          {!loading && (
            <span className="ml-3 bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-primary-900 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              {deliveryPartners.length} {showAll ? 'Total' : 'Available'}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <Link to="/manager" className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white px-4 py-2 rounded-lg transition duration-200 flex items-center font-medium shadow-sm dark:shadow-gray-900/20 border border-transparent dark:border-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Dashboard
          </Link>
          
          <button 
            onClick={() => setShowAll(!showAll)} 
            className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center font-medium shadow-sm dark:shadow-primary-900/30 border border-transparent dark:border-primary-600"
          >
            {showAll ? 'Show Available Only' : 'Show All Partners'}
          </button>
          
          <button 
            onClick={fetchPartners} 
            className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center font-medium shadow-sm dark:shadow-blue-900/30 border border-transparent dark:border-blue-500"
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center h-64 dark:bg-gray-900 rounded-xl">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md dark:shadow-gray-900/30 overflow-hidden border border-gray-100 dark:border-gray-700 p-6 transition-all duration-300 hover:shadow-lg dark:hover:shadow-gray-900/50">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            {showAll ? 'All Delivery Partners' : 'Available Delivery Partners'}
          </h2>
          
          {deliveryPartners.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliveryPartners.map((partner) => (
                <div key={partner._id || partner.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm hover:shadow-md dark:shadow-gray-900/30 dark:hover:shadow-gray-900/50">
                  <div className="flex items-center mb-3">
                    <div className="h-12 w-12 rounded-full bg-secondary-100 dark:bg-secondary-900 text-secondary-600 dark:text-secondary-400 flex items-center justify-center mr-4 shadow-inner">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{partner.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                        <span className={`h-2 w-2 rounded-full mr-1 ${getStatusColor(partner)}`}></span>
                        {getStatusText(partner)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pl-16 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-2">
                    {partner.currentOrder && (
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-primary-500 dark:text-primary-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                        </svg>
                        Current Order: <span className="font-medium text-primary-600 dark:text-primary-400 ml-1">#{partner.currentOrder.orderNumber || 'N/A'}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-blue-500 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      {partner.email}
                    </div>
                    
                    {partner.phone && (
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-green-500 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                        </svg>
                        {partner.phone}
                      </div>
                    )}
                    
                    {partner.lastActive && (
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 text-yellow-500 dark:text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Last active: {formatLastActive(partner.lastActive)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 mb-2">{showAll ? 'No delivery partners found' : 'No available delivery partners at the moment'}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">{showAll ? 'Try refreshing the page or check back later' : 'Try showing all partners instead'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PartnersPage;
