import React from 'react';

/**
 * Status badge component for displaying vehicle status
 * @param {string} status - Status type ('ok', 'warning', 'danger')
 * @param {string} label - Badge label
 * @param {React.Component} icon - Lucide icon component
 */
const StatusBadge = ({ status, label, icon: Icon }) => {
    if (status === 'danger') {
        return (
            <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full flex items-center gap-1">
                <Icon size={12} /> {label} VENCIDO
            </span>
        );
    }

    if (status === 'warning') {
        return (
            <span className="px-2 py-1 text-xs font-bold text-yellow-700 bg-yellow-100 rounded-full flex items-center gap-1">
                <Icon size={12} /> {label} PRONTO
            </span>
        );
    }

    return (
        <span className="px-2 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full flex items-center gap-1">
            <Icon size={12} /> {label} OK
        </span>
    );
};

export default StatusBadge;
