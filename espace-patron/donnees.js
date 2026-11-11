// Valeurs de départ de l'appli Nora Éditions (création de site internet) : à compléter dans Réglages.

export const PARAMETRES_DEFAUT = {
  entreprise: "Nora Éditions",
  forme: "",
  adresse: "",
  cp: "",
  ville: "",
  tel: "",
  email: "contact@noraeditions.com",
  site: "creation-site-internet.noraeditions.fr",
  siret: "",
  ape: "",
  tva_intra: "",
  mention_tva: "TVA non applicable, article 293 B du Code général des impôts",
  // micro-entreprise : pas de TVA sur les devis et les factures
  regime_tva: "franchise",
  tva_taux: 20,
  mention_attestation: "",
  iban: "",
  bic: "",
  titulaire: "",
  moyen_paiement: "Virement",
  acompte_pct: 10,
  validite_jours: 30,
  echeance_jours: 15,
  prochain_devis: 1,
  prochain_facture: 1,
  lien_avis: "https://share.google/eR0V54QFO9la7MvI6",
  abonnement_libelle: "Abonnement du site (hébergement, mises à jour, tableau de bord)",
  conditions:
    "Prestations incluses : selon la formule choisie, la création du site sur mesure, le nom de domaine en .fr, le référencement sur Google et la fiche Google ; avec les formules Pro et Pro + IA, l'identité visuelle, les 100 cartes de visite offertes, la retouche des photos et le tableau de bord.\n" +
    "Abonnement : il couvre l'hébergement et la maintenance (par an pour l'Essentiel, par mois pour le Pro et le Pro + IA) et, pour ces deux dernières formules, le tableau de bord. Le premier mois est offert : l'abonnement commence un mois après la mise en ligne. Il est sans engagement.\n" +
    "Rendus : nous vous montrons les rendus avant la mise en ligne, et vous demandez vos ajustements.\n" +
    "Délais : mise en ligne environ une semaine après réception des textes et des photos.\n" +
    "Paiement : un acompte de 10 % sur la création pour lancer le travail, par virement, puis le solde après votre validation finale, en une fois ou en 3 fois sans frais. Il n'y a pas d'acompte sur l'abonnement.",
  penalites:
    "En cas de retard de paiement, des pénalités au taux de trois fois le taux d'intérêt légal sont exigibles, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement (clients professionnels). Pas d'escompte pour paiement anticipé."
};

export const UNITES = ["forfait", "presta", "mois", "an", "page", "u", "h"];

// [catégorie, désignation, unité, prix HT] — vos tarifs ; les prestations à 0 € se chiffrent au cas par cas
export const PRESTATIONS_DEFAUT = [
  ["Création", "Formule Essentiel : site internet sur mesure, nom de domaine en .fr, référencement sur Google, fiche Google, formulaire de devis", "forfait", 190],
  ["Création", "Formule Pro : l'Essentiel, plus l'identité visuelle (logo, couleurs, typographies), 100 cartes de visite recto verso offertes, la retouche des photos, le tableau de bord, la prise de rendez-vous et le paiement en ligne", "forfait", 490],
  ["Création", "Formule Pro + IA : le Pro, plus l'assistant sur le site, les devis et les réponses aux avis préparés, deux articles par mois", "forfait", 990],
  ["Abonnements", "Hébergement et maintenance du site (formule Essentiel)", "an", 25],
  ["Abonnements", "Abonnement du site, formule Pro : hébergement, mises à jour, tableau de bord, nom de domaine", "mois", 29],
  ["Abonnements", "Abonnement du site, formule Pro + IA : hébergement, mises à jour, tableau de bord, assistant, nom de domaine", "mois", 49],
  ["Abonnements", "Extension .com du nom de domaine (au lieu du .fr compris)", "mois", 0.6],
  ["Abonnements", "Adresse e-mail professionnelle", "mois", 1.5],
  ["En plus", "Boutique en ligne (sur devis)", "forfait", 0],
  ["En plus", "Page en plus sur le site", "page", 0]
];

// le nom de domaine en .com et l'adresse e-mail professionnelle, options de l'abonnement (24/10/2026)
export const AJOUTS_PRESTATIONS = [
  { cle: "domaine-2026-10", lignes: [
    ["Abonnements", "Extension .com du nom de domaine (au lieu du .fr compris)", "mois", 0.6],
    ["Abonnements", "Adresse e-mail professionnelle", "mois", 1.5]
  ] }
];
// le logo et la retouche photo sont compris dans la création, si besoin (24/10/2026)
export const CORRECTIONS_PRESTATIONS = [
  { cle: "logo-retouche-compris-2026-10", remplacer: [
    [/^Logo$/, "Logo (compris dans la création)"],
    [/^Retouche photo$/, "Retouche photo (comprise dans la création)"],
    ["fiche Google, application", "fiche Google, logo et retouche photo si besoin, application"]
  ] }
];

// les formules du 09/11/2026 (11/11/2026) : les nouvelles lignes s'ajoutent ; les anciennes (application seule, web marketing, abonnement à 10 €…) sont archivées, pas supprimées
AJOUTS_PRESTATIONS.push({ cle: "formules-2026-11", lignes: PRESTATIONS_DEFAUT.filter(l => /^(Formule|Hébergement|Abonnement du site, formule|Boutique)/.test(l[1])) });
CORRECTIONS_PRESTATIONS.push({ cle: "formules-2026-11", remplacer: [
    [/^Logo \(compris dans la création\)$/, "Identité visuelle : logo, couleurs, typographies (comprise dans la formule Pro)"],
    [/^Retouche photo \(comprise dans la création\)$/, "Retouche photo (comprise dans la formule Pro)"]
  ], archiver: [
    /^Site internet sur mesure \+ application web sur mesure/, /^Application web sur mesure seule/, /^Abonnement du site : hébergement, mises à jour, application/,
    /^Abonnement de l'application seule/, /^Web marketing/, /^Montage vidéo$/, /^Boutique en ligne$/
  ] });
// les conditions et le libellé de la base, repris seulement s'ils sont encore ceux de départ (11/11/2026)
export const REPRISE_REGLAGES = {
  cle: "reglages-formules-2026-11",
  conditions: { marqueur: "Prestations incluses : la création du site sur mesure", nouveau: PARAMETRES_DEFAUT.conditions },
  libelle: { ancien: "Abonnement du site (hébergement, mises à jour, application)", nouveau: PARAMETRES_DEFAUT.abonnement_libelle }
};
// l'acompte sur la création seule et le premier mois d'abonnement offert (11/11/2026) : repris dans les conditions déjà enregistrées, phrase par phrase
export const REPRISE_ABO = { cle: "reglages-abo-2e-mois-2026-11", remplacer: [
  ["Abonnement : après la mise en ligne, il couvre l'hébergement et la maintenance (par an pour l'Essentiel, par mois pour le Pro et le Pro + IA) et, pour ces deux dernières formules, le tableau de bord. Il est sans engagement.", "Abonnement : il couvre l'hébergement et la maintenance (par an pour l'Essentiel, par mois pour le Pro et le Pro + IA) et, pour ces deux dernières formules, le tableau de bord. Le premier mois est offert : l'abonnement commence un mois après la mise en ligne. Il est sans engagement."],
  ["Paiement : un acompte de 10 % pour lancer le travail, par virement, puis le solde après votre validation finale, en une fois ou en 3 fois sans frais.", "Paiement : un acompte de 10 % sur la création pour lancer le travail, par virement, puis le solde après votre validation finale, en une fois ou en 3 fois sans frais. Il n'y a pas d'acompte sur l'abonnement."]] };
