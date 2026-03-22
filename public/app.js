import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. CONFIGURAZIONE ---
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
        caricaEventi(); 
    } else {
        loginScreen.style.display = 'block';
        dashboardScreen.style.display = 'none';
    }
});

// --- 4. LOGICA MATCH & SALVATAGGIO ---
document.getElementById('btn-save-event').addEventListener('click', async () => {
    const titoloInput = document.getElementById('event-title');
    const checkboxes = document.querySelectorAll('.day-check:checked');
    const giorni = Array.from(checkboxes).map(cb => cb.nextElementSibling.textContent);

    if (!titoloInput.value) return alert("Inserisci un nome per questo weekend!");
    if (giorni.length === 0) return alert("Seleziona almeno un giorno!");

    try {
        // Salva la tua disponibilità
        await addDoc(collection(db, "eventi"), {
            titolo: titoloInput.value,
            giorni: giorni,
            creatoDa: auth.currentUser.uid,
            nomeCreatore: auth.currentUser.displayName,
            dataCreazione: new Date()
        });

        // Cerca Match immediati con altri utenti
        cercaMatch(giorni, titoloInput.value);

        // Reset modulo
        titoloInput.value = "";
        document.querySelectorAll('.day-check').forEach(cb => cb.checked = false);
        alert("Disponibilità inviata! Sto cercando match...");

    } catch (e) {
        console.error("Errore:", e);
    }
});

// --- 5. FUNZIONE CERCA MATCH ---
function cercaMatch(mieiGiorni, mioTitolo) {
    // Cerchiamo eventi creati da altri
    const q = query(collection(db, "eventi"), where("creatoDa", "!=", auth.currentUser.uid));
    
    onSnapshot(q, (snapshot) => {
        snapshot.forEach((doc) => {
            const altroEvento = doc.data();
            // Controlla se ci sono giorni in comune
            const match = mieiGiorni.filter(g => altroEvento.giorni.includes(g));
            
            if (match.length > 0) {
                proponiWhatsApp(altroEvento.nomeCreatore, match[0]);
            }
        });
    });
}

// --- 6. POPUP WHATSAPP ---
function proponiWhatsApp(nomeAmico, giorno) {
    const testo = `Ciao ${nomeAmico}, ho visto da Looply che siamo liberi ${giorno} sera, usciamo?`;
    const url = `https://wa.me/?text=${encodeURIComponent(testo)}`;

    // Un popup semplice ma efficace
    const conferma = confirm(`🎉 MATCH! Anche ${nomeAmico} è libero ${giorno}.\n\nVuoi scrivergli su WhatsApp?`);
    
    if (conferma) {
        window.open(url, '_blank');
    }
}

// --- 7. VISUALIZZAZIONE LISTA ---
function caricaEventi() {
    const q = query(collection(db, "eventi"), orderBy("dataCreazione", "desc"));
    
    onSnapshot(q, (snapshot) => {
        eventsList.innerHTML = "";
        if (snapshot.empty) {
            eventsList.innerHTML = "<p style='color:#999;'>Nessuno ha ancora dato disponibilità.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            const evento = doc.data();
            const div = document.createElement('div');
            div.className = "card";
            div.style.borderLeft = "5px solid #4285F4";
            div.style.marginBottom = "10px";
            div.style.textAlign = "left";
            div.style.padding = "10px";
            
            div.innerHTML = `
                <strong style="color: #333;">${evento.nomeCreatore}</strong> è libero:<br>
                <span style="color: #4285F4; font-weight: bold;">${evento.giorni.join(" • ")}</span><br>
                <small style="color: #999;">${evento.titolo}</small>
            `;
            eventsList.appendChild(div);
        });
    });
}
