// CONFIGURAZIONE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
  authDomain: "looply-app-21eb9.firebaseapp.com",
  projectId: "looply-app-21eb9",
  storageBucket: "looply-app-21eb9.firebasestorage.app",
  messagingSenderId: "484354825970",
  appId: "1:484354825970:web:79bc652c6b39fb57d27a6b",
};

// Init
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// GESTORE STATO UTENTE
auth.onAuthStateChanged((user) => {
    const loader = document.getElementById("loader");
    const loginDiv = document.getElementById("formLogin");
    const appDiv = document.getElementById("app");
    const welcome = document.getElementById("welcomeTitle");

    if (user) {
        console.log("✅ Loggato:", user.displayName);
        if(loginDiv) loginDiv.style.display = "none";
        if(appDiv) appDiv.style.display = "block";
        if(welcome) welcome.innerText = "Ciao " + user.displayName.split(' ')[0] + " 🤙🏻";
    } else {
        console.log("❌ Non loggato");
        if(loginDiv) loginDiv.style.display = "block";
        if(appDiv) appDiv.style.display = "none";
    }
    if(loader) loader.style.display = "none";
});

// FUNZIONE LOGIN
window.startLogin = function() {
    console.log("🚀 Avvio login...");
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider);
};

// LOGOUT
window.logout = function() {
    auth.signOut().then(() => window.location.reload());
};
