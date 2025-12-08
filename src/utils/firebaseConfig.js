import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBrTIqPjwLVVZNjSmsQ770kj-MDyvm7o-E",
    authDomain: "royalcar-49e2e.firebaseapp.com",
    projectId: "royalcar-49e2e",
    storageBucket: "royalcar-49e2e.firebasestorage.app",
    messagingSenderId: "931717650876",
    appId: "1:931717650876:web:30afca96d09d94f960b3b9",
    measurementId: "G-5F17KGGRJP"
};

// Initialize Firebase
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
