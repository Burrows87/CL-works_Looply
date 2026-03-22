import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
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

// --- 3. GESTIONE INTERFACCIA DINAMICA (LOGICA BOTTONI) ---

// Gestione Click sui Giorni (Toggle)
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('day-toggle')) {
        const btn = e.target;
        btn.classList.toggle('active');
        
        // Estraiamo l'ID (es. "ven" da "btn-ven")
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
});

// Gestione selezione bottoni fasce orarie
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('slot-btn')) {
        e.target.classList.toggle('selected');
    }
});

// --- 4. GESTIONE AUTENTICAZIONE ---
document.getElementById('btn-google-login').addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Errore durante il login:", error);
        alert("Errore nel login: assicurati di aver autorizzato il dominio su Firebase.");
    }
});

document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'block';
        userDisplayName.textContent = user.displayName;
        caricaDisponibilita(); 
    } else {
        loginScreen.style.display = 'block';
        dashboardScreen.style.display = 'none';
    }
});

// --- 5. SALVATAGGIO E LOGICA MATCH ---
document.getElementById('btn-save-event').addEventListener('click', async () => {
    const selectedSlots = [];
    
    // Raccogliamo gli slot dai bottoni selezionati
    document.querySelectorAll('.slot-btn.selected').forEach(btn => {
        selectedSlots.push({
            giorno: btn.dataset.day,
            fascia: btn.textContent
        });
    });

    if (selectedSlots.length === 0) return alert("Seleziona almeno un giorno e una fascia oraria!");

    try {
        await addDoc(collection(db, "eventi"), {
            nomeCreatore: auth.currentUser.displayName,
            creatoDa: auth.currentUser.uid,
            slot: selectedSlots,
            dataCreazione: new Date()
        });

        cercaMatchInTempoReale(selectedSlots);
        resetInterfaccia();
        alert("Disponibilità inviata con successo!");

    } catch (e) {
        console.error("Errore nel salvataggio:", e);
    }
});

// --- 6. FUNZIONE CERCA MATCH ---
function cercaMatchInTempoReale(mieiSlot) {
    const q = query(collection(db, "eventi"), where("creatoDa", "!=", auth.currentUser.uid));
    
    onSnapshot(q, (snapshot) => {
        snapshot.forEach((doc) => {
            const altro = doc.data();
            altro.slot.forEach(slotAltro => {
                mieiSlot.forEach(mioSlot => {
                    if (slotAltro.giorno === mioSlot.giorno && slotAltro.fascia === mioSlot.fascia) {
                        proponiWhatsApp(altro.nomeCreatore, mioSlot.giorno, mioSlot.fascia);
                    }
                });
            });
        });
    });
}

function proponiWhatsApp(nomeAmico, giorno, fascia) {
    const testo = `Ciao ${nomeAmico}, ho visto da Looply che siamo entrambi liberi ${giorno} (${fascia.toLowerCase()}), usciamo?`;
    const url = `https://wa.me/?text=${encodeURIComponent(testo)}`;

    if (confirm(`🎉 MATCH CON ${nomeAmico.toUpperCase()}!\nSiete entrambi liberi ${giorno} ${fascia}.\n\nVuoi scrivergli su WhatsApp?`)) {
        window.open(url, '_blank');
    }
}

// --- 7. VISUALIZZAZIONE LISTA ---
function caricaDisponibilita() {
    const q = query(collection(db, "eventi"), orderBy("dataCreazione", "desc"));
    
    onSnapshot(q, (snapshot) => {
        eventsList.innerHTML = "";
        if (snapshot.empty) {
            eventsList.innerHTML = "<p style='color:#999;'>Nessuno ha ancora dato disponibilità.</p>";
            return;
        }

        snapshot.forEach((doc) => {
            const disp = doc.data();
            const div = document.createElement('div');
            div.className = "card";
            div.style.borderLeft = "5px solid #42
