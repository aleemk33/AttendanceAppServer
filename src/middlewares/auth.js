import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../common/errors.js';
export function authenticate(req, _res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        throw new UnauthorizedError('Missing or invalid Authorization header');
    }
    const token = header.slice(7);
    try {
        // Access token contains role + portal context used by downstream authorization guards.
        const payload = jwt.verify(token, env().JWT_ACCESS_SECRET);
        req.user = payload;
        next();
    }
    catch {
        throw new UnauthorizedError('Invalid or expired access token');
    }
}
/** Ensure the token was issued for the given portal */
export function requirePortal(portal) {
    return (req, _res, next) => {
        if (!req.user)
            throw new UnauthorizedError();
        // Prevent cross-portal token reuse (mobile token on web routes, etc.).
        if (req.user.portal !== portal) {
            throw new ForbiddenError(`This endpoint requires ${portal} portal access`);
        }
        next();
    };
}
/** Ensure the user has at least one of the specified roles */
export function requireRoles(...roles) {
    return (req, _res, next) => {
        if (!req.user)
            throw new UnauthorizedError();
        // "any-of" role check; route chooses strictness by what it passes in.
        const hasRole = req.user.roles.some((r) => roles.includes(r));
        if (!hasRole) {
            throw new ForbiddenError('Insufficient role');
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map