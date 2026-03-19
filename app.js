const slidesData = [
{
title:"Benvenuto in Looply 🤙",
text:"Trova amici disponibili negli stessi momenti."
},
{
title:"Segna la tua disponibilità 📅",
text:"Scegli giorni e fasce orarie facilmente."
},
{
title:"Match automatici 🔥",
text:"Ricevi notifiche quando trovi compatibilità."
}
];

let currentSlide = 0;

/* ---------------- ONBOARDING ---------------- */

function showSlide(i){
document.getElementById("slideTitle").innerText = slidesData[i].title;
document.getElementById("slideText").innerText = slidesData[i].text;

document.getElementById("ctaFinal").style.display =
(i === slidesData.length - 1) ? "block" : "none";

renderDots();
}

function renderDots(){
const dots = document.getElementById("dots");
dots.innerHTML = "";

slidesData.forEach((_,i)=>{
const d = document.createElement("span");
d.innerText = "●";
if(i === currentSlide) d.classList.add("active");
dots.appendChild(d);
});
}

function nextSlide(){
if(currentSlide < slidesData.length - 1){
currentSlide++;
showSlide(currentSlide);
}
}

function prevSlide(){
if(currentSlide > 0){
currentSlide--;
showSlide(currentSlide);
}
}

function finishSlides(){
localStorage.setItem("slidesSeen","true");
document.getElementById("slides").classList.add("hidden");
document.getElementById("formLogin").classList.remove("hidden");
}

/* ---------------- LOGIN ---------------- */

document.getElementById("terms").onchange = checkLogin;
document.getElementById("privacy").onchange = checkLogin;

function checkLogin(){
const t = document.getElementById("terms").checked;
const p = document.getElementById("privacy").checked;
document.getElementById("enterBtn").disabled = !(t && p);
}

function login(){
const name = document.getElementById("username").value;
if(!name) return alert("Inserisci nome");

localStorage.setItem("user", name);

document.getElementById("formLogin").classList.add("hidden");
document.getElementById("app").classList.remove("hidden");
}

/* ---------------- DAYS ---------------- */

const daysList = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

const daysContainer = document.getElementById("days");

daysList.forEach(day=>{
const btn = document.createElement("button");
btn.innerText = day;

btn.onclick = ()=>{
btn.classList.toggle("selected");
};

daysContainer.appendChild(btn);
});

/* ---------------- SAVE ---------------- */

function saveAvailability(){
alert("Disponibilità salvata");
}

/* ---------------- SETTINGS ---------------- */

function openSettings(){
document.getElementById("app").classList.add("hidden");
document.getElementById("settings").classList.remove("hidden");
}

function goBack(){
document.getElementById("settings").classList.add("hidden");
document.getElementById("app").classList.remove("hidden");
}

/* ---------------- INIT ---------------- */

if(!localStorage.getItem("slidesSeen")){
document.getElementById("slides").classList.remove("hidden");
showSlide(0);
}else{
document.getElementById("formLogin").classList.remove("hidden");
}
