// 1. CONFIGURAZIONE FIREBASE (Chiave Corretta)
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let selectedDays = { venerdi: false, sabato: false, domenica: false };

// --- 2. LOGIN CON POPUP (Anti-Loop per GitHub Pages) ---
window.startLogin = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Login avvenuto con successo!");
        })
        .catch((error) => {
            console.error("Errore Login:", error);
            if (error.code === 'auth/api-key-not-valid') {
                alert("Errore: Chiave API non valida. Controlla le restrizioni su Google Cloud Console!");
            } else {
                alert("Errore: " + error.message);
            }
        });
};

// --- 3. GESTIONE STATO AUTENTICAZIONE ---
auth.onAuthStateChanged(async (user) => {
    const loader = document.getElementById("initialLoader");
    const formLogin = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    
    if (user) {
        currentUser = user.uid;
        if (formLogin) formLogin.style.display = "none";
        if (appDiv) appDiv.style.display = "block";
        
        // Benvenuto
        const title = document.getElementById("welcomeTitle");
        if (title) {
            const nome = user.displayName ? user.displayName.split(' ')[0] : "Utente";
            title.innerHTML = `Ciao ${nome} 🤙🏻`;
        }
        
        // Impostazioni profilo
        if(document.getElementById("userName")) document.getElementById("userName").innerText = user.displayName || "Utente";
        if(document.getElementById("userEmail")) document.getElementById("userEmail").innerText = user.email;
        if(document.getElementById("userPhoto") && user.photoURL) {
            const img = document.getElementById("userPhoto");
            img.src = user.photoURL;
            img.style.display = "block";
        }

        await caricaDatiUtente();
    } else {
        currentUser = null;
        if (formLogin) formLogin.style.display = "block";
        if (appDiv) appDiv.style.display = "none";
    }

    // Nascondi il loader iniziale una volta che lo stato è chiaro
    if (loader) loader.style.opacity = "0";
    setTimeout(() => { if(loader) loader.style.display = "none"; }, 500);
});

// --- 4. LOGICA INTERFACCIA GIORNI ---
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const day = btn.dataset.day;
        const slots = document.getElementById(day + "-slots");
        selectedDays[day] = !selectedDays[day];
        
        btn.classList.toggle("active", selectedDays[day]);
        if (slots) {
            slots.classList.toggle("disabled", !selectedDays[day]);
            if (!selectedDays[day]) {
                slots.querySelectorAll("input").forEach(i => i.checked = false);
            }
        }
    };
});

// --- 5. SALVATAGGIO DISPONIBILITÀ ---
window.saveAvailability = async () => {
    const btn = document.getElementById("btnSave");
    const oldContent = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvataggio...';
    
    const av = {
        venerdi: getCheckedVals("venerdi"),
        sabato: getCheckedVals("sabato"),
        domenica: getCheckedVals("domenica")
    };

    try {
        await db.collection("users").doc(currentUser).set({ 
            availability: av,
            displayName: auth.currentUser.displayName,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        btn.innerHTML = '✅ Disponibilità Salvata!';
        setTimeout(() => { btn.innerHTML = oldContent; }, 2000);
        await controllaMatch(av); 
    } catch (e) { 
        console.error("Errore salvataggio:", e);
        alert("Errore nel salvataggio dei dati.");
        btn.innerHTML = oldContent;
    }
};

function getCheckedVals(day) {
    if (!selectedDays[day]) return null;
    const container = document.getElementById(day + "-slots");
    return container ? Array.from(container.querySelectorAll("input:checked")).map(c => c.value) : null;
}

// --- 6. LOGICA MATCHING ---
async function controllaMatch(miaAv) {
    try {
        const snapshot = await db.collection("users").get();
        let matchTrovato = false;

        snapshot.forEach(doc => {
            if (doc.id !== currentUser && !matchTrovato) {
                const altro = doc.data();
                const altraAv = altro.availability;
                if (altraAv) {
                    ["venerdi", "sabato", "domenica"].forEach(g => {
                        if (miaAv[g] && altraAv[g]) {
                            const comuni = miaAv[g].filter(f => altraAv[g].includes(f));
                            if (comuni.length > 0 && !matchTrovato) {
                                mostraPopupMatch(altro.displayName || "Qualcuno", g, comuni[0]);
                                matchTrovato = true;
                            }
                        }
                    });
                }
            }
        });
    } catch (e) { console.log("Errore ricerca match"); }
}

function mostraPopupMatch(nome, giorno, fascia) {
    const modal = document.getElementById("matchModal");
    const text = document.getElementById("matchText");
    const btnWA = document.getElementById("matchWA");

    text.innerHTML = `Ottime notizie! Tu e <b>${nome}</b> siete entrambi disponibili <b>${giorno} (${fascia})</b>!`;
    const msg = `Ciao ${nome}! Ho visto su Looply che siamo entrambi liberi ${giorno} ${fascia}, ci becchiamo? 🤙🏻`;
    btnWA.onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');

    modal.style.display = "flex";
}

window.closeMatch = () => document.getElementById("matchModal").style.display = "none";

// --- 7. TEMA E CARICAMENTO DATI ---
window.changeTheme = async (color) => {
    document.documentElement.style.setProperty('--primary-color', color);
    if (currentUser) await db.collection("users").doc(currentUser).set({ themeColor: color }, { merge: true });
};

async function caricaDatiUtente() {
    try {
        const doc = await db.collection("users").doc(currentUser).get();
        if (doc.exists) {
            const data = doc.data();
            if (data.themeColor) document.documentElement.style.setProperty('--primary-color', data.themeColor);
            if (data.availability) {
                for (const d in data.availability) {
                    const fasce = data.availability[d];
                    if (fasce && fasce.length > 0) {
                        selectedDays[d] = true;
                        document.querySelector(`[data-day="${d}"]`)?.classList.add("active");
                        const s = document.getElementById(d + "-slots");
                        if(s) {
                            s.classList.remove("disabled");
                            s.querySelectorAll("input").forEach(cb => { if (fasce.includes(cb.value)) cb.checked = true; });
                        }
                    }
                }
            }
        }
    } catch (e) { console.log("Errore caricamento dati"); }
}

// --- 8. NAVIGAZIONE ---
window.openSettings = () => {
    document.getElementById("app").style.display = "none";
    document.getElementById("settingsPage").style.display = "block";
};
window.closeSettings = () => {
    document.getElementById("settingsPage").style.display = "none";
    document.getElementById("app").style.display = "block";
};
window.logout = () => auth.signOut().then(() => {
    // Invece di reload() che causa loop, puliamo e mostriamo login
    location.reload();
});
