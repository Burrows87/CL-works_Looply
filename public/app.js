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

// --- 4. AUTENTICAZIONE E REGISTRAZIONE (VERSIONE RADAR ATTIVO) ---
let isLoggingOut = false;
let matchGiaMostrati = new Set(); // Per evitare popup infiniti dello stesso match

onAuthStateChanged(auth, async (user) => {
    if (user && !isLoggingOut) {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().nome) {
            // 1. MOSTRA DASHBOARD
            const dati = userDoc.data();
            loginScreen.style.display = 'none';
            document.getElementById('registration-screen').style.display = 'none';
            dashboardScreen.style.display = 'block';
            
            userDisplayName.textContent = dati.nome;
            if (dati.themeColor) applyThemeColor(dati.themeColor);

            // 2. AVVIA IL RADAR DEI MATCH
            console.log("Ricerca match avviata per:", dati.nome);
            
            // Query per trovare i MIEI eventi salvati
            const qMiei = query(collection(db, "eventi"), where("creatoDa", "==", user.uid));
            
            // Ogni volta che i MIEI slot cambiano o vengono caricati, aggiorna il radar
            onSnapshot(qMiei, (snapshot) => {
                let mieiSlotAttuali = [];
                snapshot.forEach(doc => {
                    mieiSlotAttuali = mieiSlotAttuali.concat(doc.data().slot);
                });

                if (mieiSlotAttuali.length > 0) {
                    console.log("Slot trovati, attivo il monitoraggio degli altri utenti...");
                    cercaMatchInTempoReale(mieiSlotAttuali);
                }
            });

        } else {
            // UTENTE NUOVO
            loginScreen.style.display = 'none';
            dashboardScreen.style.display = 'none';
            document.getElementById('registration-screen').style.display = 'block';
        }
    } else {
        // LOGOUT
        loginScreen.style.display = 'block';
        dashboardScreen.style.display = 'none';
        document.getElementById('registration-screen').style.display = 'none';
    }
});



// --- 5. SALVATAGGIO PROFILO (ANTI-BUG WHATSAPP) ---

document.getElementById('btn-save-profile').addEventListener('click', async () => {
    const nomeScelto = document.getElementById('reg-name').value;
    const telScelto = document.getElementById('reg-phone').value;
    const user = auth.currentUser;

    if (!user) return;

    // PULIZIA NUMERO: Rimuove tutto ciò che non è un numero
    let telPulito = telScelto.replace(/\D/g, '');

    // Se il numero ha 10 cifre, aggiungiamo il 39 davanti
    if (telPulito.length === 10 && !telPulito.startsWith('39')) {
        telPulito = '39' + telPulito;
    }

    if (nomeScelto.trim().length < 2 || telPulito.length < 10) {
        return alert("Per favore, inserisci un nome valido e un numero completo.");
    }

    try {
        // Salvataggio su Firestore (Sintassi v10)
        await setDoc(doc(db, "users", user.uid), {
            nome: nomeScelto.trim(),
            telefono: telPulito,
            email: user.email,
            uid: user.uid,
            dataCreazione: new Date()
        });

        alert("Profilo creato correttamente!");
        location.reload(); // Ricarica per entrare nella Dashboard

    } catch (e) { 
        console.error("Errore:", e);
        alert("Errore nel salvataggio: " + e.message); 
    }
});


document.getElementById('btn-save-event').onclick = async () => {
    const selectedSlots = [];
    document.querySelectorAll('.slot-btn.selected').forEach(btn => {
        selectedSlots.push({ giorno: btn.dataset.day, fascia: btn.textContent.trim() });
    });

    if (selectedSlots.length === 0) return alert("Seleziona almeno un orario!");

    try {
        // Recuperiamo i dati aggiornati dell'utente dal suo documento
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (!userDoc.exists()) return alert("Errore: Profilo utente non trovato!");
        
        const userData = userDoc.data();

        await addDoc(collection(db, "eventi"), {
            nomeCreatore: userData.nome || "Utente",
            telefonoCreatore: userData.telefono || "", // Assicuriamoci che non sia undefined
            creatoDa: auth.currentUser.uid,
            slot: selectedSlots,
            dataCreazione: new Date()
        });
        
        alert("Disponibilità salvata!");
        resetInterfaccia();
        // Nota: cercaMatchInTempoReale si attiverà da solo grazie a onSnapshot
    } catch (e) { 
        console.error("Errore salvataggio evento:", e);
        alert("Errore: " + e.message); 
    }
};

// --- 6. LOGICA MATCH (VERSIONE RADAR ANTI-DUPLICATI) ---
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
                        
                        // Creiamo una chiave univoca per questo specifico match
                        // Esempio: "ID_EVENTO_Lunedì_Mattina"
                        const matchKey = `${altroId}_${mioSlot.giorno}_${mioSlot.fascia}`;
                        
                        // Se non abbiamo ancora mostrato questo specifico match, mostriamolo!
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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registrato!', reg))
      .catch(err => console.error('Errore registrazione SW:', err));
  });
}


// --- 9. LOGICA DI LOGIN EFFETTIVA ---
const googleLoginBtn = document.getElementById('btn-google-login');

if (googleLoginBtn) {
    // Rimuoviamo eventuali altri listener per sicurezza e aggiungiamo questo
    googleLoginBtn.onclick = async (e) => {
        e.preventDefault(); // Impedisce comportamenti strani del form
        
        console.log("Pulsante cliccato: avvio procedura...");
        
        try {
            // Proviamo con il Popup
            await signInWithPopup(auth, provider);
            console.log("Login riuscito con successo");
        } catch (error) {
            console.error("Errore durante il login:", error);
            
            // Se il popup viene bloccato, l'errore solitamente è 'auth/popup-blocked'
            if (error.code === 'auth/popup-blocked') {
                alert("Il popup di Google è stato bloccato dal browser. Abilitalo per continuare.");
            } else {
                alert("Errore nel login: " + error.message);
            }
        }
    };
}

// --- 10. LOGICA LOGOUT ---
const logoutBtn = document.getElementById('btn-logout');

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            console.log("Tentativo di logout...");
            isLoggingOut = true; // Impedisce al listener onAuthStateChanged di fare controlli inutili
            
            await signOut(auth);
            
            console.log("Logout effettuato.");
            // Ricarichiamo la pagina per resettare completamente l'interfaccia e tornare al login
            window.location.reload(); 
            
        } catch (error) {
            console.error("Errore durante il logout:", error);
            alert("Errore nell'uscita: " + error.message);
            isLoggingOut = false;
        }
    });
}
