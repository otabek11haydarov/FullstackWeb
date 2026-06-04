const jwt = require('jsonwebtoken');
const { promisify } = require('util');
require('dotenv').config();
// We will need the User model later, but for now we just verify the token

exports.protect = async (req, res, next) => {
  try {
    // 1) Getting token and check of it's there
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // 2) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3) We'll attach the user data to the request object. 
    // In a full implementation, we'd fetch the user from the database here
    // to ensure they still exist. For now we use decoded data.
    req.user = decoded;
    
    console.log('Decoded Token:', req.user);
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token or token has expired. Please log in again.'
    });
  }
};
