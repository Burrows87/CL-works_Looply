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

// --- 2. STATO ---
let isLoggingOut = false;
let matchGiaMostrati = new Set();
let regSelectedDays = [];

// --- 3. AUTENTICAZIONE ---
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
                if(loginSc) loginSc.style.display = 'none';
                if(regSc) regSc.style.display = 'none';
                if(dashSc) dashSc.style.display = 'block';
                if(userDisp) userDisp.textContent = dati.nome;
                
                // Carica preferenze
                if (dati.themeColor) document.documentElement.style.setProperty('--primary-color', dati.themeColor);
                if (dati.giorniPreferiti) {
                    dati.giorniPreferiti.forEach(g => {
                        const b = document.getElementById(`btn-${g}`);
                        const s = document.getElementById(`slots-${g}`);
                        if (b && s) { b.classList.add('active'); s.style.display = 'flex'; }
                    });
                }
            } else {
                if(loginSc) loginSc.style.display = 'none';
                if(dashSc) dashSc.style.display = 'none';
                if(regSc) regSc.style.display = 'block';
            }
        } catch(e) { console.error("Errore Auth:", e); }
    } else {
        if(loginSc) loginSc.style.display = 'flex';
        if(dashSc) dashSc.style.display = 'none';
        if(regSc) regSc.style.display = 'none';
    }
});

// --- 4. IL CUORE DEL PROBLEMA: LOGIN ---
// Usiamo window.onclick per essere sicuri che l'evento venga catturato
window.addEventListener('click', async (e) => {
    // Se clicchi il bottone login
    if (e.target.id === 'btn-google-login' || e.target.closest('#btn-google-login')) {
        const cTerms = document.getElementById('check-terms');
        const cPrivacy = document.getElementById('check-privacy');

        if (cTerms && cPrivacy && (!cTerms.checked || !cPrivacy.checked)) {
            alert("Accetta Termini e Privacy per continuare!");
            return;
        }

        try {
            console.log("Tentativo di login in corso...");
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error(error);
            alert("Errore Google: " + error.message);
        }
    }

    // Gestione Logout
    if (e.target.id === 'btn-logout') {
        isLoggingOut = true;
        await signOut(auth);
        location.reload();
    }

    // Toggle Giorni in Dashboard
    if (e.target.classList.contains('day-toggle')) {
        e.target.classList.toggle('active');
        const dayId = e.target.id.replace('btn-', '');
        const sDiv = document.getElementById(`slots-${dayId}`);
        if (sDiv) sDiv.style.display = e.target.classList.contains('active') ? 'flex' : 'none';
    }

    // Selezione Slot
    if (e.target.classList.contains('slot-btn')) {
        e.target.classList.toggle('selected');
    }
});

// --- 5. REGISTRAZIONE E SALVATAGGIO ---
// Gestione giorni registrazione (delegata)
window.addEventListener('click', (e) => {
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

const saveProf = document.getElementById('btn-save-profile');
if (saveProf) {
    saveProf.onclick = async () => {
        const nome = document.getElementById('reg-name')?.value;
        const tel = document.getElementById('reg-phone')?.value;
        if (!nome || !tel || regSelectedDays.length === 0) return alert("Mancano dati!");
        await setDoc(doc(db, "users", auth.currentUser.uid), {
            nome, telefono: tel.replace(/\D/g, ''), giorniPreferiti: regSelectedDays, uid: auth.currentUser.uid
        });
        location.reload();
    };
}
