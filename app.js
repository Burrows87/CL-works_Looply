// 1. MESSAGGIO DI TEST (Se vedi questo all'apertura, JS sta caricando)
console.log("Script caricato correttamente");

// 2. CONFIGURAZIONE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione sicura
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();

// 3. FUNZIONE DI LOGIN (Attaccata direttamente a window)
window.startLogin = function() {
    alert("Hai cliccato il pulsante! Provo a connettermi a Google...");
    
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Usiamo il REDIRECT: è l'unico modo per evitare che il telefono blocchi tutto
    auth.signInWithRedirect(provider).catch(function(error) {
        alert("Errore durante l'avvio: " + error.message);
    });
};

// 4. GESTORE DELLO STATO (Cosa succede dopo il login)
auth.onAuthStateChanged(function(user) {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const welcome = document.getElementById("welcomeTitle");

    if (user) {
        console.log("Utente loggato:", user.displayName);
        if (loginDiv) loginDiv.style.display = "none";
        if (appDiv) appDiv.style.display = "block";
        if (welcome) {
            var nome = user.displayName ? user.displayName.split(' ')[0] : "Utente";
            welcome.innerHTML = "Ciao " + nome + " 🤙🏻";
        }
    } else {
        console.log("Nessun utente loggato");
        if (loginDiv) loginDiv.style.display = "block";
        if (appDiv) appDiv.style.display = "none";
    }
});

// Funzione logout
window.logout = function() {
    auth.signOut().then(function() {
        location.reload();
    });
};
