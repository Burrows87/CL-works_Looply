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

// ================= LOGIN =================

window.login = async function () {

  const name = document.getElementById("username").value;
  const phone = document.getElementById("phone").value;

  if (!name || !phone) {
    alert("Inserisci nome e telefono");
    return;
  }

  try {
    const result = await auth.signInAnonymously();
    currentUser = result.user.uid;

    await db.collection("users").doc(currentUser).set({
      name,
      phone,
      createdAt: new Date()
    });

    document.getElementById("formLogin").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
};

// ================= STATE =================

let selectedDays = {
  venerdi: false,
  sabato: false,
  domenica: false
};

// ================= DOM READY =================

window.addEventListener("DOMContentLoaded", () => {

  const buttons = document.querySelectorAll(".day-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {

      const day = btn.getAttribute("data-day");
      const select = document.getElementById(`${day}-slot`);

      selectedDays[day] = !selectedDays[day];

      if (selectedDays[day]) {
        btn.classList.add("active");
        select.disabled = false;
      } else {
        btn.classList.remove("active");
        select.disabled = true;
        select.value = "";
      }

      console.log("Toggle:", day, selectedDays[day], "disabled:", select.disabled);
    });
  });

});

// ================= AVAILABILITY =================

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

// ================= SAVE =================

window.saveAvailability = async function () {

  if (!currentUser) {
    alert("Utente non loggato");
    return;
  }

  const availability = getAvailability();

  try {
    await db.collection("users").doc(currentUser).set({
      availability
    }, { merge: true });

    alert("Disponibilità salvata");

  } catch (error) {
    console.error(error);
    alert("Errore nel salvataggio");
  }
};
