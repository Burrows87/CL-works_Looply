// 1. IMPORTAZIONI (Tutte insieme in alto)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// Aggiungiamo Firestore qui
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. CONFIGURAZIONE (Usa la tua config esistente)
const firebaseConfig = {
    apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.appspot.com",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// 3. INIZIALIZZAZIONE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app); // Inizializziamo il database
const provider = new GoogleAuthProvider();

// --- LOGICA DI AUTENTICAZIONE ---

const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const userDisplayName = document.getElementById('user-display-name');

// Gestione Login
document.getElementById('btn-google-login').addEventListener('click', () => {
    signInWithRedirect(auth, provider);
});

// Gestione Logout
document.getElementById('btn-logout').addEventListener('click', () => {
    signOut(auth);
});

// Controllo stato utente (chi è loggato?)
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        userDisplayName.textContent = user.displayName;
    } else {
        loginScreen.style.display = 'block';
        dashboardScreen.style.display = 'none';
    }
});

// --- NUOVA LOGICA: SALVATAGGIO DISPONIBILITÀ ---

document.getElementById('btn-save-event').addEventListener('click', async () => {
    const titoloInput = document.getElementById('event-title');
    const titolo = titoloInput.value;
    
    // Recuperiamo i giorni selezionati
    const checkboxEsito = document.querySelectorAll('.day-check:checked');
    const giorniSelezionati = Array.from(checkboxEsito).map(cb => cb.value);

    if (!titolo) {
        alert("Per favore, inserisci un nome per l'evento!");
        return;
    }

    try {
        const docRef = await addDoc(collection(db, "eventi"), {
            titolo: titolo,
            giorni: giorniSelezionati,
            creatoDa: auth.currentUser.uid, // Salviamo chi ha creato l'evento
            nomeCreatore: auth.currentUser.displayName,
            timestamp: new Date()
        });
        
        alert("Grande! Evento '" + titolo + "' salvato.");
        
        // Puliamo il modulo dopo il salvataggio
        titoloInput.value = "";
        document.querySelectorAll('.day-check').forEach(cb => cb.checked = false);
        
    } catch (e) {
        console.error("Errore nel salvataggio: ", e);
        alert("Ops! Qualcosa è andato storto nel salvataggio.");
    }
});
