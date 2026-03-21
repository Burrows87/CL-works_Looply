const firebaseConfig = {
    apiKey: "AIzaSyAGVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
    authDomain: "looply-app-21eb9.firebaseapp.com",
    projectId: "looply-app-21eb9",
    storageBucket: "looply-app-21eb9.firebasestorage.app",
    messagingSenderId: "484354825970",
    appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Forza la persistenza locale
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// FUNZIONE UI PER CAMBIARE SCHERMATA
function showApp(user) {
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const loader = document.getElementById("loader");
    const welcome = document.getElementById("welcomeTitle");

    if (user) {
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        if(welcome) welcome.innerText = "Ciao " + user.displayName.split(' ')[0] + " 🤙🏻";
        console.log("ACCESSO CONFERMATO:", user.displayName);
    } else {
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }
    if(loader) loader.style.display = "none";
}

// GESTORE STATO
auth.onAuthStateChanged((user) => {
    showApp(user);
});

// RECUPERO REDIRECT (Fondamentale al ritorno da Google)
auth.getRedirectResult().then((result) => {
    if (result.user) {
        showApp(result.user);
    }
}).catch((error) => {
    console.error("Errore Redirect:", error.code);
});

// FUNZIONE LOGIN
window.startLogin = function() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
};

window.logout = function() {
    auth.signOut().then(() => location.reload());
};
