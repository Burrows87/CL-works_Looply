// 1. CONFIGURAZIONE FIREBASE
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

// --- 2. INIZIALIZZAZIONE LOGIN (Fix per iPhone/Safari) ---
function inizializzaLogin() {
    const googleBtn = document.getElementById("googleBtn");
    if (googleBtn) {
        googleBtn.onclick = (e) => {
            e.preventDefault();
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithRedirect(provider);
        };
    } else if (document.getElementById("formLogin").style.display !== "none") {
        setTimeout(inizializzaLogin, 500);
    }
}

// --- 3. STATO AUTENTICAZIONE ---
auth.onAuthStateChanged(async (user) => {
    const formLogin = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    
    if (user) {
        currentUser = user.uid;
        formLogin.style.display = "none";
        appDiv.style.display = "block";
        
        // Benvenuto Personalizzato con Emoji 🤙🏻
        const nomeUtente = user.displayName ? user.displayName.split(' ')[0] : "!";
        document.getElementById("welcomeTitle").innerHTML = `Ciao ${nomeUtente} 🤙🏻`;
        
        document.getElementById("userName").innerText = user.displayName || "Utente";
        document.getElementById("userEmail").innerText = user.email;
        if (user.photoURL) {
            const img = document.getElementById("userPhoto");
            img.src = user.photoURL;
            img.style.display = "block";
        }

        await caricaEControlla();
    } else {
        currentUser = null;
        formLogin.style.display = "block";
        appDiv.style.display = "none";
        inizializzaLogin();
    }
});

// --- 4. GESTIONE GIORNI E INTERFACCIA ---
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const day = btn.dataset.day;
        const slots = document.getElementById(day + "-slots");
        selectedDays[day] = !selectedDays[day];
        
        if (selectedDays[day]) {
            btn.classList.add("active");
            slots.classList.remove("disabled");
        } else {
            btn.classList.remove("active");
            slots.classList.add("disabled");
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
            displayName: auth.currentUser.displayName 
        }, { merge: true });
        
        btn.innerHTML = '✅ Salvato!';
        setTimeout(() => { btn.innerHTML = oldText; }, 2000);

        // Avvia il controllo match dopo il salvataggio
        await controllaMatch(av); 
    } catch (e) { 
        alert("Errore durante il salvataggio");
        btn.innerHTML = oldText;
    }
};

function getCheckedVals(day) {
    if (!selectedDays[day]) return null;
    return Array.from(document.getElementById(day + "-slots").querySelectorAll("input:checked")).map(c => c.value);
}

// --- 6. LOGICA MATCH & POPUP ---
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

    text.innerHTML = `🎉 <b>Match!</b> Tu e <b>${nome}</b> siete entrambi liberi <b>${giorno} ${fascia}</b>!`;
    
    // Messaggio WhatsApp con emoji
    const messaggio = `Ehi ${nome}! Ho visto su Looply che siamo liberi entrambi ${giorno} ${fascia}, usciamo? 🤙🏻😊`;
    btnWA.onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(messaggio)}`, '_blank');

    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    modal.style.display = "flex";
}

window.closeMatch = () => {
    document.getElementById("matchModal").style.display = "none";
};

// --- 7. TEMA E CARICAMENTO ---
window.changeTheme = async (color) => {
    document.documentElement.style.setProperty('--primary-color', color);
    if (currentUser) {
        await db.collection("users").doc(currentUser).set({ themeColor: color }, { merge: true });
    }
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
                    const btn = document.querySelector(`[data-day="${d}"]`);
                    if (btn) btn.classList.add("active");
                    const slots = document.getElementById(d + "-slots");
                    if (slots) {
                        slots.classList.remove("disabled");
                        slots.querySelectorAll("input").forEach(cb => {
                            if (fasce.includes(cb.value)) cb.checked = true;
                        });
                    }
                }
            }
            await controllaMatch(data.availability);
        }
    }
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
window.logout = () => auth.signOut().then(() => location.reload());

// --- 9. PWA ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(e => console.log("SW Error", e));
    });
}
