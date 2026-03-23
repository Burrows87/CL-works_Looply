import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDoc, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const registrationScreen = document.getElementById('registration-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const userDisplayName = document.getElementById('user-display-name');
const googleLoginBtn = document.getElementById('btn-google-login');
const checkTerms = document.getElementById('check-terms');
const checkPrivacy = document.getElementById('check-privacy');
const btnSaveProfile = document.getElementById('btn-save-profile');
const btnSaveEvent = document.getElementById('btn-save-event');
const btnSettings = document.getElementById('btn-open-settings');
const settingsPanel = document.getElementById('settings-panel');
const logoutBtn = document.getElementById('btn-logout');

// --- 3. VARIABILI DI STATO ---
let isLoggingOut = false;
let matchGiaMostrati = new Set(); 
let regSelectedDays = [];

// --- 4. LOGICA ACCESSO (SBLOCCO PULSANTE) ---
function validaCheck() { 
    if (googleLoginBtn && checkTerms && checkPrivacy) {
        const accettato = checkTerms.checked && checkPrivacy.checked;
        googleLoginBtn.disabled = !accettato;
        googleLoginBtn.style.opacity = accettato ? "1" : "0.5";
        googleLoginBtn.style.cursor = accettato ? "pointer" : "not-allowed";
    }
}

if (checkTerms && checkPrivacy) {
    checkTerms.addEventListener('change', validaCheck);
    checkPrivacy.addEventListener('change', validaCheck);
    validaCheck(); // Controllo immediato al caricamento
}

// --- 5. GESTIONE AUTENTICAZIONE ---
onAuthStateChanged(auth, async (user) => {
    if (user && !isLoggingOut) {
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists() && userDoc.data().nome) {
            const dati = userDoc.data();
            loginScreen.style.display = 'none';
            registrationScreen.style.display = 'none';
            dashboardScreen.style.display = 'block';
            
            userDisplayName.textContent = dati.nome;
            if (dati.themeColor) applyThemeColor(dati.themeColor);

            // Apertura automatica giorni preferiti
            if (dati.giorniPreferiti) {
                dati.giorniPreferiti.forEach(giorno => {
                    const btn = document.getElementById(`btn-${giorno}`);
                    const slots = document.getElementById(`slots-${giorno}`);
                    if (btn && slots) {
                        btn.classList.add('active');
                        slots.style.display = 'flex';
                    }
                });
            }

            // Ascolto match in tempo reale
            const qMiei = query(collection(db, "eventi"), where("creatoDa", "==", user.uid));
            onSnapshot(qMiei, (snapshot) => {
                let mieiSlot = [];
                snapshot.forEach(docSnap => mieiSlot = mieiSlot.concat(docSnap.data().slot));
                if (mieiSlot.length > 0) cercaMatchInTempoReale(mieiSlot);
            });
        } else {
            loginScreen.style.display = 'none';
            dashboardScreen.style.display = 'none';
            registrationScreen.style.display = 'block';
        }
    } else {
        loginScreen.style.display = 'flex';
        dashboardScreen.style.display = 'none';
        registrationScreen.style.display = 'none';
    }
});

// --- 6. REGISTRAZIONE PROFILO ---
document.querySelectorAll('.reg-day-btn').forEach(btn => {
    btn.onclick = () => {
        const day = btn.dataset.day;
        if (regSelectedDays.includes(day)) {
            regSelectedDays = regSelectedDays.filter(d => d !== day);
            btn.classList.remove('selected');
        } else if (regSelectedDays.length < 3) {
            regSelectedDays.push(day);
            btn.classList.add('selected');
        } else {
            alert("Puoi scegliere massimo 3 giorni!");
        }
    };
});

if (btnSaveProfile) {
    btnSaveProfile.onclick = async () => {
        const nome = document.getElementById('reg-name').value;
        const tel = document.getElementById('reg-phone').value;
        if (!nome || tel.length < 10 || regSelectedDays.length === 0) return alert("Inserisci tutti i dati e i 3 giorni!");

        try {
            await setDoc(doc(db, "users", auth.currentUser.uid), {
                nome: nome.trim(),
                telefono: tel.replace(/\D/g, ''),
                giorniPreferiti: regSelectedDays,
                uid: auth.currentUser.uid,
                dataCreazione: new Date()
            });
            location.reload();
        } catch (e) { alert("Errore: " + e.message); }
    };
}

// --- 7. LOGICA MATCH E WHATSAPP ---
function cercaMatchInTempoReale(mieiSlot) {
    const oraSoglia = new Date();
    const diff = (oraSoglia.getDay() + 6) % 7;
    oraSoglia.setDate(oraSoglia.getDate() - diff);
    oraSoglia.setHours(1, 0, 0, 0);

    const q = query(collection(db, "eventi"), 
        where("creatoDa", "!=", auth.currentUser.uid),
        where("dataCreazione", ">=", oraSoglia)
    );
    
    onSnapshot(q, (snapshot) => {
        snapshot.forEach((docSnap) => {
            const altro = docSnap.data();
            altro.slot.forEach(sA => {
                mieiSlot.forEach(sM => {
                    if (sA.giorno === sM.giorno && sA.fascia === sM.fascia) {
                        const key = `${docSnap.id}_${sA.giorno}_${sA.fascia}`;
                        if (!matchGiaMostrati.has(key)) {
                            matchGiaMostrati.add(key);
                            proponiWhatsApp(altro.nomeCreatore, altro.telefonoCreatore, sA.giorno, sA.fascia);
                        }
                    }
                });
            });
        });
    });
}

function proponiWhatsApp(n, t, g, f) {
    const msg = `Ciao ${n}, ho visto su Looply che siamo liberi ${g} (${f.toLowerCase()}), usciamo?`;
    if(confirm(`Match con ${n} per ${g}! Vuoi scrivergli?`)) {
        window.open(`https://wa.me/${t}?text=${encodeURIComponent(msg)}`, '_blank');
    }
}

// --- 8. INTERFACCIA DASHBOARD ---
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('day-toggle')) {
        e.target.classList.toggle('active');
        const slots = document.getElementById(`slots-${e.target.id.replace('btn-', '')}`);
        if (slots) slots.style.display = e.target.classList.contains('active') ? 'flex' : 'none';
    }
    if (e.target.classList.contains('slot-btn')) {
        e.target.classList.toggle('selected');
    }
});

if (btnSaveEvent) {
    btnSaveEvent.onclick = async () => {
        const sel = [];
        document.querySelectorAll('.slot-btn.selected').forEach(b => {
            sel.push({ giorno: b.dataset.day, fascia: b.textContent.trim() });
        });
        if (sel.length === 0) return alert("Seleziona almeno un orario!");
        try {
            const u = (await getDoc(doc(db, "users", auth.currentUser.uid))).data();
            await addDoc(collection(db, "eventi"), {
                nomeCreatore: u.nome, telefonoCreatore: u.telefono, creatoDa: auth.currentUser.uid, slot: sel, dataCreazione: new Date()
            });
            alert("Disponibilità salvata!");
            location.reload();
        } catch (e) { alert(e.message); }
    };
}

// --- 9. IMPOSTAZIONI ---
if (btnSettings && settingsPanel) {
    btnSettings.onclick = async () => {
        const isHidden = settingsPanel.style.display === 'none' || settingsPanel.style.display === '';
        settingsPanel.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            const pref = userDoc.data().giorniPreferiti || [];
            document.querySelectorAll('.set-day-btn').forEach(b => {
                b.classList.toggle('selected', pref.includes(b.dataset.day));
            });
        }
    };
}

document.querySelectorAll('.set-day-btn').forEach(btn => {
    btn.onclick = async () => {
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userDoc = await getDoc(userRef);
        let giorni = userDoc.data().giorniPreferiti || [];
        const day = btn.dataset.day;

        if (giorni.includes(day)) {
            giorni = giorni.filter(d => d !== day);
        } else if (giorni.length < 3) {
            giorni.push(day);
        } else {
            return alert("Massimo 3 giorni!");
        }
        await updateDoc(userRef, { giorniPreferiti: giorni });
        btn.classList.toggle('selected');
    };
});

// --- 10. AZIONI FINALI (LOGIN/LOGOUT) ---
if (googleLoginBtn) {
    googleLoginBtn.onclick = async () => {
        try { await signInWithPopup(auth, provider); } catch (e) { alert("Errore: " + e.message); }
    };
}

if (logoutBtn) {
    logoutBtn.onclick = async () => {
        isLoggingOut = true;
        await signOut(auth);
        location.reload();
    };
}

const applyThemeColor = (c) => { document.documentElement.style.setProperty('--primary-color', c); };
        
