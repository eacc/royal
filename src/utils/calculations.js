import { KM_LIMIT, DAYS_LIMIT, AFOCAT_WARNING_DAYS, REVIEW_WARNING_DAYS, STATUS } from './constants';

/**
 * Calculate vehicle status based on maintenance and document dates
 * @param {number} currentKm - Current kilometrage
 * @param {number} lastServiceKm - Last service kilometrage
 * @param {string} lastServiceDateStr - Last service date ISO string
 * @param {string} afocatDateStr - AFOCAT expiration date
 * @param {string} reviewDateStr - Technical review expiration date
 * @returns {Object} Status object with all calculated values
 */
export const calculateStatus = (currentKm, lastServiceKm, lastServiceDateStr, afocatDateStr, reviewDateStr) => {
    // Maintenance (Oil/Filters)
    const kmDiff = currentKm - lastServiceKm;
    const kmProgress = Math.min((kmDiff / KM_LIMIT) * 100, 100);

    const lastDate = new Date(lastServiceDateStr);
    const today = new Date();
    const timeDiff = Math.abs(today - lastDate);
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const timeProgress = Math.min((daysDiff / DAYS_LIMIT) * 100, 100);

    let maintStatus = STATUS.OK;
    if (kmDiff >= KM_LIMIT || daysDiff >= DAYS_LIMIT) {
        maintStatus = STATUS.DANGER;
    } else if (kmDiff >= KM_LIMIT * 0.9 || daysDiff >= DAYS_LIMIT * 0.9) {
        maintStatus = STATUS.WARNING;
    }

    // Documents
    const getDocStatus = (dateStr, warningDays) => {
        if (!dateStr) return { status: STATUS.DANGER, days: -1 };
        const expDate = new Date(dateStr);
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status = STATUS.OK;
        if (diffDays <= 0) status = STATUS.DANGER;
        else if (diffDays <= warningDays) status = STATUS.WARNING;

        return { status, days: diffDays };
    };

    const afocat = getDocStatus(afocatDateStr, AFOCAT_WARNING_DAYS);
    const review = getDocStatus(reviewDateStr, REVIEW_WARNING_DAYS);

    // General status (worst of all)
    let generalStatus = STATUS.OK;
    if (maintStatus === STATUS.DANGER || afocat.status === STATUS.DANGER || review.status === STATUS.DANGER) {
        generalStatus = STATUS.DANGER;
    } else if (maintStatus === STATUS.WARNING || afocat.status === STATUS.WARNING || review.status === STATUS.WARNING) {
        generalStatus = STATUS.WARNING;
    }

    return { kmDiff, kmProgress, daysDiff, timeProgress, maintStatus, afocat, review, generalStatus };
};
