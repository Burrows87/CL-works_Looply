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

// --- 2. FIX LOGIN (PER ANDROID/IOS) ---
function inizializzaLogin() {
    const googleBtn = document.getElementById("googleBtn");
    if (googleBtn) {
        googleBtn.onclick = (e) => {
            e.preventDefault();
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithRedirect(provider);
        };
    } else {
        setTimeout(inizializzaLogin, 500);
    }
}

// --- 3. GESTIONE NOME E EMOJI (CON RE-TRY) ---
function scriviBenvenuto(user) {
    const title = document.getElementById("welcomeTitle");
    if (title && user) {
        const nome = user.displayName ? user.displayName.split(' ')[0] : "Utente";
        // Usiamo innerHTML per forzare il rendering dell'emoji
        title.innerHTML = `Ciao ${nome} 🤙🏻`;
        console.log("Nome inserito con successo");
    } else {
        // Se l'elemento non è ancora pronto, riprova tra 100ms
        setTimeout(() => scriviBenvenuto(user), 100);
    }
}

// --- 4. STATO AUTENTICAZIONE ---
auth.onAuthStateChanged(async (user) => {
    const formLogin = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    
    if (user) {
        currentUser = user.uid;
        formLogin.style.display = "none";
        appDiv.style.display = "block";
        
        // Avviamo la scrittura del nome
        scriviBenvenuto(user);
        
        // Aggiorna altri dati
        const userName = document.getElementById("userName");
        const userEmail = document.getElementById("userEmail");
        const userPhoto = document.getElementById("userPhoto");

        if(userName) userName.innerText = user.displayName || "Utente";
        if(userEmail) userEmail.innerText = user.email;
        if(userPhoto && user.photoURL) {
            userPhoto.src = user.photoURL;
            userPhoto.style.display = "block";
        }

        await caricaEControlla();
    } else {
        currentUser = null;
        formLogin.style.display = "block";
        appDiv.style.display = "none";
        inizializzaLogin();
    }
});

// --- 5. LOGICA GIORNI ---
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

// --- 6. SALVATAGGIO ---
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
        await controllaMatch(av); 
    } catch (e) { 
        alert("Errore salvataggio");
        btn.innerHTML = oldText;
    }
};

function getCheckedVals(day) {
    if (!selectedDays[day]) return null;
    const container = document.getElementById(day + "-slots");
    return Array.from(container.querySelectorAll("input:checked")).map(c => c.value);
}

// --- 7. LOGICA MATCH ---
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

    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    modal.style.display = "flex";
}

window.closeMatch = () => document.getElementById("matchModal").style.display = "none";

// --- 8. TEMA E CARICAMENTO ---
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
                    const b = document.querySelector(`[data-day="${d}"]`);
                    if(b) b.classList.add("active");
                    const s = document.getElementById(d + "-slots");
                    if(s) {
                        s.classList.remove("disabled");
                        s.querySelectorAll("input").forEach(cb => { if (fasce.includes(cb.value)) cb.checked = true; });
                    }
                }
            }
            await controllaMatch(data.availability);
        }
    }
}

// --- 9. NAVIGAZIONE ---
window.openSettings = () => {
    document.getElementById("app").style.display = "none";
    document.getElementById("settingsPage").style.display = "block";
};
window.closeSettings = () => {
    document.getElementById("settingsPage").style.display = "none";
    document.getElementById("app").style.display = "block";
};
window.logout = () => auth.signOut().then(() => location.reload());

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(e => {}); });
}
