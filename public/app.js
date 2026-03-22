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

// Funzione per applicare il colore
const applyThemeColor = (color) => {
    if (!color) return;
    document.documentElement.style.setProperty('--primary-color', color);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', color);
};

// --- 4. AUTENTICAZIONE ---
let isLoggingOut = false;

onAuthStateChanged(auth, async (user) => {
    if (user && !isLoggingOut) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const dati = userDoc.data();
            loginScreen.style.setProperty('display', 'none', 'important');
            if(document.getElementById('registration-screen')) document.getElementById('registration-screen').style.display = 'none'; 
            dashboardScreen.style.setProperty('display', 'block', 'important');
            userDisplayName.textContent = dati.nome; 
            
            // CARICA IL COLORE SALVATO
            if (dati.themeColor) applyThemeColor(dati.themeColor);

        } else {
            loginScreen.style.setProperty('display', 'none', 'important');
            dashboardScreen.style.setProperty('display', 'none', 'important');
            document.getElementById('registration-screen').style.display = 'block';
        }
    } else {
        loginScreen.style.setProperty('display', 'block', 'important');
        dashboardScreen.style.setProperty('display', 'none', 'important');
        if(document.getElementById('registration-screen')) document.getElementById('registration-screen').style.display = 'none';
        isLoggingOut = false;
    }
});

document.getElementById('btn-google-login').addEventListener('click', async () => {
    const terms = document.getElementById('check-terms').checked;
    const privacy = document.getElementById('check-privacy').checked;
    if (terms && privacy) {
        try {
            provider.setCustomParameters({ prompt: 'select_account' });
            await signInWithPopup(auth, provider);
        } catch (error) { console.error("Errore login:", error); }
    }
});

document.getElementById('btn-logout').addEventListener('click', () => {
    isLoggingOut = true;
    signOut(auth);
});

// --- 5. SALVATAGGIO PROFILO ED EVENTI ---

document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const nomeScelto = document.getElementById('reg-name').value;
    const telScelto = document.getElementById('reg-phone').value;
    const user = auth.currentUser;

    if (nomeScelto.length < 2 || telScelto.length < 9) return alert("Inserisci un nome e un numero validi!");

    let telPulito = telScelto.replace(/\D/g, '');
    if (!telPulito.startsWith('39')) telPulito = '39' + telPulito;

    try {
        await setDoc(doc(db, "users", user.uid), {
            nome: nomeScelto,
            telefono: telPulito,
            email: user.email,
            uid: user.uid,
            dataCreazione: new Date()
        });
        alert("Profilo creato!");
        location.reload();
    } catch (e) { alert("Errore: " + e.message); }
});

document.getElementById('btn-save-event').onclick = async () => {
    const selectedSlots = [];
    document.querySelectorAll('.slot-btn.selected').forEach(btn => {
        selectedSlots.push({ giorno: btn.dataset.day, fascia: btn.textContent.trim() });
    });

    if (selectedSlots.length === 0) return alert("Seleziona almeno un orario!");

    try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        const userData = userDoc.data();

        await addDoc(collection(db, "eventi"), {
            nomeCreatore: userData.nome,
            telefonoCreatore: userData.telefono,
            creatoDa: auth.currentUser.uid,
            slot: selectedSlots,
            dataCreazione: new Date()
        });
        
        cercaMatchInTempoReale(selectedSlots); 
        alert("Disponibilità salvata!");
        resetInterfaccia();
    } catch (e) { alert("Errore: " + e.message); }
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
                        proponiWhatsApp(altro.nomeCreatore, altro.telefonoCreatore, mioSlot.giorno, mioSlot.fascia);
                    }
                });
            });
        });
    });
}

function proponiWhatsApp(nomeAmico, numeroAmico, giorno, fascia) {
    const testo = `Ciao ${nomeAmico}, ho visto su Looply che siamo entrambi liberi ${giorno} (${fascia.toLowerCase()}), usciamo?`;
    const url = `https://wa.me/${numeroAmico}?text=${encodeURIComponent(testo)}`;
    if (confirm(`🎉 MATCH CON ${nomeAmico.toUpperCase()}!\nVuoi scrivergli su WhatsApp?`)) {
        window.location.href = url;
    }
}

function resetInterfaccia() {
    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.day-toggle').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.time-slots').forEach(d => d.style.display = 'none');
}

// --- 7. LOGICA PRIVACY ---
const checkTerms = document.getElementById('check-terms');
const checkPrivacy = document.getElementById('check-privacy');
function validaCheck() { 
    const btn = document.getElementById('btn-google-login');
    if(btn) btn.disabled = !(checkTerms.checked && checkPrivacy.checked); 
}
if (checkTerms && checkPrivacy) {
    checkTerms.onchange = validaCheck;
    checkPrivacy.onchange = validaCheck;
}

// --- 8. IMPOSTAZIONI TEMA ---
document.getElementById('btn-open-settings').addEventListener('click', () => {
    const panel = document.getElementById('settings-panel');
    const isHidden = panel.style.display === 'none';
    panel.style.display = isHidden ? 'block' : 'none';
    
    const icon = document.querySelector('#btn-open-settings svg');
    if(icon) {
        icon.style.transition = 'transform 0.3s ease';
        icon.style.transform = isHidden ? 'rotate(90deg)' : 'rotate(0deg)';
    }
});

document.querySelectorAll('.color-dot').forEach(dot => {
    dot.addEventListener('click', async (e) => {
        const selectedColor = e.target.getAttribute('data-color');
        applyThemeColor(selectedColor);
        
        const user = auth.currentUser;
        if (user) {
            try {
                await updateDoc(doc(db, "users", user.uid), {
                    themeColor: selectedColor
                });
            } catch (error) { console.error("Errore salvataggio tema:", error); }
        }
    });
});
