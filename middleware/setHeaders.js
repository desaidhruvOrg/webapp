const setHeaders = (req,res,next) => {
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Content-Type-Options': 'nosniff'
    });
    next();
};

module.exports = setHeaders;