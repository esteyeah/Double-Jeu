/**
 * Contenu original de Garde à vue.
 * Chaque affaire a 6 mots-indices : le Coupable en reçoit 3, à glisser dans ses réponses.
 * Les innocents piochent dans `WORDS`, sans aucun lien avec les affaires (vérifié par les tests).
 */

export interface Case {
  title: string;
  text: string;
  clues: string[];
}

export const CASES: Case[] = [
  {
    title: 'Le fraisier disparu',
    text: 'La veille du concours de pâtisserie, le fraisier géant de Mme Morel s’est volatilisé de sa cuisine. Sur le carrelage : des miettes, et une trace de semelle boueuse.',
    clues: ['fraise', 'crème', 'botte', 'four', 'miette', 'tablier'],
  },
  {
    title: 'Le nain de jardin kidnappé',
    text: 'Gaston, le nain de jardin préféré du maire, a disparu en pleine nuit. Une lettre de rançon réclame un camion entier de terreau.',
    clues: ['terreau', 'pelle', 'rançon', 'brouette', 'lanterne', 'haie'],
  },
  {
    title: 'Panique au bassin municipal',
    text: 'Quelqu’un a versé du colorant violet dans le grand bassin juste avant la compétition de natation synchronisée. Les nageuses sont ressorties couleur aubergine.',
    clues: ['maillot', 'plongeoir', 'colorant', 'sifflet', 'bonnet', 'chlore'],
  },
  {
    title: 'Le portrait profané',
    text: 'Au petit musée local, le portrait du fondateur de la ville a été retrouvé accroché à l’envers, une paire de lunettes dessinée au feutre.',
    clues: ['cadre', 'feutre', 'gardien', 'vernis', 'pinceau', 'lunettes'],
  },
  {
    title: 'L’oiseau qui en savait trop',
    text: 'Le mainate de la pharmacienne répète désormais le code de la porte blindée de la mairie. Qui le lui a appris pendant les vacances ?',
    clues: ['cage', 'graine', 'plume', 'code', 'pharmacie', 'répondeur'],
  },
  {
    title: 'Le défilé sabordé',
    text: 'Le jour du défilé, tous les cuivres de l’harmonie municipale ne jouaient plus qu’une seule note : quelqu’un y avait fourré des pelotes de laine.',
    clues: ['trompette', 'laine', 'tambour', 'uniforme', 'partition', 'estrade'],
  },
  {
    title: 'La cloche envolée',
    text: 'La cloche de l’église a disparu pendant la messe de minuit. Personne n’a rien entendu… ce qui est bien le plus étrange.',
    clues: ['corde', 'clocher', 'échelle', 'minuit', 'bougie', 'sonnerie'],
  },
  {
    title: 'L’affaire du fromage géant',
    text: 'Le fromage record de la foire agricole, 80 kilos, a été dérobé. Une odeur suspecte flotte depuis sur tout le quartier.',
    clues: ['fromage', 'odeur', 'foire', 'croûte', 'remorque', 'couteau'],
  },
  {
    title: 'Sabotage à l’étape',
    text: 'Juste avant l’arrivée de la course cycliste, le vélo du champion local a été retrouvé avec deux pneus crevés et la selle tartinée de confiture.',
    clues: ['vélo', 'selle', 'confiture', 'pompe', 'rustine', 'podium'],
  },
  {
    title: 'Le mariage sans alliance',
    text: 'Le jour J, l’alliance a disparu du coussin… et la pièce montée avec elle. Les cent vingt invités sont tous suspects.',
    clues: ['alliance', 'voile', 'bouquet', 'discours', 'coussin', 'champagne'],
  },
  {
    title: 'Le casse du goûter',
    text: 'À l’école, la réserve de pains au chocolat de la cantine a été vidée. On a retrouvé un cartable abandonné et une carte au trésor griffonnée.',
    clues: ['cartable', 'récréation', 'cantine', 'chocolat', 'craie', 'trésor'],
  },
  {
    title: 'Les manchots en cavale',
    text: 'Les trois manchots du parc animalier ont été retrouvés au rayon surgelés du supermarché, avec un ticket de caisse à leur nom.',
    clues: ['poisson', 'glaçon', 'ticket', 'chariot', 'soigneur', 'caisse'],
  },
  {
    title: 'La panne du siècle',
    text: 'Pendant la finale de foot, l’électricité a sauté dans tout le quartier. Le compteur a été retrouvé recouvert de beurre salé.',
    clues: ['ballon', 'compteur', 'beurre', 'fusible', 'télécommande', 'arbitre'],
  },
  {
    title: 'Le mystère du potager',
    text: 'Les potirons géants de M. Leduc ont été sculptés en forme de visages pendant la nuit, une semaine avant le concours agricole.',
    clues: ['potiron', 'arrosoir', 'semence', 'épouvantail', 'binette', 'clôture'],
  },
  {
    title: 'Le karaoké maudit',
    text: 'Au karaoké du samedi soir, le micro a été remplacé par une banane. Le chanteur ne s’en est rendu compte qu’au refrain.',
    clues: ['micro', 'banane', 'refrain', 'paillette', 'scène', 'projecteur'],
  },
  {
    title: 'La lettre anonyme',
    text: 'Le maire a reçu une lettre faite de mots découpés dans des revues de jardinage, menaçant de révéler sa recette secrète de velouté.',
    clues: ['enveloppe', 'ciseaux', 'colle', 'timbre', 'velouté', 'revue'],
  },
  {
    title: 'Le chat de la comtesse',
    text: 'Le chat de la comtesse a disparu du manoir. Une échelle de corde pend encore à la fenêtre de la plus haute tour.',
    clues: ['manoir', 'tour', 'croquette', 'comtesse', 'griffe', 'fenêtre'],
  },
  {
    title: 'Le train de l’épouvante',
    text: 'À la fête foraine, le train de l’épouvante est reparti tout seul avec un spectateur à bord, qui a fait vingt tours avant qu’on le libère.',
    clues: ['manège', 'levier', 'forain', 'squelette', 'wagon', 'frisson'],
  },
  {
    title: 'La dent en or',
    text: 'Le cabinet du dentiste a été cambriolé. Seul objet volé : une dent en or exposée dans une vitrine depuis quarante ans.',
    clues: ['fauteuil', 'vitrine', 'or', 'roulette', 'anesthésie', 'sourire'],
  },
  {
    title: 'La course de baignoires',
    text: 'La baignoire favorite de la course annuelle a coulé dès le départ. Son bouchon avait été remplacé par un bouchon de liège.',
    clues: ['baignoire', 'bouchon', 'canard', 'rivière', 'éponge', 'savon'],
  },
  {
    title: 'Le livre revenant',
    text: 'Un livre emprunté à la médiathèque en 1987 a été rendu ce matin… avec une dédicace de son auteur, mort en 1950.',
    clues: ['signet', 'poussière', 'tampon', 'retard', 'étagère', 'dédicace'],
  },
  {
    title: 'Les fèves échangées',
    text: 'Le jour de l’Épiphanie, toutes les fèves de la boulangerie ont été remplacées par des boutons de chemise.',
    clues: ['galette', 'fève', 'couronne', 'bouton', 'pâte', 'fournée'],
  },
];

/** Mots des innocents : du quotidien un peu décalé, à caser l'air de rien. */
export const WORDS: string[] = [
  'girafe', 'boussole', 'cactus', 'parapluie', 'accordéon', 'tournevis', 'fusée', 'escargot',
  'lampadaire', 'harpe', 'kangourou', 'tapis', 'pyramide', 'volcan', 'biscotte', 'caravane',
  'dinosaure', 'grenouille', 'hamac', 'igloo', 'jongleur', 'kayak', 'lasagne', 'mammouth',
  'nuage', 'orchidée', 'quiche', 'radis', 'saxophone', 'ukulélé', 'vampire', 'yaourt',
  'zèbre', 'aspirateur', 'baleine', 'chameau', 'crocodile', 'dauphin', 'éléphant', 'flamant',
  'gorille', 'hérisson', 'koala', 'lama', 'marmotte', 'panda', 'renard', 'sardine',
  'tortue', 'autruche', 'papillon', 'abeille', 'araignée', 'astronaute', 'cowboy', 'pirate',
  'sorcière', 'chevalier', 'dragon', 'licorne', 'robot', 'momie', 'ninja', 'viking',
  'magicien', 'clown', 'sirène', 'lutin', 'ogre', 'bulldozer', 'hélicoptère', 'sous-marin',
  'montgolfière', 'trottinette', 'ambulance', 'péniche', 'téléphérique', 'luge', 'raquette',
  'boomerang', 'frisbee', 'cerf-volant', 'trampoline', 'sauna', 'phare', 'moulin', 'grotte',
  'désert', 'jungle', 'banquise', 'cascade', 'marécage', 'oasis', 'prairie', 'falaise',
  'tornade', 'arc-en-ciel', 'éclipse', 'météorite', 'comète', 'brouillard', 'avalanche',
  'ananas', 'artichaut', 'avocat', 'brocoli', 'cornichon', 'courgette', 'mangue', 'myrtille',
  'noisette', 'olive', 'pastèque', 'poireau', 'pruneau', 'citron', 'cannelle', 'moutarde',
  'vanille', 'caramel', 'guimauve', 'réglisse', 'crêpe', 'croissant', 'fondue', 'paella',
  'sushi', 'couscous', 'raclette', 'omelette', 'popcorn', 'spaghetti', 'ketchup', 'cacahuète',
  'pyjama', 'kimono', 'cravate', 'sombrero', 'béret', 'écharpe', 'moufle', 'salopette',
  'perruque', 'monocle', 'éventail', 'parachute', 'aquarium', 'horloge', 'thermomètre',
  'télescope', 'microscope', 'loupe', 'calculatrice', 'agrafeuse', 'trombone', 'tabouret',
  'canapé', 'lustre', 'cheminée', 'grenier', 'ascenseur', 'girouette', 'sablier', 'globe',
  'dictionnaire', 'harmonica', 'xylophone', 'violoncelle', 'cornemuse', 'banjo', 'triangle',
  'tuba', 'gong', 'karaté', 'judo', 'escrime', 'curling', 'golf', 'bowling', 'pétanque',
  'rugby', 'sumo', 'yoga', 'marathon', 'sudoku', 'origami', 'puzzle', 'domino', 'toupie',
  'bilboquet', 'marionnette', 'acrobate', 'cascadeur', 'plombier', 'astronome', 'archéologue',
  'apiculteur', 'vétérinaire', 'notaire', 'facteur', 'pompier', 'moustache', 'chaussette',
];
