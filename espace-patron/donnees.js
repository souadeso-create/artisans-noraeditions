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
  acompte_pct: 30,
  validite_jours: 30,
  echeance_jours: 15,
  prochain_devis: 1,
  prochain_facture: 1,
  lien_avis: "https://share.google/eR0V54QFO9la7MvI6",
  abonnement_libelle: "Abonnement du site (hébergement, mises à jour, application)",
  conditions:
    "Prestations incluses : la création du site sur mesure, le nom de domaine, le référencement sur Google, la fiche Google, le logo s'il est prévu au devis, et l'application web sur mesure.\n" +
    "Abonnement : après la mise en ligne, l'abonnement mensuel couvre l'hébergement, les mises à jour, l'accès à l'application et le renouvellement du nom de domaine. Il est sans durée minimale.\n" +
    "Délais : mise en ligne environ une semaine après réception des textes et des photos.\n" +
    "Paiement : un acompte à la commande, par virement, puis le solde à la livraison.",
  penalites:
    "En cas de retard de paiement, des pénalités au taux de trois fois le taux d'intérêt légal sont exigibles, ainsi qu'une indemnité forfaitaire de 40 € pour frais de recouvrement (clients professionnels). Pas d'escompte pour paiement anticipé."
};

export const UNITES = ["forfait", "presta", "mois", "an", "page", "u", "h"];

// [catégorie, désignation, unité, prix HT] — vos tarifs ; les prestations à 0 € se chiffrent au cas par cas
export const PRESTATIONS_DEFAUT = [
  ["Création", "Site internet sur mesure + application web sur mesure (promotion) : site à votre nom, nom de domaine, référencement sur Google, fiche Google, application pour vos demandes, devis, factures et rendez-vous", "forfait", 190],
  ["Création", "Application web sur mesure seule, au nom de votre entreprise", "forfait", 100],
  ["Abonnements", "Abonnement du site : hébergement, mises à jour, application, nom de domaine", "mois", 10],
  ["Abonnements", "Abonnement de l'application seule", "an", 30],
  ["Abonnements", "Web marketing : vidéos, réseaux sociaux, annuaires", "mois", 25],
  ["En plus", "Logo", "forfait", 0],
  ["En plus", "Boutique en ligne", "forfait", 0],
  ["En plus", "Article de blog", "u", 0],
  ["En plus", "Montage vidéo", "u", 0],
  ["En plus", "Retouche photo", "u", 0],
  ["En plus", "Page en plus sur le site", "page", 0]
];

export const AJOUTS_PRESTATIONS = [];
export const CORRECTIONS_PRESTATIONS = [];
