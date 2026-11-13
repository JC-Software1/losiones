/**
 * Helper de paginación opt-in para las rutas de la API.
 *
 * Convención: si la petición NO trae ?page=, las rutas responden el array
 * plano de siempre (compatibilidad con las pantallas que aún no usan
 * paginación). Si trae ?page=, responden el sobre paginado:
 *
 *   { items, total, page, limit, hasMore, stats }
 */

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Normaliza los parámetros de paginación de la query string.
 * @returns {{ paginated: boolean, page: number, limit: number, skip: number }}
 */
function getPaginationParams(req) {
    const rawPage = req.query.page;
    if (rawPage === undefined || rawPage === null || rawPage === "") {
        return { paginated: false, page: 1, limit: DEFAULT_LIMIT, skip: 0 };
    }

    let page = parseInt(rawPage, 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
    if (limit > MAX_LIMIT) limit = MAX_LIMIT;

    return { paginated: true, page, limit, skip: (page - 1) * limit };
}

/**
 * Construye la respuesta paginada.
 * @param {Array} items - documentos de la página actual
 * @param {number} total - total de documentos que cumplen el filtro
 * @param {{page:number, limit:number}} pagination
 * @param {object} [stats] - estadísticas globales del filtro (opcional)
 */
function paginatedResponse(items, total, pagination, stats = undefined) {
    const { page, limit } = pagination;
    const response = {
        items,
        total,
        page,
        limit,
        hasMore: page * limit < total
    };
    if (stats !== undefined) response.stats = stats;
    return response;
}

/**
 * Escapa caracteres especiales de regex para búsquedas de texto libre.
 */
function escapeRegex(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Construye un filtro case-insensitive "contains" para varios campos.
 * Usa el formato { $regex, $options } que funciona tanto en find()
 * como en aggregate().
 * @param {string} search - texto de búsqueda (puede venir vacío)
 * @param {string[]} fields - campos del documento donde buscar
 * @returns {object} condición $or lista para $match (o {} si no hay búsqueda)
 */
function searchCondition(search, fields) {
    if (!search) return {};
    const rx = escapeRegex(search);
    return {
        $or: fields.map(field => ({ [field]: { $regex: rx, $options: "i" } }))
    };
}

/**
 * Convierte un rango de fechas {from, to} (ISO strings) a condición Mongo.
 * `to` es exclusivo. Devuelve {} si no hay ninguno.
 * @param {string} field - campo del documento
 * @param {string} [from]
 * @param {string} [to]
 */
function dateRangeCondition(field, from, to) {
    if (!from && !to) return {};
    const cond = {};
    if (from) cond.$gte = new Date(from);
    if (to) cond.$lt = new Date(to);
    return { [field]: cond };
}

module.exports = {
    DEFAULT_LIMIT,
    MAX_LIMIT,
    getPaginationParams,
    paginatedResponse,
    escapeRegex,
    searchCondition,
    dateRangeCondition
};
