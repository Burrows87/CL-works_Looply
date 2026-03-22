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

// --- 3. GESTIONE INTERFACCIA ---
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('day-toggle')) {
        const btn = e.target;
        btn.classList.toggle('active');
        const dayId = btn.id.replace('btn-', '');
        // Usiamo i nomi completi come venerdi, sabato, domenica per matchare l'HTML
        const slotsDiv = document.getElementById(`slots-${dayId}`);
        if (slotsDiv) {
            slotsDiv.style.display = btn.classList.contains('active') ? 'flex' : 'none';
        }
    }
    if (e.target.classList.contains('slot-btn')) {
        e.target.classList.toggle('selected');
    }
});

// --- 4. AUTENTICAZIONE ---
let isLoggingOut = false;

onAuthStateChanged(auth, (user) => {
    if (user && !isLoggingOut) {
        loginScreen.style.setProperty('display', 'none', 'important');
        dashboardScreen.style.setProperty('display', 'block', 'important');
        userDisplayName.textContent = user.displayName;
    } else {
        loginScreen.style.setProperty('display', 'block', 'important');
        dashboardScreen.style.setProperty('display', 'none', 'important');
        isLoggingOut = false;
    }
});

document.getElementById('btn-google-login').addEventListener('click', async () => {
    // Controllo di sicurezza: procedi solo se le checkbox sono attive
    const terms = document.getElementById('check-terms').checked;
    const privacy = document.getElementById('check-privacy').checked;

    if (terms && privacy) {
        try {
            provider.setCustomParameters({ prompt: 'select_account' });
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Errore login:", error);
        }
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    isLoggingOut = true;
    signOut(auth);
});

// --- 5. SALVATAGGIO E MATCH ---
document.getElementById('btn-save-event').onclick = async () => {
    const selectedSlots = [];
    document.querySelectorAll('.slot-btn.selected').forEach(btn => {
        selectedSlots.push({ 
            giorno: btn.dataset.day, 
            fascia: btn.textContent.trim() 
        });
    });

    if (selectedSlots.length === 0) return alert("Seleziona almeno un orario!");

    try {
        await addDoc(collection(db, "eventi"), {
            nomeCreatore: auth.currentUser.displayName,
            creatoDa: auth.currentUser.uid,
            slot: selectedSlots,
            dataCreazione: new Date()
        });
        
        // Cerca i match in tempo reale subito dopo il salvataggio
        cercaMatchInTempoReale(selectedSlots); 

        alert("Disponibilità salvata! Se un amico coincide, riceverai un avviso.");
        resetInterfaccia();
    } catch (e) { 
        console.error("Errore salvataggio:", e); 
        alert("Errore: " + e.message);
    }
};

// --- 6. LOGICA MATCH ---
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
    const testo = `Ciao ${nomeAmico}, ho visto su Looply che siamo entrambi liberi ${giorno} (${fascia.toLowerCase()}), usciamo?`;
    const url = `https://wa.me/?text=${encodeURIComponent(testo)}`;
    if (confirm(`🎉 MATCH CON ${nomeAmico.toUpperCase()}!\nVuoi scrivergli su WhatsApp?`)) {
        window.location.href = url;
    }
}

function resetInterfaccia() {
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.day-toggle').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.time-slots').forEach(d => d.style.display = 'none');
}

// --- 7. LOGICA PRIVACY CHECK ---
const btnLogin = document.getElementById('btn-google-login');
const checkTerms = document.getElementById('check-terms');
const checkPrivacy = document.getElementById('check-privacy');

function validaCheck() {
    btnLogin.disabled = !(checkTerms.checked && checkPrivacy.checked);
}

if (checkTerms && checkPrivacy) {
    checkTerms.onchange = validaCheck;
    checkPrivacy.onchange = validaCheck;
}
