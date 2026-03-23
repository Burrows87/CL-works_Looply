import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDoc, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// --- 2. STATO ---
let isLoggingOut = false;
let regSelectedDays = [];

// --- 3. AUTENTICAZIONE E CARICAMENTO ---
onAuthStateChanged(auth, async (user) => {
    const loginSc = document.getElementById('login-screen');
    const regSc = document.getElementById('registration-screen');
    const dashSc = document.getElementById('dashboard-screen');
    const userDisp = document.getElementById('user-display-name');

    if (user && !isLoggingOut) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().nome) {
                const dati = userDoc.data();
                
                // UI Switch
                loginSc.style.display = 'none';
                regSc.style.display = 'none';
                dashSc.style.display = 'block';
                userDisp.textContent = dati.nome;

                // 1. Applica Colore Tema
                if (dati.temaColore) {
                    document.documentElement.style.setProperty('--primary-color', dati.temaColore);
                    document.querySelector(`.color-dot[data-color="${dati.temaColore}"]`)?.classList.add('selected');
                }

                // 2. Filtro Giorni Preferiti
                document.querySelectorAll('.day-group').forEach(group => group.style.display = 'none');
                if (dati.giorniPreferiti) {
                    dati.giorniPreferiti.forEach(giorno => {
                        const giornoBox = document.getElementById(`btn-${giorno}`)?.closest('.day-group');
                        if (giornoBox) giornoBox.style.display = 'block';
                        document.querySelector(`.set-day-btn[data-day="${giorno}"]`)?.classList.add('selected');
                    });
                }
            } else {
                loginSc.style.display = 'none';
                dashSc.style.display = 'none';
                regSc.style.display = 'block';
            }
        } catch(e) { console.error("Errore caricamento user:", e); }
    } else {
        loginSc.style.display = 'flex';
        dashSc.style.display = 'none';
        regSc.style.display = 'none';
    }
});

// --- 4. GESTIONE CLICK GLOBALE ---
window.addEventListener('click', async (e) => {
    
    // CAMBIO COLORE
    if (e.target.classList.contains('color-dot')) {
        const newColor = e.target.dataset.color;
        document.documentElement.style.setProperty('--primary-color', newColor);
        document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
        e.target.classList.add('selected');
        const userRef = doc(db, "users", auth.currentUser.uid);
        await updateDoc(userRef, { temaColore: newColor });
    }

    // LOGIN
    if (e.target.closest('#btn-google-login')) {
        if (!document.getElementById('check-terms').checked || !document.getElementById('check-privacy').checked) {
            return alert("Accetta Termini e Privacy!");
        }
        await signInWithPopup(auth, provider);
    }

    // LOGOUT
    if (e.target.id === 'btn-logout') {
        isLoggingOut = true;
        await signOut(auth);
        location.reload();
    }

    // TOGGLE GIORNI DASHBOARD
    if (e.target.classList.contains('day-toggle')) {
        e.target.classList.toggle('active');
        const dayId = e.target.id.replace('btn-', '');
        const sDiv = document.getElementById(`slots-${dayId}`);
        if (sDiv) sDiv.style.display = e.target.classList.contains('active') ? 'flex' : 'none';
    }

    // SELEZIONE SLOT
    if (e.target.classList.contains('slot-btn')) {
        e.target.classList.toggle('selected');
    }

    // APRI SETTINGS
    if (e.target.id === 'btn-open-settings' || e.target.closest('#btn-open-settings')) {
        const panel = document.getElementById('settings-panel');
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    }

    // CAMBIO GIORNI (SETTINGS)
    if (e.target.classList.contains('set-day-btn')) {
        const day = e.target.dataset.day;
        const userRef = doc(db, "users", auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        let giorni = userSnap.data().giorniPreferiti || [];

        if (giorni.includes(day)) {
            giorni = giorni.filter(d => d !== day);
        } else if (giorni.length < 3) {
            giorni.push(day);
        } else {
            return alert("Massimo 3 giorni!");
        }
        await updateDoc(userRef, { giorniPreferiti: giorni });
        location.reload(); 
    }

    // REGISTRAZIONE GIORNI (INITIAL)
    if (e.target.classList.contains('reg-day-btn')) {
        const day = e.target.dataset.day;
        if (regSelectedDays.includes(day)) {
            regSelectedDays = regSelectedDays.filter(d => d !== day);
            e.target.classList.remove('selected');
        } else if (regSelectedDays.length < 3) {
            regSelectedDays.push(day);
            e.target.classList.add('selected');
        }
    }
});

// --- 5. SALVATAGGIO ---

// Salva Profilo
document.getElementById('btn-save-profile').onclick = async () => {
    const nome = document.getElementById('reg-name').value;
    const tel = document.getElementById('reg-phone').value;
    if (!nome || !tel || regSelectedDays.length === 0) return alert("Dati incompleti!");
    await setDoc(doc(db, "users", auth.currentUser.uid), {
        nome, telefono: tel.replace(/\D/g, ''), giorniPreferiti: regSelectedDays, uid: auth.currentUser.uid, temaColore: "#4285F4"
    });
    location.reload();
};

// Salva Evento e WhatsApp
document.getElementById('btn-save-event').onclick = async () => {
    const sel = [];
    const groupedSlots = {};
    document.querySelectorAll('.slot-btn.selected').forEach(b => {
        const g = b.dataset.day;
        const f = b.textContent.trim();
        sel.push({ giorno: g, fascia: f });
        if (!groupedSlots[g]) groupedSlots[g] = [];
        groupedSlots[g].push(f);
    });

    if (sel.length === 0) return alert("Seleziona un orario!");
    
    const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
    const u = userSnap.data();

    await addDoc(collection(db, "eventi"), {
        nomeCreatore: u.nome, telefonoCreatore: u.telefono, creatoDa: auth.currentUser.uid, slot: sel, dataCreazione: new Date()
    });

    // WhatsApp logic
    let msg = `Ciao! Sono *${u.nome}*, ecco le mie disponibilità:\n\n`;
    for (const g in groupedSlots) { msg += `📅 *${g}*: ${groupedSlots[g].join(", ")}\n`; }
    msg += `\nOrganizziamo? 🚀`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    alert("Inviato!");
    location.reload();
};
