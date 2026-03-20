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

// --- 2. REGISTRAZIONE SERVICE WORKER (PWA) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log("SW error:", err));
    });
}

// --- 3. GESTIONE LOGIN (FIX IPHONE/SAFARI) ---
document.addEventListener("DOMContentLoaded", () => {
    const googleBtn = document.getElementById("googleBtn");
    if (googleBtn) {
        googleBtn.onclick = () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithRedirect(provider);
        };
    }
});

auth.onAuthStateChanged(async (user) => {
    const formLogin = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    
    if (user) {
        currentUser = user.uid;
        formLogin.style.display = "none";
        appDiv.style.display = "block";
        
        document.getElementById("welcomeTitle").innerText = "Ciao " + (user.displayName ? user.displayName.split(' ')[0] : "!");
        document.getElementById("userName").innerText = user.displayName || "Utente";
        document.getElementById("userEmail").innerText = user.email;
        if (user.photoURL) document.getElementById("userPhoto").src = user.photoURL;

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

// --- 5. SALVATAGGIO E WHATSAPP PERSONALE ---
window.saveAvailability = async () => {
    const btn = document.getElementById("btnSave");
    const oldText = btn.innerHTML;
    btn.innerHTML = "Salvataggio...";
    
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
        alert("✅ Salvato! Ora controllo se qualcuno è libero come te...");
        await controllaMatch(av); // Controlla subito dopo il salva
    } catch (e) { alert("Errore"); }
    btn.innerHTML = oldText;
};

window.shareWhatsApp = () => {
    let msg = "🗓 *Le mie disponibilità Looply:*%0A%0A";
    let hasData = false;
    ["venerdi", "sabato", "domenica"].forEach(d => {
        const vals = getCheckedVals(d);
        if (vals && vals.length > 0) {
            msg += `*${d.toUpperCase()}*: ${vals.join(", ")}%0A`;
            hasData = true;
        }
    });
    if (!hasData) return alert("Seleziona qualcosa!");
    window.open(`https://wa.me/?text=${msg}`, '_blank');
};

function getCheckedVals(day) {
    if (!selectedDays[day]) return null;
    return Array.from(document.getElementById(day + "-slots").querySelectorAll("input:checked")).map(c => c.value);
}

// --- 6. LOGICA MATCH (IL CUORE) ---
async function controllaMatch(miaAv) {
    if (!miaAv) return;
    const snapshot = await db.collection("users").get();
    
    snapshot.forEach(doc => {
        if (doc.id !== currentUser) {
            const altro = doc.data();
            const altraAv = altro.availability;
            if (altraAv) {
                ["venerdi", "sabato", "domenica"].forEach(g => {
                    if (miaAv[g] && altraAv[g]) {
                        const comuni = miaAv[g].filter(f => altraAv[g].includes(f));
                        if (comuni.length > 0) {
                            mostraPopupMatch(altro.displayName || "Tizio", g, comuni[0]);
                        }
                    }
                });
            }
        }
    });
}

function mostraPopupMatch(nome, giorno, fascia) {
    const modal = document.getElementById("matchModal");
    document.getElementById("matchText").innerHTML = `🎉 Tu e <b>${nome}</b> siete liberi <b>${giorno} ${fascia}</b>!`;
    const msg = `Ciao ${nome}! Ho visto su Looply che siamo liberi entrambi ${giorno} ${fascia}, usciamo?`;
    document.getElementById("matchWA").onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    modal.style.display = "flex";
}

window.closeMatch = () => document.getElementById("matchModal").style.display = "none";

// --- 7. TEMA E CARICAMENTO ---
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
                    document.querySelector(`[data-day="${d}"]`).classList.add("active");
                    const slots = document.getElementById(d + "-slots");
                    slots.classList.remove("disabled");
                    slots.querySelectorAll("input").forEach(cb => { if (fasce.includes(cb.value)) cb.checked = true; });
                }
            }
            // Dopo aver caricato, controlla se c'è già un match
            await controllaMatch(data.availability);
        }
    }
}

window.openSettings = () => { document.getElementById("app").style.display = "none"; document.getElementById("settingsPage").style.display = "block"; };
window.closeSettings = () => { document.getElementById("settingsPage").style.display = "none"; document.getElementById("app").style.display = "block"; };
window.logout = () => auth.signOut().then(() => location.reload());
