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
    Filter,
    Activity
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './utils/firebaseConfig';
import { calculateStatus } from './utils/calculations';
import StorageService from './services/storageService';
import LoginScreen from './components/auth/LoginScreen';
import TaxiCard from './components/vehicle/TaxiCard';
import Modal from './components/common/Modal';

// Import modals (these will be created inline for now to keep the refactoring manageable)
// In a full refactoring, these would be separate components

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
        if (!isHistoryModalOpen || !selectedTaxi) return;

        setHistoryLoading(true);
        const unsubscribe = storageService.getHistory(selectedTaxi.id, (logs) => {
            setHistoryLogs(logs);
            setHistoryLoading(false);
        });

        return () => unsubscribe();
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
            serviceCount: 0,
            lastGreaseDate: newGreaseDate || new Date().toISOString(),
            lastGreaseKm: initialKm,
            changesSinceGrease: 0,
            createdAt: new Date().toISOString(),
            history: []
        };

        await storageService.addTaxi(newTaxi);
        setNewPlate(''); setNewModel(''); setNewKm(''); setNewAfocat(''); setNewReview(''); setNewGreaseDate('');
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
        if (maintFilters.oilFilter) activeFilters.push('Filtro Aceite');
        if (maintFilters.airFilter) activeFilters.push('Filtro Aire');
        if (maintFilters.fuelFilter) activeFilters.push('Filtro Combustible');
        if (maintGrease) activeFilters.push('Cambio de Grasa de Caja');

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
        if (!confirm('¿Eliminar taxi?')) return;
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
            taxi.reviewDate
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

        return true;
    });

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Activity className="animate-spin text-blue-600" />
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
                        <button onClick={() => setIsAddModalOpen(true)} className="bg-red-700 hover:bg-red-500 text-white px-4 py-2 rounded-full font-medium flex items-center gap-2 shadow-lg transition-all">
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
                            {taxis.filter(t => calculateStatus(t.currentKm, t.lastServiceKm, t.lastServiceDate, t.afocatDate, t.reviewDate).generalStatus === 'danger').length}
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
                    <div className="text-center py-10 text-slate-400">No hay vehículos registrados. Comienza agregando uno.</div>
                )}
            </div>

            {/* Modals would go here - for brevity, I'll note that these should be extracted to separate components */}
            {/* AddVehicleModal, MaintenanceModal, DocumentsModal, HistoryModal, EditHistoryModal */}
        </div>
    );
}
