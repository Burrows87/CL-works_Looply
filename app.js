// 1. CONFIGURAZIONE
const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

// Inizializzazione rapida
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. FUNZIONE LOGIN (FORZATA)
// Usiamo il REDIRECT perché è l'unico che i telefoni non bloccano
window.startLogin = function() {
    console.log("Pulsante premuto!"); // Se vedi questo in console, il tasto funziona
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    auth.signInWithRedirect(provider).catch(err => {
        alert("Errore critico: " + err.message);
    });
};

// 3. GESTORE STATO
auth.onAuthStateChanged((user) => {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const loader = document.getElementById("initialLoader");

    if (user) {
        console.log("Loggato come:", user.displayName);
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        document.getElementById("welcomeTitle").innerHTML = `Ciao ${user.displayName.split(' ')[0]} 🤙🏻`;
    } else {
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }
    if(loader) loader.style.display = "none";
});

// Altre funzioni minime per non rompere l'HTML
window.openSettings = () => { document.getElementById("app").style.display = "none"; document.getElementById("settingsPage").style.display = "block"; };
window.closeSettings = () => { document.getElementById("settingsPage").style.display = "none"; document.getElementById("app").style.display = "block"; };
window.logout = () => auth.signOut().then(() => location.reload());
