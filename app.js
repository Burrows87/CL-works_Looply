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

// CAMBIO TEMA ISTANTANEO
window.changeTheme = async (color) => {
    document.documentElement.style.setProperty('--primary-color', color);
    if (currentUser) {
        await db.collection("users").doc(currentUser).set({ themeColor: color }, { merge: true });
    }
};

// LOGIN REDIRECT (MOBILE)
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("googleBtn");
    if (btn) btn.onclick = () => auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user.uid;
        document.getElementById("formLogin").style.display = "none";
        document.getElementById("app").style.display = "block";
        document.getElementById("welcomeTitle").innerText = "Ciao " + user.displayName.split(' ')[0];
        if (user.photoURL) document.getElementById("userPhoto").src = user.photoURL;
        document.getElementById("userName").innerText = user.displayName;
        document.getElementById("userEmail").innerText = user.email;
        await caricaDati();
    } else {
        document.getElementById("formLogin").style.display = "block";
        document.getElementById("app").style.display = "none";
    }
});

// LOGICA CLICK GIORNI
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
        }
    };
});

window.saveAvailability = async () => {
    const btn = document.getElementById("btnSave");
    btn.innerText = "Salvataggio...";
    const av = {
        venerdi: getVals("venerdi"),
        sabato: getVals("sabato"),
        domenica: getVals("domenica")
    };
    await db.collection("users").doc(currentUser).set({ availability: av }, { merge: true });
    btn.innerText = "Salva disponibilità";
    alert("✅ Salvato!");
};

function getVals(day) {
    if (!selectedDays[day]) return null;
    return Array.from(document.getElementById(day + "-slots").querySelectorAll("input:checked")).map(c => c.value);
}

async function caricaDati() {
    const doc = await db.collection("users").doc(currentUser).get();
    if (doc.exists) {
        const data = doc.data();
        if (data.themeColor) document.documentElement.style.setProperty('--primary-color', data.themeColor);
        if (data.availability) {
            for (const d in data.availability) {
                if (data.availability[d]) {
                    selectedDays[d] = true;
                    document.querySelector(`[data-day="${d}"]`).classList.add("active");
                    const slots = document.getElementById(d + "-slots");
                    slots.classList.remove("disabled");
                    slots.querySelectorAll("input").forEach(cb => {
                        if (data.availability[d].includes(cb.value)) cb.checked = true;
                    });
                }
            }
        }
    }
}

window.openSettings = () => { document.getElementById("app").style.display = "none"; document.getElementById("settingsPage").style.display = "block"; };
window.closeSettings = () => { document.getElementById("settingsPage").style.display = "none"; document.getElementById("app").style.display = "block"; };
window.logout = () => auth.signOut().then(() => location.reload());
