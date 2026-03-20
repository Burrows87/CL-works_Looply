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

// --- NAVIGAZIONE ---
window.openSettings = () => {
    document.getElementById("app").style.display = "none";
    document.getElementById("settingsPage").style.display = "block";
};

window.closeSettings = () => {
    document.getElementById("settingsPage").style.display = "none";
    document.getElementById("app").style.display = "block";
};

// --- PERSONALIZZAZIONE TEMA ---
window.changeTheme = async (color) => {
    document.documentElement.style.setProperty('--primary-color', color);
    if (currentUser) {
        await db.collection("users").doc(currentUser).set({ themeColor: color }, { merge: true });
    }
};

// --- GESTIONE AUTH ---
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
        
        if (user.photoURL) {
            const img = document.getElementById("userPhoto");
            img.src = user.photoURL;
            img.style.display = "block";
        }
        await caricaDati();
    } else {
        currentUser = null;
        formLogin.style.display = "block";
        appDiv.style.display = "none";
        document.getElementById("settingsPage").style.display = "none";
    }
});

document.getElementById("googleBtn").onclick = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => console.error(e));
};

window.logout = () => auth.signOut().then(() => location.reload());

// --- LOGICA GIORNI ---
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

// --- SALVATAGGIO E CARICAMENTO ---
window.saveAvailability = async () => {
    const btn = document.getElementById("btnSave");
    btn.innerText = "Salvataggio...";
    
    const av = {
        venerdi: getVals("venerdi"),
        sabato: getVals("sabato"),
        domenica: getVals("domenica")
    };

    try {
        await db.collection("users").doc(currentUser).set({ availability: av }, { merge: true });
        btn.innerText = "Salva disponibilità";
        alert("✅ Disponibilità salvata!");
    } catch (e) {
        alert("Errore");
        btn.innerText = "Salva disponibilità";
    }
};

function getVals(day) {
    if (!selectedDays[day]) return null;
    const checks = document.getElementById(day + "-slots").querySelectorAll("input:checked");
    return Array.from(checks).map(c => c.value);
}

async function caricaDati() {
    const doc = await db.collection("users").doc(currentUser).get();
    if (doc.exists) {
        const data = doc.data();
        
        // Applica tema salvato
        if (data.themeColor) {
            document.documentElement.style.setProperty('--primary-color', data.themeColor);
        }

        // Applica disponibilità
        if (data.availability) {
            const av = data.availability;
            for (const d in av) {
                if (av[d]) {
                    const btn = document.querySelector(`[data-day="${d}"]`);
                    const slots = document.getElementById(d + "-slots");
                    selectedDays[d] = true;
                    btn.classList.add("active");
                    slots.classList.remove("disabled");
                    slots.querySelectorAll("input").forEach(cb => {
                        if (av[d].includes(cb.value)) cb.checked = true;
                    });
                }
            }
        }
    }
}
