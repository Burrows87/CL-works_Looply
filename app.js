// TEST DI CARICAMENTO - Se non vedi questo, il file è quello vecchio!
alert("VERSIONE 11 CARICATA");

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

// GESTIONE RITORNO DA GOOGLE
auth.getRedirectResult().then((result) => {
    if (result.user) {
        console.log("✅ LOGIN AGGANCIATO!");
    }
}).catch((e) => console.error("Errore Redirect:", e));

// GESTORE STATO
auth.onAuthStateChanged((user) => {
    const loader = document.getElementById("loader");
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");

    if (user) {
        console.log("✅ UTENTE OK:", user.displayName);
        loginDiv.style.display = "none";
        appDiv.style.display = "block";
        document.getElementById("welcomeTitle").innerText = "Ciao " + user.displayName.split(' ')[0] + " 🤙🏻";
    } else {
        console.log("❌ NON LOGGATO");
        loginDiv.style.display = "block";
        appDiv.style.display = "none";
    }
    if (loader) loader.style.display = "none";
});

window.startLogin = () => auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider());
window.logout = () => auth.signOut().then(() => location.reload());
