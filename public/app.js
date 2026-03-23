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
        const slotsDiv = document.getElementById(`slots-${dayId}`);
        if (slotsDiv) {
            slotsDiv.style.display = btn.classList.contains('active') ? 'flex' : 'none';
        }
    }
    if (e.target.classList.contains('slot-btn')) {
        e.target.classList.toggle('selected');
    }
});

const applyThemeColor = (color) => {
    if (!color) return;
    document.documentElement.style.setProperty('--primary-color', color);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', color);
};

// --- 4. AUTENTICAZIONE E REGISTRAZIONE ---
let isLoggingOut = false;
let matchGiaMostrati = new Set(); 

onAuthStateChanged(auth, async (user) => {
    if (user && !isLoggingOut) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().nome) {
            const dati = userDoc.data();
            if (loginScreen) loginScreen.style.display = 'none';
            if (document.getElementById('registration-screen')) document.getElementById('registration-screen').style.display = 'none';
            if (dashboardScreen) dashboardScreen.style.display = 'block';
            
            if (userDisplayName) userDisplayName.textContent = dati.nome;
            if (dati.themeColor) applyThemeColor(dati.themeColor);

            const qMiei = query(collection(db, "eventi"), where("creatoDa", "==", user.uid));
            onSnapshot(qMiei, (snapshot) => {
                let mieiSlotAttuali = [];
                snapshot.forEach(doc => {
                    mieiSlotAttuali = mieiSlotAttuali.concat(doc.data().slot);
                });
                if (mieiSlotAttuali.length > 0) {
                    cercaMatchInTempoReale(mieiSlotAttuali);
                }
            });
        } else {
            if (loginScreen) loginScreen.style.display = 'none';
            if (dashboardScreen) dashboardScreen.style.display = 'none';
            if (document.getElementById('registration-screen')) document.getElementById('registration-screen').style.display = 'block';
        }
    } else {
        if (loginScreen) loginScreen.style.display = 'block';
        if (dashboardScreen) dashboardScreen.style.display = 'none';
        if (document.getElementById('registration-screen')) document.getElementById('registration-screen').style.display = 'none';
    }
});

// --- 5. SALVATAGGIO PROFILO ED EVENTI ---
const btnSaveProfile = document.getElementById('btn-save-profile');
if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', async () => {
        const nomeScelto = document.getElementById('reg-name').value;
        const telScelto = document.getElementById('reg-phone').value;
        const user = auth.currentUser;
        if (!user) return;
        let telPulito = telScelto.replace(/\D/g, '');
        if (telPulito.length === 10 && !telPulito.startsWith('39')) telPulito = '39' + telPulito;
        if (nomeScelto.trim().length < 2 || telPulito.length < 10) return alert("Dati non validi.");
        try {
            await setDoc(doc(db, "users", user.uid), {
                nome: nomeScelto.trim(), telefono: telPulito, email: user.email, uid: user.uid, dataCreazione: new Date()
            });
            location.reload();
        } catch (e) { console.error(e); }
    });
}

const btnSaveEvent = document.getElementById('btn-save-event');
if (btnSaveEvent) {
    btnSaveEvent.onclick = async () => {
        const selectedSlots = [];
        document.querySelectorAll('.slot-btn.selected').forEach(btn => {
            selectedSlots.push({ giorno: btn.dataset.day, fascia: btn.textContent.trim() });
        });
        if (selectedSlots.length === 0) return alert("Seleziona almeno un orario!");
        try {
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            const userData = userDoc.data();
            await addDoc(collection(db, "eventi"), {
                nomeCreatore: userData.nome, telefonoCreatore: userData.telefono, creatoDa: auth.currentUser.uid, slot: selectedSlots, dataCreazione: new Date()
            });
            alert("Salvato!");
            resetInterfaccia();
        } catch (e) { alert("Errore: " + e.message); }
    };
}

// --- 6. LOGICA MATCH (VERSIONE CON NOTIFICA PERSONALIZZATA) ---
let matchGiaMostrati = new Set(); 

function cercaMatchInTempoReale(mieiSlot) {
    if (!mieiSlot || mieiSlot.length === 0) return;

    // Cerchiamo tutti gli eventi che NON sono stati creati da me
    const q = query(collection(db, "eventi"), where("creatoDa", "!=", auth.currentUser.uid));
    
    onSnapshot(q, (snapshot) => {
        snapshot.forEach((doc) => {
            const altro = doc.data();
            const altroId = doc.id; // ID unico dell'evento dell'amico

            altro.slot.forEach(slotAltro => {
                mieiSlot.forEach(mioSlot => {
                    // Controllo coincidenza Giorno + Fascia
                    if (slotAltro.giorno === mioSlot.giorno && slotAltro.fascia === mioSlot.fascia) {
                        
                        // Chiave univoca per non ripetere lo stesso match finché non si ricarica
                        const matchKey = `${altroId}_${mioSlot.giorno}_${mioSlot.fascia}`;
                        
                        if (!matchGiaMostrati.has(matchKey)) {
                            matchGiaMostrati.add(matchKey);
                            proponiWhatsApp(altro.nomeCreatore, altro.telefonoCreatore, mioSlot.giorno, mioSlot.fascia);
                        }
                    }
                });
            });
        });
    });
}

function proponiWhatsApp(nomeAmico, numeroAmico, giorno, fascia) {
    const numeroPulito = String(numeroAmico).replace(/\D/g, '');
    const testo = `Ciao ${nomeAmico}, ho visto su Looply che siamo entrambi liberi ${giorno} (${fascia.toLowerCase()}), usciamo?`;
    const url = `https://wa.me/${numeroPulito}?text=${encodeURIComponent(testo)}`;

    // Rimuoviamo eventuali toast precedenti per non sovrapporli
    const vecchioToast = document.getElementById('match-toast');
    if (vecchioToast) vecchioToast.remove();

    // Creiamo il contenitore del Toast (Notifica in-app)
    const toast = document.createElement('div');
    toast.id = 'match-toast';
    toast.style = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: white; color: #333; padding: 20px; border-radius: 15px;
        z-index: 10000; width: 92%; max-width: 350px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
        border: 1px solid #eee;
        animation: slideUp 0.4s ease-out;
    `;

    toast.innerHTML = `
        <div style="font-size: 1.2rem; margin-bottom: 10px;">🎉 <strong>Match con ${nomeAmico}!</strong></div>
        <div style="font-size: 0.9rem; color: #666; margin-bottom: 20px;">
            Siete entrambi liberi <strong>${giorno}</strong> (${fascia.toLowerCase()}).
        </div>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="btn-wa-ok" style="background: #25D366; color: white; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; font-weight: bold; flex: 1; font-size: 0.9rem;">
                SCRIVI
            </button>
            <button id="btn-wa-no" style="background: #f0f0f0; color: #666; border: none; padding: 12px 20px; border-radius: 10px; cursor: pointer; flex: 1; font-size: 0.9rem;">
                DOPO
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    // Gestione Pulsante SCRIVI (Apre WhatsApp)
    document.getElementById('btn-wa-ok').onclick = () => {
        window.open(url, '_blank');
        toast.remove();
    };

    // Gestione Pulsante DOPO (Chiude solo il toast)
    document.getElementById('btn-wa-no').onclick = () => {
        toast.remove();
    };

    // Vibrazione tattile se supportata
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

function resetInterfaccia() {
    // Pulisce i bottoni degli slot
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
    // Pulisce i toggle dei giorni
    document.querySelectorAll('.day-toggle').forEach(b => b.classList.remove('active'));
    // Nasconde tutte le sezioni orari
    document.querySelectorAll('.time-slots').forEach(d => d.style.display = 'none');
}

// --- FINE SEZIONE 6 ---


// --- 7. LOGICA PRIVACY ---
const checkTerms = document.getElementById('check-terms');
const checkPrivacy = document.getElementById('check-privacy');
const googleLoginBtn = document.getElementById('btn-google-login');

function validaCheck() { 
    if(googleLoginBtn && checkTerms && checkPrivacy) {
        googleLoginBtn.disabled = !(checkTerms.checked && checkPrivacy.checked);
    }
}
if (checkTerms && checkPrivacy) {
    checkTerms.onchange = validaCheck;
    checkPrivacy.onchange = validaCheck;
    validaCheck();
}

// --- 8. IMPOSTAZIONI TEMA ---
const btnSettings = document.getElementById('btn-open-settings');
const panel = document.getElementById('settings-panel');
if (btnSettings && panel) {
    btnSettings.addEventListener('click', () => {
        const isHidden = panel.style.display === 'none' || panel.style.display === '';
        panel.style.display = isHidden ? 'block' : 'none';
        btnSettings.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
    });
}
document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', async (e) => {
        const color = e.target.getAttribute('data-color');
        applyThemeColor(color);
        if (auth.currentUser) await updateDoc(doc(db, "users", auth.currentUser.uid), { themeColor: color });
    });
});

// --- 9. LOGIN ---
if (googleLoginBtn) {
    googleLoginBtn.onclick = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error(error);
            alert("Errore login: " + error.message);
        }
    };
}

// --- 10. LOGOUT ---
const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        isLoggingOut = true;
        await signOut(auth);
        location.reload();
    });
}
