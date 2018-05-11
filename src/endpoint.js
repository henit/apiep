const exportHAL = (apiUrl, name, data) => {
    if (Array.isArray(data)) {
        return {
            _links: {
                self: { href: `${apiUrl}${apiUrl.slice(-1) !== '/' ? '/' : ''}${name || 'data'}/` }
            },
            count: data.length,
            _embedded: {
                [name || 'data']: data
            }
        };
    } else {
        return {
            ...data,
            _links: {
                self: { href: `${apiUrl}${name}/${data.id}` }
            }
        };
    }
};

const error404 = (message = 'Resource not found') => {
    let err = new Error(message);
    err.status = 404;
    return err;
};

/**
 * Endpoint wrapper middleware, simplifying input/output handling
 * @param {string} apiUrl Api base url
 * @param {function} fn Endpoint function
 * @return {function} Express middleware
 */
const endpoint = (apiUrl, fn) => (req, res, next) => {
    const respond = (statusCode = 200, data = '') => {
        if (typeof data === 'string') {
            res.status(statusCode).send(data);
            next();
            return;
        }
        if (!data) {
            return error404();
        }

        res.status(statusCode).json(data);
    };

    respond.error404 = () => {
        next(error404());
    };

    respond.HAL = (type, data, statusCode = 200) => {
        if (!data) {
            next(error404());
            return;
        }

        res.status(statusCode).json(exportHAL(apiUrl, type, data));
    };

    respond.redirect = url => res.redirect(url);

    Promise
        .resolve(fn({
            user: req.user,
            url: req.url,
            query: req.query || {},
            body: req.body || {},
            params: req.params || {},
            respond,
            logout: () => req.logout()
        }))
        .catch(next);
};

export default endpoint;

// Middlewares

export function requireUser(req, res, next) {
    if (!req.user || !req.user.id) {
        let err = new Error('Authentication required.');
        err.status = 401;
        next(err);
        return;
    }
    next();
}
