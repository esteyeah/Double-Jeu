/**
 * Liste de base de Boussole : des mots simples et évocateurs, faciles à associer.
 * L'administrateur du site peut en ajouter d'autres depuis la page « Mots des jeux ».
 */
export const BASE_WORDS: readonly string[] = `
abeille accordéon acier aéroport affiche agenda aigle aiguille aimant album algue allumette alpiniste ambulance ampoule ananas ancre âne ange antenne
appareil aquarium araignée arbre arc-en-ciel arène argent armure arrosoir artiste ascenseur aspirateur astronaute atelier avalanche avion avocat bagage baguette
baignoire balai balcon baleine balle ballon banane banc bandage banque barbe barque bateau batterie bébé bec berceau béton beurre bibliothèque bijou
biscuit bise bougie boîte bonbon bonnet bottes bouche boucher bouclier boue boussole bouteille boxe branche bras brique brosse brouillard bulle bureau
cabane cactus cadeau cadenas café cage cahier caisse calendrier caméléon camion campagne canapé canard canne canon capitaine carnaval carotte carte cascade
casque casserole castor cathédrale cave ceinture céleri cercle cerf-volant cerise chaîne chaise chameau champignon chandelier chanson chapeau charbon chat château
chaussette chef chemin cheminée chêne cheval cheveux chèvre chien chocolat ciel cigale cinéma cirque ciseaux citron clé cloche clown cochon cocotte
coeur coffre colle collier colline comète concert confiture coquillage corbeau corde corne costume coton couronne couteau crabe craie crayon crêpe crocodile
croissant cuillère cuisine cuivre cygne danse dauphin dé désert dessin diamant dinosaure disque docteur domino dragon drapeau eau échelle échecs éclair
école écran écureuil église élastique éléphant enveloppe épée épice éponge escalier escargot espion étoile été éventail fantôme farine fée fenêtre fer
ferme feu feuille fil flamme flèche fleur flûte foin fontaine forêt fourchette fourmi fraise fromage fumée fusée gâteau gant gare gazon
géant genou girafe glace glaçon gomme gorille goutte grenouille grotte guépard guerre guitare hamac hamster harpe hélicoptère herbe hérisson hibou hiver
horloge hôpital hublot huile huître île igloo jardin jambon jeu journal jouet judo jungle jupe kangourou kayak koala laboratoire lac laine lait
lampe lance lapin lavande légume lettre lézard librairie licorne lion lit livre loup loupe lune lunettes magicien maillot main maison manège manteau
marché marée marionnette marteau masque match matelas médaille méduse menthe mer miel miroir momie monnaie montagne montgolfière montre moto mouche moulin
moustache mouton musée musique nage nappe neige nid noix nuage nuit océan oeuf oignon oiseau ombre ongle opéra or orage orange orchestre oreille
oreiller os ours page paille pain palais palmier panda papier papillon parachute parapluie parc passeport pâtes patin pêche peigne peinture pelle perle
perroquet phare photo piano pied pierre pieuvre pilote pinceau pingouin pique-nique pirate piscine pizza plage planète plante plume pluie poche poêle
poire poisson poivre police pomme pompier pont port porte poubelle poule poupée prince prison puits pyramide quai radar radio raisin rame
raquette rat règle reine renard requin réveil rideau rivière robe robot rocher roi rose roue rubis ruche rue sable sac salade sapin satellite
saucisse savon scie seau sel serpent sifflet singe ski soldat soleil sorcière soupe sous-marin squelette stade statue sucre table tableau tambour tapis
taupe taxi télescope téléphone tempête temple tennis tente terre théâtre tigre tirelire toboggan toile tomate tonnerre tortue tour tracteur train trampoline
trésor tricot trompette trône tulipe tunnel uniforme univers usine vache vague valise vampire vase vélo vent ventilateur verre violon vitrail volcan
wagon yaourt zèbre zoo aventure bonheur colère courage danger énigme espoir fête frisson gloire hasard humour liberté magie mensonge mystère paresse peur
promesse rêve secret silence souvenir surprise talent tradition vacances vitesse vérité victoire voyage
`
  .split(/\s+/)
  .filter(Boolean);
