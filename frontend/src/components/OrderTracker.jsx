import React from 'react';

const OrderTracker = ({ currentStatus, isDeliveryPartner = false, onStatusUpdate = null, orderId = null }) => {
  // Map backend status to display status
  const mapStatusForDisplay = (backendStatus) => {
    const statusMap = {
      'PREPARING': 'PREP',
      'READY_FOR_PICKUP': 'READY',
      'ASSIGNED': 'ASSIGNED',
      'PICKED_UP': 'PICKED',
      'ON_ROUTE': 'ON_ROUTE',
      'DELIVERED': 'DELIVERED',
      'CANCELLED': 'CANCELLED'
    };
    return statusMap[backendStatus] || backendStatus;
  };
  
  // Define the order statuses and their sequence for display
  const displayStatuses = ['ASSIGNED', 'PICKED', 'ON_ROUTE', 'DELIVERED'];
  
  // Define the actual backend statuses that correspond to the display statuses
  // These are the exact values expected by the backend API
  const backendStatuses = {
    'ASSIGNED': 'PICKED_UP', // First action for delivery partner is to mark as PICKED_UP
    'PICKED': 'ON_ROUTE',
    'ON_ROUTE': 'DELIVERED',
    'DELIVERED': 'DELIVERED'
  };
  
  // Find the index of the current status in our display sequence
  const displayStatus = mapStatusForDisplay(currentStatus);
  const currentIndex = displayStatuses.indexOf(displayStatus);
  
  // Get next valid status for an order
  const getNextStatus = (displayStatus) => {
    const statusIndex = displayStatuses.indexOf(displayStatus);
    return statusIndex < displayStatuses.length - 1 ? backendStatuses[displayStatuses[statusIndex + 1]] : null;
  };
  
  // Handle status click
  const handleStatusClick = (status, index) => {
    // Only allow clicking the next status in sequence for delivery partners
    if (isDeliveryPartner && onStatusUpdate && orderId) {
      // Can only update to the next status in sequence
      if (index === currentIndex + 1) {
        // Convert display status to backend status
        const nextBackendStatus = backendStatuses[status];
        console.log(`Updating order ${orderId} status from ${currentStatus} to: ${nextBackendStatus}`);
        
        // Validate the status transition based on backend rules
        const validTransitions = {
          'ASSIGNED': ['PICKED_UP'],
          'PICKED_UP': ['ON_ROUTE'],
          'ON_ROUTE': ['DELIVERED']
        };
        
        // Check if this is a valid transition according to backend rules
        if (validTransitions[currentStatus]?.includes(nextBackendStatus)) {
          onStatusUpdate(orderId, nextBackendStatus);
        } else {
          console.error(`Invalid status transition from ${currentStatus} to ${nextBackendStatus}`);
          alert(`Cannot update status from ${currentStatus} to ${nextBackendStatus}`);
        }
      } else if (index <= currentIndex) {
        alert('Cannot revert to a previous status');
      } else {
        alert('Please follow the status sequence');
      }
    }
  };
  
  return (
    <div className="w-full">
      <div className="flex justify-between mb-2">
        {displayStatuses.map((status, index) => (
          <div key={status} className="text-xs font-medium text-center">
            {status}
          </div>
        ))}
      </div>
      
      <div className="relative">
        {/* Track line */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2"></div>
        
        {/* Colored progress line */}
        <div 
          className="absolute top-1/2 left-0 h-1 bg-red-500 -translate-y-1/2"
          style={{ 
            width: `${currentIndex >= 0 ? (currentIndex / (displayStatuses.length - 1)) * 100 : 0}%`
          }}
        ></div>
        
        {/* Status circles */}
        <div className="relative flex justify-between">
          {displayStatuses.map((status, index) => {
            const isClickable = isDeliveryPartner && index === currentIndex + 1;
            
            return (
              <div 
                key={status}
                onClick={() => handleStatusClick(status, index)}
                className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${
                  index <= currentIndex 
                    ? 'bg-red-500 text-white' 
                    : isClickable
                      ? 'bg-red-300 text-white cursor-pointer hover:bg-red-400'
                      : 'bg-gray-200 text-gray-500'
                }`}
                title={isClickable ? `Update to ${status}` : ''}
              >
                <span className="text-xs">{index + 1}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderTracker;
