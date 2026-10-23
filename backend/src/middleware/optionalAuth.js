const User = require('../models/User')
const { verifyAccessToken } = require('../security/tokenService')

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if (token) {
      const decoded = verifyAccessToken(token)
      if (decoded) {
        req.user = await User.findById(decoded.id).select('-password')
      }
    }
  } catch (err) {
  }
  next()
}
