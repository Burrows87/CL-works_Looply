// CONFIGURAZIONE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU", // <--- RICONTROLLA QUESTA CHIAVE
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione sicura
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} catch (e) {
    console.error("Errore inizializzazione Firebase:", e);
}

const auth = firebase.auth();

// GESTIONE STATO UTENTE
auth.onAuthStateChanged((user) => {
    const loader = document.getElementById("loader");
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const welcomeTitle = document.getElementById("welcomeTitle");

    if (user) {
        console.log("✅ UTENTE LOGGATO:", user.displayName);
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        if(welcomeTitle) welcomeTitle.innerText = "Ciao " + user.displayName.split(' ')[0] + " 🤙🏻";
    } else {
        console.log("❌ UTENTE NON LOGGATO");
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }
    
    // Rimuovi il loader rotante
    if (loader) loader.style.display = "none";
});

// FUNZIONE LOGIN
window.startLogin = function() {
    console.log("🚀 Tentativo di login...");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider).catch((error) => {
        alert("Errore immediato: " + error.message);
    });
};

// LOGOUT
window.logout = function() {
    auth.signOut().then(() => window.location.reload());
};
