module.exports = (req, res) => {
    res.status(405).json({ message: 'Method Not Allowed' });
};