import React from 'react';

const LoadingSpinner = ({ size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className="flex justify-center items-center">
      <div className={`${sizeClasses[size]} border-4 border-gray-200 dark:border-gray-700 border-t-red-600 dark:border-t-red-500 rounded-full animate-spin`}></div>
    </div>
  );
};

export default LoadingSpinner;
