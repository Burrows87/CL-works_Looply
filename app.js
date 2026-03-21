// CONFIGURAZIONE
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione con controllo errori
try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    console.log("Firebase inizializzato");
} catch (e) {
    console.error("Errore inizializzazione:", e);
}

const auth = firebase.auth();

// FUNZIONE LOGIN
window.startLogin = function() {
    console.log("Cliccato!");
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Usiamo il REDIRECT (più affidabile su mobile)
    auth.signInWithRedirect(provider);
};

// GESTORE STATO
auth.onAuthStateChanged((user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    
    if (user) {
        console.log("Utente OK:", user.displayName);
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        document.getElementById("welcomeTitle").innerHTML = "Ciao " + user.displayName.split(' ')[0] + " 🤙🏻";
    } else {
        console.log("Nessun utente");
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }
});

window.logout = () => auth.signOut().then(() => location.reload());
