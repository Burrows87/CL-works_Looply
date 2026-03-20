// 1. CONFIGURAZIONE
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializza Firebase subito
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// FORZA IL LOGIN A ESSERE DISPONIBILE AL CLICK
window.startLogin = function() {
    console.log("Pulsante cliccato!");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => { console.log("Loggato!", result.user); })
        .catch((error) => { alert("Errore Firebase: " + error.message); });
};

// Variabili globali
let currentUser = null;
let userLang = 'it';
let selectedDays = { venerdi: false, sabato: false, domenica: false };

// GESTIONE STATO ACCESSO
auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        currentUser = user.uid;
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        
        // Recupera dati
        const doc = await db.collection("users").doc(user.uid).get();
        if (doc.exists && doc.data().displayName) {
            userLang = doc.data().lang || 'it';
            applicaLingua(doc.data().displayName, userLang);
            caricaDati();
        } else {
            const onboard = document.getElementById("onboardingModal");
            if(onboard) onboard.style.display = "flex";
        }
    } else {
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }
});

// FUNZIONI UI (Tutte collegate a window per sicurezza)
window.saveOnboarding = async () => {
    const nome = document.getElementById("inputNome").value.trim();
    const lingua = document.getElementById("selectLingua").value;
    if (nome.length < 2) return;
    await db.collection("users").doc(currentUser).set({ displayName: nome, lang: lingua, themeColor: "#2563eb" }, { merge: true });
    userLang = lingua;
    document.getElementById("onboardingModal").style.display = "none";
    applicaLingua(nome, lingua);
};

function applicaLingua(nome, lingua) {
    const it = { welcome: "Ciao", save: "Salva disponibilità" };
    const en = { welcome: "Hi", save: "Save availability" };
    const t = lingua === 'it' ? it : en;
    const w = document.getElementById("welcomeTitle");
    if(w) w.innerHTML = `${t.welcome} ${nome} 🤙🏻`;
    const s = document.getElementById("labelSaveBtn");
    if(s) s.innerText = t.save;
}

window.logout = () => auth.signOut().then(() => location.reload());
window.openSettings = () => { document.getElementById("app").style.display = "none"; document.getElementById("settingsPage").style.display = "block"; };
window.closeSettings = () => { document.getElementById("settingsPage").style.display = "none"; document.getElementById("app").style.display = "block"; };
