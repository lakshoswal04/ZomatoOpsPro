import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const OrderForm = ({ onOrderCreated }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    items: [{ name: '', quantity: 1, price: 0 }],
    totalAmount: 0,
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    prepTime: 15
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total amount
    const totalAmount = updatedItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    setFormData({
      ...formData,
      items: updatedItems,
      totalAmount
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { name: '', quantity: 1, price: 0 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) {
      setError('Order must have at least one item');
      return;
    }
    
    const updatedItems = formData.items.filter((_, i) => i !== index);
    
    // Recalculate total amount
    const totalAmount = updatedItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    setFormData({
      ...formData,
      items: updatedItems,
      totalAmount
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      // Validate form
      if (!formData.customerName || !formData.customerAddress || !formData.customerPhone) {
        setError('Please fill in all customer details');
        setLoading(false);
        return;
      }
      
      if (formData.prepTime < 1) {
        setError('Preparation time must be at least 1 minute');
        setLoading(false);
        return;
      }
      
      // Validate items
      for (const item of formData.items) {
        if (!item.name || item.quantity < 1 || item.price <= 0) {
          setError('Please fill in all item details correctly');
          setLoading(false);
          return;
        }
      }
      
      // Validate phone number format
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(formData.customerPhone)) {
        setError('Phone number must be 10 digits');
        setLoading(false);
        return;
      }
      
      // Prepare data for API
      const orderData = {
        ...formData,
        // Ensure numeric values are properly formatted
        prepTime: parseInt(formData.prepTime),
        totalAmount: parseFloat(formData.totalAmount),
        items: formData.items.map(item => ({
          name: item.name,
          quantity: parseInt(item.quantity),
          price: parseFloat(item.price)
        }))
      };
      
      console.log('Sending order data:', orderData);
      
      // Make API request to create order
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': localStorage.getItem('token')
        },
        body: JSON.stringify(orderData)
      });
      
      const data = await response.json();
      console.log('Response from server:', data);
      
      if (!response.ok) {
        throw new Error(data.msg || 'Failed to create order');
      }
      
      setSuccess('Order created successfully!');
      
      // Reset form
      setFormData({
        items: [{ name: '', quantity: 1, price: 0 }],
        totalAmount: 0,
        customerName: '',
        customerAddress: '',
        customerPhone: '',
        prepTime: 15
      });
      
      // Notify parent component
      if (onOrderCreated) {
        onOrderCreated(data.order);
      }
    } catch (err) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Create New Order</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Customer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                pattern="[0-9]{10}"
                title="Phone number must be 10 digits"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-gray-700 mb-1">Address</label>
            <textarea
              name="customerAddress"
              value={formData.customerAddress}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              rows="2"
            ></textarea>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">Order Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Add Item
            </button>
          </div>
          
          {formData.items.map((item, index) => (
            <div key={index} className="flex items-center space-x-2 mb-3 p-3 border rounded-md bg-gray-50">
              <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 mb-1 text-sm">Item Name</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 text-sm">Quantity</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 text-sm">Price (₹)</label>
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <div className="flex items-end pb-1">
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          
          <div className="mt-3 text-right">
            <p className="text-lg font-semibold">
              Total: ₹{formData.totalAmount.toFixed(2)}
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Preparation Details</h3>
          <div>
            <label className="block text-gray-700 mb-1">Preparation Time (minutes)</label>
            <input
              type="number"
              name="prepTime"
              value={formData.prepTime}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
              required
            />
          </div>
        </div>
        
        <div className="text-right">
          <button
            type="submit"
            className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
