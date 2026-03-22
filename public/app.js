import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. CONFIGURAZIONE (Metti i tuoi dati qui!) ---
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

// --- 3. GESTIONE AUTENTICAZIONE ---
document.getElementById('btn-google-login').addEventListener('click', () => signInWithRedirect(auth, provider));
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        userDisplayName.textContent = user.displayName;
        caricaEventi(); // Avvia la lettura dei dati quando l'utente entra
    } else {
        loginScreen.style.display = 'block';
        dashboardScreen.style.display = 'none';
    }
});

// --- 4. SALVATAGGIO NUOVO EVENTO ---
document.getElementById('btn-save-event').addEventListener('click', async () => {
    const titoloInput = document.getElementById('event-title');
    const checkboxes = document.querySelectorAll('.day-check:checked');
    const giorni = Array.from(checkboxes).map(cb => cb.nextElementSibling.textContent);

    if (!titoloInput.value) return alert("Inserisci un titolo!");

    try {
        await addDoc(collection(db, "eventi"), {
            titolo: titoloInput.value,
            giorni: giorni,
            creatoDa: auth.currentUser.uid,
            nomeCreatore: auth.currentUser.displayName,
            dataCreazione: new Date()
        });
        titoloInput.value = "";
        document.querySelectorAll('.day-check').forEach(cb => cb.checked = false);
    } catch (e) {
        console.error("Errore:", e);
    }
});

// --- 5. LETTURA EVENTI IN TEMPO REALE ---
function caricaEventi() {
    const q = query(collection(db, "eventi"), orderBy("dataCreazione", "desc"));
    
    // Questa funzione "ascolta" il database: se aggiungi un weekend, appare subito!
    onSnapshot(q, (snapshot) => {
        eventsList.innerHTML = "";
        if (snapshot.empty) {
            eventsList.innerHTML = "<p>Nessun weekend in programma. Creane uno!</p>";
            return;
        }

        snapshot.forEach((doc) => {
            const evento = doc.data();
            const div = document.createElement('div');
            div.className = "card";
            div.style.border = "1px solid #ddd";
            div.style.marginBottom = "10px";
            div.style.textAlign = "left";
            
            div.innerHTML = `
                <strong style="color: #4285F4;">${evento.titolo}</strong><br>
                <small>Disponibilità: ${evento.giorni.join(", ")}</small><br>
                <span style="font-size: 0.7rem; color: #999;">Creato da: ${evento.nomeCreatore}</span>
            `;
            eventsList.appendChild(div);
        });
    });
}
