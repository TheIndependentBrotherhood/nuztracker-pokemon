export type Lang = "fr" | "en";

const translations = {
  // ── Home page ──────────────────────────────────────────────────────────────
  home: {
    readyToStart: { fr: "Prêt à commencer ?", en: "Ready to start?" },
    discoverFeatures: {
      fr: "Découvrez ce que NuzTracker peut faire pour vous",
      en: "Discover what NuzTracker can do for you",
    },
    spriteSourcesButton: {
      fr: "🖼️ Sources des sprites",
      en: "🖼️ Sprite sources",
    },
    spriteSourcesDescription: {
      fr: "Consultez les crédits et sources utilisées pour les sprites affichés dans l'application.",
      en: "Browse the credits and sources used for the sprites shown in the app.",
    },
    spriteSourcesTitle: {
      fr: "Sources des sprites",
      en: "Sprite sources",
    },
    spriteSourcesSubtitle: {
      fr: "NuzTracker s'appuie sur plusieurs catalogues et collections de sprites Gen 5 style.",
      en: "NuzTracker relies on several Gen 5 style sprite catalogs and collections.",
    },
    visitSource: {
      fr: "Ouvrir la source",
      en: "Open source",
    },
    yourRuns: { fr: "Vos Runs", en: "Your Runs" },
    runsInProgress: {
      fr: (n: number) => `${n} run${n > 1 ? "s" : ""} en cours ou complétés`,
      en: (n: number) => `${n} run${n > 1 ? "s" : ""} in progress or completed`,
    },
    features: {
      interactiveMaps: {
        title: { fr: "Cartes Interactives", en: "Interactive Maps" },
        description: {
          fr: "Visualisez vos zones sur des cartes interactives pour chaque région Pokémon.",
          en: "Visualise your zones on interactive maps for each Pokémon region.",
        },
      },
      teamManagement: {
        title: { fr: "Gestion d'Équipe", en: "Team Management" },
        description: {
          fr: "Gérez votre équipe de 6 Pokémon avec sprites, types et statistiques.",
          en: "Manage your team of 6 Pokémon with sprites, types and stats.",
        },
      },
      typeAnalysis: {
        title: { fr: "Analyse de Types", en: "Type Analysis" },
        description: {
          fr: "Analysez les forces et faiblesses de votre équipe en temps réel.",
          en: "Analyse your team's strengths and weaknesses in real time.",
        },
      },
      shinyHunt: {
        title: { fr: "Mode Shiny Hunt", en: "Shiny Hunt Mode" },
        description: {
          fr: "Activez le mode Shiny Hunt pour vos runs à la recherche des raretés.",
          en: "Enable Shiny Hunt mode for runs in search of rare shinies.",
        },
      },
    },
  },

  // ── Hero Section ───────────────────────────────────────────────────────────
  hero: {
    subtitle: {
      fr: "Votre tracker ultime pour les runs Nuzlocke",
      en: "Your ultimate Nuzlocke run tracker",
    },
    description: {
      fr: "Suivi en temps réel, gestion d'équipe avancée et statistiques détaillées pour vos aventures Pokémon les plus difficiles",
      en: "Real-time tracking, advanced team management and detailed stats for your toughest Pokémon adventures",
    },
    statActive: { fr: "Actifs", en: "Active" },
    statCaptures: { fr: "Captures", en: "Captures" },
    startRun: { fr: "🚀 Démarrer mon Run", en: "🚀 Start my Run" },
  },

  // ── Run List ───────────────────────────────────────────────────────────────
  runList: {
    noRuns: { fr: "Aucun run pour l'instant", en: "No runs yet" },
    noRunsHint: {
      fr: "Lancez votre premier Nuzlocke et démarrez l'aventure !",
      en: "Start your first Nuzlocke and begin the adventure!",
    },
    statusActive: { fr: "Active", en: "Active" },
    statusCompleted: { fr: "Terminé", en: "Completed" },
    statusAbandoned: { fr: "Abandonné", en: "Abandoned" },
    captures: { fr: "Captures", en: "Captures" },
    deaths: { fr: "RIP", en: "RIP" },
    progression: { fr: "Progression", en: "Progress" },
    zones: { fr: "Zones", en: "Zones" },
    deleteConfirm: {
      fr: "Supprimer ce run ?",
      en: "Delete this run?",
    },
    delete: { fr: "🗑️ Supprimer", en: "🗑️ Delete" },
  },

  // ── Create Run Modal ───────────────────────────────────────────────────────
  createRun: {
    title: { fr: "🎮 Nouveau Run", en: "🎮 New Run" },
    subtitle: {
      fr: "Créez votre aventure Nuzlocke et lancez le défi",
      en: "Create your Nuzlocke adventure and take on the challenge",
    },
    runName: { fr: "Nom du Run", en: "Run Name" },
    runNamePlaceholder: {
      fr: "ex. FireRed Nuzlocke",
      en: "e.g. FireRed Nuzlocke",
    },
    region: { fr: "Région", en: "Region" },
    typeChart: { fr: "Table des Types", en: "Type Chart" },
    gen1: { fr: "Génération 1", en: "Generation 1" },
    gen25: { fr: "Générations 2-5", en: "Generations 2-5" },
    gen6: { fr: "Générations 6+", en: "Generations 6+" },
    gameModes: { fr: "⚙️ Modes de Jeu", en: "⚙️ Game Modes" },
    shinyHuntMode: { fr: "✨ Mode Shiny Hunt", en: "✨ Shiny Hunt Mode" },
    randomizerMode: { fr: "🎲 Mode Randomizer", en: "🎲 Randomizer Mode" },
    randomizerOptions: {
      fr: "🎛️ Options Randomizer",
      en: "🎛️ Randomizer Options",
    },
    randomizeTypes: { fr: "Types aléatoires", en: "Random types" },
    randomizeAbilities: { fr: "Talents aléatoires", en: "Random abilities" },
    randomizeEncounters: {
      fr: "Rencontres aléatoires",
      en: "Random encounters",
    },
    randomizeEvolvedForms: {
      fr: "Évolutions aléatoires",
      en: "Random evolutions",
    },
    cancel: { fr: "Annuler", en: "Cancel" },
    createRun: { fr: "🚀 Créer le Run", en: "🚀 Create Run" },
  },

  // ── Add Capture Modal ──────────────────────────────────────────────────────
  addCapture: {
    title: { fr: "Ajouter une capture", en: "Add a capture" },
    pokemonLabel: { fr: "Pokémon", en: "Pokémon" },
    searchPlaceholder: {
      fr: "Rechercher un Pokémon...",
      en: "Search for a Pokémon...",
    },
    searching: { fr: "Recherche...", en: "Searching..." },
    nickname: { fr: "Surnom (optionnel)", en: "Nickname (optional)" },
    nicknamePlaceholder: {
      fr: "Entrez un surnom...",
      en: "Enter a nickname...",
    },
    gender: { fr: "Genre", en: "Gender" },
    genderUnknown: { fr: "Inconnu", en: "Unknown" },
    genderMale: { fr: "Mâle ♂", en: "Male ♂" },
    genderFemale: { fr: "Femelle ♀", en: "Female ♀" },
    isShiny: { fr: "✨ Est Shiny ?", en: "✨ Is Shiny?" },
    loadingSprites: {
      fr: "Chargement des sprites...",
      en: "Loading sprites...",
    },
    randomTypes: { fr: "Types (randomizer)", en: "Types (randomizer)" },
    chooseType: { fr: "Choisir un type", en: "Choose a type" },
    unknownType: { fr: "???", en: "???" },
    addSecondType: { fr: "Ajouter un second type", en: "Add second type" },
    removeSecondType: {
      fr: "Retirer le second type",
      en: "Remove second type",
    },
    firstTypeRequired: {
      fr: "Choisis au moins un type pour cette capture.",
      en: "Choose at least one type for this capture.",
    },
    sprite: { fr: "Sprite", en: "Sprite" },
    unownForm: { fr: "Forme (lettre capturée)", en: "Form (captured letter)" },
    cancel: { fr: "Annuler", en: "Cancel" },
    add: { fr: "Ajouter", en: "Add" },
    randomAbilities: { fr: "Talent (randomizer)", en: "Ability (randomizer)" },
    abilitiesSearchPlaceholder: { fr: "Rechercher un talent...", en: "Search for an ability..." },
    removeAbility: { fr: "Retirer ce talent", en: "Remove this ability" },
    noAbilityResult: { fr: "Aucun talent trouvé", en: "No ability found" },
  },

  // ── Pokemon Detail Modal ───────────────────────────────────────────────────
  pokemonDetail: {
    loading: { fr: "Chargement...", en: "Loading..." },
    loadingSprites: {
      fr: "Chargement des sprites...",
      en: "Loading sprites...",
    },
    randomTypes: { fr: "Types (randomizer)", en: "Types (randomizer)" },
    chooseType: { fr: "Choisir un type", en: "Choose a type" },
    unknownType: { fr: "???", en: "???" },
    addSecondType: { fr: "Ajouter un second type", en: "Add second type" },
    removeSecondType: {
      fr: "Retirer le second type",
      en: "Remove second type",
    },
    baseStats: { fr: "Statistiques de base", en: "Base Stats" },
    baseStatTotal: { fr: "BST", en: "BST" },
    nickname: { fr: "Surnom", en: "Nickname" },
    nicknamePlaceholder: {
      fr: "Entrez un surnom...",
      en: "Enter a nickname...",
    },
    noNickname: { fr: "Aucun surnom", en: "No nickname" },
    editNickname: { fr: "Modifier", en: "Edit" },
    saveNickname: { fr: "Sauvegarder", en: "Save" },
    cancelEditNickname: { fr: "Annuler", en: "Cancel" },
    height: { fr: "Taille", en: "Height" },
    weight: { fr: "Poids", en: "Weight" },
    failedToLoad: {
      fr: "Impossible de charger les données",
      en: "Failed to load data",
    },
    sprite: { fr: "Sprite", en: "Sprite" },
    close: { fr: "Fermer", en: "Close" },
    statSpeed: { fr: "Vit", en: "Spd" },
    abilitiesSection: { fr: "Talent", en: "Ability" },
    abilitiesRandomizer: { fr: "Talent (randomizer)", en: "Ability (randomizer)" },
    abilitiesSearchPlaceholder: { fr: "Rechercher un talent...", en: "Search for an ability..." },
    removeAbility: { fr: "Retirer ce talent", en: "Remove this ability" },
    noAbilityResult: { fr: "Aucun talent trouvé", en: "No ability found" },
    abilitiesHidden: { fr: "Caché", en: "Hidden" },
  },

  // ── Zone List ──────────────────────────────────────────────────────────────
  zoneList: {
    searchPlaceholder: {
      fr: "Rechercher une zone...",
      en: "Search zone...",
    },
    filterAll: { fr: "Toutes", en: "All" },
    filterNotVisited: { fr: "Non visitées", en: "Not Visited" },
    filterVisited: { fr: "Visitées", en: "Visited" },
    filterCaptured: { fr: "Capturées", en: "Captured" },
    noZoneFound: { fr: "Aucune zone trouvée", en: "No zone found" },
  },

  // ── Zone Item ──────────────────────────────────────────────────────────────
  zoneItem: {
    capture: { fr: "+ Capturer", en: "+ Capture" },
    captureLimit: {
      fr: "Limite de captures atteinte pour cette zone",
      en: "Capture limit reached for this zone",
    },
    changeStatus: { fr: "Changer le statut", en: "Change status" },
    deleteCapturesToChange: {
      fr: "Supprimer les captures pour changer le statut",
      en: "Delete captures to change status",
    },
  },

  // ── Team View ──────────────────────────────────────────────────────────────
  teamView: {
    team: { fr: "⚔️ Équipe", en: "⚔️ Team" },
    analysis: { fr: "🔬 Analyse", en: "🔬 Analysis" },
    slot: {
      fr: (n: number) => `Emplacement ${n}`,
      en: (n: number) => `Slot ${n}`,
    },
    capturedPokemon: {
      fr: (n: number) => `📦 Pokémons capturés (${n})`,
      en: (n: number) => `📦 Captured Pokémon (${n})`,
    },
    reserveArea: {
      fr: "Zone de réserve (glisse les pokémons ici pour les retirer de l'équipe)",
      en: "Reserve area (drag Pokémon here to remove them from the team)",
    },
    unknown: { fr: "Inconnue", en: "Unknown" },
    deadPokemon: {
      fr: (n: number) => `⚰️ Pokémons RIP (${n})`,
      en: (n: number) => `⚰️ Pokémon RIP (${n})`,
    },
    noDeadPokemon: {
      fr: "Aucun pokémon décédé pour le moment. Longue vie à votre équipe ! 🍀",
      en: "No deceased Pokémon so far. Long live your team! 🍀",
    },
  },

  // ── Pokemon Card ───────────────────────────────────────────────────────────
  pokemonCard: {
    removeFromTeam: { fr: "Retirer de l'équipe", en: "Remove from team" },
  },

  // ── Captured Pokemon Card ──────────────────────────────────────────────────
  capturedPokemonCard: {
    addToTeam: { fr: "Ajouter à l'équipe", en: "Add to team" },
    markAsDead: { fr: "Marquer comme décédé", en: "Mark as dead" },
  },

  // ── Dead Pokemon Card ──────────────────────────────────────────────────────
  deadPokemonCard: {
    resurrect: { fr: "Ressusciter", en: "Resurrect" },
  },

  // ── Stats Bar ──────────────────────────────────────────────────────────────
  statsBar: {
    caught: { fr: "Capturés", en: "Caught" },
    dead: { fr: "RIP", en: "RIP" },
    exportDimensionsHint: {
      fr: "De 440x720px à 1920x1080px",
      en: "From 440x720px to 1920x1080px",
    },
    exportTeamAsPng: {
      fr: "Exporter l'équipe en PNG",
      en: "Export team as PNG",
    },
    generateShareableUrl: {
      fr: "Générer une URL de partage",
      en: "Generate shareable URL",
    },
    regularZones: { fr: "Zones Pokémons", en: "Regular Zones" },
    shinyZones: { fr: "Zones Shinies", en: "Shiny Zones" },
    rate: { fr: "Taux", en: "Rate" },
    missed: { fr: "Loupés", en: "Missed" },
    team: { fr: "Équipe", en: "Team" },
    teamViewElementNotFound: {
      fr: "Élément de l'équipe introuvable",
      en: "Team view element not found",
    },
    failedToExportPng: {
      fr: "Impossible d'exporter le PNG. Réessaie.",
      en: "Failed to export PNG. Please try again.",
    },
    failedToGenerateShareUrl: {
      fr: "Impossible de générer l'URL de partage",
      en: "Failed to generate share URL",
    },
    exportPngTitle: {
      fr: "Exporter l'image PNG",
      en: "Export PNG image",
    },
    generate: { fr: "Générer", en: "Generate" },
    width: { fr: "Largeur (px)", en: "Width (px)" },
    height: { fr: "Hauteur (px)", en: "Height (px)" },
    showTypesLabel: {
      fr: "Afficher les types",
      en: "Show types",
    },
    tightTypesLabel: {
      fr: "Affichage serré des types",
      en: "Tight type layout",
    },
    yes: { fr: "Oui", en: "Yes" },
    no: { fr: "Non", en: "No" },
    cancel: { fr: "Annuler", en: "Cancel" },
    exporting: { fr: "Export...", en: "Exporting..." },
    export: { fr: "Exporter", en: "Export" },
    zones: { fr: "Zones", en: "Zones" },
  },

  // ── Type Analysis ──────────────────────────────────────────────────────────
  typeAnalysis: {
    addPokemonToSeeAnalysis: {
      fr: "Ajoute des Pokémon à ton équipe pour voir l'analyse des types",
      en: "Add Pokémon to your team to see the type analysis",
    },
    tabDefense: { fr: "🛡️ Équipe (Défenseur)", en: "🛡️ Team (Defender)" },
    tabAttack: { fr: "⚔️ Équipe (Attaquant)", en: "⚔️ Team (Attacker)" },
    tabCombination: { fr: "🧬 Combinaison", en: "🧬 Combination" },
    tabTypes: { fr: "📋 Types", en: "📋 Types" },
    attackType: { fr: "Type Attaque", en: "Attack Type" },
    defenseType: { fr: "Type Défense", en: "Defense Type" },
    defX2: { fr: "Déf x2+", en: "Def x2+" },
    defX05: { fr: "Déf x0.5-", en: "Def x0.5-" },
    atkX2: { fr: "Atq x2+", en: "Atk x2+" },
    atkX05: { fr: "Atq x0.5-", en: "Atk x0.5-" },
    difference: { fr: "Différence", en: "Difference" },
    clickToSelectCombination: {
      fr: "Clique sur les types pour sélectionner une combinaison (max 2)",
      en: "Click on types to select a combination (max 2)",
    },
    plusOneType: { fr: "+1 type", en: "+1 type" },
    availableTypes: { fr: "Types disponibles :", en: "Available types:" },
    defenseSection: { fr: "Défense", en: "Defense" },
    attackSection: { fr: "Attaque", en: "Attack" },
    resetSelection: { fr: "Réinitialiser la sélection", en: "Reset selection" },
    effectiveAgainst: { fr: "Efficace contre", en: "Effective against" },
    weakAgainst: { fr: "Faible contre", en: "Weak against" },
    resistantTo: { fr: "Résistant à", en: "Resistant to" },
    // effectiveness labels
    hyperEffective: { fr: "Hyper efficace", en: "Super effective (x4)" },
    superEffective: { fr: "Super efficace", en: "Super effective" },
    neutral: { fr: "Neutre", en: "Neutral" },
    notVeryEffective: { fr: "Peu efficace", en: "Not very effective" },
    veryNotEffective: {
      fr: "Très peu efficace",
      en: "Not very effective (x0.25)",
    },
    noEffect: { fr: "Aucun effet", en: "No effect" },
    unknown: { fr: "Inconnu", en: "Unknown" },
    veryWeak: { fr: "Très faible", en: "Very weak" },
    weak: { fr: "Faible", en: "Weak" },
    resistant: { fr: "Résistant", en: "Resistant" },
    veryResistant: { fr: "Très résistant", en: "Very resistant" },
    immune: { fr: "Immunisé", en: "Immune" },
    abilitiesSection: { fr: "Talents :", en: "Abilities:" },
    addAbility: { fr: "+ Talent", en: "+ Ability" },
    abilitiesSearchPlaceholder: { fr: "Rechercher un talent...", en: "Search for an ability..." },
    noAbilityResult: { fr: "Aucun talent trouvé", en: "No ability found" },
    removeAbility: { fr: "Retirer ce talent", en: "Remove this ability" },
  },

  // ── Map View ───────────────────────────────────────────────────────────────
  mapView: {
    multiple: { fr: "Multiple", en: "Multiple" },
    noMapAvailable: {
      fr: "Carte interactive non disponible pour cette région",
      en: "Interactive map not available for this region",
    },
    notVisited: { fr: "Non visité", en: "Not Visited" },
    captured: { fr: "Capturé", en: "Captured" },
    regionMap: { fr: "Carte Région", en: "Region Map" },
    visited: { fr: "Visité", en: "Visited" },
  },

  // ── Run Page ───────────────────────────────────────────────────────────────
  runPage: {
    runNotFound: { fr: "Run introuvable", en: "Run not found" },
    backHome: { fr: "← Retour à l'accueil", en: "← Back to home" },
    finish: { fr: "✓ Terminer", en: "✓ Complete" },
    abandon: { fr: "✗ Abandonner", en: "✗ Abandon" },
    completed: { fr: "✓ Terminé", en: "✓ Completed" },
    abandoned: { fr: "✗ Abandonné", en: "✗ Abandoned" },
    resume: { fr: "↩ Reprendre", en: "↩ Resume" },
    home: { fr: "← Accueil", en: "← Home" },
    tabZones: { fr: "🗺 Zones", en: "🗺 Zones" },
    tabTeam: { fr: "⚔️ Équipe", en: "⚔️ Team" },
    tabPokedex: { fr: "📘 Pokédex", en: "📘 Pokédex" },
    pokedexEmpty: {
      fr: "Impossible de charger le Pokédex pour le moment.",
      en: "Unable to load the Pokédex right now.",
    },
    pokedexNoSearchResult: {
      fr: "Aucun Pokémon ne correspond à cette recherche.",
      en: "No Pokémon matches this search.",
    },
    pokedexPageInfo: {
      fr: (n: number) => `Page ${n}`,
      en: (n: number) => `Page ${n}`,
    },
    pokedexPrev: { fr: "← Préc.", en: "← Prev" },
    pokedexNext: { fr: "Suiv. →", en: "Next →" },
    pokedexSearchPlaceholder: {
      fr: "Rechercher par nom ou numéro du Pokédex",
      en: "Search by name or Pokédex number",
    },
    pokedexSortAsc: { fr: "Croissant ↑", en: "Ascending ↑" },
    pokedexSortBst: { fr: "Trier par BST", en: "Sort by BST" },
    pokedexSortDesc: { fr: "Décroissant ↓", en: "Descending ↓" },
    pokedexSortDex: { fr: "Trier par numéro", en: "Sort by Pokédex number" },
    pokedexSortName: { fr: "Trier par nom", en: "Sort by name" },
    analysis: { fr: "🔬 Analyse", en: "🔬 Analysis" },
    close: { fr: "Fermer", en: "Close" },
    loading: { fr: "Chargement...", en: "Loading..." },
  },

  // ── Language toggle ────────────────────────────────────────────────────────
  language: {
    switchToEnglish: { fr: "Switch to English", en: "Switch to English" },
    switchToFrench: { fr: "Passer en français", en: "Switch to French" },
  },
} as const;

/** Return the string for the given language */
export function t<T extends string | ((n: number) => string)>(
  entry: { fr: T; en: T },
  lang: Lang,
): T {
  return entry[lang];
}

export default translations;
