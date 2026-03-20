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
const db = firebase.firestore();

let currentUser = null;
let selectedDays = { venerdi: false, sabato: false, domenica: false };

// SESSIONE
auth.onAuthStateChanged(async (user) => {
  const formLogin = document.getElementById("formLogin");
  const appDiv = document.getElementById("app");
  if (user) {
    currentUser = user.uid;
    formLogin.classList.add("hidden");
    appDiv.classList.remove("hidden");
    caricaDati();
  } else {
    currentUser = null;
    formLogin.classList.remove("hidden");
    appDiv.classList.add("hidden");
  }
});

// LOGIN GOOGLE
document.getElementById("googleBtn").addEventListener("click", async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    await db.collection("users").doc(result.user.uid).set({
      name: result.user.displayName,
      email: result.user.email,
      lastLogin: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) { alert(e.message); }
});

// LOGICA GIORNI
document.querySelectorAll(".day-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const day = btn.dataset.day;
    toggleDay(day);
  });
});

function toggleDay(day) {
  const btn = document.querySelector(`[data-day="${day}"]`);
  const slots = document.getElementById(`${day}-slots`);
  
  selectedDays[day] = !selectedDays[day];

  if (selectedDays[day]) {
    btn.classList.add("active");
    slots.classList.remove("disabled");
  } else {
    btn.classList.remove("active");
    slots.classList.add("disabled");
    slots.querySelectorAll("input").forEach(i => i.checked = false);
  }
}

// SALVA
window.saveAvailability = async () => {
  const av = {
    venerdi: selectedDays.venerdi ? Array.from(document.querySelectorAll("#venerdi-slots input:checked")).map(c => c.value) : null,
    sabato: selectedDays.sabato ? Array.from(document.querySelectorAll("#sabato-slots input:checked")).map(c => c.value) : null,
    domenica: selectedDays.domenica ? Array.from(document.querySelectorAll("#domenica-slots input:checked")).map(c => c.value) : null,
  };

  try {
    await db.collection("users").doc(currentUser).set({ availability: av }, { merge: true });
    alert("Salvato!");
  } catch (e) { alert("Errore"); }
};

// CARICA
async function caricaDati() {
  const doc = await db.collection("users").doc(currentUser).get();
  if (doc.exists && doc.data().availability) {
    const av = doc.data().availability;
    for (const d in av) {
      if (av[d]) {
        toggleDay(d);
        const container = document.getElementById(`${d}-slots`);
        container.querySelectorAll("input").forEach(cb => {
          if (av[d].includes(cb.value)) cb.checked = true;
        });
      }
    }
  }
}

window.logout = () => auth.signOut().then(() => location.reload());
window.loginEmail = () => alert("Usa Google per ora!");
