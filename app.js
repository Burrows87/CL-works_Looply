// 1. CONFIGURAZIONE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
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

// 2. GESTIONE LOGIN (OTTIMIZZATA PER MOBILE)
document.addEventListener("DOMContentLoaded", () => {
    const googleBtn = document.getElementById("googleBtn");
    if (googleBtn) {
        googleBtn.onclick = () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            // Metodo Redirect: più stabile per Safari e browser in-app (WhatsApp/Instagram)
            auth.signInWithRedirect(provider);
        };
    }
});

// Gestisce il ritorno dal redirect di Google
auth.getRedirectResult().then((result) => {
    if (result.user) console.log("Login completato con successo!");
}).catch((error) => {
    if (error.code !== 'auth/no-auth-event') {
        console.error("Errore nel login:", error.message);
    }
});

// 3. MONITORAGGIO STATO UTENTE
auth.onAuthStateChanged(async (user) => {
    const formLogin = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    
    if (user) {
        currentUser = user.uid;
        formLogin.style.display = "none";
        appDiv.style.display = "block";
        
        // Aggiorna UI con dati utente
        document.getElementById("welcomeTitle").innerText = "Ciao " + (user.displayName ? user.displayName.split(' ')[0] : "!");
        document.getElementById("userName").innerText = user.displayName || "Utente";
        document.getElementById("userEmail").innerText = user.email;
        
        if (user.photoURL) {
            const img = document.getElementById("userPhoto");
            img.src = user.photoURL;
            img.style.display = "block";
        }
        // Carica dati salvati (disponibilità e tema)
        await caricaDati();
    } else {
        currentUser = null;
        formLogin.style.display = "block";
        appDiv.style.display = "none";
        document.getElementById("settingsPage").style.display = "none";
    }
});

// 4. CAMBIO TEMA (COLORI)
window.changeTheme = async (color) => {
    console.log("Applicazione tema:", color);
    // Cambia la variabile CSS in tempo reale
    document.documentElement.style.setProperty('--primary-color', color);
    
    // Salva la scelta nel database
    if (currentUser) {
        try {
            await db.collection("users").doc(currentUser).set({ themeColor: color }, { merge: true });
        } catch (e) {
            console.error("Errore salvataggio tema:", e);
        }
    }
};

// 5. NAVIGAZIONE INTERNA
window.openSettings = () => {
    document.getElementById("app").style.display = "none";
    document.getElementById("settingsPage").style.display = "block";
};

window.closeSettings = () => {
    document.getElementById("settingsPage").style.display = "none";
    document.getElementById("app").style.display = "block";
};

// 6. LOGICA SELEZIONE GIORNI
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const day = btn.dataset.day;
        const slots = document.getElementById(day + "-slots");
        
        selectedDays[day] = !selectedDays[day];
        
        if (selectedDays[day]) {
            btn.classList.add("active");
            slots.classList.remove("disabled");
            // Seleziona 'Sempre' di default all'attivazione
            slots.querySelector('input[value="any"]').checked = true;
        } else {
            btn.classList.remove("active");
            slots.classList.add("disabled");
            slots.querySelectorAll("input").forEach(i => i.checked = false);
        }
    };
});

// 7. SALVATAGGIO DISPONIBILITÀ
window.saveAvailability = async () => {
    const btn = document.getElementById("btnSave");
    btn.innerText = "Salvataggio...";
    
    const av = {
        venerdi: getCheckedValues("venerdi"),
        sabato: getCheckedValues("sabato"),
        domenica: getCheckedValues("domenica")
    };

    try {
        await db.collection("users").doc(currentUser).set({ availability: av }, { merge: true });
        btn.innerText = "Salva disponibilità";
        alert("✅ Disponibilità salvata correttamente!");
    } catch (e) {
        alert("Errore durante il salvataggio.");
        btn.innerText = "Salva disponibilità";
    }
};

function getCheckedValues(day) {
    if (!selectedDays[day]) return null;
    const container = document.getElementById(day + "-slots");
    const values = Array.from(container.querySelectorAll("input:checked")).map(c => c.value);
    return values.length > 0 ? values : null;
}

// 8. CARICAMENTO DATI DA FIREBASE
async function caricaDati() {
    try {
        const doc = await db.collection("users").doc(currentUser).get();
        if (doc.exists) {
            const data = doc.data();
            
            // 1. Applica il tema salvato
            if (data.themeColor) {
                document.documentElement.style.setProperty('--primary-color', data.themeColor);
            }

            // 2. Ripristina la disponibilità
            if (data.availability) {
                const av = data.availability;
                for (const d in av) {
                    if (av[d]) {
                        const btn = document.querySelector(`[data-day="${d}"]`);
                        const slots = document.getElementById(d + "-slots");
                        selectedDays[d] = true;
                        if (btn) btn.classList.add("active");
                        if (slots) {
                            slots.classList.remove("disabled");
                            slots.querySelectorAll("input").forEach(cb => {
                                if (av[d].includes(cb.value)) cb.checked = true;
                            });
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error("Errore caricamento dati:", e);
    }
}

// 9. LOGOUT
window.logout = () => {
    auth.signOut().then(() => {
        location.reload();
    });
};
