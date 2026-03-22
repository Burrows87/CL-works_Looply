import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. CONFIGURAZIONE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.appspot.com",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- 2. ELEMENTI HTML ---
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const userDisplayName = document.getElementById('user-display-name');
const eventsList = document.getElementById('events-list');

// --- 3. GESTIONE INTERFACCIA (TOGGLE GIORNI E SLOT) ---

document.addEventListener('click', (e) => {
    // Click sul Giorno (es. Venerdì)
    if (e.target.classList.contains('day-toggle')) {
        const btn = e.target;
        btn.classList.toggle('active');
        
        const dayId = btn.id.replace('btn-', '');
        const slotsDiv = document.getElementById(`slots-${dayId}`);
        
        if (slotsDiv) {
            if (btn.classList.contains('active')) {
                slotsDiv.style.display = 'flex';
            } else {
                slotsDiv.style.display = 'none';
                // Reset delle fasce orarie se chiudo il giorno
                slotsDiv.querySelectorAll('.slot-btn').forEach(s => s.classList.remove('selected'));
            }
        }
    }

    // Click sulla Fascia Oraria (es. Sera)
    if (e.target.classList.contains('slot-btn')) {
        e.target.classList.toggle('selected');
    }
});

// --- 4. GESTIONE AUTENTICAZIONE (Versione Anti-Loop) ---

let isAppReady = false; // Flag per evitare loop durante il caricamento

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Accesso confermato per:", user.displayName);
        
        // Cambiamo schermata solo se non siamo già in dashboard
        if (dashboardScreen.style.display !== 'block') {
            loginScreen.style.display = 'none';
            dashboardScreen.style.display = 'block';
            userDisplayName.textContent = user.displayName;
            caricaDisponibilita();
        }
    } else {
        console.log("Nessun utente rilevato, mostro login.");
        loginScreen.style.display = 'block';
        dashboardScreen.style.display = 'none';
    }
    isAppReady = true;
});


// Logout
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

// Ascoltatore Stato Autenticazione
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Utente loggato:", user.displayName);
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        userDisplayName.textContent = user.displayName;
        caricaDisponibilita(); 
    } else {
        console.log("Utente non loggato");
        loginScreen.style.display = 'block';
        dashboardScreen.style.display = 'none';
    }
});

// --- 5. SALVATAGGIO DISPONIBILITÀ E MATCH ---

document.getElementById('btn-save-event').addEventListener('click', async () => {
    const selectedSlots = [];
    
    // Raccogliamo tutti i bottoni con classe .selected
    document.querySelectorAll('.slot-btn.selected').forEach(btn => {
        selectedSlots.push
