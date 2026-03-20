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

// 2. FUNZIONE CAMBIO COLORE (IL CUORE DEL PROBLEMA)
window.changeTheme = async (color) => {
    console.log("Cambio colore richiesto:", color);
    
    // Cambia il colore a tutto il documento istantaneamente
    document.documentElement.style.setProperty('--primary-color', color);
    
    // Salva nel database così al prossimo accesso è già pronto
    if (currentUser) {
        try {
            await db.collection("users").doc(currentUser).set({ themeColor: color }, { merge: true });
        } catch (e) { console.error("Errore salvataggio tema:", e); }
    }
};

// 3. LOGIN (REDIRECT PER MOBILE)
document.addEventListener("DOMContentLoaded", () => {
    const googleBtn = document.getElementById("googleBtn");
    if (googleBtn) {
        googleBtn.onclick = () => auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
    }
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user.uid;
        document.getElementById("formLogin").style.display = "none";
        document.getElementById("app").style.display = "block";
        document.getElementById("welcomeTitle").innerText = "Ciao " + (user.displayName ? user.displayName.split(' ')[0] : "!");
        document.getElementById("userName").innerText = user.displayName || "Utente";
        document.getElementById("userEmail").innerText = user.email;
        if (user.photoURL) document.getElementById("userPhoto").src = user.photoURL;
        await caricaDati();
    } else {
        currentUser = null;
        document.getElementById("formLogin").style.display = "block";
        document.getElementById("app").style.display = "none";
    }
});

// 4. LOGICA GIORNI
document.querySelectorAll(".day-btn").forEach(btn => {
    btn.onclick = () => {
        const day = btn.dataset.day;
        const slots = document.getElementById(day + "-slots");
        selectedDays[day] = !selectedDays[day];
        if (selectedDays[day]) {
            btn.classList.add("active");
            slots.classList.remove("disabled");
            slots.querySelector('input[value="any"]').checked = true;
        } else {
            btn.classList.remove("active");
            slots.classList.add("disabled");
            slots.querySelectorAll("input").forEach(i => i.checked = false);
        }
    };
});

// 5. SALVATAGGIO DISPONIBILITÀ
window.saveAvailability = async () => {
    const btn = document.getElementById("btnSave");
    btn.innerText = "Salvataggio...";
    const av = {
        venerdi: getCheckedVals("venerdi"),
        sabato: getCheckedVals("sabato"),
        domenica: getCheckedVals("domenica")
    };
    try {
        await db.collection("users").doc(currentUser).set({ availability: av }, { merge: true });
        alert("✅ Salvato!");
    } catch (e) { alert("Errore"); }
    btn.innerText = "Salva disponibilità";
};

function getCheckedVals(day) {
    if (!selectedDays[day]) return null;
    return Array.from(document.getElementById(day + "-slots").querySelectorAll("input:checked")).map(c => c.value);
}

// 6. CARICAMENTO DATI (TEMA E GIORNI)
async function caricaDati() {
    const doc = await db.collection("users").doc(currentUser).get();
    if (doc.exists) {
        const data = doc.data();
        if (data.themeColor) document.documentElement.style.setProperty('--primary-color', data.themeColor);
        if (data.availability) {
            for (const d in data.availability) {
                if (data.availability[d]) {
                    selectedDays[d] = true;
                    const btn = document.querySelector(`[data-day="${d}"]`);
                    const slots = document.getElementById(d + "-slots");
                    if(btn) btn.classList.add("active");
                    if(slots) {
                        slots.classList.remove("disabled");
                        slots.querySelectorAll("input").forEach(cb => {
                            if (data.availability[d].includes(cb.value)) cb.checked = true;
                        });
                    }
                }
            }
        }
    }
}

// NAVIGAZIONE
window.openSettings = () => {
    document.getElementById("app").style.display = "none";
    document.getElementById("settingsPage").style.display = "block";
};
window.closeSettings = () => {
    document.getElementById("settingsPage").style.display = "none";
    document.getElementById("app").style.display = "block";
};
window.logout = () => auth.signOut().then(() => location.reload());
