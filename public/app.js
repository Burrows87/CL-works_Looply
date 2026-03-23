import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, getDoc, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- 2. ELEMENTI DOM ---
const loginScreen = document.getElementById('login-screen');
const registrationScreen = document.getElementById('registration-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const userDisplayName = document.getElementById('user-display-name');
const googleLoginBtn = document.getElementById('btn-google-login');
const checkTerms = document.getElementById('check-terms');
const checkPrivacy = document.getElementById('check-privacy');

// --- 3. STATO APPLICAZIONE ---
let isLoggingOut = false;
let matchGiaMostrati = new Set();
let regSelectedDays = [];

// --- 4. GESTIONE AUTENTICAZIONE ---
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
            if (dati.giorniPreferiti) {
                dati.giorniPreferiti.forEach(g => {
                    const b = document.getElementById(`btn-${g}`);
                    const s = document.getElementById(`slots-${g}`);
                    if (b && s) { b.classList.add('active'); s.style.display = 'flex'; }
                });
            }
            // Ascolto match
            const q = query(collection(db, "eventi"), where("creatoDa", "==", user.uid));
            onSnapshot(q, (snap) => {
                let mieiSlot = [];
                snap.forEach(d => mieiSlot = mieiSlot.concat(d.data().slot));
                if (mieiSlot.length > 0) cercaMatch(mieiSlot);
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

// --- 5. LOGIN GOOGLE (LOGICA SICURA) ---
if (googleLoginBtn) {
    // Rimuoviamo il "disabled" forzato per evitare blocchi JS
    googleLoginBtn.disabled = false; 

    googleLoginBtn.onclick = async () => {
        if (!checkTerms.checked || !checkPrivacy.checked) {
            alert("Per favore, accetta i Termini e la Privacy per continuare.");
            return;
        }
        try {
            await signInWithPopup(auth, provider);
        } catch (e) {
            alert("Errore durante il login: " + e.message);
        }
    };
}

// --- 6. REGISTRAZIONE ---
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
            alert("Scegli massimo 3 giorni!");
        }
    };
});

const btnSaveProfile = document.getElementById('btn-save-profile');
if (btnSaveProfile) {
    btnSaveProfile.onclick = async () => {
        const nome = document.getElementById('reg-name').value;
        const tel = document.getElementById('reg-phone').value;
        if (!nome || tel.length < 10 || regSelectedDays.length === 0) {
            return alert("Completa tutti i campi e scegli 3 giorni!");
        }
        try {
            await setDoc(doc(db, "users", auth.currentUser.uid), {
                nome: nome.trim(),
                telefono: tel.replace(/\D/g, ''),
                giorniPreferiti: regSelectedDays,
                uid: auth.currentUser.uid,
                dataCreazione: new Date()
            });
            location.reload();
        } catch (e) { alert(e.message); }
    };
}

// --- 7. DASHBOARD E MATCH ---
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('day-toggle')) {
        e.target.classList.toggle('active');
        const s = document.getElementById(`slots-${e.target.id.replace('btn-', '')}`);
        if (s) s.style.display = e.target.classList.contains('active') ? 'flex' : 'none';
    }
    if (e.target.classList.contains('slot-btn')) e.target.classList.toggle('selected');
});

function cercaMatch(mieiSlot) {
    const oraSoglia = new Date();
    const diff = (oraSoglia.getDay() + 6) % 7;
    oraSoglia.setDate(oraSoglia.getDate() - diff);
    oraSoglia.setHours(1, 0, 0, 0);

    const q = query(collection(db, "eventi"), 
        where("creatoDa", "!=", auth.currentUser.uid),
        where("dataCreazione", ">=", oraSoglia)
    );
    onSnapshot(q, (snap) => {
        snap.forEach(docSnap => {
            const altro = docSnap.data();
            altro.slot.forEach(sA => {
                mieiSlot.forEach(sM => {
                    if (sA.giorno === sM.giorno && sA.fascia === sM.fascia) {
                        const key = `${docSnap.id}_${sA.giorno}_${sA.fascia}`;
                        if (!matchGiaMostrati.has(key)) {
                            matchGiaMostrati.add(key);
                            if(confirm(`Match con ${altro.nomeCreatore} per ${sA.giorno}! Scrivigli?`)) {
                                window.open(`https://wa.me/${altro.telefonoCreatore}?text=Ciao, ho visto su Looply che siamo liberi ${sA.giorno}!`, '_blank');
                            }
                        }
                    }
                });
            });
        });
    });
}

const btnSaveEvent = document.getElementById('btn-save-event');
if (btnSaveEvent) {
    btnSaveEvent.onclick = async () => {
        const sel = [];
        document.querySelectorAll('.slot-btn.selected').forEach(b => {
            sel.push({ giorno: b.dataset.day, fascia: b.textContent.trim() });
        });
        if (sel.length === 0) return alert("Seleziona orari!");
        const u = (await getDoc(doc(db, "users", auth.currentUser.uid))).data();
        await addDoc(collection(db, "eventi"), {
            nomeCreatore: u.nome, telefonoCreatore: u.telefono, creatoDa: auth.currentUser.uid, slot: sel, dataCreazione: new Date()
        });
        alert("Salvato!");
        location.reload();
    };
}

// --- 8. IMPOSTAZIONI E LOGOUT ---
const btnSettings = document.getElementById('btn-open-settings');
const panel = document.getElementById('settings-panel');
if (btnSettings) {
    btnSettings.onclick = () => panel.style.display = (panel.style.display === 'block' ? 'none' : 'block');
}

document.querySelectorAll('.set-day-btn').forEach(btn => {
    btn.onclick = async () => {
        const ref = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(ref);
        let giorni = docSnap.data().giorniPreferiti || [];
        const d = btn.dataset.day;
        if (giorni.includes(d)) giorni = giorni.filter(x => x !== d);
        else if (giorni.length < 3) giorni.push(d);
        else return alert("Max 3!");
        await updateDoc(ref, { giorniPreferiti: giorni });
        btn.classList.toggle('selected');
    };
});

document.getElementById('btn-logout').onclick = async () => {
    isLoggingOut = true;
    await signOut(auth);
    location.reload();
};

const applyThemeColor = (c) => document.documentElement.style.setProperty('--primary-color', c);
