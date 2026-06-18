module.exports = (req, res) => {
  res.json({ message: 'Simple test endpoint works!', timestamp: new Date().toISOString() });
};