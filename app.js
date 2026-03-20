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

// --- 2. REGISTRAZIONE SERVICE WORKER (Per PWA/Installazione) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log("SW error:", err));
    });
}

// --- 3. GESTIONE LOGIN (REDIRECT PER MOBILE/IPHONE) ---
document.addEventListener("DOMContentLoaded", () => {
    const googleBtn = document.getElementById("googleBtn");
    if (googleBtn) {
        googleBtn.onclick = () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithRedirect(provider);
        };
    }
});

// Gestisce il ritorno dal login di Google
auth.getRedirectResult().then((result) => {
    if (result.user) console.log("Login effettuato!");
}).catch((error) => {
    if (error.code !== 'auth/no-auth-event') console.error("Errore login:", error);
});

// --- 4. STATO AUTENTICAZIONE ---
auth.onAuthStateChanged(async (user) => {
    const formLogin = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    
    if (user) {
        currentUser = user.uid;
        formLogin.style.display = "none";
        appDiv.style.display = "block";
        
        // Aggiorna Profilo
        document.getElementById("welcomeTitle").innerText = "Ciao " + (user.displayName ? user.displayName.split(' ')[0] : "!");
        document.getElementById("userName").innerText = user.displayName || "Utente";
        document.getElementById("userEmail").innerText = user.email;
        if (user.photoURL) document.getElementById("userPhoto").src = user.photoURL;

        await caricaDati();
    } else {
        currentUser = null;
        formLogin.style.display = "block";
        appDiv.style.display = "none";
    }
});

// --- 5. LOGICA GIORNI E SLOT ---
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
            // Deseleziona i checkbox se il giorno viene disattivato
            slots.querySelectorAll("input").forEach(i => i.checked = false);
        }
    };
});

// --- 6. SALVATAGGIO E CONDIVISIONE ---
window.saveAvailability = async () => {
    const btn = document.getElementById("btnSave");
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvataggio...';
    
    const av = {
        venerdi: getCheckedVals("venerdi"),
        sabato: getCheckedVals("sabato"),
        domenica: getCheckedVals("domenica")
    };

    try {
        await db.collection("users").doc(currentUser).set({ availability: av }, { merge: true });
        alert("✅ Disponibilità salvata!");
    } catch (e) {
        alert("Errore nel salvataggio");
    }
    btn.innerHTML = originalText;
};

// Funzione WhatsApp
window.shareWhatsApp = () => {
    let message = "🗓 *Le mie disponibilità Looply:*%0A%0A";
    let count = 0;

    ["venerdi", "sabato", "domenica"].forEach(d => {
        if (selectedDays[d]) {
            const vals = getCheckedVals(d);
            if (vals && vals.length > 0) {
                const giornoNome = d.charAt(0).toUpperCase() + d.slice(1);
                message += `*${giornoNome}*: ${vals.join(", ")}%0A`;
                count++;
            }
        }
    });

    if (count === 0) return alert("Seleziona almeno un giorno e una fascia oraria!");
    
    const url = `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
};

function getCheckedVals(day) {
    if (!selectedDays[day]) return null;
    const container = document.getElementById(day + "-slots");
    return Array.from(container.querySelectorAll("input:checked")).map(c => c.value);
}

// --- 7. PERSONALIZZAZIONE TEMA ---
window.changeTheme = async (color) => {
    document.documentElement.style.setProperty('--primary-color', color);
    if (currentUser) {
        await db.collection("users").doc(currentUser).set({ themeColor: color }, { merge: true });
    }
};

// --- 8. CARICAMENTO DATI ---
async function caricaDati() {
    const doc = await db.collection("users").doc(currentUser).get();
    if (doc.exists) {
        const data = doc.data();
        
        // Applica Tema
        if (data.themeColor) {
            document.documentElement.style.setProperty('--primary-color', data.themeColor);
        }

        // Applica Disponibilità
        if (data.availability) {
            for (const d in data.availability) {
                const fasce = data.availability[d];
                if (fasce && fasce.length > 0) {
                    selectedDays[d] = true;
                    document.querySelector(`[data-day="${d}"]`).classList.add("active");
                    const slots = document.getElementById(d + "-slots");
                    slots.classList.remove("disabled");
                    slots.querySelectorAll("input").forEach(cb => {
                        if (fasce.includes(cb.value)) cb.checked = true;
                    });
                }
            }
        }
    }
}

// --- 9. NAVIGAZIONE E LOGOUT ---
window.openSettings = () => {
    document.getElementById("app").style.display = "none";
    document.getElementById("settingsPage").style.display = "block";
};
window.closeSettings = () => {
    document.getElementById("settingsPage").style.display = "none";
    document.getElementById("app").style.display = "block";
};
window.logout = () => auth.signOut().then(() => location.reload());
