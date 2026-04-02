/**
 * Audit Logger Middleware
 * Logs structured audit records for sensitive operations
 */
const auditLog = (action) => (req, res, next) => {
    const record = {
        timestamp: new Date().toISOString(),
        userId: req.user?._id,
        userName: req.user?.name,
        role: req.user?.role,
        action,
        resource: req.originalUrl,
        method: req.method,
        ip: req.ip || req.connection?.remoteAddress
    };
    console.log('[AUDIT]', JSON.stringify(record));
    next();
};

module.exports = { auditLog };
