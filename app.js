console.log("App.js caricato correttamente!");

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

// NAVIGAZIONE
window.openSettings = () => {
    document.getElementById("app").style.display = "none";
    document.getElementById("settingsPage").style.display = "block";
};
window.closeSettings = () => {
    document.getElementById("settingsPage").style.display = "none";
    document.getElementById("app").style.display = "block";
};

// LOGIN GOOGLE (METODO DIRETTO)
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("googleBtn");
    if (btn) {
        btn.onclick = () => {
            console.log("Click su Login Google rilevato!");
            const provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then((result) => console.log("Successo:", result.user))
                .catch((error) => {
                    console.error("Errore Firebase:", error.code);
                    alert("Errore Login: " + error.message);
                });
        };
    }
});

// STATO AUTH
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user.uid;
        document.getElementById("formLogin").style.display = "none";
        document.getElementById("app").style.display = "block";
        document.getElementById("welcomeTitle").innerText = "Ciao " + (user.displayName ? user.displayName.split(' ')[0] : "Utente");
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
        document.getElementById("formLogin").style.display = "block";
        document.getElementById("app").style.display = "none";
        document.getElementById("settingsPage").style.display = "none";
    }
});

// LOGICA GIORNI
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

// SALVATAGGIO
window.saveAvailability = async () => {
    const av = {
        venerdi: getValues("venerdi"),
        sabato: getValues("sabato"),
        domenica: getValues("domenica")
    };
    try {
        await db.collection("users").doc(currentUser).set({ availability: av }, { merge: true });
        alert("✅ Salvato!");
    } catch (e) { alert("Errore"); }
};

function getValues(day) {
    if (!selectedDays[day]) return null;
    const vals = Array.from(document.getElementById(day + "-slots").querySelectorAll("input:checked")).map(c => c.value);
    return vals.length > 0 ? vals : null;
}

async function caricaDati() {
    const doc = await db.collection("users").doc(currentUser).get();
    if (doc.exists && doc.data().availability) {
        const av = doc.data().availability;
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

window.logout = () => auth.signOut().then(() => location.reload());
window.loginEmail = () => alert("Usa Google!");
