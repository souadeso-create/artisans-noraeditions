// Rendez-vous : objets, agenda du téléphone (Google Agenda sur Android, fichier .ics sur iPhone), messages au client.

export const OBJETS_RDV = ["Premier appel", "Rendez-vous de présentation", "Présentation de la maquette", "Mise en ligne du site", "Point de suivi", "Autre"];
const DUREES = { "Premier appel": 30, "Rendez-vous de présentation": 60, "Présentation de la maquette": 45, "Mise en ligne du site": 30, "Point de suivi": 30, "Autre": 60 };
// la signature des messages : le nom de l'entreprise et son téléphone, tels qu'ils sont dans Réglages
let SIGNATURE = "Nora Éditions";
export function reglerSignature(p) { SIGNATURE = [p?.entreprise || "Nora Éditions", p?.tel].filter(Boolean).join(" — "); }

const politesse = c => c ? [c.civilite, c.nom].filter(Boolean).join(" ") : "";
const adresse = c => c ? [c.adresse, [c.cp, c.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";
export const jourRdv = iso => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
export const heureRdv = iso => { const d = new Date(iso); return `${d.getHours()} h ${String(d.getMinutes()).padStart(2, "0")}`; };
const majuscule = t => t.charAt(0).toUpperCase() + t.slice(1);
const lieuDe = c => !c ? "" : c.adresse ? `au ${adresse(c)}` : c.ville ? `à ${c.ville}` : "";
const estDemain = iso => { const d = new Date(iso), t = new Date(); t.setDate(t.getDate() + 1); return d.toDateString() === t.toDateString(); };
const estAujourdhui = iso => new Date(iso).toDateString() === new Date().toDateString();
// le lien de visio est rangé à la fin du texte du rendez-vous : « Point de suivi · https://meet.google.com/… »
export const lienVisio = r => ((r?.texte || "").match(/https?:\/\/\S+/) || [""])[0];
export const sansLien = t => String(t || "").replace(/\s*·?\s*https?:\/\/\S+/, "").trim();
export const avecLien = (texte, lien) => [texte, String(lien || "").trim()].filter(Boolean).join(" · ");
// le champ du lien dans les fenêtres de rendez-vous, avec le lien habituel des Réglages en un toucher
export const champVisio = (id, lienHabituel, esc) => `<div class="champ"><label for="${id}">Lien de la visio <small>(facultatif)</small></label><input type="url" id="${id}" placeholder="https://meet.google.com/…" inputmode="url">
  ${lienHabituel ? `<button type="button" class="btn discret petit-btn" style="margin-top:6px" onclick="document.getElementById('${id}').value=this.dataset.lien" data-lien="${esc(lienHabituel)}">Mon lien habituel</button>` : ""}</div>`;

export function messageRdv(genre, rdv, client) {
  const quand = estAujourdhui(rdv.created_at) ? "aujourd'hui" : estDemain(rdv.created_at) ? "demain" : `le ${jourRdv(rdv.created_at)}`;
  const lien = lienVisio(rdv), objet = (sansLien(rdv.texte) || "Rendez-vous").toLowerCase(), lieu = lien ? "en visio" : lieuDe(client);
  const visio = lien ? `\n\nLe lien de la visio : ${lien}` : "";
  if (genre === "rappel")
    return `Bonjour ${politesse(client)},\n\nPetit rappel : ${objet} ${quand} à ${heureRdv(rdv.created_at)}${lieu ? `, ${lieu}` : ""}.${visio}\n\nÀ ${quand === "demain" ? "demain" : "bientôt"} !\n${SIGNATURE}`;
  return `Bonjour ${politesse(client)},\n\nJe vous confirme notre rendez-vous (${objet}) ${quand} à ${heureRdv(rdv.created_at)}${lieu ? `, ${lieu}` : ""}.${visio}\n\nÀ bientôt,\n${SIGNATURE}`;
}

// ajoute le rendez-vous à l'agenda du téléphone
export function versAgenda(rdv, client) {
  const objet = sansLien(rdv.texte), lien = lienVisio(rdv), debut = new Date(rdv.created_at), fin = new Date(debut.getTime() + (DUREES[objet.split(" · ")[0]] || 60) * 60000);
  const z = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const titre = `${objet || "Rendez-vous"} – ${politesse(client) || "client"}`, lieu = lien || adresse(client), notes = [client?.tel ? `Tél. ${client.tel}` : "", lien ? `Visio : ${lien}` : ""].filter(Boolean).join("\n");
  if (/android/i.test(navigator.userAgent)) {
    const u = new URL("https://calendar.google.com/calendar/render");
    u.searchParams.set("action", "TEMPLATE"); u.searchParams.set("text", titre); u.searchParams.set("dates", `${z(debut)}/${z(fin)}`);
    if (lieu) u.searchParams.set("location", lieu); if (notes) u.searchParams.set("details", notes);
    window.open(u.toString(), "_blank"); return;
  }
  const esc = t => String(t).replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nora Editions//Appli//FR", "BEGIN:VEVENT", `UID:${rdv.id}@noraeditions.com`, `DTSTAMP:${z(new Date())}`,
    `DTSTART:${z(debut)}`, `DTEND:${z(fin)}`, `SUMMARY:${esc(titre)}`, lieu ? `LOCATION:${esc(lieu)}` : "", notes ? `DESCRIPTION:${esc(notes)}` : "",
    "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", `DESCRIPTION:${esc(titre)}`, "END:VALARM", "END:VEVENT", "END:VCALENDAR"].filter(Boolean).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" })); a.download = "rendez-vous.ics"; a.click();
}

// carte d'un rendez-vous, avec ses trois boutons (le nom du client seulement sur le tableau de bord)
export function carteRdv(rdv, esc, { client = null, retirer = false } = {}) {
  const passe = new Date(rdv.created_at) < Date.now() - 3600000;
  return `<div class="note-carnet rdv ${passe ? "passe" : ""}">
    <small>Rendez-vous${client ? " · " + esc(politesse(client)) : ""}</small>
    <p><b>${esc(majuscule(jourRdv(rdv.created_at)))} · ${heureRdv(rdv.created_at)}</b><br>${esc(sansLien(rdv.texte))}${lienVisio(rdv) ? " · en visio" : ""}</p>
    ${passe ? "" : `<div class="actions-doc" style="margin:8px 0 0">
      ${lienVisio(rdv) ? `<a class="btn petit-btn" href="${esc(lienVisio(rdv))}" target="_blank" rel="noopener">Rejoindre la visio</a>` : ""}
      <button type="button" class="btn petit-btn" data-rdv-agenda="${rdv.id}">Mon agenda</button>
      <button type="button" class="btn clair petit-btn" data-rdv-confirmer="${rdv.id}">Prévenir le client</button>
      <button type="button" class="btn clair petit-btn" data-rdv-rappel="${rdv.id}">Rappel</button></div>`}
    ${retirer ? `<button type="button" class="icone" data-retirer="${rdv.id}" aria-label="Retirer">✕</button>` : ""}</div>`;
}

// branche les boutons des cartes de rendez-vous d'un bloc
export function lierRdv(zone, rdvs, clientDe, envoyerMessage) {
  zone.querySelectorAll("[data-rdv-agenda]").forEach(b => b.onclick = () => { const r = rdvs.find(x => x.id === b.dataset.rdvAgenda); versAgenda(r, clientDe(r)); });
  zone.querySelectorAll("[data-rdv-confirmer]").forEach(b => b.onclick = () => { const r = rdvs.find(x => x.id === b.dataset.rdvConfirmer); envoyerMessage({ client: clientDe(r) }, messageRdv("confirmation", r, clientDe(r))); });
  zone.querySelectorAll("[data-rdv-rappel]").forEach(b => b.onclick = () => { const r = rdvs.find(x => x.id === b.dataset.rdvRappel); envoyerMessage({ client: clientDe(r) }, messageRdv("rappel", r, clientDe(r))); });
}
