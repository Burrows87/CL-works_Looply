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

// --- 3. GESTIONE INTERFACCIA DINAMICA ---
// Mostra le fasce orarie solo quando il giorno è selezionato
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('day-check')) {
        const slotsDiv = document.getElementById(`slots-${e.target.id}`);
        if (slotsDiv) {
            slotsDiv.style.display = e.target.checked ? 'flex' : 'none';
            if (!e.target.checked) {
                slotsDiv.querySelectorAll('.slot-btn').forEach(btn => btn.classList.remove('selected'));
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

// --- 4. GESTIONE AUTENTICAZIONE (Risolto problema Loop) ---
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
        alert("Disponibilità salvata con successo!");

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
            div.style.borderLeft = "5px solid #4285F4";
            div.style.marginBottom = "10px";
            div.style.textAlign = "left";
            div.style.padding = "10px";
            
            const slotHtml = disp.slot.map(s => 
                `<span style="background:#e8f0fe; color:#1967d2; padding:2px 8px; border-radius:10px; font-size:0.75rem; margin-right:5px; display:inline-block; margin-top:5px;">
                    ${s.giorno} ${s.fascia}
                </span>`
            ).join("");

            div.innerHTML = `
                <strong style="color: #333;">${disp.nomeCreatore}</strong> è disponibile:<br>
                <div style="margin-top:5px;">${slotHtml}</div>
            `;
            eventsList.appendChild(div);
        });
    });
}

function resetInterfaccia() {
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.day-check').forEach(c => {
        c.checked = false;
        const slotsDiv = document.getElementById(`slots-${c.id}`);
        if(slotsDiv) slotsDiv.style.display = 'none';
    });
}
