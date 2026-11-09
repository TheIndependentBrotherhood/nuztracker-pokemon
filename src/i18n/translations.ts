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
        title: { fr: "Seconde chance (Shiny)", en: "Second Chance (Shiny)" },
        description: {
          fr: "Activez la seconde chance pour vos runs à la recherche des raretés avec deux tentatives par zone.",
          en: "Enable second chance for runs in search of rare shinies with two attempts per zone.",
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
    shinyHuntMode: {
      fr: "✨ Seconde chance (Shiny)",
      en: "✨ Second Chance (Shiny)",
    },
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
    soulLinkMode: { fr: "🔗 Soul Link", en: "🔗 Soul Link" },
    soulLinkPlayers: { fr: "⚙️ Joueurs Soul Link", en: "⚙️ Soul Link Players" },
    player1Name: { fr: "Nom du J1", en: "P1 Name" },
    player2Name: { fr: "Nom du J2", en: "P2 Name" },
    player3Name: { fr: "Nom du J3", en: "P3 Name" },
    player4Name: { fr: "Nom du J4", en: "P4 Name" },
    player1Placeholder: { fr: "Ex: RedPlayer", en: "e.g. RedPlayer" },
    player2Placeholder: { fr: "Ex: BluePlayer", en: "e.g. BluePlayer" },
    player3Placeholder: { fr: "Ex: GreenPlayer", en: "e.g. GreenPlayer" },
    player4Placeholder: { fr: "Ex: GoldPlayer", en: "e.g. GoldPlayer" },
    addPlayer3: { fr: "+ J3", en: "+ P3" },
    addPlayer4: { fr: "+ J4", en: "+ P4" },
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
    randomTypes: { fr: "Types", en: "Types" },
    chooseType: { fr: "Choisir un type", en: "Choose a type" },
    unknownType: { fr: "???", en: "???" },
    addSecondType: { fr: "Ajouter un second type", en: "Add second type" },
    removeFirstType: {
      fr: "Retirer le type",
      en: "Remove type",
    },
    removeSecondType: {
      fr: "Retirer le second type",
      en: "Remove second type",
    },
    firstTypeRequired: {
      fr: "Choisis au moins un type pour cette capture.",
      en: "Choose at least one type for this capture.",
    },
    abilityRequired: {
      fr: "Choisis un talent pour cette capture.",
      en: "Choose an ability for this capture.",
    },
    sprite: { fr: "Sprite", en: "Sprite" },
    unownForm: { fr: "Forme (lettre capturée)", en: "Form (captured letter)" },
    cancel: { fr: "Annuler", en: "Cancel" },
    add: { fr: "Ajouter", en: "Add" },
    abilityPanel: { fr: "Panel de talents", en: "Ability panel" },
    abilityPanelFull: {
      fr: "Panel complet (3/3) — choisissez un talent ci-dessous",
      en: "Panel full (3/3) — pick a talent below",
    },
    abilityPanelHint: {
      fr: "Choisissez un talent ou ajoutez-en un au panel :",
      en: "Pick a talent or add one to the panel:",
    },
    capturedAbility: { fr: "Talent capturé", en: "Captured talent" },
    abilitiesSearchPlaceholder: {
      fr: "Rechercher un talent...",
      en: "Search for an ability...",
    },
    removeAbility: { fr: "Retirer ce talent", en: "Remove this ability" },
    noAbilityResult: { fr: "Aucun talent trouvé", en: "No ability found" },
    soulLinkPlayer: { fr: "Joueur", en: "Player" },
    soulLinkPlayerUnavailable: {
      fr: "Ce joueur ne peut plus capturer ici : il a déjà une capture ou un partenaire a perdu la zone",
      en: "This player can no longer capture here: they already have a capture or a partner lost the zone",
    },
  },
  pokemonDetail: {
    loading: { fr: "Chargement...", en: "Loading..." },
    loadingSprites: {
      fr: "Chargement des sprites...",
      en: "Loading sprites...",
    },
    evolutionHistory: { fr: "Historique d'évolution", en: "Evolution history" },
    closeButton: { fr: "Fermer", en: "Close" },
    chooseType: { fr: "Choisir un type", en: "Choose a type" },
    unknownType: { fr: "???", en: "???" },
    addSecondType: { fr: "Ajouter un second type", en: "Add second type" },
    removeFirstType: {
      fr: "Retirer le type",
      en: "Remove type",
    },
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
    captureRate: { fr: "Taux de capture", en: "Catch rate" },
    captureRateHint: {
      fr: (rate: number, probability: string) =>
        `Taux ${rate}/255 — environ ${probability} de chances par Poké Ball à PV max, sans altération de statut.`,
      en: (rate: number, probability: string) =>
        `Rate ${rate}/255 — about ${probability} chance per Poké Ball at full HP, no status condition.`,
    },
    captureDifficulty: {
      fr: {
        veryEasy: "Très facile",
        easy: "Facile",
        medium: "Moyen",
        hard: "Difficile",
        veryHard: "Très difficile",
      },
      en: {
        veryEasy: "Very easy",
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
        veryHard: "Very hard",
      },
    },
    failedToLoad: {
      fr: "Impossible de charger les données",
      en: "Failed to load data",
    },
    sprite: { fr: "Sprite", en: "Sprite" },
    close: { fr: "Fermer", en: "Close" },
    statSpeed: { fr: "Vit", en: "Spd" },
    abilitiesSection: { fr: "Talent", en: "Ability" },
    abilityPanel: {
      fr: "Panel de talents",
      en: "Ability panel",
    },
    abilityPanelHint: {
      fr: "Jusqu'à 3 talents possibles pour ce Pokémon",
      en: "Up to 3 possible talents for this Pokémon",
    },
    capturedAbility: { fr: "Talent capturé", en: "Captured talent" },
    possibleAbilities: { fr: "Talents possibles", en: "Possible abilities" },
    addToPanel: { fr: "Ajouter au panel", en: "Add to panel" },
    removeFromPanel: { fr: "Retirer du panel", en: "Remove from panel" },
    abilitiesSearchPlaceholder: {
      fr: "Rechercher un talent...",
      en: "Search for an ability...",
    },
    removeAbility: { fr: "Retirer ce talent", en: "Remove this ability" },
    noAbilityResult: { fr: "Aucun talent trouvé", en: "No ability found" },
    abilitiesHidden: { fr: "Caché", en: "Hidden" },
    firstTypeRequired: {
      fr: "Choisis au moins un type pour ce Pokémon.",
      en: "Choose at least one type for this Pokémon.",
    },
    typeDeductionTitle: {
      fr: "Outil de déduction de types",
      en: "Type Deduction Tool",
    },
    speciesNotes: { fr: "Notes sur l'espèce", en: "Species notes" },
    speciesNotesPlaceholder: {
      fr: "Vos observations globales sur ce Pokémon...",
      en: "Your overall observations about this Pokémon...",
    },
    abilityPanelLabel: { fr: "Talents du panel", en: "Ability panel" },
    abilityPanelCount: {
      fr: (n: number) => `+ ${n} talent${n > 1 ? "s" : ""} du panel`,
      en: (n: number) => `+ ${n} ability(ies) in panel`,
    },
    observations: { fr: "Observations", en: "Observations" },
    observationTypes: {
      immunity: { fr: "Immunité à", en: "Immune to" },
      weakness: { fr: "Faible à", en: "Weak to" },
      resistance: { fr: "Résistant à", en: "Resistant to" },
      neutral: { fr: "Neutre à", en: "Neutral to" },
    },
    possibleTypesLabel: {
      fr: (n: number) => `Types possibles (${n})`,
      en: (n: number) => `Possible types (${n})`,
    },
    typesConfirmed: { fr: "✓ Type déterminé", en: "✓ Type confirmed" },
    otherPossibilities: {
      fr: (n: number) => `+${n} autres`,
      en: (n: number) => `+${n} more`,
    },
    abilityRequired: {
      fr: "Choisis un talent pour ce Pokémon.",
      en: "Choose an ability for this Pokémon.",
    },
    enterAdvancedMode: {
      fr: "Mode comparaison avancé",
      en: "Advanced comparison mode",
    },
    exitAdvancedMode: {
      fr: "Quitter",
      en: "Exit",
    },
    advancedComparison: {
      fr: "Comparaison avancée de deux Pokémon",
      en: "Advanced comparison of two Pokémon",
    },
    selectSecondPokemon: {
      fr: "Sélectionner un second Pokémon",
      en: "Select a second Pokémon",
    },
    searchPokemon: {
      fr: "Rechercher par nom ou numéro...",
      en: "Search by name or number...",
    },
    changeSecondPokemon: {
      fr: "Changer",
      en: "Change",
    },
  },

  // ── Run Settings ───────────────────────────────────────────────────────────
  runSettings: {
    title: { fr: "⚙️ Paramètres du run", en: "⚙️ Run settings" },
    button: { fr: "Paramètres du run", en: "Run settings" },
    typeChartHint: {
      fr: "La table des types est appliquée immédiatement à l'analyse d'équipe, aux comparaisons et à la déduction des types dans le Pokédex.",
      en: "The type chart applies immediately to the team analysis, comparisons and Pokédex type deduction.",
    },
  },

  // ── Backups ────────────────────────────────────────────────────────────────
  archive: {
    importBackup: { fr: "Importer une sauvegarde", en: "Import backup" },
    exportRun: { fr: "Exporter le run", en: "Export run" },
    exportAll: { fr: "Exporter tous les runs", en: "Export all runs" },
    exportShared: {
      fr: "Exporter une copie partagée",
      en: "Export shared copy",
    },
    fileLabel: {
      fr: "Importer une sauvegarde NuzTracker",
      en: "Import NuzTracker backup",
    },
    tooLarge: {
      fr: "L'archive dépasse la limite d'import de 50 Mo.",
      en: "The archive exceeds the 50 MB import limit.",
    },
    previewTitle: {
      fr: "Importer la sauvegarde comme nouveaux runs",
      en: "Import backup as new runs",
    },
    previewInfo: {
      fr: "Les runs existants ne seront pas écrasés. Les sauvegardes d'émulateur et les identifiants de salon ne font pas partie de cette sauvegarde.",
      en: "Existing runs will not be overwritten. Emulator saves and room credentials are not part of this backup.",
    },
    previewCounts: {
      fr: (captures: number, observations: number) =>
        `${captures} capture${captures > 1 ? "s" : ""}, ${observations} observation${observations > 1 ? "s" : ""}`,
      en: (captures: number, observations: number) =>
        `${captures} captures, ${observations} observations`,
    },
    cancel: { fr: "Annuler", en: "Cancel" },
    importCopies: { fr: "Importer les copies", en: "Import copies" },
  },

  // ── Connection hub ─────────────────────────────────────────────────────────
  hub: {
    button: { fr: "Connexions", en: "Connections" },
    ariaLabel: {
      fr: "Connexions et sauvegardes",
      en: "Connections and backups",
    },
    title: { fr: "Connexions", en: "Connections" },
    back: { fr: "Retour", en: "Back" },
    close: { fr: "Fermer", en: "Close" },
    intro: {
      fr: "Choisis ce que tu veux faire. Seules les options utiles pour cette run sont proposées.",
      en: "Choose what you want to do. Only the options that apply to this run are shown.",
    },
    gameTitle: { fr: "Connecter le jeu", en: "Connect the game" },
    gameDescription: {
      fr: (game: string, emulator: string) =>
        `${game} via ${emulator} : le tracker se met à jour tout seul.`,
      en: (game: string, emulator: string) =>
        `${game} via ${emulator}: the tracker updates automatically.`,
    },
    gameManual: {
      fr: (game: string) =>
        `${game} : pas de connexion automatique, le suivi reste manuel.`,
      en: (game: string) =>
        `${game}: no automatic connection, tracking stays manual.`,
    },
    noGameVersion: {
      fr: "Aucune version de jeu choisie pour cette run.",
      en: "No game version selected for this run.",
    },
    manualExplanation: {
      fr: "Ce jeu n'a pas encore de connecteur automatique. Tu peux tout suivre à la main : zones, captures, équipe et morts. Jeux connectables aujourd'hui : Platine (MelonDS) et Rouge Feu anglais (BizHawk).",
      en: "This game has no automatic connector yet. You can track everything manually: zones, captures, team and deaths. Connectable games today: Platinum (MelonDS) and English FireRed (BizHawk).",
    },
    pickGameVersion: {
      fr: "Choisis la version du jeu dans les paramètres de la run pour savoir si une connexion automatique est possible.",
      en: "Choose the game version in Run settings to find out whether automatic tracking is available.",
    },
    soulLinkTitle: { fr: "SoulLink en ligne", en: "Online SoulLink" },
    soulLinkDescription: {
      fr: "Héberger la partie ou rejoindre celle d'un partenaire.",
      en: "Host the game or join a partner's.",
    },
    joinDescription: {
      fr: "Rejoindre le salon SoulLink d'un partenaire.",
      en: "Join a partner's SoulLink room.",
    },
    overlayTitle: {
      fr: "Overlay OBS et Stream Deck",
      en: "OBS overlay and Stream Deck",
    },
    overlayDescription: {
      fr: "Afficher ton équipe en stream et la piloter à distance.",
      en: "Show your team on stream and control it remotely.",
    },
    backupTitle: { fr: "Sauvegardes", en: "Backups" },
    backupDescription: {
      fr: "Exporter ou importer un fichier .nuzrun.",
      en: "Export or import a .nuzrun file.",
    },
    backupInfo: {
      fr: "Tes données sont enregistrées automatiquement sur cet appareil. Exporte une sauvegarde pour la garder ailleurs ou la transférer.",
      en: "Your data is saved automatically on this device. Export a backup to keep it elsewhere or move it.",
    },
    compatibilityTitle: { fr: "Jeux compatibles", en: "Compatible games" },
    compatibilityDescription: {
      fr: "Jeux, consoles et émulateurs pris en charge.",
      en: "Supported games, consoles and emulators.",
    },
    statusTracking: {
      fr: (emulator: string) => `${emulator} : suivi en cours`,
      en: (emulator: string) => `${emulator}: tracking`,
    },
    statusWaiting: {
      fr: (emulator: string) => `${emulator} : en attente du jeu`,
      en: (emulator: string) => `${emulator}: waiting for the game`,
    },
    statusOff: { fr: "Jeu non connecté", en: "Game not connected" },
    next: { fr: "Suivant", en: "Next" },
    previous: { fr: "Précédent", en: "Previous" },
    done: { fr: "C'est fait", en: "Done" },
    lightStep: { fr: "Ouvrir le tracker light", en: "Open the light tracker" },
    lightExplanation: {
      fr: "Une petite fenêtre s'ouvre et suit le jeu toute seule : le combat en cours pendant un combat, ton équipe sinon. Survole « Équipe » pour la déplier, clique sur un Pokémon pour sa fiche, et « Live » pour revenir au suivi automatique. Dans OBS, ajoute-la en capture de fenêtre.",
      en: "A small window opens and follows the game on its own: the current battle during a fight, your team otherwise. Hover “Team” to expand it, click a Pokémon for its details, and “Live” to return to automatic tracking. In OBS, add it as a window capture.",
    },
    alreadyLight: {
      fr: "Tu es déjà dans le tracker light : il se met à jour automatiquement.",
      en: "You are already in the light tracker: it updates automatically.",
    },
    hostChoice: { fr: "J'héberge", en: "I host" },
    joinChoice: { fr: "Je rejoins", en: "I join" },
    teamButton: { fr: "Équipe", en: "Team" },
  },

  // ── MelonDS ────────────────────────────────────────────────────────────────
  melonDs: {
    title: { fr: "MelonDS (Platine)", en: "MelonDS (Platinum)" },
    prepareStep: { fr: "Préparer MelonDS", en: "Prepare MelonDS" },
    prepareIntro: {
      fr: "À faire une seule fois, ROM Platine lancée dans MelonDS :",
      en: "Only once, with your Platinum ROM running in MelonDS:",
    },
    prepareSettings: {
      fr: "Ouvre Config → Emu settings.",
      en: "Open Config → Emu settings.",
    },
    prepareJit: {
      fr: "Onglet « CPU emulation » : décoche « Enable JIT recompiler ».",
      en: "“CPU emulation” tab: uncheck “Enable JIT recompiler”.",
    },
    prepareGdb: {
      fr: "Onglet « Devtools » : coche « Enable GDB stub », note le port ARM9 (3333 par défaut) et laisse « Break on startup » décoché.",
      en: "“Devtools” tab: check “Enable GDB stub”, note the ARM9 port (3333 by default) and leave “Break on startup” unchecked.",
    },
    prepareReset: {
      fr: "Valide, puis fais System → Reset. Pour garder ta progression : Save state avant, Load state après.",
      en: "Confirm, then use System → Reset. To keep your progress: Save state before, Load state after.",
    },
    prepareSafety: {
      fr: "Le tracker lit seulement la mémoire du jeu : il n'écrit jamais dans ta partie. N'ouvre pas ce port sur ta box.",
      en: "The tracker only reads game memory: it never writes to your game. Do not forward this port on your router.",
    },
    platinumRequired: {
      fr: "Sélectionne d'abord Platine dans les paramètres de la run.",
      en: "Select Platinum in Run settings first.",
    },
    romStep: { fr: "Choisir la ROM", en: "Choose the ROM" },
    romIntro: {
      fr: "Sélectionne exactement le fichier .nds ouvert dans MelonDS, puis indique le même port ARM9.",
      en: "Select the exact .nds file open in MelonDS, then enter the same ARM9 port.",
    },
    noRom: { fr: "Aucune ROM sélectionnée.", en: "No ROM selected." },
    revision: { fr: "rév.", en: "rev." },
    selectRom: { fr: "Choisir le fichier .nds", en: "Choose the .nds file" },
    port: { fr: "Port ARM9", en: "ARM9 port" },
    confirmRom: {
      fr: "C'est bien la ROM ouverte dans MelonDS.",
      en: "This is the ROM open in MelonDS.",
    },
    seedWarning: {
      fr: "Pour une ROM randomisée, deux fichiers avec le même en-tête peuvent avoir une seed différente : choisis le bon fichier.",
      en: "For a randomized ROM, two files with the same header can use different seeds: pick the right file.",
    },
    connectStep: { fr: "Se connecter", en: "Connect" },
    connect: { fr: "Connecter MelonDS", en: "Connect MelonDS" },
    disconnect: { fr: "Déconnecter", en: "Disconnect" },
    tracking: {
      fr: "Connecté : le tracker suit ta partie.",
      en: "Connected: the tracker is following your game.",
    },
    waiting: {
      fr: "Connecté à MelonDS, en attente des données du jeu. Charge ta partie si ce n'est pas fait.",
      en: "Connected to MelonDS, waiting for game data. Load your save if you have not yet.",
    },
    troubleshoot: {
      fr: "Ça ne se connecte pas ? MelonDS n'accepte une nouvelle connexion qu'après System → Reset (Save state avant, Load state après), puis réessaie.",
      en: "Not connecting? MelonDS only accepts a new connection after System → Reset (Save state before, Load state after), then try again.",
    },
    desktopOnly: {
      fr: "Le suivi MelonDS nécessite l'application desktop.",
      en: "MelonDS tracking requires the desktop application.",
    },
  },

  // ── BizHawk ────────────────────────────────────────────────────────────────
  bizHawk: {
    title: { fr: "BizHawk (Rouge Feu)", en: "BizHawk (FireRed)" },
    requirement: {
      fr: "Uniquement Rouge Feu anglais, révision 1.0 (BPRE). Les autres versions sont refusées sans rien envoyer.",
      en: "English FireRed revision 1.0 (BPRE) only. Other versions are rejected without sending anything.",
    },
    bindStep: { fr: "Lier cette run", en: "Link this run" },
    bindIntro: {
      fr: "Le tracker attend le script de BizHawk pour cette run.",
      en: "The tracker waits for the BizHawk script for this run.",
    },
    bind: { fr: "Lier cette run", en: "Link this run" },
    rebind: { fr: "Lier à nouveau", en: "Link again" },
    scriptStep: { fr: "Enregistrer le script", en: "Save the script" },
    scriptIntro: {
      fr: "Enregistre le script Lua où tu veux (par exemple à côté de ta ROM).",
      en: "Save the Lua script wherever you like (for example next to your ROM).",
    },
    saveScript: { fr: "Enregistrer le script Lua", en: "Save Lua script" },
    scriptSaved: { fr: "Script enregistré.", en: "Script saved." },
    loadStep: { fr: "Le charger dans BizHawk", en: "Load it in BizHawk" },
    loadInstructions: {
      fr: "Lance ta ROM dans BizHawk, ouvre Tools → Lua Console, puis Script → Open Script et choisis le fichier enregistré. Les captures détectées te seront demandées en confirmation. Le script ne modifie jamais ta sauvegarde.",
      en: "Start your ROM in BizHawk, open Tools → Lua Console, then Script → Open Script and choose the saved file. Detected captures will ask for your confirmation. The script never modifies your save.",
    },
    tracking: {
      fr: "Le script envoie des données : le tracker suit ta partie.",
      en: "The script is sending data: the tracker is following your game.",
    },
    waiting: {
      fr: "En attente du script BizHawk…",
      en: "Waiting for the BizHawk script…",
    },
  },

  // ── Overlay controls ───────────────────────────────────────────────────────
  overlayControls: {
    obsTitle: { fr: "Source OBS", en: "OBS source" },
    obsIntro: {
      fr: "Dans OBS, ajoute une source « Navigateur » avec cette URL. Garde l'application ouverte ; l'URL ne fonctionne que sur cet ordinateur.",
      en: "In OBS, add a “Browser” source with this URL. Keep the app open; the URL works on this computer only.",
    },
    getUrl: { fr: "Afficher les URL OBS", en: "Show OBS URLs" },
    teamUrl: {
      fr: "Équipe (colonnes, comme l'export PNG)",
      en: "Team (columns, like the PNG export)",
    },
    ribbonUrl: { fr: "Bandeau compact", en: "Compact ribbon" },
    copy: { fr: "Copier", en: "Copy" },
    copied: { fr: "Copié.", en: "Copied." },
    remoteTitle: {
      fr: "Streamer.bot / Stream Deck",
      en: "Streamer.bot / Stream Deck",
    },
    remoteIntro: {
      fr: "Déclenche l'overlay depuis un raccourci : choisis une action, teste-la, puis copie la requête dans ton outil. Sans durée, l'action devient l'affichage par défaut.",
      en: "Trigger the overlay from a shortcut: choose an action, test it, then copy the request into your tool. Without a duration, the action becomes the default view.",
    },
    action: { fr: "Action", en: "Action" },
    showTeam: { fr: "Afficher l'équipe", en: "Show team" },
    showPokemon: { fr: "Afficher un Pokémon", en: "Show a Pokémon" },
    live: { fr: "Live automatique", en: "Automatic live" },
    hide: { fr: "Masquer", en: "Hide" },
    seconds: { fr: "Secondes", en: "Seconds" },
    slot: { fr: "Position dans l'équipe", en: "Party slot" },
    test: { fr: "Tester", en: "Test" },
    applied: { fr: "Commande appliquée.", en: "Command applied." },
    configure: {
      fr: "Afficher la requête HTTP",
      en: "Show HTTP request",
    },
    postUrl: { fr: "URL (POST)", en: "URL (POST)" },
    authorization: {
      fr: "En-tête Authorization",
      en: "Authorization header",
    },
    authorizationHint: {
      fr: "Jeton de contrôle séparé. Ne le mets jamais dans une URL OBS ni dans une sauvegarde partagée.",
      en: "A separate control token. Never put it in an OBS URL or a shared backup.",
    },
    copyAuthorization: {
      fr: "Copier l'en-tête Authorization",
      en: "Copy authorization header",
    },
    authorizationCopied: {
      fr: "En-tête Authorization copié.",
      en: "Authorization header copied.",
    },
    body: { fr: "Corps JSON", en: "JSON body" },
    bodyHint: {
      fr: "À envoyer avec Content-Type: application/json. Les commandes restent sur cet ordinateur.",
      en: "Send with Content-Type: application/json. Commands stay on this computer.",
    },
    desktopOnly: {
      fr: "Le contrôle de l'overlay nécessite l'application desktop.",
      en: "Overlay control requires the desktop application.",
    },
  },

  // ── Connections ────────────────────────────────────────────────────────────
  liveView: {
    loading: { fr: "Chargement du tracker…", en: "Loading tracker…" },
    runNotFound: { fr: "Run introuvable.", en: "Run not found." },
    openRuns: { fr: "Ouvrir les runs", en: "Open runs" },
    noPlayer: {
      fr: "Aucun joueur n'est configuré pour cette run.",
      en: "No player is configured for this run.",
    },
    fullRun: { fr: "Run complète", en: "Full run" },
    liveButton: { fr: "Direct", en: "Live" },
    opponentsLabel: { fr: "Adversaires", en: "Opponents" },
    opponentSlot: {
      fr: (n: number) => `Adversaire ${n}`,
      en: (n: number) => `Opponent ${n}`,
    },
    statusLive: { fr: "En direct", en: "Live" },
    statusLead: { fr: "Direct · en tête", en: "Live · lead" },
    statusBattle: { fr: "Combat · auto", en: "Battle · auto" },
    statusPinned: { fr: "Épinglé", en: "Pinned" },
    statusManual: {
      fr: "Manuel · dernier état connu",
      en: "Manual · last known state",
    },
    statusDisconnected: {
      fr: "Déconnecté · dernier état connu",
      en: "Disconnected · last known state",
    },
    timelinePaused: { fr: "Chronologie en pause", en: "Timeline paused" },
    lastKnownState: {
      fr: (names: string) => `Dernier état connu : ${names}`,
      en: (names: string) => `Last known state: ${names}`,
    },
    noPartyMembers: {
      fr: "Aucun membre d'équipe confirmé.",
      en: "No confirmed party members.",
    },
    notInTeam: {
      fr: "Ce Pokémon n'est plus dans l'équipe. Reviens en direct.",
      en: "This Pokémon is no longer in the team. Return to Live.",
    },
    noMatchingMember: {
      fr: "Aucun membre correspondant. Mets à jour l'équipe ou reviens en direct.",
      en: "No matching team member. Update the team or return to Live.",
    },
    addTeamHint: {
      fr: "Ajoute ton équipe à la main ou connecte l'émulateur pour la détecter automatiquement.",
      en: "Add your team manually or connect the emulator to detect it automatically.",
    },
    noMappedZone: { fr: "Aucune zone associée", en: "No mapped zone" },
    player: { fr: "Joueur", en: "Player" },
    pausedReconcile: {
      fr: "Chronologie en pause : l'état chargé contredit l'équipe suivie.",
      en: "Timeline paused: the loaded state contradicts the tracked team.",
    },
    solo: { fr: "Solo", en: "Solo" },
    map: {
      fr: (name: string) => `Carte : ${name}`,
      en: (name: string) => `Map: ${name}`,
    },
    connectHint: {
      fr: "Connecte un émulateur compatible depuis Connexions. Toutes les fonctionnalités manuelles de la run restent disponibles.",
      en: "Connect a compatible emulator from Connections. All existing manual run features remain available.",
    },
    resumeConfirm: {
      fr: "Reprendre à partir de l'état actuel du jeu ? Les morts et découvertes existantes sont conservées. (La reprise est automatique dès que le jeu redevient cohérent avec l'équipe.)",
      en: "Resume from the current game state? Existing deaths and discoveries will be preserved. (Tracking resumes automatically once the game matches the team again.)",
    },
    reconcile: { fr: "Réconcilier", en: "Reconcile" },
    backwardJump: {
      fr: "Un retour en arrière a été détecté. Les mises à jour de l'équipe sont en pause jusqu'à ce que tu confirmes cette chronologie. Les nouvelles observations restent enregistrées.",
      en: "A backward jump was detected. Team updates are paused until you confirm this timeline. New observations are still saved.",
    },
    participant: {
      fr: (name: string, online: boolean) =>
        `${name} : ${online ? "en ligne" : "hors ligne"}`,
      en: (name: string, online: boolean) =>
        `${name}: ${online ? "online" : "offline"}`,
    },
    party: { fr: "Équipe", en: "Party" },
    level: {
      fr: (level: number) => `N. ${level}`,
      en: (level: number) => `Lv. ${level}`,
    },
    hp: {
      fr: (hp: number, maxHp: number) => `${hp}/${maxHp} PV`,
      en: (hp: number, maxHp: number) => `${hp}/${maxHp} HP`,
    },
    unavailableSoulLink: {
      fr: "Indisponible à cause du SoulLink",
      en: "Unavailable through SoulLink",
    },
    markedDead: { fr: "Marqué comme mort", en: "Marked as dead" },
    removeFromPlay: {
      fr: "— retire ce Pokémon du jeu.",
      en: "— remove this Pokémon from play.",
    },
    egg: {
      fr: "Œuf — confirme sa rencontre après l'éclosion",
      en: "Egg — confirm its encounter after hatching",
    },
    movesAndStats: { fr: "Attaques et stats", en: "Moves & stats" },
    move: {
      fr: (id: number) => `Attaque n°${id}`,
      en: (id: number) => `Move #${id}`,
    },
    power: {
      fr: (power: number) => `Puissance ${power}`,
      en: (power: number) => `Power ${power}`,
    },
    species: {
      fr: (id: number) => `Espèce n°${id}`,
      en: (id: number) => `Species #${id}`,
    },
    opponentTitle: {
      fr: "Adversaire — informations observées uniquement",
      en: "Opponent — observed information only",
    },
    noObservations: {
      fr: "Aucune attaque ni talent observé pour l'instant.",
      en: "No moves or abilities observed yet.",
    },
    observed: { fr: "Observé", en: "Observed" },
    previouslySeen: { fr: "Déjà vu", en: "Previously seen" },
    history: { fr: "Historique de la run", en: "Run history" },
    historyEmpty: {
      fr: "Les événements seront enregistrés ici pendant que tu joues.",
      en: "Events will be saved here as you play.",
    },
    showEarlier: {
      fr: "Afficher les événements précédents",
      en: "Show earlier events",
    },
  },
  zoneGuide: {
    open: { fr: "Guide de zone / découvertes", en: "Zone guide / discoveries" },
    title: {
      fr: "Guide de zone et rencontres observées",
      en: "Zone guide and observed encounters",
    },
    current: {
      fr: (zone: string, mapped: boolean) =>
        `Lieu actuel : ${zone}${mapped ? "" : " (non associé)"}`,
      en: (zone: string, mapped: boolean) =>
        `Current: ${zone}${mapped ? "" : " (unmapped)"}`,
    },
    zone: { fr: "Zone de rencontre", en: "Encounter zone" },
    mapHere: { fr: "Associer ici", en: "Map here" },
    mapExplanation: {
      fr: (location: string) =>
        `Lieu dans le jeu : ${location}. L'association relie ce lieu à la zone choisie ; elle ne crée jamais de capture. Rattacher une ancienne capture ne modifie pas l'association du lieu actuel.`,
      en: (location: string) =>
        `Game location: ${location}. Mapping associates this location with the selected zone; it never creates a capture. Linking an older capture does not remap your current location.`,
    },
    observedTitle: {
      fr: "Observé dans la run de ce joueur",
      en: "Observed in this player's run",
    },
    observedScope: {
      fr: (player: string) =>
        `${player} / ROM et dresseur actuels uniquement. Les observations répétées d'une même rencontre comptent une fois ; les découvertes survivent au retour à une save state.`,
      en: (player: string) =>
        `${player} / current ROM and trainer only. Repeated observations in the same encounter are counted once; discoveries survive save-state rollback.`,
    },
    encounterSummary: {
      fr: (count: number, min: number, max: number) =>
        `${count} rencontre${count > 1 ? "s" : ""} / N. ${min}-${max}`,
      en: (count: number, min: number, max: number) =>
        `${count} encounter${count > 1 ? "s" : ""} / Lv. ${min}-${max}`,
    },
    noObserved: {
      fr: "Aucune rencontre sauvage observée n'est encore associée à cette zone.",
      en: "No observed wild encounters mapped to this zone yet.",
    },
    referenceTitle: {
      fr: "Référence du jeu original",
      en: "Original game reference",
    },
    noGame: { fr: "Aucun jeu sélectionné", en: "No game selected" },
    referenceWarning: {
      fr: (game: string) =>
        `${game} : ces espèces, taux et niveaux décrivent le jeu non modifié, jamais ta seed randomisée. Les dons et rencontres scénarisées ne sont pas entièrement couverts par cette référence.`,
      en: (game: string) =>
        `${game}: these species, rates and levels describe the unmodified game, never your randomized seed. Gifts and special scripted encounters are not a complete part of this reference.`,
    },
    ratesHint: {
      fr: "Les taux concernent chaque emplacement de rencontre dans les conditions indiquées, pas la probabilité cumulée d'une espèce. Les emplacements identiques sont regroupés.",
      en: "Rates are for individual encounter slots under the listed conditions, not cumulative species probabilities. Identical slot descriptions are grouped.",
    },
    noReference: {
      fr: "Aucune table de rencontres originale n'est disponible pour ce jeu / cette zone.",
      en: "No original encounter table is available for this game / zone.",
    },
    originalVersion: { fr: "Version originale", en: "Original version" },
    entry: {
      fr: (method: string, min: number, max: number, chance: number) =>
        `${method} / N. ${min}-${max} / emplacement : ${chance} %`,
      en: (method: string, min: number, max: number, chance: number) =>
        `${method} / Lv. ${min}-${max} / slot: ${chance}%`,
    },
    close: { fr: "Fermer", en: "Close" },
    namesError: {
      fr: "Impossible de charger les noms des Pokémon.",
      en: "Pokémon names could not be loaded.",
    },
    referencesError: {
      fr: "Impossible de charger les références de rencontres.",
      en: "Encounter references could not be loaded.",
    },
    connectFirst: {
      fr: "Connecte un jeu et choisis d'abord une zone.",
      en: "Connect a game and choose a zone first.",
    },
  },
  faintedPokemon: {
    dead: { fr: "Mort", en: "Dead" },
    title: { fr: "Pokémon KO", en: "Fainted Pokémon" },
    intro: {
      fr: "Règle Nuzlocke : un Pokémon tombé à 0 PV est mort et quitte l'équipe suivie, même s'il est soigné ensuite dans le jeu. Si ta run fait une exception (premier combat contre le rival, faux positif…), annule la mort.",
      en: "Nuzlocke rule: a Pokémon that drops to 0 HP is dead and leaves the tracked team, even if the game heals it afterwards. If your run makes an exception (first rival battle, false positive…), undo the death.",
    },
    fainted: {
      fr: (name: string) => `${name} est mort (KO).`,
      en: (name: string) => `${name} died (fainted).`,
    },
    linked: {
      fr: (name: string) => `${name} est mort à cause du SoulLink.`,
      en: (name: string) => `${name} died through the SoulLink.`,
    },
    undo: { fr: "Annuler la mort", en: "Undo death" },
    confirm: {
      fr: "Annuler cette mort et remettre le Pokémon dans l'équipe ?",
      en: "Undo this death and put the Pokémon back in the team?",
    },
    pendingTitle: {
      fr: "KO avant ta première Poké Ball",
      en: "Fainted before your first Poké Ball",
    },
    pendingIntro: {
      fr: "Le Nuzlocke commence quand tu obtiens ta première Poké Ball. Avant ça, c'est toi qui décides si un KO compte comme une mort.",
      en: "The Nuzlocke starts when you get your first Poké Ball. Until then, you decide whether a faint counts as a death.",
    },
    pendingLine: {
      fr: (name: string) => `${name} est tombé KO.`,
      en: (name: string) => `${name} fainted.`,
    },
    countDeath: { fr: "Compter comme mort", en: "Count as death" },
    ignore: { fr: "Ce n'est pas une mort", en: "Not a death" },
  },
  pendingCaptures: {
    title: { fr: "Captures à vérifier", en: "Captures to check" },
    intro: {
      fr: "Le tracker range tout seul tes nouveaux Pokémon dans leur zone. Pour ceux-ci, il a un doute : choisis la zone.",
      en: "The tracker files your new Pokémon in their zone on its own. It is unsure about these ones: choose their zone.",
    },
    compactSummary: {
      fr: (count: number) =>
        count > 1 ? `${count} captures à vérifier` : "1 capture à vérifier",
      en: (count: number) =>
        count > 1 ? `${count} captures to check` : "1 capture to check",
    },
    reasons: {
      "zone-taken": {
        fr: "Tu as déjà une capture dans cette zone.",
        en: "You already have a capture in this zone.",
      },
      "unknown-zone": {
        fr: "Le lieu de capture ne correspond à aucune zone.",
        en: "The capture location does not match any zone.",
      },
      "ambiguous-zone": {
        fr: "Plusieurs zones correspondent à ce lieu.",
        en: "Several zones match this location.",
      },
      "no-encounter": {
        fr: "Obtenu sans combat sauvage (don, échange, œuf…).",
        en: "Obtained without a wild battle (gift, trade, egg…).",
      },
    },
    suggestion: {
      fr: (zone: string) => `Zone proposée : ${zone}`,
      en: (zone: string) => `Suggested zone: ${zone}`,
    },
    dialogTitle: {
      fr: (name: string) => `Où as-tu obtenu ${name} ?`,
      en: (name: string) => `Where did you get ${name}?`,
    },
    zone: { fr: "Zone de rencontre", en: "Encounter zone" },
    choose: { fr: "Choisir", en: "Choose" },
    level: {
      fr: (level: number) => `N. ${level}`,
      en: (level: number) => `Lv. ${level}`,
    },
    association: { fr: "Capture", en: "Capture" },
    newCapture: { fr: "Nouvelle capture", en: "New capture" },
    existingHint: {
      fr: "Choisis une capture existante si tu l'avais déjà ajoutée à la main.",
      en: "Pick an existing capture if you already added it manually.",
    },
    groupId: {
      fr: "Groupe SoulLink (optionnel)",
      en: "SoulLink group (optional)",
    },
    groupHelp: {
      fr: "Par défaut, la zone choisie. Ton partenaire peut utiliser le même groupe dans une autre zone.",
      en: "Defaults to the chosen zone. Your partner can use the same group in another zone.",
    },
    cancel: { fr: "Annuler", en: "Cancel" },
    confirm: { fr: "Confirmer", en: "Confirm" },
  },
  connections: {
    openLight: { fr: "Ouvrir le tracker light", en: "Open light tracker" },
    browserStorage: {
      fr: "Stockage local du navigateur",
      en: "Local browser storage",
    },
    knowledgePlayer: {
      fr: "Connaissances / joueur local",
      en: "Knowledge / local player",
    },
    savedLocally: { fr: "Enregistré localement :", en: "Saved locally:" },
    roomStatus: {
      fr: (mode: string, pending: number) =>
        `${mode} — ${pending} modification${pending > 1 ? "s" : ""} en attente de synchronisation.`,
      en: (mode: string, pending: number) =>
        `${mode} — ${pending} changes waiting to synchronize.`,
    },
    youControl: {
      fr: (playerId: string) => ` Tu contrôles ${playerId}.`,
      en: (playerId: string) => ` You control ${playerId}.`,
    },
    connected: { fr: "connecté", en: "connected" },
    offline: { fr: "hors ligne", en: "offline" },
    roomAddress: { fr: "Adresse du salon", en: "Room address" },
    roomAddressHint: {
      fr: "IPv4 de ce PC sur ton réseau local / VPN, à envoyer à ton partenaire.",
      en: "This PC's IPv4 on your LAN / VPN, to send to your partner.",
    },
    localOnlyAddress: {
      fr: "Salon accessible depuis ce PC uniquement. Relance l'hébergement en autorisant le réseau local / VPN pour jouer à plusieurs PC.",
      en: "Room reachable from this PC only. Host again with LAN / VPN allowed to play across PCs.",
    },
    otherAddresses: {
      fr: "Autres adresses de ce PC (si la première ne fonctionne pas)",
      en: "Other addresses of this PC (if the first one doesn't work)",
    },
    secureAddressHint: {
      fr: "Salon chiffré (WSS). L'invitation contient l'empreinte du certificat : ton partenaire n'a rien d'autre à configurer.",
      en: "Encrypted room (WSS). The invitation contains the certificate fingerprint: your partner has nothing else to configure.",
    },
    allowInternet: {
      fr: "Accessible depuis Internet (chiffré en WSS)",
      en: "Reachable from the Internet (encrypted with WSS)",
    },
    publicHost: {
      fr: "Adresse publique (IP publique ou nom de domaine)",
      en: "Public address (public IP or domain name)",
    },
    publicHostHint: {
      fr: (port: string) =>
        `Redirige le port TCP ${port} de ta box vers ce PC et autorise-le dans le pare-feu. Ton IP publique est indiquée dans l'interface de ta box.`,
      en: (port: string) =>
        `Forward TCP port ${port} on your router to this PC and allow it in the firewall. Your public IP is shown in your router's interface.`,
    },
    showSecrets: {
      fr: "Afficher les IP et l'invitation",
      en: "Show IPs and invitation",
    },
    hideSecrets: {
      fr: "Masquer les IP et l'invitation",
      en: "Hide IPs and invitation",
    },
    copy: { fr: "Copier", en: "Copy" },
    copied: { fr: "Copié", en: "Copied" },
    invitationShare: {
      fr: "Invitation (à partager uniquement avec tes partenaires)",
      en: "Invitation (share only with your partners)",
    },
    reconnect: { fr: "Reconnecter", en: "Reconnect" },
    leaveConfirm: {
      fr: "Quitter ce salon ? Les modifications non envoyées seront conservées dans une copie locale séparée.",
      en: "Leave this room? Unsent changes, if any, will be kept in a separate local copy.",
    },
    leave: { fr: "Quitter le salon en sécurité", en: "Leave room safely" },
    hostPort: { fr: "Port d'hébergement", en: "Host port" },
    allowLan: {
      fr: "Autoriser les connexions depuis mon réseau local / VPN de confiance",
      en: "Allow connections from my trusted LAN / VPN",
    },
    resetCredentials: {
      fr: "Réinitialiser les identifiants des joueurs précédents",
      en: "Reset previous player credentials",
    },
    host: { fr: "Héberger ce run SoulLink", en: "Host this SoulLink run" },
    invitation: { fr: "Invitation", en: "Invitation" },
    joinPlayerId: {
      fr: "ID joueur attribué par l'hôte",
      en: "Player ID assigned by the host",
    },
    joinPlayerHint: {
      fr: "Généralement p2, p3 ou p4. L'emplacement de l'hôte est réservé.",
      en: "Usually p2, p3 or p4. The host's player slot is reserved.",
    },
    joined: {
      fr: "Salon rejoint. Son run est maintenant disponible sur l'accueil.",
      en: "Room joined. Its run is now available on the home screen.",
    },
    join: { fr: "Rejoindre le salon", en: "Join room" },
    networkWarning: {
      fr: "Sur un réseau local ou un VPN de confiance, aucune configuration n'est nécessaire. Par Internet, coche l'option WSS et redirige le port sur ta box : l'invitation seule ne configure pas ton routeur.",
      en: "On a trusted LAN or VPN, nothing else is needed. Over the Internet, enable the WSS option and forward the port on your router: an invitation alone does not configure it.",
    },
  },

  // ── Game compatibility ─────────────────────────────────────────────────────
  compatibility: {
    noGameVersion: {
      fr: "Ce run n'a pas de version de jeu. Choisis-en une dans les paramètres du run ; une région seule ne suffit pas à identifier le jeu.",
      en: "This run has no game version. Choose one in Run settings; a region alone does not identify the game.",
    },
    manualTracking: {
      fr: "Le suivi manuel fonctionne dans le navigateur et sur desktop, avec n'importe quel émulateur ou console d'origine. Le suivi automatique nécessite l'application desktop et un connecteur compatible.",
      en: "Manual tracking works in the browser and desktop, with any emulator or original console. Automatic tracking requires the desktop application and a matching connector.",
    },
    melonDsWarning: {
      fr: "MelonDS 1.1 nécessite le serveur GDB ARM9, avec le JIT et l'arrêt au démarrage désactivés. Les ROM Platine doivent conserver une organisation mémoire prise en charge ; les traductions et patchs multijoueurs ne sont pas tous interchangeables.",
      en: "MelonDS 1.1 requires the ARM9 GDB stub, with JIT disabled and break-on-startup disabled. Platinum ROMs must retain a supported memory layout; translations and multiplayer patches are not all interchangeable.",
    },
    tableLabel: { fr: "Compatibilité des jeux", en: "Game compatibility" },
    regionGame: { fr: "Région / jeu", en: "Region / game" },
    console: { fr: "Console", en: "Console" },
    manual: { fr: "Manuel", en: "Manual" },
    automatic: { fr: "Automatique", en: "Automatic" },
    yes: { fr: "Oui", en: "Yes" },
    fireRedConnector: {
      fr: "Expérimental : BizHawk, BPRE anglais v1.0",
      en: "Experimental: BizHawk, BPRE English v1.0",
    },
    platinumConnector: {
      fr: "Expérimental : MelonDS 1.1 GDB, CPUE / CPUF v0-1",
      en: "Experimental: MelonDS 1.1 GDB, CPUE / CPUF v0-1",
    },
    noConnector: { fr: "Aucun connecteur", en: "No connector" },
    referenceNote: {
      fr: "Les stats, types et talents de référence proviennent de tables locales propres à chaque génération. Ce n'est pas une extraction de la seed de ton randomizer. Les stats de base randomisées inconnues restent masquées ; les marqueurs + / - sont tes propres estimations. Les références de rencontres, quand elles sont affichées, décrivent le jeu non modifié.",
      en: "Reference stats, types and abilities use local generation-specific tables. They are not a dump of your randomizer seed. Unknown randomized base stats remain hidden; + / - markers are your own estimates. Encounter references, when shown, describe the unmodified game.",
    },
  },

  // ── Game version field ─────────────────────────────────────────────────────
  gameVersion: {
    label: { fr: "Version du jeu", en: "Game version" },
    unspecified: { fr: "Non précisée", en: "Unspecified" },
    reference: {
      fr: (console: string, generation: number) =>
        `Référence ${console} / génération ${generation}. Les modifications d'une ROM personnalisée peuvent différer.`,
      en: (console: string, generation: number) =>
        `${console} / Generation ${generation} reference. Custom ROM changes may differ.`,
    },
    hint: {
      fr: "Choisis un jeu pour des stats, types et talents exacts. Les runs sans version gardent la référence générique.",
      en: "Select a game for accurate stats, types and abilities. Unspecified runs retain the generic reference.",
    },
  },

  // ── Zone List ──────────────────────────────────────────────────────────────
  zoneList: {
    searchPlaceholder: {
      fr: "Rechercher une zone...",
      en: "Search zone...",
    },
    filterAll: { fr: "Toutes", en: "All" },
    filterNotVisited: { fr: "Non visitées", en: "Not Visited" },
    filterLost: { fr: "Loupées", en: "Lost" },
    filterCaptured: { fr: "Capturées", en: "Captured" },
    noZoneFound: { fr: "Aucune zone trouvée", en: "No zone found" },
    addTitle: { fr: "Nouvelle zone", en: "New zone" },
    addLabel: { fr: "Nom de la zone", en: "Zone name" },
    addPlaceholder: { fr: "Ex: Vallée des Bois", en: "Ex: Forest Valley" },
    addButton: { fr: "Ajouter", en: "Add" },
    addCancel: { fr: "Annuler", en: "Cancel" },
    deleteTitle: { fr: "Supprimer la zone ?", en: "Delete zone?" },
    deleteMessage: {
      fr: "Êtes-vous sûr de vouloir supprimer cette zone ? Les captures seront également supprimées.",
      en: "Are you sure you want to delete this zone? Captures will also be deleted.",
    },
    deleteButton: { fr: "Supprimer", en: "Delete" },
    deleteCancel: { fr: "Annuler", en: "Cancel" },
    removedZonesButton: {
      fr: (n: number) => `🗑️ Zones retirées (${n})`,
      en: (n: number) => `🗑️ Removed zones (${n})`,
    },
    removedZonesTitle: { fr: "Zones retirées", en: "Removed zones" },
    removedZonesDescription: {
      fr: "Ces zones ont été retirées de la partie. Restaure une zone pour la récupérer avec ses captures.",
      en: "These zones were removed from the run. Restore a zone to get it back along with its captures.",
    },
    removedZoneCaptures: {
      fr: (n: number) => `${n} capture${n > 1 ? "s" : ""}`,
      en: (n: number) => `${n} capture${n > 1 ? "s" : ""}`,
    },
    restoreButton: { fr: "Restaurer", en: "Restore" },
    removedZonesClose: { fr: "Fermer", en: "Close" },
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
    captureFor: { fr: "Capturer pour", en: "Capture for" },
    linkBroken: {
      fr: "Lien brisé : le partenaire a raté ou perdu cette zone",
      en: "Link broken: the partner lost this zone",
    },
    linkedDeath: {
      fr: "Relâché : le Pokémon lié du partenaire a été raté ou est mort",
      en: "Released: the partner's linked Pokémon was lost or died",
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
    soulLinkSubTab: {
      fr: (name: string) => `J: ${name}`,
      en: (name: string) => `P: ${name}`,
    },
    toastRemoved: {
      fr: (playerName: string, pokemonName: string) =>
        `${pokemonName} retiré de l'équipe de ${playerName}`,
      en: (playerName: string, pokemonName: string) =>
        `${pokemonName} removed from ${playerName}'s team`,
    },
    toastAdded: {
      fr: (playerName: string, pokemonName: string) =>
        `${pokemonName} ajouté à l'équipe de ${playerName}`,
      en: (playerName: string, pokemonName: string) =>
        `${pokemonName} added to ${playerName}'s team`,
    },
    toastDied: {
      fr: (playerName: string, pokemonName: string) =>
        `${pokemonName} de ${playerName} est décédé`,
      en: (playerName: string, pokemonName: string) =>
        `${playerName}'s ${pokemonName} has died`,
    },
  },

  // ── Pokemon Card ───────────────────────────────────────────────────────────
  pokemonCard: {
    removeFromTeam: { fr: "Retirer de l'équipe", en: "Remove from team" },
    evolveButton: { fr: "Évoluer", en: "Evolve" },
  },

  // ── Evolution Modal ────────────────────────────────────────────────────────
  evolution: {
    title: { fr: "Évolution", en: "Evolution" },
    selectEvolution: {
      fr: "Sélectionnez l'évolution :",
      en: "Select an evolution:",
    },
    noEvolutionsAvailable: {
      fr: "Pas d'évolutions disponibles",
      en: "No evolutions available",
    },
    searchPlaceholder: {
      fr: "Rechercher un Pokémon…",
      en: "Search Pokémon…",
    },
    resultSingular: { fr: "résultat", en: "result" },
    resultPlural: { fr: "résultats", en: "results" },
    noResults: {
      fr: (query: string) => `Aucun Pokémon ne correspond à "${query}"`,
      en: (query: string) => `No Pokémon found matching "${query}"`,
    },
    evolveButton: { fr: "Évoluer", en: "Evolve" },
    cancelButton: { fr: "Annuler", en: "Cancel" },
    closeButton: { fr: "Fermer", en: "Close" },
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
    progressCaptured: {
      fr: (n: number) => `${n} capturée${n > 1 ? "s" : ""}`,
      en: (n: number) => `${n} captured`,
    },
    progressLost: {
      fr: (n: number) => `${n} ratée${n > 1 ? "s" : ""}`,
      en: (n: number) => `${n} lost`,
    },
    progressDead: {
      fr: (n: number) => `${n} mort${n > 1 ? "s" : ""}`,
      en: (n: number) => `${n} dead`,
    },
    progressLinksBrokenBy: {
      fr: (n: number) =>
        `${n} lien${n > 1 ? "s" : ""} brisé${n > 1 ? "s" : ""}`,
      en: (n: number) => `${n} link${n > 1 ? "s" : ""} broken`,
    },
    progressLinksBrokenByHint: {
      fr: "Pokémon des partenaires relâchés (comptés morts) à cause des ratés ou des morts de ce joueur.",
      en: "Partners' Pokémon released (counted as dead) because of this player's failed captures or deaths.",
    },
    progressRemaining: {
      fr: (n: number) => `${n} restante${n > 1 ? "s" : ""}`,
      en: (n: number) => `${n} remaining`,
    },
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
    exportRipAsPng: {
      fr: "Exporter les RIP en PNG",
      en: "Export RIP as PNG",
    },
    generateRipShareUrl: {
      fr: "Partager les RIP",
      en: "Share RIP",
    },
    ripViewElementNotFound: {
      fr: "Élément des RIP introuvable",
      en: "RIP view element not found",
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
    soulLinkMissedByPlayer: {
      fr: (name: string, n: number) => `${name}: ${n} loupé${n > 1 ? "s" : ""}`,
      en: (name: string, n: number) => `${name}: ${n} missed`,
    },
    soulLinkDeathsByPlayer: {
      fr: (name: string, n: number) => `${name}: ${n} mort${n > 1 ? "s" : ""}`,
      en: (name: string, n: number) => `${name}: ${n} death${n > 1 ? "s" : ""}`,
    },
    killedBy: {
      fr: (name: string) => `Tué par ${name}`,
      en: (name: string) => `Killed by ${name}`,
    },
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
    abilitiesDescription: {
      fr: "(affectant les types - faiblesse, immunité, résistance)",
      en: "(affecting types - weakness, immunity, resistance)",
    },
    addAbility: { fr: "+ Talent", en: "+ Ability" },
    abilitiesSearchPlaceholder: {
      fr: "Rechercher un talent...",
      en: "Search for an ability...",
    },
    noAbilityResult: { fr: "Aucun talent trouvé", en: "No ability found" },
    removeAbility: { fr: "Retirer ce talent", en: "Remove this ability" },
    abilityModifiesMatchup: {
      fr: (name: string) => `Talent ${name} modifie ce matchup`,
      en: (name: string) => `Ability ${name} modifies this matchup`,
    },
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
    pokedexSortType: { fr: "Trier par type", en: "Sort by type" },
    pokedexRegionalTitle: {
      fr: (region: string) => `📘 Pokédex de ${region}`,
      en: (region: string) => `📘 ${region} Pokédex`,
    },
    pokedexNationalTitle: {
      fr: "📘 Pokédex national",
      en: "📘 National Pokédex",
    },
    pokedexEntryCount: {
      fr: (n: number) => `${n} Pokémon`,
      en: (n: number) => `${n} Pokémon`,
    },
    pokedexRegionalCount: {
      fr: (n: number) => `${n} du Pokédex régional`,
      en: (n: number) => `${n} from the regional Pokédex`,
    },
    pokedexTransferCount: {
      fr: (n: number) => `${n} par échange`,
      en: (n: number) => `${n} via trade`,
    },
    pokedexTransferBadge: { fr: "échange", en: "trade" },
    pokedexTransferTooltip: {
      fr: "Absent du Pokédex régional, mais obtenable dans ces jeux (échange, Parc des Amis, GTS, transfert…)",
      en: "Not in the regional Pokédex, but obtainable in these games (trade, Pal Park, GTS, transfer…)",
    },
    pokedexAddedCount: {
      fr: (n: number) => `${n} ajouté${n > 1 ? "s" : ""}`,
      en: (n: number) => `${n} added`,
    },
    pokedexRemovedCount: {
      fr: (n: number) => `${n} retiré${n > 1 ? "s" : ""}`,
      en: (n: number) => `${n} removed`,
    },
    pokedexAddButton: { fr: "➕ Ajouter un Pokémon", en: "➕ Add a Pokémon" },
    pokedexAddTitle: {
      fr: "Ajouter un Pokémon au Pokédex",
      en: "Add a Pokémon to the Pokédex",
    },
    pokedexAddDescription: {
      fr: "Ajoute un Pokémon absent de la liste (forme alternative, Pokémon d'une génération ultérieure, Pokémon retiré par erreur…). Tu pourras le retirer à tout moment avec ✕.",
      en: "Add a Pokémon missing from the list (alternate form, Pokémon from a later generation, Pokémon removed by mistake…). You can remove it anytime with ✕.",
    },
    pokedexAddedBadge: { fr: "ajouté", en: "added" },
    pokedexRemovedBadge: { fr: "retiré", en: "removed" },
    pokedexRemoveTooltip: {
      fr: "Retirer du Pokédex",
      en: "Remove from Pokédex",
    },
    pokedexKnowledgeTitle: {
      fr: "Connaissance des types",
      en: "Type knowledge",
    },
    pokedexKnowledgeDetail: {
      fr: (known: number, partial: number, total: number) =>
        `${known} connu${known > 1 ? "s" : ""} · ${partial} en cours · ${total} Pokémon`,
      en: (known: number, partial: number, total: number) =>
        `${known} known · ${partial} in progress · ${total} Pokémon`,
    },
    pokedexKnowledgeHint: {
      fr: "Un Pokémon aux types confirmés compte à 100 %. Sinon, chaque observation réduit les 171 combinaisons possibles et fait progresser la connaissance.",
      en: "A Pokémon with confirmed types counts as 100%. Otherwise, each observation narrows the 171 possible combinations and increases knowledge.",
    },
    analysis: { fr: "🔬 Analyse", en: "🔬 Analysis" },
    close: { fr: "Fermer", en: "Close" },
    loading: { fr: "Chargement...", en: "Loading..." },
  },

  // ── Compact Pokémon card (light tracker and OBS overlay) ────────────────────
  focusCard: {
    notes: { fr: "Notes", en: "Notes" },
    typesAction: { fr: "Types", en: "Types" },
    typeMatchups: {
      fr: "Faiblesses / résistances",
      en: "Weaknesses / resistances",
    },
    typeMatchupsHint: {
      fr: "Dégâts reçus selon les types connus et la table de la run. Les talents et objets ne sont pas pris en compte.",
      en: "Incoming damage based on known types and the run's type chart. Abilities and items are not included.",
    },
    unknownTypes: {
      fr: "Types inconnus : confirme-les dans le Pokédex pour calculer les faiblesses.",
      en: "Unknown types: confirm them in the Pokédex to calculate weaknesses.",
    },
    typeChartError: {
      fr: "Impossible de calculer la table : vérifie que les types confirmés existent dans la génération de ta run.",
      en: "Unable to calculate matchups: check that the confirmed types exist in your run's generation.",
    },
    notesHint: {
      fr: "Notes par espèce pour cette run, communes au Pokédex et au tracker. Elles restent privées en SoulLink.",
      en: "Species notes for this run, shared with the Pokédex and tracker. They remain private in SoulLink.",
    },
    notesError: {
      fr: "La sauvegarde a échoué. Tes notes restent dans ce panneau ; réessaie.",
      en: "Saving failed. Your notes are still in this panel; please retry.",
    },
    saveAction: { fr: "Enregistrer", en: "Save" },
    investigationAction: { fr: "Enquête", en: "Clues" },
    investigationTitle: {
      fr: "Enquête sur les types",
      en: "Type investigation",
    },
    investigationProgress: {
      fr: (remaining: number, total: number) =>
        `${remaining} / ${total} combinaisons possibles`,
      en: (remaining: number, total: number) =>
        `${remaining} / ${total} combinations possible`,
    },
    investigationHint: {
      fr: "Les attaques lancées en combat sont ajoutées automatiquement (Platine sur MelonDS, combats simples). Valide ici les types trouvés ou saisis-les à la main ; les indices se corrigent dans la fiche Pokédex.",
      en: "Moves used in battle are added automatically (Platinum on MelonDS, single battles). Confirm the types found here or enter them manually; clues can be corrected from the Pokédex entry.",
    },
    investigationSolved: { fr: "Types déduits :", en: "Deduced types:" },
    investigationCandidates: {
      fr: "Combinaisons possibles",
      en: "Possible combinations",
    },
    investigationTooMany: {
      fr: "Trop de possibilités : attaque avec d'autres types.",
      en: "Too many options: attack with other types.",
    },
    investigationNoClue: {
      fr: "Aucun indice : attaque ce Pokémon.",
      en: "No clue yet: attack this Pokémon.",
    },
    investigationContradiction: {
      fr: "Indices contradictoires : vérifie-les dans le Pokédex.",
      en: "Contradicting clues: check them in the Pokédex.",
    },
    investigationLoading: {
      fr: "Chargement de la table des types…",
      en: "Loading the type chart…",
    },
    helpAction: { fr: "Aide", en: "Help" },
    investigationPick: {
      fr: "Choisis jusqu'à 2 types :",
      en: "Pick up to 2 types:",
    },
    investigationPickHint: {
      fr: "Pour fixer les types, clique sur une combinaison possible ou sur le bouton ✓, choisis les types puis Valider. Une fois validés, le bouton Types remplace Enquête.",
      en: "To set the types, click a possible combination or the ✓ button, pick the types, then Confirm. Once confirmed, the Types button replaces Clues.",
    },
    confirmTypesAction: { fr: "Valider", en: "Confirm" },
    confirmTypesError: {
      fr: "Impossible d'enregistrer les types.",
      en: "Unable to save the types.",
    },
    defenderMode: { fr: "Défenseur", en: "Defender" },
    attackerMode: { fr: "Assaillant", en: "Attacker" },
    attackerHint: {
      fr: "Meilleur multiplicateur des attaques de ses propres types (STAB) contre chaque type défenseur. Les talents et objets ne sont pas pris en compte.",
      en: "Best multiplier of moves matching its own types (STAB) against each defending type. Abilities and items are not included.",
    },
    closeAction: { fr: "Fermer", en: "Close" },
    cancelAction: { fr: "Annuler", en: "Cancel" },
    opponentInfo: {
      fr: "Adversaire · seules les informations connues sont affichées.",
      en: "Opponent · only known information is displayed.",
    },
    stats: {
      hp: { fr: "PV", en: "HP" },
      attack: { fr: "Atq", en: "Atk" },
      defense: { fr: "Déf", en: "Def" },
      "special-attack": { fr: "A.Spé", en: "SpA" },
      "special-defense": { fr: "D.Spé", en: "SpD" },
      speed: { fr: "Vit", en: "Spe" },
      special: { fr: "Spé", en: "Spc" },
      total: { fr: "BST", en: "BST" },
    },
    statNames: {
      hp: { fr: "PV", en: "HP" },
      attack: { fr: "Attaque", en: "Attack" },
      defense: { fr: "Défense", en: "Defense" },
      "special-attack": { fr: "Attaque Spéciale", en: "Special Attack" },
      "special-defense": { fr: "Défense Spéciale", en: "Special Defense" },
      speed: { fr: "Vitesse", en: "Speed" },
    },
    level: { fr: "N.", en: "Lv." },
    nature: { fr: "Nature", en: "Nature" },
    ability: { fr: "Talent", en: "Ability" },
    item: { fr: "Objet", en: "Item" },
    noItem: { fr: "Aucun", en: "None" },
    unknown: { fr: "Inconnu", en: "Unknown" },
    neutralNature: {
      fr: "Nature neutre : aucune stat modifiée.",
      en: "Neutral nature: no stat changed.",
    },
    natureEffect: {
      fr: (up: string, down: string) => `+10 % ${up} · −10 % ${down}`,
      en: (up: string, down: string) => `+10% ${up} · −10% ${down}`,
    },
    moves: { fr: "Capacités", en: "Moves" },
    learnProgress: {
      fr: (learned: number, total: number, next?: number) =>
        `${learned}/${total} capacités apprises par niveau${next === undefined ? " : toutes sont apprises." : `, prochaine au niveau ${next}.`}`,
      en: (learned: number, total: number, next?: number) =>
        `${learned}/${total} level-up moves learned${next === undefined ? ": all are learned." : `, next one at level ${next}.`}`,
    },
    seenMoves: {
      fr: "Attaques vues chez cette espèce, les plus récentes en premier.",
      en: "Moves seen from this species, most recent first.",
    },
    noMovesSeen: {
      fr: "Aucune attaque vue pour l'instant",
      en: "No move seen yet",
    },
    pp: { fr: "PP", en: "PP" },
    power: { fr: "Puis.", en: "Pow" },
    accuracy: { fr: "Préc.", en: "Acc" },
    powerFull: { fr: "Puissance", en: "Power" },
    accuracyFull: { fr: "Précision", en: "Accuracy" },
    categories: {
      physical: { fr: "Physique", en: "Physical" },
      special: { fr: "Spéciale", en: "Special" },
      status: { fr: "Statut", en: "Status" },
    },
    statusShort: {
      sleep: { fr: "SOM", en: "SLP" },
      poison: { fr: "PSN", en: "PSN" },
      toxic: { fr: "TOX", en: "TOX" },
      burn: { fr: "BRÛ", en: "BRN" },
      freeze: { fr: "GEL", en: "FRZ" },
      paralysis: { fr: "PAR", en: "PAR" },
      fainted: { fr: "K.O.", en: "FNT" },
    },
    statusFull: {
      sleep: { fr: "Endormi", en: "Asleep" },
      poison: { fr: "Empoisonné", en: "Poisoned" },
      toxic: { fr: "Gravement empoisonné", en: "Badly poisoned" },
      burn: { fr: "Brûlé", en: "Burned" },
      freeze: { fr: "Gelé", en: "Frozen" },
      paralysis: { fr: "Paralysé", en: "Paralyzed" },
      fainted: { fr: "K.O.", en: "Fainted" },
    },
    deadInParty: {
      fr: "Mort selon les règles Nuzlocke, mais encore dans ton équipe en jeu.",
      en: "Dead under the Nuzlocke rules, but still in your in-game party.",
    },
    manual: {
      fr: "Manuel · pas de valeurs en jeu",
      en: "Manual · no in-game values",
    },
    inGameStats: { fr: "Stats en jeu", en: "In-game stats" },
    estimates: { fr: "Tes estimations", en: "Your estimates" },
    baseStats: { fr: "Stats de base", en: "Base stats" },
    noReference: {
      fr: "Pas de stats de base pour ce jeu.",
      en: "No base-stat reference for the selected game.",
    },
    changeSprite: {
      fr: "Clique pour changer de sprite",
      en: "Click to change the sprite",
    },
    previousSprite: { fr: "Sprite précédent", en: "Previous sprite" },
    nextSprite: { fr: "Sprite suivant", en: "Next sprite" },
    confirmSprite: {
      fr: "Clique sur le sprite pour le garder · Échap pour annuler",
      en: "Click the sprite to keep it · Esc to cancel",
    },
    cancelSprite: { fr: "Annuler", en: "Cancel" },
    noOtherSprite: {
      fr: "Aucun autre sprite disponible.",
      en: "No other sprite available.",
    },
  },

  // ── Pokemon Types ─────────────────────────────────────────────────────────
  pokemonTypes: {
    normal: { fr: "Normal", en: "Normal" },
    fire: { fr: "Feu", en: "Fire" },
    water: { fr: "Eau", en: "Water" },
    electric: { fr: "Électrik", en: "Electric" },
    grass: { fr: "Plante", en: "Grass" },
    ice: { fr: "Glace", en: "Ice" },
    fighting: { fr: "Combat", en: "Fighting" },
    poison: { fr: "Poison", en: "Poison" },
    ground: { fr: "Sol", en: "Ground" },
    flying: { fr: "Vol", en: "Flying" },
    psychic: { fr: "Psy", en: "Psychic" },
    bug: { fr: "Insecte", en: "Bug" },
    rock: { fr: "Roche", en: "Rock" },
    ghost: { fr: "Spectre", en: "Ghost" },
    dragon: { fr: "Dragon", en: "Dragon" },
    dark: { fr: "Ténèbres", en: "Dark" },
    steel: { fr: "Acier", en: "Steel" },
    fairy: { fr: "Fée", en: "Fairy" },
  },

  // ── Language toggle ────────────────────────────────────────────────────────
  language: {
    switchToEnglish: { fr: "Switch to English", en: "Switch to English" },
    switchToFrench: { fr: "Passer en français", en: "Switch to French" },
  },
} as const;

type TranslationText = string | ((...args: never[]) => string);

/** Return the translation for the given language */
export function t<T extends { fr: TranslationText; en: TranslationText }>(
  entry: T,
  lang: Lang,
): T[Lang] {
  return entry[lang];
}

export default translations;
