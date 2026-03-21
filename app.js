// 1. CONFIGURAZIONE FIREBASE (Usa la chiave senza la "u" extra se presente)
const firebaseConfig = {
    apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let selectedDays = { venerdi: false, sabato: false, domenica: false };

// --- 2. FIX LOGIN (USA POPUP INVECE DI REDIRECT) ---
// Il Popup evita il ricaricamento della pagina e interrompe il loop
window.startLogin = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    auth.signInWithPopup(provider)
        .then((result) => {
            console.log("Login successo:", result.user.displayName);
        })
        .catch((error) => {
            console.error("Errore login:", error);
            // Se il popup viene bloccato, prova il redirect come fallback
            if (error.code === 'auth/popup-blocked') {
                auth.signInWithRedirect(provider);
            }
        });
};

// Colleghiamo il tasto subito
document.addEventListener("DOMContentLoaded", () => {
    const googleBtn = document.getElementById("googleBtn");
    if (googleBtn) googleBtn.onclick = window.startLogin;
});

// --- 3. STATO AUTENTICAZIONE ---
auth.onAuthStateChanged(async (user) => {
    const formLogin = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    
    if (user) {
        currentUser = user.uid;
        formLogin.style.display = "none";
        appDiv.style.display = "block";
        
        // Scrive il benvenuto
        const title = document.getElementById("welcomeTitle");
        if (title) {
            const nome = user.displayName ? user.displayName.split(' ')[0] : "Utente";
            title.innerHTML = `Ciao ${nome} 🤙🏻`;
        }
        
        // Impostazioni profilo
        if(document.getElementById("userName")) document.getElementById("userName").innerText = user.displayName || "Utente";
        if(document.getElementById("userEmail")) document.getElementById("userEmail").innerText = user.email;
        if(document.getElementById("userPhoto") && user.photoURL) {
            document.getElementById("userPhoto").src = user.photoURL;
            document.getElementById("userPhoto").style.display = "block";
        }

        await caricaEControlla();
    } else {
        currentUser = null;
        formLogin.style.display = "block";
        appDiv.style.display = "none";
    }
});

// --- 4. LOGICA GIORNI E SLOT ---
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const day = btn.dataset.day;
        const slots = document.getElementById(day + "-slots");
        selectedDays[day] = !selectedDays[day];
        
        btn.classList.toggle("active", selectedDays[day]);
        slots.classList.toggle("disabled", !selectedDays[day]);
        
        if (!selectedDays[day]) {
            slots.querySelectorAll("input").forEach(i => i.checked = false);
        }
    };
});

// --- 5. SALVATAGGIO ---
window.saveAvailability = async () => {
    const btn = document.getElementById("btnSave");
    const oldText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvo...';
    
    const av = {
        venerdi: getCheckedVals("venerdi"),
        sabato: getCheckedVals("sabato"),
        domenica: getCheckedVals("domenica")
    };

    try {
        await db.collection("users").doc(currentUser).set({ 
            availability: av,
            displayName: auth.currentUser.displayName,
            lastUpdate: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        btn.innerHTML = '✅ Salvato!';
        setTimeout(() => { btn.innerHTML = oldText; }, 2000);
        await controllaMatch(av); 
    } catch (e) { 
        console.error(e);
        alert("Errore salvataggio. Controlla le regole Firestore.");
        btn.innerHTML = oldText;
    }
};

function getCheckedVals(day) {
    if (!selectedDays[day]) return null;
    const container = document.getElementById(day + "-slots");
    return Array.from(container.querySelectorAll("input:checked")).map(c => c.value);
}

// --- 6. LOGICA MATCH E TEMA (RESTANTE) ---
async function controllaMatch(miaAv) {
    if (!miaAv) return;
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
}

function mostraPopupMatch(nome, giorno, fascia) {
    const modal = document.getElementById("matchModal");
    const text = document.getElementById("matchText");
    const btnWA = document.getElementById("matchWA");

    text.innerHTML = `🎉 <b>Match!</b> Tu e <b>${nome}</b> siete liberi <b>${giorno} ${fascia}</b>!`;
    const messaggio = `Ciao ${nome}! Ho visto su Looply che siamo liberi entrambi ${giorno} ${fascia}, usciamo? 🤙🏻`;
    btnWA.onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(messaggio)}`, '_blank');
    modal.style.display = "flex";
}

window.closeMatch = () => document.getElementById("matchModal").style.display = "none";

window.changeTheme = async (color) => {
    document.documentElement.style.setProperty('--primary-color', color);
    if (currentUser) await db.collection("users").doc(currentUser).set({ themeColor: color }, { merge: true });
};

async function caricaEControlla() {
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
}

window.openSettings = () => { document.getElementById("app").style.display = "none"; document.getElementById("settingsPage").style.display = "block"; };
window.closeSettings = () => { document.getElementById("settingsPage").style.display = "none"; document.getElementById("app").style.display = "block"; };
window.logout = () => auth.signOut().then(() => location.reload());
