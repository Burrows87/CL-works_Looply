// ================= FIREBASE =================

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
    alert("Inserisci dati");
    return;
  }

  const result = await auth.signInAnonymously();
  currentUser = result.user.uid;

  await db.collection("users").doc(currentUser).set({
    name,
    phone
  });

  document.getElementById("formLogin").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
};

// ================= GIORNI =================

let selectedDays = {
  venerdi: false,
  sabato: false,
  domenica: false
};

// EVENT LISTENER (NO onclick inline)
document.querySelectorAll(".day-btn").forEach(btn => {
  btn.addEventListener("click", function () {

    const day = this.getAttribute("data-day");
    const select = document.getElementById(`${day}-slot`);

    selectedDays[day] = !selectedDays[day];

    if (selectedDays[day]) {
      this.classList.add("active");
      select.disabled = false;
    } else {
      this.classList.remove("active");
      select.disabled = true;
      select.value = "";
    }

    console.log("Toggle:", day, selectedDays[day]);
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

  await db.collection("users").doc(currentUser).set({
    availability
  }, { merge: true });

  alert("Salvato");
};
