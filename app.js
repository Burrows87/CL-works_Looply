// ================= FIREBASE INIT =================

const firebaseConfig = {
  apiKey: "AIzaSyAGuCVHMwTmApzsgSJ7hS8UX6LiiSNJFjU",
  authDomain: "looply-app-21eb9.firebaseapp.com",
  projectId: "looply-app-21eb9",
  storageBucket: "looply-app-21eb9.firebasestorage.app",
  messagingSenderId: "484354825970",
  appId: "1:484354825970:web:79bc652c6b39fb57d27a6b"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentMatchUser = null;

// ================= DOM READY =================

window.addEventListener("DOMContentLoaded", () => {
  createDaysUI(); // se la usi per generare i 3 giorni
});

// ================= LOGIN =================

window.login = async function () {

  const name = document.getElementById("username").value;
  const phone = document.getElementById("phone").value;
  const terms = document.getElementById("terms").checked;
  const privacy = document.getElementById("privacy").checked;

  if (!name || !phone) {
    alert("Inserisci nome e telefono");
    return;
  }

  if (!terms || !privacy) {
    alert("Devi accettare termini e privacy");
    return;
  }

  try {
    const result = await auth.signInAnonymously();
    currentUser = result.user.uid;

    await db.collection("users").doc(currentUser).set({
      name,
      phone,
      createdAt: new Date()
    }, { merge: true });

    document.getElementById("formLogin").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    listenMatches();

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

// ================= GIORNI =================

let selectedDays = {
  venerdi: false,
  sabato: false,
  domenica: false
};

function toggleDay(day) {
  selectedDays[day] = !selectedDays[day];

  const btn = document.getElementById(`${day}-btn`);
  const select = document.getElementById(`${day}-slot`);

  if (selectedDays[day]) {
    btn.classList.add("active");
    select.disabled = false;
  } else {
    btn.classList.remove("active");
    select.disabled = true;
    select.value = "";
  }
}

// ================= RACCOLTA DATI =================

function getAvailability() {
  return {
    venerdi: selectedDays.venerdi
      ? document.getElementById("venerdi-slot").value || "any"
      : null,

    sabato: selectedDays.sabato
      ? document.getElementById("sabato-slot").value || "any"
      : null,

    domenica: selectedDays.domenica
      ? document.getElementById("domenica-slot").value || "any"
      : null
  };
}

// ================= SALVATAGGIO =================

async function saveAvailability() {

  const availability = getAvailability();

  try {
    await db.collection("users").doc(currentUser).set({
      availability: availability,
      updatedAt: new Date()
    }, { merge: true });

    alert("Disponibilità salvata");

    checkMatches(currentUser);

  } catch (error) {
    console.error(error);
    alert("Errore nel salvataggio");
  }
}

// ================= MATCH =================

async function checkMatches(myId) {

  const myDoc = await db.collection("users").doc(myId).get();
  const myData = myDoc.data();

  const snapshot = await db.collection("users").get();

  snapshot.forEach(doc => {

    if (doc.id === myId) return;

    const user = doc.data();

    if (user.availability && compareAvailability(myData.availability, user.availability)) {
      showMatch(user);
    }

  });
}

function compareAvailability(a, b) {
  if (!a || !b) return false;

  return (
    (a.venerdi && b.venerdi && a.venerdi === b.venerdi) ||
    (a.sabato && b.sabato && a.sabato === b.sabato) ||
    (a.domenica && b.domenica && a.domenica === b.domenica)
  );
}

// ================= MATCH UI =================

function showMatch(user) {
  const popup = document.getElementById("matchPopup");
  const text = document.getElementById("matchText");

  text.innerText = `Hai un match con ${user.name}`;

  popup.classList.remove("hidden");

  currentMatchUser = user;
}

function closeMatch() {
  document.getElementById("matchPopup").classList.add("hidden");
}

function sendWhatsApp() {
  if (!currentMatchUser) return;

  const phone = currentMatchUser.phone;
  const message = encodeURIComponent("Ciao! Match da Looply 👋");

  window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
}

// ================= LISTENER MATCH (OPZIONALE) =================

function listenMatches() {
  db.collection("users").onSnapshot(() => {
    checkMatches(currentUser);
  });
}
