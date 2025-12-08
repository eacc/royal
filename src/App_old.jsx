import React, { useState, useEffect } from 'react';
import {
    Car,
    Settings,
    Plus,
    Activity,
    Calendar,
    AlertTriangle,
    CheckCircle,
    Gauge,
    Droplet,
    Wind,
    X,
    Trash2,
    History,
    Filter,
    Search,
    LogOut,
    Edit
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    query,
    getDocs,
    getDoc
} from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE (¡IMPORTANTE!) ---
// Reemplaza esto con tu propia configuración de Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyBrTIqPjwLVVZNjSmsQ770kj-MDyvm7o-E",
    authDomain: "royalcar-49e2e.firebaseapp.com",
    projectId: "royalcar-49e2e",
    storageBucket: "royalcar-49e2e.firebasestorage.app",
    messagingSenderId: "931717650876",
    appId: "1:931717650876:web:30afca96d09d94f960b3b9",
    measurementId: "G-5F17KGGRJP"
};

// NOTA: Si estás probando sin configurar Firebase aún, la app dará error.
// Asegúrate de tener una configuración válida o usar un mock si solo quieres ver la UI.

// Inicialización condicional para evitar errores si no hay config
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const appId = 'flota-taxis-app';

// --- LÓGICA DE NEGOCIO ---
const KM_LIMIT = 5000;
const DAYS_LIMIT = 30;

const calculateStatus = (currentKm, lastServiceKm, lastServiceDateStr, afocatDateStr, reviewDateStr) => {
    // Mantenimiento (Aceite/Filtros)
    const kmDiff = currentKm - lastServiceKm;
    const kmProgress = Math.min((kmDiff / KM_LIMIT) * 100, 100);

    const lastDate = new Date(lastServiceDateStr);
    const today = new Date();
    const timeDiff = Math.abs(today - lastDate);
    const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    const timeProgress = Math.min((daysDiff / DAYS_LIMIT) * 100, 100);

    let maintStatus = 'ok';
    if (kmDiff >= KM_LIMIT || daysDiff >= DAYS_LIMIT) {
        maintStatus = 'danger';
    } else if (kmDiff >= KM_LIMIT * 0.9 || daysDiff >= DAYS_LIMIT * 0.9) {
        maintStatus = 'warning';
    }

    // Documentos
    const getDocStatus = (dateStr, warningDays) => {
        if (!dateStr) return { status: 'danger', days: -1 };
        const expDate = new Date(dateStr);
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status = 'ok';
        if (diffDays <= 0) status = 'danger';
        else if (diffDays <= warningDays) status = 'warning';

        return { status, days: diffDays };
    };

    const afocat = getDocStatus(afocatDateStr, 30);
    const review = getDocStatus(reviewDateStr, 15);

    // Status general (el peor de todos)
    let generalStatus = 'ok';
    if (maintStatus === 'danger' || afocat.status === 'danger' || review.status === 'danger') generalStatus = 'danger';
    else if (maintStatus === 'warning' || afocat.status === 'warning' || review.status === 'warning') generalStatus = 'warning';

    return { kmDiff, kmProgress, daysDiff, timeProgress, maintStatus, afocat, review, generalStatus };
};

// --- COMPONENTES UI ---

const StatusBadge = ({ status, label, icon: Icon }) => {
    if (status === 'danger') return <span className="px-2 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full flex items-center gap-1"><Icon size={12} /> {label} VENCIDO</span>;
    if (status === 'warning') return <span className="px-2 py-1 text-xs font-bold text-yellow-700 bg-yellow-100 rounded-full flex items-center gap-1"><Icon size={12} /> {label} PRONTO</span>;
    return <span className="px-2 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full flex items-center gap-1"><Icon size={12} /> {label} OK</span>;
};

const TaxiCard = ({ taxi, onMaintenance, onDelete, onViewHistory, onUpdateDocs }) => {
    const { kmDiff, kmProgress, daysDiff, timeProgress, maintStatus, afocat, review, generalStatus } = calculateStatus(
        taxi.currentKm,
        taxi.lastServiceKm,
        taxi.lastServiceDate,
        taxi.afocatDate,
        taxi.reviewDate
    );

    return (
        <div className={`bg-white rounded-xl shadow-sm border-l-4 p-5 hover:shadow-md transition-shadow relative ${generalStatus === 'danger' ? 'border-red-500' : generalStatus === 'warning' ? 'border-yellow-400' : 'border-green-500'}`}>
            <button onClick={() => onViewHistory(taxi)} className="absolute top-4 right-4 text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-full transition-colors" title="Ver Historial">
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
                <p className="text-2xl font-mono font-bold text-slate-700">{taxi.currentKm.toLocaleString()} <span className="text-sm text-slate-400 font-sans">km</span></p>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mt-2">Próximo Cambio</p>
                <p className="text-2xl font-mono font-bold text-slate-700">{(taxi.lastServiceKm + KM_LIMIT).toLocaleString()} <span className="text-sm text-slate-400 font-sans">km</span></p>
            </div>

            <div className="space-y-4 mb-6">
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 flex items-center gap-1"><Calendar size={12} /> Tiempo ({daysDiff} / {DAYS_LIMIT} días)</span>
                        <span className={`font-bold ${timeProgress >= 100 ? 'text-red-600' : 'text-slate-600'}`}>{Math.round(timeProgress)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-2.5 rounded-full ${timeProgress >= 100 ? 'bg-red-500' : timeProgress > 80 ? 'bg-yellow-400' : 'bg-purple-500'}`} style={{ width: `${timeProgress}%` }}></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                    <div>
                        <span className="font-bold block">AFOCAT:</span>
                        {afocat.days < 0 ? <span className="text-red-600 font-bold">Vencido hace {Math.abs(afocat.days)} días</span> : <span>Vence en {afocat.days} días</span>}
                    </div>
                    <div>
                        <span className="font-bold block">Rev. Técnica:</span>
                        {review.days < 0 ? <span className="text-red-600 font-bold">Vencido hace {Math.abs(review.days)} días</span> : <span>Vence en {review.days} días</span>}
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
                <button onClick={() => onMaintenance(taxi)} className={`flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-lg transition-colors text-sm text-white ${maintStatus === 'danger' ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-slate-800 hover:bg-slate-900'}`}>
                    <Settings size={18} /> Mantenimiento
                </button>
                <button onClick={() => onUpdateDocs(taxi)} className="flex items-center justify-center gap-2 font-semibold py-3 px-4 rounded-lg transition-colors text-sm bg-blue-600 hover:bg-blue-700 text-white">
                    <CheckCircle size={18} /> Documentos
                </button>
            </div>

            <div className="mt-4 flex justify-end">
                <button onClick={() => onDelete(taxi.id)} className="text-slate-300 hover:text-red-400 text-xs flex items-center gap-1 transition-colors">
                    <Trash2 size={12} /> Eliminar vehículo
                </button>
            </div>
        </div>
    );
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};



const LoginScreen = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Auth state listener in App will handle the rest
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Correo o contraseña incorrectos.');
            } else if (err.code === 'auth/user-disabled') {
                setError('Esta cuenta ha sido deshabilitada.');
            } else {
                setError('Error al autenticar: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-red-700 p-8 text-center">
                    <div className="inline-block p-3 bg-white/10 rounded-full mb-4">
                        <Car size={48} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Royal Car</h1>
                    <p className="text-red-100 mt-2">Gestión de Flota y Mantenimiento</p>
                </div>
                <div className="p-8">
                    <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
                        Iniciar Sesión
                    </h2>
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                            <input
                                type="email"
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                            <input
                                type="password"
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                        >
                            {loading ? <Activity className="animate-spin" /> : 'Ingresar'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

// --- APP PRINCIPAL ---
export default function App() {
    const [user, setUser] = useState(null);
    const [taxis, setTaxis] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isEditHistoryModalOpen, setIsEditHistoryModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState(null);

    const [selectedTaxi, setSelectedTaxi] = useState(null);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'maintenance', 'afocat', 'review'

    const [newPlate, setNewPlate] = useState('');
    const [newModel, setNewModel] = useState('');
    const [newKm, setNewKm] = useState('');
    const [newAfocat, setNewAfocat] = useState('');
    const [newReview, setNewReview] = useState('');
    const [newGreaseDate, setNewGreaseDate] = useState('');

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

    const [updateDocsModalOpen, setUpdateDocsModalOpen] = useState(false);
    const [selectedTaxiForDocs, setSelectedTaxiForDocs] = useState(null);
    const [docAfocat, setDocAfocat] = useState('');
    const [docReview, setDocReview] = useState('');

    useEffect(() => {
        // Simulación de Auth si no hay Firebase configurado
        if (!auth) {

            setLoading(false);
            setUser({ uid: 'local-user' });

            // Cargar datos de LocalStorage
            const localData = localStorage.getItem('taxis');
            if (localData) {
                setTaxis(JSON.parse(localData));
            } else {
                setTaxis([]);
            }
            return;
        }

        const initAuth = async () => {
            // Ya no iniciamos anónimamente automático
            // Esperamos a que el usuario haga login
        };
        initAuth();

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {

            setUser(currentUser);
            if (!currentUser) setLoading(false);
        });

        // Safety timeout
        setTimeout(() => {
            setLoading(false);

        }, 5000);

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !db) return;

        const q = query(collection(db, 'users', user.uid, 'taxis'));

        const unsubscribe = onSnapshot(q, (snapshot) => {

            const taxiData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTaxis(taxiData);
            setLoading(false);
        }, (err) => {
            console.error("Error DB:", err);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

    // Listener para el historial en tiempo real
    useEffect(() => {
        if (!isHistoryModalOpen || !selectedTaxi || !db || !user) return;


        setHistoryLoading(true);

        const historyRef = collection(db, 'users', user.uid, 'taxis', selectedTaxi.id, 'history');
        const q = query(historyRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {

            const logs = snapshot.docs.map(doc => {
                const data = doc.data();
                // IMPORTANTE: Usar doc.id (ID del documento) en lugar de data.id
                // Eliminar el campo 'id' de los datos si existe (logs viejos)
                const { id: _, ...cleanData } = data;

                return {
                    id: doc.id,  // ✅ Usar el ID real del documento de Firebase
                    ...cleanData
                };
            });
            logs.sort((a, b) => new Date(b.date) - new Date(a.date));
            setHistoryLogs(logs);
            setHistoryLoading(false);
        }, (err) => {
            console.error("Error loading history:", err);
            setHistoryLoading(false);
        });

        return () => {

            unsubscribe();
        };
    }, [isHistoryModalOpen, selectedTaxi, db, user]);

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
            history: [] // Inicializar historial vacío para modo local
        };

        if (!db) {
            // Modo LocalStorage
            const updatedTaxis = [...taxis, { ...newTaxi, id: Date.now().toString() }];
            setTaxis(updatedTaxis);
            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));

            setNewPlate(''); setNewModel(''); setNewKm(''); setNewAfocat(''); setNewReview(''); setNewGreaseDate('');
            setIsAddModalOpen(false);
            return;
        }

        if (!user) { alert("Usuario no autenticado"); return; }

        try {
            await addDoc(collection(db, 'users', user.uid, 'taxis'), {
                ...newTaxi,
                createdAt: serverTimestamp()
            });
            setNewPlate(''); setNewModel(''); setNewKm(''); setNewAfocat(''); setNewReview(''); setNewGreaseDate('');
            setIsAddModalOpen(false);
        } catch (err) { console.error(err); }
    };

    const openMaintenance = (taxi) => {
        setSelectedTaxi(taxi);
        setMaintKm(taxi.currentKm);
        setMaintDate(new Date().toISOString().split('T')[0]); // Default to today
        setMaintOil('');
        setMaintFilters({ oilFilter: true, airFilter: false, fuelFilter: false });
        setMaintGrease(false);
        setMaintGreaseDate(taxi.lastGreaseDate ? taxi.lastGreaseDate.split('T')[0] : '');
        setIsMaintModalOpen(true);
    };

    const handlePerformMaintenance = async (e) => {
        e.preventDefault();
        if (!user || !selectedTaxi) return;

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
        // Update grease date even if not changing grease
        if (maintGreaseDate && maintGreaseDate !== (selectedTaxi.lastGreaseDate || '').split('T')[0]) {
            updateData.lastGreaseDate = new Date(maintGreaseDate).toISOString();
        }

        if (!db) {
            // Modo LocalStorage - aquí SÍ necesitamos un ID manual
            const maintenanceLog = {
                ...maintenanceLogData,
                id: Date.now().toString()
            };

            const updatedTaxis = taxis.map(t => {
                if (t.id === selectedTaxi.id) {
                    return {
                        ...t,
                        ...updateData,
                        history: [maintenanceLog, ...(t.history || [])]
                    };
                }
                return t;
            });

            setTaxis(updatedTaxis);
            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));
            setIsMaintModalOpen(false);
            setSelectedTaxi(null);
            // Limpiar campos de documentos
            setNewAfocat('');
            setNewReview('');
            return;
        }

        try {
            // Para Firebase, NO incluimos 'id' - Firebase lo genera automáticamente
            await addDoc(collection(db, 'users', user.uid, 'taxis', selectedTaxi.id, 'history'), maintenanceLogData);

            await updateDoc(doc(db, 'users', user.uid, 'taxis', selectedTaxi.id), updateData);

            setIsMaintModalOpen(false);
            setSelectedTaxi(null);
        } catch (err) { console.error(err); }
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

        if (!db) {
            // Modo LocalStorage
            const updatedTaxis = taxis.map(t => {
                if (t.id === selectedTaxiForDocs.id) {
                    return { ...t, ...updateData };
                }
                return t;
            });
            setTaxis(updatedTaxis);
            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));
            setUpdateDocsModalOpen(false);
            return;
        }

        if (!user) return;

        try {
            await updateDoc(doc(db, 'users', user.uid, 'taxis', selectedTaxiForDocs.id), updateData);
            setUpdateDocsModalOpen(false);
        } catch (err) {
            console.error(err);
            alert('Error al actualizar documentos: ' + err.message);
        }
    };

    const handleDeleteHistoryLog = async (logId) => {
        if (!confirm('¿Eliminar este registro del historial?')) return;

        if (!db) {
            // Modo LocalStorage
            const updatedTaxis = taxis.map(t => {
                if (t.id === selectedTaxi.id) {
                    const updatedHistory = (t.history || []).filter(h => String(h.id) !== String(logId));
                    return { ...t, history: updatedHistory };
                }
                return t;
            });
            setTaxis(updatedTaxis);
            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));

            // Actualizar vista actual
            setHistoryLogs(prev => prev.filter(l => l.id !== logId));

            // Actualizar selectedTaxi para que refleje los cambios si se vuelve a abrir
            const updatedSelectedTaxi = updatedTaxis.find(t => t.id === selectedTaxi.id);
            if (updatedSelectedTaxi) setSelectedTaxi(updatedSelectedTaxi);

            return;
        }

        if (!user || !selectedTaxi) {

            return;
        }

        try {
            const docPath = `users/${user.uid}/taxis/${selectedTaxi.id}/history/${logId}`;
            const docRef = doc(db, 'users', user.uid, 'taxis', selectedTaxi.id, 'history', logId);

            await deleteDoc(docRef);
            // No necesitamos actualizar manualmente porque onSnapshot lo hará
            // setHistoryLogs(prev => prev.filter(l => l.id !== logId));
        } catch (err) {
            console.error("Error deleting log:", err);

            if (err.code === 'permission-denied') {
                alert("❌ ERROR DE PERMISOS: No tienes permiso para eliminar logs del historial.\n\n" +
                    "Solución: Ve a Firebase Console → Firestore Database → Rules y actualiza las reglas de seguridad.\n\n" +
                    "Revisa el documento 'firebase_rules_fix.md' para las reglas correctas.");
            } else {
                alert("Error al eliminar el registro: " + err.message);
            }
        }
    };

    const openEditHistory = (log) => {
        setEditingLog(log);
        setIsEditHistoryModalOpen(true);
    };

    const handleUpdateHistory = async (e) => {
        e.preventDefault();
        if (!editingLog || !selectedTaxi) return;

        const updatedLog = {
            ...editingLog,
            date: editingLog.date,
            km: parseInt(editingLog.km),
            oilUsed: editingLog.oilUsed,
            filtersChanged: editingLog.filtersChanged
        };

        if (!db) {
            // Modo LocalStorage
            const updatedTaxis = taxis.map(t => {
                if (t.id === selectedTaxi.id) {
                    const updatedHistory = (t.history || []).map(h =>
                        h.id === editingLog.id ? updatedLog : h
                    );
                    return { ...t, history: updatedHistory };
                }
                return t;
            });
            setTaxis(updatedTaxis);
            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));
            setHistoryLogs(prev => prev.map(l => l.id === editingLog.id ? updatedLog : l));
            setIsEditHistoryModalOpen(false);
            setEditingLog(null);
            return;
        }

        if (!user) return;

        try {
            const { id, ...dataToUpdate } = updatedLog;
            await updateDoc(doc(db, 'users', user.uid, 'taxis', selectedTaxi.id, 'history', editingLog.id), dataToUpdate);
            setIsEditHistoryModalOpen(false);
            setEditingLog(null);
        } catch (err) {
            console.error("Error updating history:", err);
            alert("Error al actualizar el registro: " + err.message);
        }
    };

    const openHistory = async (taxi) => {
        setSelectedTaxi(taxi);
        setIsHistoryModalOpen(true);
        setHistoryLoading(true);
        setHistoryLogs([]);

        if (!db) {
            // Modo LocalStorage
            const currentTaxi = taxis.find(t => t.id === taxi.id) || taxi;
            setHistoryLogs(currentTaxi.history || []);
            setHistoryLoading(false);
            return;
        }

        if (!user) return;
        try {
            const historyRef = collection(db, 'users', user.uid, 'taxis', taxi.id, 'history');
            const q = query(historyRef);

            // Usar onSnapshot para actualizaciones en tiempo real
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                logs.sort((a, b) => new Date(b.date) - new Date(a.date));
                setHistoryLogs(logs);
                setHistoryLoading(false);
            }, (err) => {
                console.error("Error loading history:", err);
                setHistoryLoading(false);
            });

            // Guardar el unsubscribe para limpiarlo cuando se cierre el modal
            // (esto se manejará cuando el usuario cierre el modal)
        } catch (err) {
            console.error(err);
            setHistoryLoading(false);
        }
    };

    const handleDeleteTaxi = async (id) => {
        if (!confirm('¿Eliminar taxi?')) return;

        if (!db) {
            // Modo LocalStorage
            const updatedTaxis = taxis.filter(t => t.id !== id);
            setTaxis(updatedTaxis);
            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));
            return;
        }

        try { await deleteDoc(doc(db, 'users', user.uid, 'taxis', id)); }
        catch (err) { console.error(err); }
    }

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Activity className="animate-spin text-blue-600" /></div>;

    if (!user) return <LoginScreen />;

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-20">
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

            <div className="max-w-5xl mx-auto px-4 py-6">
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

            {/* MODAL NUEVO TAXI */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Nuevo Vehículo">
                <form onSubmit={handleAddTaxi} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Placa</label>
                        <input required type="text" placeholder="Ej: ABC-123" className="w-full px-4 py-2 border rounded-lg uppercase"
                            value={newPlate} onChange={(e) => setNewPlate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
                        <input required type="text" placeholder="Ej: Toyota Yaris 2020" className="w-full px-4 py-2 border rounded-lg"
                            value={newModel} onChange={(e) => setNewModel(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kilometraje Inicial</label>
                        <input required type="number" placeholder="0" className="w-full px-4 py-2 border rounded-lg"
                            value={newKm} onChange={(e) => setNewKm(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Vencimiento AFOCAT</label>
                            <input required type="date" className="w-full px-4 py-2 border rounded-lg"
                                value={newAfocat} onChange={(e) => setNewAfocat(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Venc. Rev. Técnica</label>
                            <input required type="date" className="w-full px-4 py-2 border rounded-lg"
                                value={newReview} onChange={(e) => setNewReview(e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Último Cambio de Grasa <span className="text-slate-400 font-normal">(Opcional)</span></label>
                        <input type="date" className="w-full px-4 py-2 border rounded-lg"
                            value={newGreaseDate} onChange={(e) => setNewGreaseDate(e.target.value)} />
                        <p className="text-xs text-slate-500 mt-1">Si no se especifica, se usará la fecha actual</p>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">Guardar</button>
                </form>
            </Modal>

            {/* MODAL MANTENIMIENTO */}
            <Modal isOpen={isMaintModalOpen} onClose={() => setIsMaintModalOpen(false)} title="Registrar Mantenimiento">
                <form onSubmit={handlePerformMaintenance} className="space-y-5">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                        <h4 className="font-bold text-blue-900 text-sm">{selectedTaxi?.plate}</h4>
                        <p className="text-xs text-blue-700">{selectedTaxi?.model}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Mantenimiento</label>
                        <input required type="date" className="w-full px-4 py-2 border border-slate-300 rounded-lg mb-4"
                            value={maintDate} onChange={(e) => setMaintDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">1. Kilometraje Actual</label>
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

            {/* MODAL HISTORIAL */}
            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Historial">
                <div className="space-y-4">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="bg-slate-100 p-2 rounded-full"><History size={24} className="text-slate-600" /></div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-lg">{selectedTaxi?.plate}</h4>
                            <p className="text-xs text-slate-500">{selectedTaxi?.model}</p>
                        </div>
                    </div>
                    {historyLoading ? <div className="text-center text-slate-400">Cargando...</div> : historyLogs.length === 0 ? <div className="text-center text-slate-400 italic">Sin registros.</div> : (
                        <div className="space-y-4">
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
                                        <p className="font-bold text-slate-800 flex items-center gap-2"><Calendar size={14} className="text-slate-400" /> {new Date(log.date).toLocaleDateString()}</p>
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono font-bold">{log.km?.toLocaleString()} km</span>
                                    </div>
                                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-start gap-2 text-sm text-slate-700"><Droplet size={14} className="text-blue-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Aceite:</span> {log.oilUsed || 'No especificado'}</span></div>
                                        <div className="flex items-start gap-2 text-sm text-slate-700"><Filter size={14} className="text-orange-500 mt-0.5 shrink-0" /> <div className="flex flex-wrap gap-1"><span className="font-semibold mr-1">Filtros:</span> {log.filtersChanged && log.filtersChanged.length > 0 ? log.filtersChanged.filter(f => f !== 'Cambio de Grasa de Caja').map(f => (<span key={f} className="text-xs bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">{f}</span>)) : <span className="text-slate-400 italic">Ninguno</span>}</div></div>

                                        {log.filtersChanged && log.filtersChanged.includes('Cambio de Grasa de Caja') && (
                                            <div className="flex items-center gap-2 text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200">
                                                <Droplet size={14} className="text-purple-600" />
                                                <span className="font-bold">Cambio de Grasa de Caja realizado</span>
                                            </div>
                                        )}

                                        {(log.changedAfocat || log.changedReview) && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1">
                                                {log.changedAfocat && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                                        <AlertTriangle size={12} className="text-yellow-600" />
                                                        <span>AFOCAT renovado: <b>{new Date(log.changedAfocat + 'T12:00:00').toLocaleDateString()}</b></span>
                                                    </div>
                                                )}
                                                {log.changedReview && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                                        <CheckCircle size={12} className="text-green-600" />
                                                        <span>Rev. Técnica renovada: <b>{new Date(log.changedReview + 'T12:00:00').toLocaleDateString()}</b></span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700">
                        Actualizar Documentos
                    </button>
                </form>
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
                                {['Filtro Aceite', 'Filtro Aire', 'Filtro Combustible', 'Cambio de Grasa de Caja'].map(filterName => (
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