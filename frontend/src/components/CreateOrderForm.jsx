import React, { useState, useEffect } from 'react';
import { createOrder } from '../utils/api.js';
import LoadingSpinner from './LoadingSpinner.jsx';

const CreateOrderForm = ({ onOrderCreated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newOrder, setNewOrder] = useState({
    items: [{ name: '', quantity: 1, price: 0 }],
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    totalAmount: 0,
    prepTime: 15
  });
  
  // Calculate total amount whenever items change
  useEffect(() => {
    const total = newOrder.items.reduce((sum, item) => {
      return sum + (item.quantity * item.price);
    }, 0);
    
    setNewOrder(prev => ({
      ...prev,
      totalAmount: total
    }));
  }, [newOrder.items]);

  // Handle new order form changes
  const handleOrderChange = (e) => {
    setNewOrder({
      ...newOrder,
      [e.target.name]: e.target.value
    });
  };

  // Handle item changes in new order form
  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const updatedItems = [...newOrder.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [name]: name === 'quantity' || name === 'price' ? Number(value) : value
    };
    
    setNewOrder({
      ...newOrder,
      items: updatedItems
    });
  };

  // Add new item to order
  const addItem = () => {
    setNewOrder({
      ...newOrder,
      items: [...newOrder.items, { name: '', quantity: 1, price: 0 }]
    });
  };

  // Remove item from order
  const removeItem = (index) => {
    if (newOrder.items.length === 1) return;
    
    const updatedItems = newOrder.items.filter((_, i) => i !== index);
    setNewOrder({
      ...newOrder,
      items: updatedItems
    });
  };

  // Submit new order
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (newOrder.items.some(item => !item.name || item.quantity < 1 || item.price < 0)) {
      setError('Please fill out all item fields correctly');
      return;
    }
    
    if (!newOrder.prepTime || newOrder.prepTime < 1) {
      setError('Preparation time must be a positive number');
      return;
    }
    
    // Validate customer information
    if (!newOrder.customerName) {
      setError('Customer name is required');
      return;
    }
    
    if (!newOrder.customerAddress) {
      setError('Customer address is required');
      return;
    }
    
    // Validate phone number format (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!newOrder.customerPhone || !phoneRegex.test(newOrder.customerPhone)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    
    try {
      setLoading(true);
      
      // Log the order data being sent for debugging
      console.log('Submitting order data:', newOrder);
      
      const res = await createOrder(newOrder);
      
      // Log the response for debugging
      console.log('Order created successfully:', res.data);
      
      // Call the callback with the new order
      onOrderCreated(res.data);
      
      // Reset form
      setNewOrder({
        items: [{ name: '', quantity: 1, price: 0 }],
        customerName: '',
        customerAddress: '',
        customerPhone: '',
        totalAmount: 0,
        prepTime: 15
      });
      
      setError('');
    } catch (err) {
      setError(`Failed to create order: ${err.response?.data?.msg || err.message || 'Unknown error'}`);
      console.error('Order creation error:', err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/30 p-6 mb-8">
      <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">Create New Order</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmitOrder}>
        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2">
            Order Items
          </label>
          
          {newOrder.items.map((item, index) => (
            <div key={index} className="flex flex-wrap mb-2 items-end">
              <div className="w-full md:w-1/2 px-2 mb-2 md:mb-0">
                <label className="block text-gray-700 dark:text-gray-300 text-xs font-bold mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => handleItemChange(index, e)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline dark:focus:shadow-outline-gray"
                  required
                />
              </div>
              
              <div className="w-1/4 md:w-1/6 px-2 mb-2 md:mb-0">
                <label className="block text-gray-700 dark:text-gray-300 text-xs font-bold mb-1">
                  Qty
                </label>
                <input
                  type="number"
                  name="quantity"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, e)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline dark:focus:shadow-outline-gray"
                  min="1"
                  required
                />
              </div>
              
              <div className="w-1/3 md:w-1/6 px-2 mb-2 md:mb-0">
                <label className="block text-gray-700 dark:text-gray-300 text-xs font-bold mb-1">
                  Price
                </label>
                <input
                  type="number"
                  name="price"
                  placeholder="Price"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, e)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 dark:bg-gray-700 dark:border-gray-600 leading-tight focus:outline-none focus:shadow-outline dark:focus:shadow-outline-gray"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              
              <div className="w-1/3 md:w-1/6 px-2">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="bg-red-100 dark:bg-red-800 dark:bg-opacity-30 text-red-600 dark:text-red-400 px-3 py-2 rounded hover:bg-red-200 dark:hover:bg-red-800 dark:hover:bg-opacity-50"
                  disabled={newOrder.items.length === 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addItem}
            className="mt-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            + Add Item
          </button>
        </div>
        
        {/* Customer Information Section */}
        <div className="mb-6 border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3 dark:text-gray-200">Customer Information</h3>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Customer Name
            </label>
            <input
              type="text"
              name="customerName"
              value={newOrder.customerName}
              onChange={handleOrderChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Customer Address
            </label>
            <textarea
              name="customerAddress"
              value={newOrder.customerAddress}
              onChange={handleOrderChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              rows="2"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Phone Number (10 digits)
            </label>
            <input
              type="tel"
              name="customerPhone"
              value={newOrder.customerPhone}
              onChange={handleOrderChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              pattern="[0-9]{10}"
              placeholder="10-digit number"
              required
            />
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Preparation Time (minutes)
          </label>
          <input
            type="number"
            name="prepTime"
            value={newOrder.prepTime}
            onChange={handleOrderChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            min="1"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Order Total
          </label>
          <div className="flex items-center">
            <span className="text-lg font-bold mr-2">₹</span>
            <input
              type="number"
              name="totalAmount"
              value={newOrder.totalAmount}
              onChange={handleOrderChange}
              className="shadow appearance-none border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline w-40 text-lg font-bold"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Auto-calculated: ₹{newOrder.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="small" /> : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateOrderForm;
