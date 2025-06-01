const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zomatosecret');
    
    // Add user from payload
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

// Role-based authorization middleware
const authorize = (roles = []) => {
  // roles param can be a single role string (e.g., 'manager') 
  // or an array of roles (e.g., ['manager', 'delivery_partner'])
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ msg: 'Forbidden - insufficient role permissions' });
    }

    // Authentication and authorization successful
    next();
  };
};

module.exports = { auth, authorize };
