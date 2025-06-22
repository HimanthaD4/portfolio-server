const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const requireAuth = (req, res, next) => {
  console.log('Checking authentication...');
  const token = req.cookies.jwt;

  if (!token) {
    console.warn('No token provided');
    return res.status(401).json({ message: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedToken) => {
    if (err) {
      console.warn('Invalid token:', err.message);
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.log('Authenticated user ID:', decodedToken.id);
    req.userId = decodedToken.id;
    next();
  });
};

module.exports = { requireAuth };