// CONFIGURAZIONE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// --- LOGIN CON REDIRECT (Anti-Blocco) ---
window.startLogin = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Usiamo il Redirect per bypassare i blocchi dei browser mobile
    auth.signInWithRedirect(provider);
};

// Gestione del ritorno dal login
auth.getRedirectResult().then((result) => {
    if (result.user) console.log("Login completato con successo");
}).catch((error) => {
    console.error("Errore nel redirect:", error.message);
});

// --- CONTROLLO STATO UTENTE ---
auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const welcome = document.getElementById("welcomeTitle");

    if (user) {
        // Utente Loggato
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        if(welcome) {
            const nome = user.displayName ? user.displayName.split(' ')[0] : "Utente";
            welcome.innerHTML = "Ciao " + nome + " 🤙🏻";
        }
    } else {
        // Utente non loggato
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }
});

// Logout
window.logout = function() {
    auth.signOut().then(() => location.reload());
};
