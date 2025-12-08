import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    serverTimestamp,
    query
} from 'firebase/firestore';

/**
 * Storage service - abstracts Firebase and LocalStorage operations
 */
class StorageService {
    constructor(db, user) {
        this.db = db;
        this.user = user;
        this.isLocalMode = !db;
    }

    // Taxis operations
    async getTaxis(callback) {
        if (this.isLocalMode) {
            const localData = localStorage.getItem('taxis');
            const taxis = localData ? JSON.parse(localData) : [];
            callback(taxis);
            return () => { }; // Return empty unsubscribe function
        }

        const q = query(collection(this.db, 'users', this.user.uid, 'taxis'));
        return onSnapshot(q, (snapshot) => {
            const taxiData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(taxiData);
        });
    }

    async addTaxi(taxiData) {
        if (this.isLocalMode) {
            const localData = localStorage.getItem('taxis');
            const taxis = localData ? JSON.parse(localData) : [];
            const newTaxi = { ...taxiData, id: Date.now().toString() };
            const updatedTaxis = [...taxis, newTaxi];
            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));
            return newTaxi;
        }

        return await addDoc(collection(this.db, 'users', this.user.uid, 'taxis'), {
            ...taxiData,
            createdAt: serverTimestamp()
        });
    }

    async updateTaxi(taxiId, updateData) {
        if (this.isLocalMode) {
            const localData = localStorage.getItem('taxis');
            const taxis = localData ? JSON.parse(localData) : [];
            const updatedTaxis = taxis.map(t => t.id === taxiId ? { ...t, ...updateData } : t);
            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));
            return;
        }

        await updateDoc(doc(this.db, 'users', this.user.uid, 'taxis', taxiId), updateData);
    }

    async deleteTaxi(taxiId) {
        if (this.isLocalMode) {
            const localData = localStorage.getItem('taxis');
            const taxis = localData ? JSON.parse(localData) : [];
            const updatedTaxis = taxis.filter(t => t.id !== taxiId);
            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));
            return;
        }

        await deleteDoc(doc(this.db, 'users', this.user.uid, 'taxis', taxiId));
    }

    // History operations
    async getHistory(taxiId, callback) {
        if (this.isLocalMode) {
            const localData = localStorage.getItem('taxis');
            const taxis = localData ? JSON.parse(localData) : [];
            const taxi = taxis.find(t => t.id === taxiId);
            callback(taxi?.history || []);
            return () => { };
        }

        const historyRef = collection(this.db, 'users', this.user.uid, 'taxis', taxiId, 'history');
        const q = query(historyRef);

        return onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs.map(doc => {
                const data = doc.data();
                const { id: _, ...cleanData } = data;
                return { id: doc.id, ...cleanData };
            });
            logs.sort((a, b) => new Date(b.date) - new Date(a.date));
            callback(logs);
        });
    }

    async addHistory(taxiId, historyData) {
        if (this.isLocalMode) {
            const localData = localStorage.getItem('taxis');
            const taxis = localData ? JSON.parse(localData) : [];
            const historyLog = { ...historyData, id: Date.now().toString() };

            const updatedTaxis = taxis.map(t => {
                if (t.id === taxiId) {
                    return { ...t, history: [historyLog, ...(t.history || [])] };
                }
                return t;
            });

            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));
            return;
        }

        await addDoc(collection(this.db, 'users', this.user.uid, 'taxis', taxiId, 'history'), historyData);
    }

    async updateHistory(taxiId, historyId, updateData) {
        if (this.isLocalMode) {
            const localData = localStorage.getItem('taxis');
            const taxis = localData ? JSON.parse(localData) : [];

            const updatedTaxis = taxis.map(t => {
                if (t.id === taxiId) {
                    const updatedHistory = (t.history || []).map(h =>
                        h.id === historyId ? { ...h, ...updateData } : h
                    );
                    return { ...t, history: updatedHistory };
                }
                return t;
            });

            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));
            return;
        }

        const { id, ...dataToUpdate } = updateData;
        await updateDoc(doc(this.db, 'users', this.user.uid, 'taxis', taxiId, 'history', historyId), dataToUpdate);
    }

    async deleteHistory(taxiId, historyId) {
        if (this.isLocalMode) {
            const localData = localStorage.getItem('taxis');
            const taxis = localData ? JSON.parse(localData) : [];

            const updatedTaxis = taxis.map(t => {
                if (t.id === taxiId) {
                    const updatedHistory = (t.history || []).filter(h => String(h.id) !== String(historyId));
                    return { ...t, history: updatedHistory };
                }
                return t;
            });

            localStorage.setItem('taxis', JSON.stringify(updatedTaxis));
            return;
        }

        await deleteDoc(doc(this.db, 'users', this.user.uid, 'taxis', taxiId, 'history', historyId));
    }
}

export default StorageService;
