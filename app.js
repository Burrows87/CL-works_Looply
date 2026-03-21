// 1. CONFIGURAZIONE (Verificata: AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU)
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

// --- 2. LOGIN CON REDIRECT (Il più stabile su Mobile/GitHub) ---
window.startLogin = function() {
    console.log("Avvio redirect Google...");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithRedirect(provider);
};

// Gestione del ritorno dal redirect (fondamentale per evitare loop)
auth.getRedirectResult().then((result) => {
    if (result.user) console.log("Ritorno dal login riuscito:", result.user.displayName);
}).catch((error) => {
    if (error.code === 'auth/api-key-not-valid') {
        alert("Errore: Chiave API non autorizzata. Verifica le restrizioni su Google Cloud Console!");
    } else {
        console.error("Errore Redirect:", error);
    }
});

// --- 3. GESTORE STATO UTENTE ---
auth.onAuthStateChanged(async (user) => {
    const loader = document.getElementById("initialLoader");
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        currentUser = user.uid;
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";

        // Aggiorna Interfaccia
        const title = document.getElementById("welcomeTitle");
        if (title) title.innerHTML = `Ciao ${user.displayName.split(' ')[0]} 🤙🏻`;
        
        if(document.getElementById("userName")) document.getElementById("userName").innerText = user.displayName;
        if(document.getElementById("userEmail")) document.getElementById("userEmail").innerText = user.email;
        if(document.getElementById("userPhoto") && user.photoURL) {
            document.getElementById("userPhoto").src = user.photoURL;
            document.getElementById("userPhoto").style.display = "block";
        }

        await caricaDatiUtente();
    } else {
        currentUser = null;
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }

    // Nascondi caricamento
    if (loader) {
        loader.style.opacity = "0";
        setTimeout(() => loader.style.display = "none", 500);
    }
});

// --- 4. LOGICA GIORNI ---
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const day = btn.dataset.day;
        const slots = document.getElementById(day + "-slots");
        selectedDays[day] = !selectedDays[day];
        btn.classList.toggle("active", selectedDays[day]);
        if(slots) slots.classList.toggle("disabled", !selectedDays[day]);
    };
});

// --- 5. SALVATAGGIO E MATCH ---
window.saveAvailability = async () => {
    const btn = document.getElementById("btnSave");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvo...';

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

        btn.innerHTML = '✅ Salvato!';
        setTimeout(() => btn.innerHTML = originalText, 2000);
        await controllaMatch(av);
    } catch (e) {
        alert("Errore database. Verifica le regole Firestore!");
        btn.innerHTML = originalText;
    }
};

function getCheckedVals(day) {
    if (!selectedDays[day]) return null;
    const container = document.getElementById(day + "-slots");
    return container ? Array.from(container.querySelectorAll("input:checked")).map(c => c.value) : null;
}

async function controllaMatch(miaAv) {
    const snapshot = await db.collection("users").get();
    let matchTrovato = false;
    snapshot.forEach(doc => {
        if (doc.id !== currentUser && !matchTrovato) {
            const altro = doc.data();
            if (altro.availability) {
                ["venerdi", "sabato", "domenica"].forEach(g => {
                    if (miaAv[g] && altro.availability[g]) {
                        const comuni = miaAv[g].filter(f => altro.availability[g].includes(f));
                        if (comuni.length > 0 && !matchTrovato) {
                            mostraPopupMatch(altro.displayName, g, comuni[0]);
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
    document.getElementById("matchText").innerHTML = `🎉 <b>Match!</b> Tu e <b>${nome}</b> siete liberi <b>${giorno} ${fascia}</b>!`;
    const msg = `Ciao ${nome}, siamo liberi ${giorno} ${fascia}, ci becchiamo? 🤙🏻`;
    document.getElementById("matchWA").onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    modal.style.display = "flex";
}

window.closeMatch = () => document.getElementById("matchModal").style.display = "none";

// --- 6. TEMA E CARICAMENTO ---
window.changeTheme = async (color) => {
    document.documentElement.style.setProperty('--primary-color', color);
    if (currentUser) await db.collection("users").doc(currentUser).set({ themeColor: color }, { merge: true });
};

async function caricaDatiUtente() {
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
                        fasce.forEach(f => {
                            const cb = s.querySelector(`input[value="${f}"]`);
                            if(cb) cb.checked = true;
                        });
                    }
                }
            }
        }
    }
}

// --- 7. NAVIGAZIONE ---
window.openSettings = () => { document.getElementById("app").style.display = "none"; document.getElementById("settingsPage").style.display = "block"; };
window.closeSettings = () => { document.getElementById("settingsPage").style.display = "none"; document.getElementById("app").style.display = "block"; };
window.logout = () => auth.signOut().then(() => location.reload());
