module.exports = function methodNotAllowed(req, res) {
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('X-Content-Type-Options', 'nosniff');
  res.status(405).json({ message: 'Method Not Allowed' });
};