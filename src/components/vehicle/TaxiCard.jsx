import React from 'react';
import {
    Car,
    Settings,
    Calendar,
    Gauge,
    Droplet,
    Trash2,
    History,
    CheckCircle,
    AlertTriangle
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { calculateStatus } from '../../utils/calculations';
import { KM_LIMIT, DAYS_LIMIT } from '../../utils/constants';

/**
 * Vehicle card component displaying all vehicle information
 * @param {Object} taxi - Vehicle data
 * @param {function} onMaintenance - Maintenance button handler
 * @param {function} onDelete - Delete button handler
 * @param {function} onViewHistory - History button handler
 * @param {function} onUpdateDocs - Update documents button handler
 */
const TaxiCard = ({ taxi, onMaintenance, onDelete, onViewHistory, onUpdateDocs }) => {
    const { kmDiff, kmProgress, daysDiff, timeProgress, maintStatus, afocat, review, generalStatus } = calculateStatus(
        taxi.currentKm,
        taxi.lastServiceKm,
        taxi.lastServiceDate,
        taxi.afocatDate,
        taxi.reviewDate
    );

    return (
        <div className={`bg-white rounded-xl shadow-sm border-l-4 p-5 hover:shadow-md transition-shadow relative ${generalStatus === 'danger' ? 'border-red-500' :
                generalStatus === 'warning' ? 'border-yellow-400' :
                    'border-green-500'
            }`}>
            <button
                onClick={() => onViewHistory(taxi)}
                className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors"
                title="Ver Historial"
            >
                <History size={20} />
            </button>

            <div className="flex justify-between items-start mb-4 pr-10">
                <div>
                    <div className="flex items-center gap-2">
                        <Car className="text-slate-600" size={20} />
                        <h3 className="text-xl font-bold text-slate-800">{taxi.plate}</h3>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 font-medium">{taxi.model || 'Modelo no especificado'}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                <StatusBadge status={maintStatus} label="MANT." icon={Settings} />
                <StatusBadge status={afocat.status} label="AFOCAT" icon={AlertTriangle} />
                <StatusBadge status={review.status} label="REV." icon={CheckCircle} />
            </div>

            <div className="text-right mb-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Kilometraje Actual</p>
                <p className="text-2xl font-mono font-bold text-slate-700">
                    {taxi.currentKm.toLocaleString()} <span className="text-sm text-slate-400 font-sans">km</span>
                </p>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mt-2">Próximo Cambio</p>
                <p className="text-2xl font-mono font-bold text-slate-700">
                    {(taxi.lastServiceKm + KM_LIMIT).toLocaleString()} <span className="text-sm text-slate-400 font-sans">km</span>
                </p>
            </div>

            <div className="space-y-4 mb-6">
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 flex items-center gap-1">
                            <Calendar size={12} /> Tiempo ({daysDiff} / {DAYS_LIMIT} días)
                        </span>
                        <span className={`font-bold ${timeProgress >= 100 ? 'text-red-600' : 'text-slate-600'}`}>
                            {Math.round(timeProgress)}%
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                            className={`h-2.5 rounded-full ${timeProgress >= 100 ? 'bg-red-500' :
                                    timeProgress > 80 ? 'bg-yellow-400' :
                                        'bg-purple-500'
                                }`}
                            style={{ width: `${timeProgress}%` }}
                        ></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                    <div>
                        <span className="font-bold block">AFOCAT:</span>
                        {afocat.days < 0 ? (
                            <span className="text-red-600 font-bold">Vencido hace {Math.abs(afocat.days)} días</span>
                        ) : (
                            <span>Vence en {afocat.days} días</span>
                        )}
                    </div>
                    <div>
                        <span className="font-bold block">Rev. Técnica:</span>
                        {review.days < 0 ? (
                            <span className="text-red-600 font-bold">Vencido hace {Math.abs(review.days)} días</span>
                        ) : (
                            <span>Vence en {review.days} días</span>
                        )}
                    </div>
                </div>

                <div className="mt-2 bg-purple-50 p-2 rounded-lg border border-purple-100">
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-purple-700 flex items-center gap-1">
                            <Droplet size={12} /> Grasa de Caja:
                        </span>
                        <span className={`text-xs font-bold ${(taxi.changesSinceGrease || 0) >= 10 ? 'text-red-600 animate-pulse' :
                                (taxi.changesSinceGrease || 0) >= 9 ? 'text-yellow-600' :
                                    'text-purple-600'
                            }`}>
                            {taxi.changesSinceGrease || 0} / 10 cambios
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => onMaintenance(taxi)}
                    className={`flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-lg transition-colors text-sm text-white ${maintStatus === 'danger' ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-slate-800 hover:bg-slate-900'
                        }`}
                >
                    <Settings size={18} /> Mantenimiento
                </button>
                <button
                    onClick={() => onUpdateDocs(taxi)}
                    className="flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-lg transition-colors text-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <CheckCircle size={18} /> Documentos
                </button>
            </div>

            <div className="mt-4 flex justify-end">
                <button
                    onClick={() => onDelete(taxi.id)}
                    className="text-slate-300 hover:text-red-400 text-xs flex items-center gap-1 transition-colors"
                >
                    <Trash2 size={12} /> Eliminar vehículo
                </button>
            </div>
        </div>
    );
};

export default TaxiCard;
