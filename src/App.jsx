import React, { useState, useEffect } from 'react';
import {
    Car,
    Plus,
    Search,
    X,
    LogOut,
    Settings,
    AlertTriangle,
    CheckCircle,
    Calendar,
    Gauge,
    Droplet,
    Wind,
    Filter,
    Edit,
    Trash2,
    Flame
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './utils/firebaseConfig';
import { calculateStatus } from './utils/calculations';
import { KM_LIMIT, DAYS_LIMIT, FILTERS } from './utils/constants';
import StorageService from './services/storageService';
import LoginScreen from './components/auth/LoginScreen';
import TaxiCard from './components/vehicle/TaxiCard';
import Modal from './components/common/Modal';

export default function App() {
    const [user, setUser] = useState(null);
    const [taxis, setTaxis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEditHistoryModalOpen, setIsEditHistoryModalOpen] = useState(false);
    const [updateDocsModalOpen, setUpdateDocsModalOpen] = useState(false);

    // Selected items
    const [selectedTaxi, setSelectedTaxi] = useState(null);
    const [selectedTaxiForDocs, setSelectedTaxiForDocs] = useState(null);
    const [editingLog, setEditingLog] = useState(null);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Form states - Add Vehicle
    const [newPlate, setNewPlate] = useState('');
    const [newModel, setNewModel] = useState('');
    const [newKm, setNewKm] = useState('');
    const [newAfocat, setNewAfocat] = useState('');
    const [newReview, setNewReview] = useState('');
    const [newExtinguisher, setNewExtinguisher] = useState('');
    const [newGreaseDate, setNewGreaseDate] = useState('');

    // Form states - Maintenance
    const [maintKm, setMaintKm] = useState('');
    const [maintDate, setMaintDate] = useState('');
    const [maintOil, setMaintOil] = useState('');
    const [maintFilters, setMaintFilters] = useState({
        oilFilter: true,
        airFilter: false,
        fuelFilter: false
    });
    const [maintGrease, setMaintGrease] = useState(false);
    const [maintGreaseDate, setMaintGreaseDate] = useState('');

    // Form states - Documents
    const [docAfocat, setDocAfocat] = useState('');
    const [docReview, setDocReview] = useState('');
    const [docExtinguisher, setDocExtinguisher] = useState('');

    // Initialize storage service
    const storageService = new StorageService(db, user);

    // Auth effect
    useEffect(() => {
        if (!auth) {
            setLoading(false);
            setUser({ uid: 'local-user' });
            const localData = localStorage.getItem('taxis');
            if (localData) {
                setTaxis(JSON.parse(localData));
            }
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setLoading(false);
        });

        setTimeout(() => setLoading(false), 5000);
        return () => unsubscribe();
    }, []);

    // Taxis effect
    useEffect(() => {
        if (!user) return;

        const unsubscribe = storageService.getTaxis((taxiData) => {
            setTaxis(taxiData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // History effect
    useEffect(() => {
        let unsubscribe = null;
        if (isHistoryModalOpen && selectedTaxi && selectedTaxi.id) {
            setHistoryLoading(true);
            unsubscribe = storageService.getHistory(selectedTaxi.id, (logs) => {
                setHistoryLogs(logs);
                setHistoryLoading(false);
            });
        } else {
            setHistoryLogs([]);
            setHistoryLoading(false);
        }

        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [isHistoryModalOpen, selectedTaxi]);

    // Handlers
    const handleAddTaxi = async (e) => {
        e.preventDefault();
        const initialKm = parseInt(newKm);
        const newTaxi = {
            plate: newPlate.toUpperCase(),
            model: newModel,
            currentKm: initialKm,
            lastServiceKm: initialKm,
            lastServiceDate: new Date().toISOString(),
            afocatDate: newAfocat,
            reviewDate: newReview,
            extinguisherDate: newExtinguisher,
            serviceCount: 0,
            lastGreaseDate: newGreaseDate || new Date().toISOString(),
            lastGreaseKm: initialKm,
            changesSinceGrease: 0,
            createdAt: new Date().toISOString(),
            history: []
        };

        await storageService.addTaxi(newTaxi);
        setNewPlate(''); setNewModel(''); setNewKm(''); setNewAfocat(''); setNewReview(''); setNewExtinguisher(''); setNewGreaseDate('');
        setIsAddModalOpen(false);
    };

    const openMaintenance = (taxi) => {
        setSelectedTaxi(taxi);
        setMaintKm(taxi.currentKm);
        setMaintDate(new Date().toISOString().split('T')[0]);
        setMaintOil('');
        setMaintFilters({ oilFilter: true, airFilter: false, fuelFilter: false });
        setMaintGrease(false);
        setMaintGreaseDate(taxi.lastGreaseDate ? taxi.lastGreaseDate.split('T')[0] : '');
        setIsMaintModalOpen(true);
    };

    const handlePerformMaintenance = async (e) => {
        e.preventDefault();
        if (!selectedTaxi) return;

        const newCurrentKm = parseInt(maintKm);
        const activeFilters = [];
        if (maintFilters.oilFilter) activeFilters.push(FILTERS.OIL);
        if (maintFilters.airFilter) activeFilters.push(FILTERS.AIR);
        if (maintFilters.fuelFilter) activeFilters.push(FILTERS.FUEL);
        if (maintGrease) activeFilters.push(FILTERS.GREASE);

        const maintenanceLogData = {
            date: maintDate ? new Date(maintDate).toISOString() : new Date().toISOString(),
            km: newCurrentKm,
            oilUsed: maintOil,
            filtersChanged: activeFilters,
            type: 'maintenance'
        };

        const updateData = {
            currentKm: newCurrentKm,
            lastServiceKm: newCurrentKm,
            lastServiceDate: maintDate ? new Date(maintDate).toISOString() : new Date().toISOString(),
            serviceCount: (selectedTaxi.serviceCount || 0) + 1,
            changesSinceGrease: maintGrease ? 0 : (selectedTaxi.changesSinceGrease || 0) + 1,
        };

        if (maintGrease) {
            updateData.lastGreaseDate = maintDate ? new Date(maintDate).toISOString() : new Date().toISOString();
            updateData.lastGreaseKm = newCurrentKm;
        }

        if (maintGreaseDate && maintGreaseDate !== (selectedTaxi.lastGreaseDate || '').split('T')[0]) {
            updateData.lastGreaseDate = new Date(maintGreaseDate).toISOString();
        }

        await storageService.addHistory(selectedTaxi.id, maintenanceLogData);
        await storageService.updateTaxi(selectedTaxi.id, updateData);

        setIsMaintModalOpen(false);
        setSelectedTaxi(null);
    };

    const openUpdateDocs = (taxi) => {
        setSelectedTaxiForDocs(taxi);
        setDocAfocat(taxi.afocatDate ? taxi.afocatDate.split('T')[0] : '');
        setDocReview(taxi.reviewDate ? taxi.reviewDate.split('T')[0] : '');
        setDocExtinguisher(taxi.extinguisherDate ? taxi.extinguisherDate.split('T')[0] : '');
        setUpdateDocsModalOpen(true);
    };

    const handleUpdateDocs = async (e) => {
        e.preventDefault();
        if (!selectedTaxiForDocs) return;

        const updateData = {};
        if (docAfocat && docAfocat !== (selectedTaxiForDocs.afocatDate || '').split('T')[0]) {
            updateData.afocatDate = docAfocat;
        }
        if (docReview && docReview !== (selectedTaxiForDocs.reviewDate || '').split('T')[0]) {
            updateData.reviewDate = docReview;
        }
        if (docExtinguisher && docExtinguisher !== (selectedTaxiForDocs.extinguisherDate || '').split('T')[0]) {
            updateData.extinguisherDate = docExtinguisher;
        }

        if (Object.keys(updateData).length === 0) {
            setUpdateDocsModalOpen(false);
            return;
        }

        await storageService.updateTaxi(selectedTaxiForDocs.id, updateData);
        setUpdateDocsModalOpen(false);
    };

    const openHistory = (taxi) => {
        setSelectedTaxi(taxi);
        setIsHistoryModalOpen(true);
    };

    const openEditHistory = (log) => {
        setEditingLog(log);
        setIsEditHistoryModalOpen(true);
    };

    const handleUpdateHistory = async (e) => {
        e.preventDefault();
        if (!editingLog || !selectedTaxi) return;

        await storageService.updateHistory(selectedTaxi.id, editingLog.id, editingLog);
        setIsEditHistoryModalOpen(false);
        setEditingLog(null);
    };

    const handleDeleteHistoryLog = async (logId) => {
        if (!confirm('¿Eliminar este registro del historial?')) return;
        if (!selectedTaxi) return;

        await storageService.deleteHistory(selectedTaxi.id, logId);
    };

    const handleDeleteTaxi = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar este vehículo? Esta acción no se puede deshacer.')) return;
        await storageService.deleteTaxi(id);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    // Filtered taxis
    const filteredTaxis = taxis.filter(taxi => {
        const matchesSearch = taxi.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (taxi.model && taxi.model.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;
        if (filterStatus === 'all') return true;

        const status = calculateStatus(
            taxi.currentKm,
            taxi.lastServiceKm,
            taxi.lastServiceDate,
            taxi.afocatDate,
            taxi.reviewDate,
            taxi.extinguisherDate
        );

        if (filterStatus === 'maintenance') {
            return status.maintStatus === 'warning' || status.maintStatus === 'danger';
        }
        if (filterStatus === 'afocat') {
            return status.afocat.status === 'warning' || status.afocat.status === 'danger';
        }
        if (filterStatus === 'review') {
            return status.review.status === 'warning' || status.review.status === 'danger';
        }
        if (filterStatus === 'extinguisher') {
            return status.extinguisher.status === 'warning' || status.extinguisher.status === 'danger';
        }

        return true;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="text-center">
                    <div className="inline-block p-4 bg-white rounded-full shadow-lg mb-4">
                        <Car size={48} className="text-red-700 animate-pulse" />
                    </div>
                    <p className="text-slate-600 font-medium">Cargando Royal Car...</p>
                </div>
            </div>
        );
    }

    if (!user) return <LoginScreen auth={auth} />;

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20">
            {/* Header */}
            <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-lg">
                <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-700 p-2 rounded-lg"><Car size={24} className="text-white" /></div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Royal Car</h1>
                            <p className="text-xs text-slate-400">Gestión de Mantenimientos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleLogout} className="text-slate-300 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors" title="Cerrar Sesión">
                            <LogOut size={20} />
                        </button>
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg transition-all">
                            <Plus size={18} /> <span className="hidden sm:inline">Nuevo Vehículo</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-4 py-6">
                {/* Search and Filters */}
                <div className="mb-6 flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center w-full md:w-auto flex-1">
                        <Search className="text-slate-400 ml-3" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por placa o modelo..."
                            className="w-full px-4 py-2 outline-none text-slate-700 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="p-2 text-slate-400 hover:text-red-500"><X size={18} /></button>
                        )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 px-2 md:px-0 no-scrollbar">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filterStatus === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilterStatus('maintenance')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${filterStatus === 'maintenance' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}
                        >
                            <Settings size={14} /> Mantenimiento
                        </button>
                        <button
                            onClick={() => setFilterStatus('afocat')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${filterStatus === 'afocat' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}
                        >
                            <AlertTriangle size={14} /> AFOCAT
                        </button>
                        <button
                            onClick={() => setFilterStatus('review')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${filterStatus === 'review' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}
                        >
                            <CheckCircle size={14} /> Rev. Técnica
                        </button>
                        <button
                            onClick={() => setFilterStatus('extinguisher')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${filterStatus === 'extinguisher' ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
                        >
                            <Flame size={14} /> Extintor
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-xs font-bold uppercase">Total Flota</p>
                        <p className="text-2xl font-bold text-slate-800">{taxis.length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-xs font-bold uppercase">Mantenimiento Pendiente</p>
                        <p className="text-2xl font-bold text-red-600">
                            {taxis.filter(t => calculateStatus(t.currentKm, t.lastServiceKm, t.lastServiceDate, t.afocatDate, t.reviewDate, t.extinguisherDate).generalStatus === 'danger').length}
                        </p>
                    </div>
                </div>

                {/* Vehicle Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTaxis.map(taxi => (
                        <TaxiCard
                            key={taxi.id}
                            taxi={taxi}
                            onMaintenance={openMaintenance}
                            onDelete={handleDeleteTaxi}
                            onViewHistory={openHistory}
                            onUpdateDocs={openUpdateDocs}
                        />
                    ))}
                </div>

                {taxis.length === 0 && (
                    <div className="text-center py-10 text-slate-400">
                        <Car size={64} className="mx-auto mb-4 opacity-20" />
                        <p className="font-medium">No hay vehículos registrados</p>
                        <p className="text-sm">Comienza agregando uno con el botón "Nuevo Vehículo"</p>
                    </div>
                )}

                {filteredTaxis.length === 0 && taxis.length > 0 && (
                    <div className="text-center py-10 text-slate-400">
                        <Search size={64} className="mx-auto mb-4 opacity-20" />
                        <p className="font-medium">No se encontraron vehículos</p>
                        <p className="text-sm">Intenta con otros términos de búsqueda o filtros</p>
                    </div>
                )}
            </div>

            {/* MODAL NUEVO TAXI */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nuevo Vehículo">
                <form onSubmit={handleAddTaxi} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Placa</label>
                        <input required type="text" className="w-full px-4 py-2 border rounded-lg uppercase" placeholder="ABC-123"
                            value={newPlate} onChange={(e) => setNewPlate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                        <input type="text" className="w-full px-4 py-2 border rounded-lg" placeholder="Ej: Toyota Corolla 2020"
                            value={newModel} onChange={(e) => setNewModel(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kilometraje Actual</label>
                        <input required type="number" className="w-full px-4 py-2 border rounded-lg font-mono font-bold" placeholder="50000"
                            value={newKm} onChange={(e) => setNewKm(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Vencimiento AFOCAT</label>
                            <input type="date" className="w-full px-4 py-2 border rounded-lg"
                                value={newAfocat} onChange={(e) => setNewAfocat(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Venc. Rev. Técnica</label>
                            <input type="date" className="w-full px-4 py-2 border rounded-lg"
                                value={newReview} onChange={(e) => setNewReview(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vencimiento Extintor</label>
                        <input type="date" className="w-full px-4 py-2 border rounded-lg"
                            value={newExtinguisher} onChange={(e) => setNewExtinguisher(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Último Cambio de Grasa (Opcional)</label>
                        <input type="date" className="w-full px-4 py-2 border rounded-lg"
                            value={newGreaseDate} onChange={(e) => setNewGreaseDate(e.target.value)} />
                        <p className="text-xs text-slate-500 mt-1">Si no se especifica, se usará la fecha actual</p>
                    </div>
                    <button type="submit" className="w-full bg-red-700 text-white font-bold py-3 rounded-lg hover:bg-red-600 shadow-lg shadow-red-900/20">
                        Agregar Vehículo
                    </button>
                </form>
            </Modal>

            {/* MODAL MANTENIMIENTO */}
            <Modal isOpen={isMaintModalOpen} onClose={() => setIsMaintModalOpen(false)} title="Registrar Mantenimiento">
                <form onSubmit={handlePerformMaintenance} className="space-y-5">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <h4 className="font-bold text-slate-900">{selectedTaxi?.plate}</h4>
                        <p className="text-xs text-slate-600">{selectedTaxi?.model}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Mantenimiento</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input required type="date" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
                                value={maintDate} onChange={(e) => setMaintDate(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">1. Kilometraje</label>
                        <div className="relative">
                            <Gauge className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input required type="number" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                                value={maintKm} onChange={(e) => setMaintKm(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">2. Aceite Utilizado</label>
                        <div className="relative">
                            <Droplet className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input type="text" placeholder="Ej: Castrol 10W-30" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
                                value={maintOil} onChange={(e) => setMaintOil(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">3. Filtros Cambiados</label>
                        <div className="space-y-2">
                            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={maintFilters.oilFilter} onChange={(e) => setMaintFilters({ ...maintFilters, oilFilter: e.target.checked })} />
                                <span className="ml-3 flex items-center gap-2 text-sm font-medium text-slate-700"><Filter size={16} /> Filtro de Aceite</span>
                            </label>
                            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={maintFilters.airFilter} onChange={(e) => setMaintFilters({ ...maintFilters, airFilter: e.target.checked })} />
                                <span className="ml-3 flex items-center gap-2 text-sm font-medium text-slate-700"><Wind size={16} /> Filtro de Aire</span>
                            </label>
                            <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={maintFilters.fuelFilter} onChange={(e) => setMaintFilters({ ...maintFilters, fuelFilter: e.target.checked })} />
                                <span className="ml-3 flex items-center gap-2 text-sm font-medium text-slate-700"><Droplet size={16} /> Filtro de Combustible</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">4. Grasa de Caja</label>
                        <label className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${(selectedTaxi?.changesSinceGrease || 0) >= 10 ? 'bg-red-50 border-red-300' : (selectedTaxi?.changesSinceGrease || 0) >= 9 ? 'bg-yellow-50 border-yellow-200' : ''}`}>
                            <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={maintGrease} onChange={(e) => setMaintGrease(e.target.checked)} />
                            <span className="ml-3 flex items-center gap-2 text-sm font-medium text-slate-700">
                                <Droplet size={16} className="text-purple-600" />
                                Cambio de Grasa de Caja
                                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${(selectedTaxi?.changesSinceGrease || 0) >= 10 ? 'text-red-700 bg-red-100 animate-pulse' :
                                    (selectedTaxi?.changesSinceGrease || 0) >= 9 ? 'text-yellow-700 bg-yellow-100' :
                                        'text-purple-700 bg-purple-100'
                                    }`}>
                                    {selectedTaxi?.changesSinceGrease || 0} / 10 cambios
                                </span>
                            </span>
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Último Cambio de Grasa</label>
                        <input type="date" className="w-full px-4 py-2 border rounded-lg"
                            value={maintGreaseDate} onChange={(e) => setMaintGreaseDate(e.target.value)} />
                        <p className="text-xs text-slate-500 mt-1">Actualizar solo si es necesario corregir la fecha</p>
                    </div>
                    <button type="submit" className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 shadow-lg shadow-green-900/20">Guardar</button>
                </form>
            </Modal>

            {/* MODAL ACTUALIZAR DOCUMENTOS */}
            <Modal isOpen={updateDocsModalOpen} onClose={() => setUpdateDocsModalOpen(false)} title="Actualizar Documentos y Fechas">
                <form onSubmit={handleUpdateDocs} className="space-y-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                        <h4 className="font-bold text-blue-900 text-sm">{selectedTaxiForDocs?.plate}</h4>
                        <p className="text-xs text-blue-700">{selectedTaxiForDocs?.model}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Vencimiento AFOCAT</label>
                            <input type="date" className="w-full px-4 py-2 border rounded-lg"
                                value={docAfocat} onChange={(e) => setDocAfocat(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Venc. Rev. Técnica</label>
                            <input type="date" className="w-full px-4 py-2 border rounded-lg"
                                value={docReview} onChange={(e) => setDocReview(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vencimiento Extintor</label>
                        <input type="date" className="w-full px-4 py-2 border rounded-lg"
                            value={docExtinguisher} onChange={(e) => setDocExtinguisher(e.target.value)} />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
                        Actualizar Documentos
                    </button>
                </form>
            </Modal>

            {/* MODAL HISTORIAL */}
            <Modal isOpen={isHistoryModalOpen} onClose={() => { setSelectedTaxi(null); setIsHistoryModalOpen(false); setHistoryLogs([]); }} title="Historial">
                <div className="space-y-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <h4 className="font-bold text-slate-900">{selectedTaxi?.plate}</h4>
                        <p className="text-xs text-slate-600">{selectedTaxi?.model}</p>
                    </div>
                    {historyLoading ? (
                        <div className="text-center py-8 text-slate-400">Cargando historial...</div>
                    ) : historyLogs.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">No hay registros de mantenimiento aún.</div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {historyLogs.map((log) => (
                                <div key={log.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <button
                                            onClick={() => openEditHistory(log)}
                                            className="text-slate-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Editar registro"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteHistoryLog(log.id)}
                                            className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Eliminar registro"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-start mb-2 pr-6">
                                        <p className="font-bold text-slate-800 flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> {new Date(log.date).toLocaleDateString(undefined, { timeZone: 'UTC' })}</p>
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono font-bold">{log.km?.toLocaleString()} km</span>
                                    </div>
                                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-start gap-2 text-sm text-slate-700"><Droplet size={14} className="text-blue-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Aceite:</span> {log.oilUsed || 'No especificado'}</span></div>
                                        <div className="flex items-start gap-2 text-sm text-slate-700"><Filter size={14} className="text-orange-500 mt-0.5 shrink-0" /> <div className="flex flex-wrap gap-1"><span className="font-semibold mr-1">Filtros:</span> {log.filtersChanged && log.filtersChanged.length > 0 ? log.filtersChanged.filter(f => f !== FILTERS.GREASE).map(f => (<span key={f} className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">{f}</span>)) : <span className="text-slate-400 italic">Ninguno</span>}</div></div>

                                        {log.filtersChanged && log.filtersChanged.includes(FILTERS.GREASE) && (
                                            <div className="flex items-center gap-2 text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200">
                                                <Droplet size={14} className="text-purple-600" />
                                                <span className="font-bold">Cambio de Grasa de Caja realizado</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {/* MODAL EDITAR HISTORIAL */}
            <Modal isOpen={isEditHistoryModalOpen} onClose={() => { setIsEditHistoryModalOpen(false); setEditingLog(null); }} title="Editar Registro de Mantenimiento">
                {editingLog && (
                    <form onSubmit={handleUpdateHistory} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                            <input
                                required
                                type="date"
                                className="w-full px-4 py-2 border rounded-lg"
                                value={editingLog.date ? editingLog.date.split('T')[0] : ''}
                                onChange={(e) => setEditingLog({ ...editingLog, date: new Date(e.target.value).toISOString() })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Kilometraje</label>
                            <input
                                required
                                type="number"
                                className="w-full px-4 py-2 border rounded-lg font-mono font-bold"
                                value={editingLog.km || ''}
                                onChange={(e) => setEditingLog({ ...editingLog, km: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Aceite Utilizado</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Ej: Castrol 10W-30"
                                value={editingLog.oilUsed || ''}
                                onChange={(e) => setEditingLog({ ...editingLog, oilUsed: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Filtros Cambiados</label>
                            <div className="space-y-2">
                                {[FILTERS.OIL, FILTERS.AIR, FILTERS.FUEL, FILTERS.GREASE].map(filterName => (
                                    <label key={filterName} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 text-blue-600 rounded"
                                            checked={editingLog.filtersChanged?.includes(filterName) || false}
                                            onChange={(e) => {
                                                const filters = editingLog.filtersChanged || [];
                                                if (e.target.checked) {
                                                    setEditingLog({ ...editingLog, filtersChanged: [...filters, filterName] });
                                                } else {
                                                    setEditingLog({ ...editingLog, filtersChanged: filters.filter(f => f !== filterName) });
                                                }
                                            }}
                                        />
                                        <span className="ml-3 text-sm font-medium text-slate-700">{filterName}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
                            Guardar Cambios
                        </button>
                    </form>
                )}
            </Modal>
        </div>
    );
}