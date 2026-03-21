// 1. CONFIGURAZIONE (Verificata dai tuoi screenshot)
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// 2. FUNZIONE DI LOGIN (REDIRECT)
// Il redirect è necessario per evitare blocchi popup e l'errore 404 sui domini non verificati
window.startLogin = function() {
    console.log("Tentativo di login avviato...");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Cambiamo pagina verso Google
    auth.signInWithRedirect(provider);
};

// 3. GESTORE DELLO STATO (Cosa succede quando torni da Google)
auth.onAuthStateChanged(async (user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const welcome = document.getElementById("welcomeTitle");

    if (user) {
        console.log("Utente loggato con successo:", user.displayName);
        
        // Mostra l'app, nascondi il login
        if (loginDiv) loginDiv.style.display = "none";
        if (appDiv) appDiv.style.display = "block";
        
        // Saluto personalizzato
        if (welcome) {
            const nome = user.displayName ? user.displayName.split(' ')[0] : "Utente";
            welcome.innerHTML = `Ciao ${nome} 🤙🏻`;
        }

        // Qui caricheremo i dati dal database in seguito
    } else {
        console.log("Nessun utente rilevato, mostro il login.");
        if (loginDiv) loginDiv.style.display = "block";
        if (appDiv) appDiv.style.display = "none";
    }
});

// 4. FUNZIONE LOGOUT
window.logout = function() {
    auth.signOut().then(() => {
        window.location.reload();
    }).catch((error) => {
        console.error("Errore logout:", error);
    });
};
