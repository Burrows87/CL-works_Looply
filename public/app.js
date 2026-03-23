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
const registrationScreen = document.getElementById('registration-screen');

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

// --- 4. AUTENTICAZIONE ---
let isLoggingOut = false;
let matchGiaMostrati = new Set(); 
let regSelectedDays = []; // Per tenere traccia dei giorni scelti in registrazione

onAuthStateChanged(auth, async (user) => {
    if (user && !isLoggingOut) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().nome) {
            const dati = userDoc.data();
            loginScreen.style.display = 'none';
            registrationScreen.style.display = 'none';
            dashboardScreen.style.display = 'block';
            
            userDisplayName.textContent = dati.nome;
            if (dati.themeColor) applyThemeColor(dati.themeColor);

            // APERTURA AUTOMATICA GIORNI PREFERITI
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

            const qMiei = query(collection(db, "eventi"), where("creatoDa", "==", user.uid));
            onSnapshot(qMiei, (snapshot) => {
                let mieiSlotAttuali = [];
                snapshot.forEach(docSnap => mieiSlotAttuali = mieiSlotAttuali.concat(docSnap.data().slot));
                if (mieiSlotAttuali.length > 0) cercaMatchInTempoReale(mieiSlotAttuali);
            });
        } else {
            loginScreen.style.display = 'none';
            dashboardScreen.style.display = 'none';
            registrationScreen.style.display = 'block';
        }
    } else {
        loginScreen.style.display = 'block';
        dashboardScreen.style.display = 'none';
        registrationScreen.style.display = 'none';
    }
});



// --- 5. SALVATAGGIO PROFILO ED EVENTI ---

// Gestione clic bottoni giorni in REGISTRAZIONE
document.querySelectorAll('.reg-day-btn').forEach(btn => {
    btn.onclick = () => {
        const day = btn.dataset.day;
        if (regSelectedDays.includes(day)) {
            regSelectedDays = regSelectedDays.filter(d => d !== day);
            btn.classList.remove('selected');
        } else {
            if (regSelectedDays.length < 3) {
                regSelectedDays.push(day);
                btn.classList.add('selected');
            } else {
                alert("Puoi scegliere massimo 3 giorni!");
            }
        }
    };
});

if (btnSaveProfile) {
    btnSaveProfile.onclick = async () => {
        const nomeScelto = document.getElementById('reg-name').value;
        const telScelto = document.getElementById('reg-phone').value;
        const user = auth.currentUser;
        if (!user) return;
        if (regSelectedDays.length === 0) return alert("Scegli almeno un giorno!");

        let telPulito = telScelto.replace(/\D/g, '');
        if (telPulito.length === 10 && !telPulito.startsWith('39')) telPulito = '39' + telPulito;

        try {
            await setDoc(doc(db, "users", user.uid), {
                nome: nomeScelto.trim(),
                telefono: telPulito,
                giorniPreferiti: regSelectedDays,
                email: user.email,
                uid: user.uid,
                dataCreazione: new Date()
            });
            location.reload();
        } catch (e) { console.error(e); }
    };
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
            alert("Disponibilità salvata!");
            resetInterfaccia();
        } catch (e) { alert("Errore: " + e.message); }
    };
}


// --- 6. LOGICA MATCH (CON AZZERAMENTO SETTIMANALE) ---

function cercaMatchInTempoReale(mieiSlot) {
    if (!mieiSlot || mieiSlot.length === 0) return;

    // Calcoliamo la data dell'ultimo lunedì alle 01:00
    const oraSoglia = new Date();
    const giornoSettimana = oraSoglia.getDay(); // 0 è Domenica, 1 è Lunedì
    const differenza = (giornoSettimana + 6) % 7; // Quanti giorni sono passati dall'ultimo lunedì
    
    oraSoglia.setDate(oraSoglia.getDate() - differenza);
    oraSoglia.setHours(1, 0, 0, 0); // Impostiamo alle 01:00:00

    // Cerchiamo solo eventi creati DOPO l'ultimo lunedì alle 01:00
    const q = query(
        collection(db, "eventi"), 
        where("creatoDa", "!=", auth.currentUser.uid),
        where("dataCreazione", ">=", oraSoglia) // FILTRO TEMPORALE
    );
    
    onSnapshot(q, (snapshot) => {
        snapshot.forEach((docSnap) => {
            const altro = docSnap.data();
            const altroId = docSnap.id; 

            altro.slot.forEach(slotAltro => {
                mieiSlot.forEach(mioSlot => {
                    if (slotAltro.giorno === mioSlot.giorno && slotAltro.fascia === mioSlot.fascia) {
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
    
    const vecchioToast = document.getElementById('match-toast');
    if (vecchioToast) vecchioToast.remove();

    const toast = document.createElement('div');
    toast.id = 'match-toast';
    toast.style = "position:fixed; bottom:30px; left:50%; transform:translateX(-50%); background:white; color:#333; padding:20px; border-radius:15px; z-index:10000; width:92%; max-width:350px; box-shadow:0 10px 30px rgba(0,0,0,0.3); text-align:center; font-family:sans-serif; border:1px solid #eee; animation:slideUp 0.4s ease-out;";

    toast.innerHTML = `
        <div style="font-size:1.2rem; margin-bottom:10px;">🎉 <strong>Match con ${nomeAmico}!</strong></div>
        <div style="font-size:0.9rem; color:#666; margin-bottom:20px;">Siete liberi <strong>${giorno}</strong> (${fascia.toLowerCase()}).</div>
        <div style="display:flex; gap:10px; justify-content:center; flex-direction: row-reverse;">
            <button id="btn-wa-ok" style="background:#25D366; color:white; border:none; padding:12px; border-radius:10px; cursor:pointer; font-weight:bold; flex:1.5; display:flex; align-items:center; justify-content:center; gap:8px;">
                <svg width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.06 3.96l-1.125 4.11 4.205-1.103a7.859 7.859 0 0 0 3.79.972h.003c4.366 0 7.925-3.558 7.929-7.926a7.86 7.86 0 0 0-2.33-5.593l.002-.002zm-1.082 10.156a6.518 6.518 0 0 1-4.519 1.932h-.003a6.518 6.518 0 0 1-3.326-.906l-.238-.141-2.478.65.662-2.42-.155-.247a6.522 6.522 0 0 1-.988-3.32c0-3.596 2.926-6.521 6.529-6.521a6.52 6.52 0 0 1 4.619 1.919 6.52 6.52 0 0 1 1.916 4.621 6.524 6.524 0 0 1-1.812 4.634zm-3.393-4.735c-.196-.098-1.162-.574-1.341-.639-.179-.065-.308-.098-.438.098-.13.196-.503.639-.617.771-.114.13-.227.147-.423.049-.196-.098-.826-.304-1.574-.971-.582-.519-.974-1.16-.108-1.357.196-.098.392-.147.588-.245.049-.098.074-.183.037-.282-.037-.098-.308-.743-.423-1.02-.11-.266-.222-.23-.308-.235h-.262c-.13 0-.341.049-.519.245-.179.196-.683.667-.683 1.629 0 .962.7 1.891.798 2.022.098.13 1.378 2.103 3.337 2.949.467.202.83.323 1.114.413.468.148.894.127 1.231.077.376-.056 1.162-.474 1.325-.931.163-.457.163-.849.114-.931-.049-.082-.179-.13-.375-.228z"/></svg>
                SCRIVI
            </button>
            <button id="btn-wa-no" style="background:#f0f0f0; color:#666; border:none; padding:12px; border-radius:10px; cursor:pointer; flex:1;">
                DOPO
            </button>
        </div>
    `;
    document.body.appendChild(toast);

    document.getElementById('btn-wa-ok').onclick = () => { window.open(url, '_blank'); toast.remove(); };
    document.getElementById('btn-wa-no').onclick = () => { toast.remove(); };

    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

function resetInterfaccia() {
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.day-toggle').forEach(b => b.classList.remove('active'));
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
    btnSettings.addEventListener('click', async () => {
        const isHidden = panel.style.display === 'none' || panel.style.display === '';
        panel.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden) {
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            const preferiti = userDoc.data().giorniPreferiti || [];
            document.querySelectorAll('.set-day-btn').forEach(btn => {
                btn.classList.toggle('selected', preferiti.includes(btn.dataset.day));
            });
        }
    });
}

// Gestione cambio giorni dalle IMPOSTAZIONI
document.querySelectorAll('.set-day-btn').forEach(btn => {
    btn.onclick = async () => {
        const user = auth.currentUser;
        const day = btn.dataset.day;
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        let giorni = userDoc.data().giorniPreferiti || [];

        if (giorni.includes(day)) {
            giorni = giorni.filter(d => d !== day);
        } else {
            if (giorni.length < 3) {
                giorni.push(day);
            } else {
                return alert("Massimo 3 giorni!");
            }
        }
        await updateDoc(userRef, { giorniPreferiti: giorni });
        btn.classList.toggle('selected');
        // Opzionale: location.reload() se vuoi che la dashboard si aggiorni subito
    };
});




// --- 9. LOGIN ---
if (googleLoginBtn) {
    googleLoginBtn.onclick = async () => {
        try { await signInWithPopup(auth, provider); } catch (error) { alert("Errore login: " + error.message); }
    };
}

// --- 10. LOGOUT E SERVICE WORKER ---
const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        isLoggingOut = true;
        await signOut(auth);
        location.reload();
    });
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.error(err));
    });
}
