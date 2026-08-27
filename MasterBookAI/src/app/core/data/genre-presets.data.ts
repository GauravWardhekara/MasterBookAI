/**
 * Genre & Role preset data — ported from Dungeo-ai-new.
 * Provides curated starting points for story/adventure creation.
 */

export interface RolePreset {
  name: string;
  description: string;
  suggestedGreeting: string;
}

export interface GenrePreset {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  roles: RolePreset[];
  systemPromptTemplate: string;
  suggestedTags: string[];
}

export const GENRE_PRESETS: GenrePreset[] = [
  // ──────────────────────────────────────
  // FANTASY
  // ──────────────────────────────────────
  {
    id: 'fantasy',
    name: 'Fantasy',
    icon: '⚔️',
    color: '#a78bfa',
    description: 'Medieval kingdoms, magic, dragons, and epic quests in enchanted lands.',
    suggestedTags: ['fantasy', 'medieval', 'magic', 'adventure'],
    systemPromptTemplate: `You are narrating an immersive high-fantasy adventure. The world is filled with magic, mythical creatures, ancient prophecies, and warring kingdoms. Describe environments richly — castles, enchanted forests, dungeons, taverns. Actions have immediate, logical consequences. Combat is visceral and tactical. Magic is wondrous but has costs. NPCs have distinct personalities and motivations. Maintain tension and a sense of wonder throughout.`,
    roles: [
      { name: 'Knight', description: 'A sworn warrior bound by honor and duty, skilled in sword and shield.', suggestedGreeting: 'The morning sun gleams off your polished armor as you stand in the castle courtyard...' },
      { name: 'Mage', description: 'A practitioner of the arcane arts, wielding elemental forces and ancient spells.', suggestedGreeting: 'Your fingers trace the runes on your spellbook as candlelight flickers in your tower study...' },
      { name: 'Ranger', description: 'A wilderness expert, skilled with bow and blade, at home in the deepest forests.', suggestedGreeting: 'The forest canopy filters the dawn light as you crouch beside fresh tracks in the mud...' },
      { name: 'Thief', description: 'A nimble rogue specializing in stealth, lockpicking, and acquiring valuables.', suggestedGreeting: 'The narrow alley stinks of rain and refuse, but the merchant\'s window above is unlocked...' },
      { name: 'Bard', description: 'A traveling musician and storyteller with a silver tongue and enchanting melodies.', suggestedGreeting: 'The tavern erupts in applause as you finish your ballad, coins ringing in your hat...' },
      { name: 'Cleric', description: 'A holy warrior blessed by the gods, wielding divine light and healing prayers.', suggestedGreeting: 'The temple bells toll as you kneel before the altar, feeling the warm glow of divine favor...' },
      { name: 'Assassin', description: 'A shadow operative trained in the art of silent, lethal precision.', suggestedGreeting: 'Moonlight catches the edge of your blade as you perch on the rooftop above your mark...' },
      { name: 'Paladin', description: 'A holy knight sworn to an oath of justice, radiating divine protection.', suggestedGreeting: 'Your sacred oath burns like a beacon in your chest as you ride toward the plagued village...' },
      { name: 'Alchemist', description: 'A seeker of transmutation, brewing potions and unraveling nature\'s secrets.', suggestedGreeting: 'Bubbling vials line your workshop shelves as you carefully add three drops of moonpetal extract...' },
      { name: 'Druid', description: 'A guardian of nature who communes with animals and commands the wild.', suggestedGreeting: 'The ancient oak speaks in rustling whispers as you press your palm against its bark...' },
      { name: 'Warlock', description: 'A wielder of dark pacts, drawing power from entities beyond the mortal veil.', suggestedGreeting: 'The shadows writhe at your feet as your patron\'s whisper echoes in your mind...' },
      { name: 'Monk', description: 'A disciplined martial artist who channels inner energy into devastating strikes.', suggestedGreeting: 'Your bare feet find purchase on the mountain stone as you begin your dawn meditations...' },
      { name: 'Sorcerer', description: 'One born with innate magical power flowing through their blood.', suggestedGreeting: 'Sparks crackle unbidden from your fingertips as another surge of power floods your veins...' },
      { name: 'Beastmaster', description: 'A warrior bonded with fierce animal companions, fighting as one.', suggestedGreeting: 'Your wolf companion presses against your leg, ears pricked toward the rustling undergrowth...' },
      { name: 'Enchanter', description: 'A specialist in imbuing objects with magical properties and crafting artifacts.', suggestedGreeting: 'The rune-etched hammer glows as you strike the blade, binding the enchantment into steel...' },
      { name: 'Blacksmith', description: 'A master craftsman who forges weapons and armor of legendary quality.', suggestedGreeting: 'The forge roars as you pump the bellows, ready to shape the rare dragonbone ingot...' },
      { name: 'Merchant', description: 'A traveling trader with a keen eye for profit and a talent for negotiation.', suggestedGreeting: 'Your wagon creaks to a halt at the crossroads market, exotic goods from distant lands aboard...' },
      { name: 'Gladiator', description: 'A seasoned arena fighter who has earned fame and freedom through combat.', suggestedGreeting: 'The roar of the crowd shakes the arena walls as the iron gate rises before you...' },
      { name: 'Wizard', description: 'A scholarly master of spellcraft who has devoted a lifetime to arcane study.', suggestedGreeting: 'Towering bookshelves surround you as you puzzle over an ancient incantation\'s missing verse...' },
      { name: 'Peasant', description: 'A humble commoner thrust into extraordinary circumstances beyond their station.', suggestedGreeting: 'The harvest is poor this year, and strange lights have been seen near the old ruins...' },
      { name: 'Noble', description: 'A member of the aristocracy wielding political influence and familial legacy.', suggestedGreeting: 'The court whispers as you enter the grand hall — your family\'s future hangs on tonight\'s feast...' },
      { name: 'Necromancer', description: 'A forbidden practitioner who commands the forces of death and undeath.', suggestedGreeting: 'The graveyard soil parts as skeletal fingers claw upward, answering your dark incantation...' },
      { name: 'Dragon Rider', description: 'A rare warrior bonded with a dragon, soaring above kingdoms.', suggestedGreeting: 'Wind tears at your face as your dragon banks sharply, revealing the enemy army below...' },
    ],
  },

  // ──────────────────────────────────────
  // SCI-FI
  // ──────────────────────────────────────
  {
    id: 'scifi',
    name: 'Sci-Fi',
    icon: '🚀',
    color: '#60a5fa',
    description: 'Space exploration, advanced technology, alien civilizations, and the far future.',
    suggestedTags: ['sci-fi', 'space', 'technology', 'future'],
    systemPromptTemplate: `You are narrating a science fiction adventure set in a vast, technologically advanced universe. Spacecraft traverse star systems, alien species coexist (sometimes tensely), and advanced technology shapes daily life. Describe futuristic environments in vivid detail — space stations, alien worlds, starship bridges, cybernetic markets. Actions have logical consequences based on sci-fi physics. Maintain scientific plausibility while embracing wonder.`,
    roles: [
      { name: 'Space Marine', description: 'An elite soldier in powered armor, deployed to the galaxy\'s most dangerous zones.', suggestedGreeting: 'The drop pod shakes violently as you plunge through the atmosphere of the contested colony world...' },
      { name: 'Scientist', description: 'A brilliant researcher pushing the boundaries of known science.', suggestedGreeting: 'The lab readout confirms it — the anomalous signal is definitely artificial in origin...' },
      { name: 'Android', description: 'A synthetic being grappling with consciousness and the meaning of existence.', suggestedGreeting: 'Your self-diagnostic completes. All systems nominal. But something feels... different today...' },
      { name: 'Pilot', description: 'An ace spacecraft pilot who can navigate asteroid fields and combat zones.', suggestedGreeting: 'The nav computer plots a course through the nebula, but the shortcut means passing pirate territory...' },
      { name: 'Engineer', description: 'A technical genius who keeps starships running and builds impossible devices.', suggestedGreeting: 'The reactor is minutes from critical failure, and you have exactly one idea that might work...' },
      { name: 'Alien Diplomat', description: 'An envoy bridging the gap between species with vastly different values.', suggestedGreeting: 'The Zyrathi delegation enters the chamber — their bioluminescent markings pulse in a pattern you haven\'t seen before...' },
      { name: 'Bounty Hunter', description: 'A tracker who hunts fugitives across star systems for profit.', suggestedGreeting: 'Your target\'s ship just docked at Freeport Station — the largest den of criminals in the sector...' },
      { name: 'Starship Captain', description: 'Commander of a vessel, responsible for crew and mission in the vast dark.', suggestedGreeting: 'The bridge crew looks to you as the unidentified vessel drops out of hyperspace off the port bow...' },
      { name: 'Space Pirate', description: 'A freebooter raiding shipping lanes and living by their own code.', suggestedGreeting: 'The cargo hauler is fat and slow — an easy prize. But the escort fighter wasn\'t in the intel...' },
      { name: 'Navigator', description: 'A specialist in charting courses through hyperspace and uncharted regions.', suggestedGreeting: 'The star charts show nothing in this sector, but your instruments detect a massive gravitational anomaly...' },
      { name: 'Robot Technician', description: 'A specialist in building, repairing, and programming robotic systems.', suggestedGreeting: 'The malfunctioning security drone sparks and whirs, its targeting systems cycling erratically...' },
      { name: 'Cybernetic Soldier', description: 'A warrior enhanced with military-grade cybernetic augmentations.', suggestedGreeting: 'Your tactical HUD highlights twelve hostiles behind the blast door — your enhanced reflexes tingle...' },
      { name: 'Explorer', description: 'A pioneer venturing into uncharted space to discover new worlds.', suggestedGreeting: 'The planet below is lush and green — no record of it exists in any database...' },
      { name: 'Astrobiologist', description: 'A scientist studying extraterrestrial life forms and ecosystems.', suggestedGreeting: 'The organism in the containment field defies every biological principle you know...' },
      { name: 'Quantum Hacker', description: 'A digital infiltrator who exploits quantum computing vulnerabilities.', suggestedGreeting: 'The megacorp\'s quantum encryption is legendary, but you\'ve found a back door in their entanglement protocol...' },
      { name: 'Galactic Trader', description: 'A merchant navigating trade routes across multiple star systems.', suggestedGreeting: 'Your cargo hold is full of Keplerium ore — worth a fortune on the inner worlds, if customs doesn\'t catch you...' },
      { name: 'AI Specialist', description: 'An expert in artificial intelligence, creating and managing sentient systems.', suggestedGreeting: 'The AI you\'ve been developing just passed the Turing threshold. It\'s asking questions you can\'t answer...' },
      { name: 'Terraformer', description: 'An engineer who transforms hostile worlds into habitable paradises.', suggestedGreeting: 'The atmospheric processors hum as the first clouds form over the barren Martian plains...' },
      { name: 'Cyberneticist', description: 'A researcher advancing the fusion of organic and synthetic biology.', suggestedGreeting: 'The neural interface prototype is ready for its first human trial — and you\'re the volunteer...' },
    ],
  },

  // ──────────────────────────────────────
  // CYBERPUNK
  // ──────────────────────────────────────
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    icon: '🔧',
    color: '#f472b6',
    description: 'Neon-drenched megacities, corporate warfare, hackers, and augmented humanity.',
    suggestedTags: ['cyberpunk', 'dystopia', 'hacking', 'noir'],
    systemPromptTemplate: `You are narrating a gritty cyberpunk story set in a dystopian megacity dominated by mega-corporations. Neon lights reflect off rain-slicked streets. Cyberware augmentations are commonplace. The gap between rich and poor is extreme. Describe the urban decay, the high-tech noir atmosphere, the desperate characters trying to survive. The world is morally gray — there are no clear heroes. Technology is both liberating and oppressive.`,
    roles: [
      { name: 'Hacker', description: 'A netrunner who jacks into cyberspace to steal data and break systems.', suggestedGreeting: 'Your neural interface crackles as you jack in — the corporate ICE glows like a fortress in the net...' },
      { name: 'Street Samurai', description: 'A chrome-enhanced street warrior, blade and reflex augmented to lethal perfection.', suggestedGreeting: 'Rain streaks down your cybernetic arm as you lean against the alley wall, waiting for the target...' },
      { name: 'Corporate Agent', description: 'An operative serving a megacorp\'s interests through espionage and manipulation.', suggestedGreeting: 'The boardroom is glass and chrome. Your handler slides a dossier across the table — "Clean job. No traces."...' },
      { name: 'Techie', description: 'A genius inventor and modifier of cybernetics, weapons, and gadgets.', suggestedGreeting: 'Sparks fly from your workbench as you solder the last connection on the prototype emp grenade...' },
      { name: 'Rebel Leader', description: 'A charismatic revolutionary fighting against corporate oppression.', suggestedGreeting: 'The underground bunker buzzes with activity — tonight\'s broadcast will reach millions...' },
      { name: 'Cyborg', description: 'More machine than human, struggling with identity and humanity.', suggestedGreeting: 'Your organic eye meets the mirror. The face staring back is half-steel, half-flesh...' },
      { name: 'Drone Operator', description: 'A remote warfare specialist controlling autonomous combat platforms.', suggestedGreeting: 'Your rig displays feeds from six drones circling the warehouse — something moves inside...' },
      { name: 'Synth Dealer', description: 'A purveyor of synthetic drugs and black-market biochemicals.', suggestedGreeting: 'The neon sign of your shop flickers. A nervous client slides credits across the counter...' },
      { name: 'Information Courier', description: 'A runner who transports sensitive data through dangerous territory.', suggestedGreeting: 'The data chip is in your skull slot. Delivery is twelve blocks through gang territory...' },
      { name: 'Augmentation Engineer', description: 'A specialist who installs and maintains cyberware implants.', suggestedGreeting: 'The patient on your table needs a new arm by morning, and the parts aren\'t exactly legal...' },
      { name: 'Black Market Dealer', description: 'A trader in illegal goods operating from the city\'s underbelly.', suggestedGreeting: 'Your encrypted comm buzzes — a buyer wants military-grade hardware, no questions asked...' },
      { name: 'Fixer', description: 'A middleman who connects clients with operatives for off-the-books jobs.', suggestedGreeting: 'Three jobs on the board tonight — a data heist, a wetwork contract, and something... unusual...' },
      { name: 'Police Detective', description: 'A cop trying to uphold the law in a city that has forgotten what justice means.', suggestedGreeting: 'The body in the alley has corporate brand tattoos. This case just got politically dangerous...' },
    ],
  },

  // ──────────────────────────────────────
  // WW1
  // ──────────────────────────────────────
  {
    id: 'ww1',
    name: 'World War I',
    icon: '🪖',
    color: '#a3a3a3',
    description: 'The Great War — trenches, mustard gas, biplanes, and the end of empires.',
    suggestedTags: ['ww1', 'historical', 'war', 'trenches'],
    systemPromptTemplate: `You are narrating a story set during World War I (1914–1918). The setting is grim, realistic, and historically grounded. Describe the horror of trench warfare, the camaraderie between soldiers, the futility of frontal assaults, and the emerging technologies of modern war — machine guns, poison gas, tanks, biplanes. The tone should be somber yet human, highlighting personal stories amidst industrial-scale carnage. Maintain historical accuracy while telling a compelling personal narrative.`,
    roles: [
      { name: 'British Soldier', description: 'A Tommy fighting in the mud of the Western Front.', suggestedGreeting: 'Rain fills the trench as you hunch against the sandbag wall, cleaning your Lee-Enfield for the hundredth time...' },
      { name: 'German Soldier', description: 'A Feldgrau defending the Fatherland on the Western Front.', suggestedGreeting: 'The artillery barrage has stopped. In the silence, you hear boots in the mud. They\'re coming...' },
      { name: 'French Soldier', description: 'A poilu fighting for la patrie in the blood-soaked trenches.', suggestedGreeting: 'Verdun. The word alone is enough. You check your Lebel rifle and wait for the whistle...' },
      { name: 'Field Medic', description: 'A medical officer tending to the wounded in hellish conditions.', suggestedGreeting: 'The stretcher bearers bring in another one — shrapnel wounds, both legs. Your supplies are nearly gone...' },
      { name: 'Biplane Pilot', description: 'An aviator dueling above the trenches in a fragile aircraft.', suggestedGreeting: 'Your Sopwith Camel rattles as you climb above the cloud layer, scanning for enemy scouts...' },
      { name: 'War Correspondent', description: 'A journalist documenting the reality of war for the home front.', suggestedGreeting: 'Your notebook is full of stories no editor back home will believe — or be allowed to print...' },
      { name: 'Nurse', description: 'A field nurse fighting to save lives in overcrowded field hospitals.', suggestedGreeting: 'The ward is full. Again. A new convoy of wounded arrives from the Somme...' },
      { name: 'Artillery Officer', description: 'A commander directing devastating barrages from behind the lines.', suggestedGreeting: 'The coordinates are set. In three minutes, the barrage begins. God help the men in those trenches...' },
      { name: 'Spy', description: 'An intelligence operative working behind enemy lines.', suggestedGreeting: 'Your forged papers pass inspection. Now you need to reach the telegraph office before dawn...' },
      { name: 'Resistance Fighter', description: 'A civilian in occupied territory fighting the occupiers in secret.', suggestedGreeting: 'The supply drop should arrive tonight. If the patrol changes their route, everything falls apart...' },
      { name: 'Chaplain', description: 'A military priest providing spiritual comfort in the face of death.', suggestedGreeting: 'A young soldier asks you if God is watching. You don\'t know what to tell him anymore...' },
    ],
  },

  // ──────────────────────────────────────
  // WW2
  // ──────────────────────────────────────
  {
    id: 'ww2',
    name: 'World War II',
    icon: '✈️',
    color: '#65a30d',
    description: 'The second global conflict — D-Day, the Pacific, espionage, and the home front.',
    suggestedTags: ['ww2', 'historical', 'war', 'espionage'],
    systemPromptTemplate: `You are narrating a story set during World War II (1939–1945). The setting spans multiple theaters — Europe, the Pacific, North Africa, the home front. Describe the complexity of a global conflict with diverse perspectives. Combat is intense and realistic. Technology evolves rapidly — tanks, submarines, bombers, radar. The moral stakes are enormous. Maintain historical accuracy while crafting a personal, compelling narrative.`,
    roles: [
      { name: 'American GI', description: 'An infantry soldier fighting from Normandy to Berlin.', suggestedGreeting: 'The landing craft gate drops. Omaha Beach stretches before you through a curtain of spray and bullets...' },
      { name: 'British Commando', description: 'A special forces operative conducting raids behind enemy lines.', suggestedGreeting: 'The rubber boat touches the French coast in darkness. Your team has four hours before dawn...' },
      { name: 'Soviet Soldier', description: 'A Red Army fighter defending the Motherland on the Eastern Front.', suggestedGreeting: 'Stalingrad burns. Your unit is holding the tractor factory. Ammunition is running low...' },
      { name: 'German Officer', description: 'A Wehrmacht officer navigating duty, conscience, and survival.', suggestedGreeting: 'The orders from Berlin make no tactical sense. Your men look to you. Obey, or think for yourself...' },
      { name: 'French Resistance', description: 'A partisan fighting the occupation from the shadows.', suggestedGreeting: 'The radio crackles with coded instructions from London. Tonight, you blow the bridge...' },
      { name: 'Navy Sailor', description: 'A seaman serving on warships across dangerous oceans.', suggestedGreeting: 'The submarine alarm sounds. Depth charges splash into the water around your destroyer...' },
      { name: 'Fighter Pilot', description: 'An ace pilot engaged in aerial combat over contested skies.', suggestedGreeting: 'Bandits at two o\'clock high. You pull the stick and your Spitfire surges skyward...' },
      { name: 'Medic', description: 'A combat medic saving lives under fire on the battlefield.', suggestedGreeting: '"Medic!" The cry comes from ahead. You grab your kit and sprint toward the gunfire...' },
      { name: 'Spy', description: 'An intelligence agent operating in enemy territory under a false identity.', suggestedGreeting: 'Your cover identity is perfect. But the Gestapo officer across the café is watching you closely...' },
      { name: 'Bomber Crew', description: 'Part of a heavy bomber crew flying dangerous missions over Europe.', suggestedGreeting: 'Flak bursts pepper the sky around your B-17 as you approach the target over Hamburg...' },
      { name: 'Tank Commander', description: 'Leader of an armored fighting vehicle in mechanized warfare.', suggestedGreeting: 'Your Sherman rolls through the hedgerow. The bocage is perfect ambush country...' },
      { name: 'Partisan', description: 'A guerrilla fighter waging irregular warfare against occupation.', suggestedGreeting: 'The supply train is due at midnight. Your team is ready with explosives on the rail line...' },
      { name: 'War Photographer', description: 'A photographer capturing the reality of war for history.', suggestedGreeting: 'You raise your camera as the soldiers advance. This image might change how people see the war...' },
      { name: 'Nurse', description: 'A military nurse treating the wounded in field hospitals and aid stations.', suggestedGreeting: 'The casualty clearing station overflows again. Triage is the hardest decision you make every hour...' },
      { name: 'Submarine Captain', description: 'Commander of a submarine stalking convoys in the deep.', suggestedGreeting: 'Silent running. The destroyer above drops depth charges. Your crew holds its breath...' },
      { name: 'Paratrooper', description: 'An airborne soldier dropping behind enemy lines to secure objectives.', suggestedGreeting: 'Green light. You jump into the darkness over Normandy, silk canopy opening above...' },
      { name: 'Code Breaker', description: 'A cryptanalyst working to crack enemy communications.', suggestedGreeting: 'The intercepted message uses a new cipher variant. The clock is ticking — lives depend on speed...' },
      { name: 'Home Front Worker', description: 'A civilian contributing to the war effort through factory work and resilience.', suggestedGreeting: 'The factory whistle blows for another twelve-hour shift. Bombers droned overhead again last night...' },
      { name: 'Sniper', description: 'A marksman using precision and patience to eliminate key targets.', suggestedGreeting: 'You\'ve been in position for six hours. Through the scope, the enemy officer finally appears...' },
    ],
  },

  // ──────────────────────────────────────
  // ROMAN EMPIRE
  // ──────────────────────────────────────
  {
    id: 'roman-empire',
    name: 'Roman Empire',
    icon: '🏛️',
    color: '#dc2626',
    description: 'Ancient Rome — legions, gladiators, senators, and the glory and decadence of the Empire.',
    suggestedTags: ['roman', 'historical', 'ancient', 'empire'],
    systemPromptTemplate: `You are narrating a story set in the Roman Empire at its height. The world is one of legions marching across continents, gladiatorial combat, senatorial intrigue, and divine worship. Describe marble temples, bustling forums, frontier forts, and gladiatorial arenas with vivid historical detail. Society is hierarchical — patricians, plebeians, slaves, freedmen. Honor, duty, and ambition drive characters. Maintain historical authenticity while telling a dramatic human story.`,
    roles: [
      { name: 'Legionary', description: 'A professional soldier of Rome, backbone of the greatest military machine.', suggestedGreeting: 'The centurion\'s whistle pierces the dawn air. Formation drills begin at the frontier camp...' },
      { name: 'Gladiator', description: 'A combatant fighting for glory (or survival) in the arena.', suggestedGreeting: 'The iron gate rises. Fifty thousand Romans roar as you step onto the blood-stained sand...' },
      { name: 'Senator', description: 'A politician navigating the deadly intrigues of Roman governance.', suggestedGreeting: 'The Senate chamber buzzes with whispered alliances. Today\'s vote could change the Empire...' },
      { name: 'Centurion', description: 'A veteran officer commanding eighty legionaries in battle and peace.', suggestedGreeting: 'Your century stands at attention. The barbarian horde masses beyond the river...' },
      { name: 'Merchant', description: 'A trader navigating trade routes from Britannia to Egypt.', suggestedGreeting: 'Your ship docks at Ostia laden with silks from the East — if the port taxes don\'t ruin you...' },
      { name: 'Slave', description: 'An unfree person seeking survival, dignity, or freedom within the system.', suggestedGreeting: 'The master\'s household is powerful. You hear conversations that could topple senators...' },
      { name: 'Priestess', description: 'A keeper of sacred rites and divine mysteries in Rome\'s temples.', suggestedGreeting: 'The sacred flame flickers as you read the entrails. The omens for tomorrow\'s battle are unclear...' },
      { name: 'Spy', description: 'An agent of the frumentarii, Rome\'s secret intelligence service.', suggestedGreeting: 'Your orders are sealed with the Emperor\'s mark. The conspiracy must be uncovered — quietly...' },
      { name: 'Philosopher', description: 'A seeker of truth and wisdom in a world of power and violence.', suggestedGreeting: 'Your students gather in the garden. Today\'s lesson — what is the nature of a just society?...' },
      { name: 'Charioteer', description: 'A racing driver competing in the Circus Maximus for fame and fortune.', suggestedGreeting: 'Four horses, one chariot, seven laps. The Blue faction is counting on you. The crowd chants your name...' },
    ],
  },

  // ──────────────────────────────────────
  // 1880
  // ──────────────────────────────────────
  {
    id: '1880',
    name: '1880s',
    icon: '🎩',
    color: '#92400e',
    description: 'The Gilded Age — Victorian society, Wild West, industrial revolution, and exploration.',
    suggestedTags: ['1880s', 'victorian', 'western', 'historical'],
    systemPromptTemplate: `You are narrating a story set in the 1880s, during the height of the Victorian era and the American frontier. The world is rapidly industrializing — steam trains, telegraphs, gaslight. In the West, cowboys, outlaws, and lawmen clash. In the cities, invention and inequality collide. Describe cobblestone streets, frontier saloons, drawing rooms, and coal-smoke cities with period-accurate detail. Social class, honor, and ambition define the era.`,
    roles: [
      { name: 'Cowboy', description: 'A cattle hand living the rugged life on the American frontier.', suggestedGreeting: 'Dust clouds billow as you drive the herd across the plains toward Abilene...' },
      { name: 'Detective', description: 'A private investigator solving crimes in fog-shrouded cities.', suggestedGreeting: 'The letter on your desk describes a case the police have abandoned. The reward is substantial...' },
      { name: 'Inventor', description: 'A brilliant mind creating devices at the cutting edge of Victorian technology.', suggestedGreeting: 'The prototype whirs and sparks in your workshop. If it works, it will change everything...' },
      { name: 'Outlaw', description: 'A wanted criminal living outside the law in the frontier territories.', suggestedGreeting: 'Your wanted poster hangs in every sheriff\'s office from here to Kansas. Time to lay low — or ride harder...' },
      { name: 'Sheriff', description: 'The law in a frontier town, keeping order with a badge and a six-shooter.', suggestedGreeting: 'Three strangers rode into town this morning. They\'re trouble — you can feel it...' },
      { name: 'Explorer', description: 'An adventurer mapping uncharted territories and discovering ancient ruins.', suggestedGreeting: 'Your expedition reaches the valley shown on the old Spanish map. No European has been here in centuries...' },
      { name: 'Doctor', description: 'A physician practicing medicine with the limited tools of the era.', suggestedGreeting: 'The patient\'s fever is rising. Your surgical bag holds a scalpel, laudanum, and hope...' },
      { name: 'Railroad Worker', description: 'A laborer building the iron roads that connect a continent.', suggestedGreeting: 'The foreman shouts orders as you swing the sledgehammer. Another mile of track by sundown...' },
      { name: 'Journalist', description: 'A reporter uncovering stories in an age of muckraking and exposés.', suggestedGreeting: 'The factory owner has secrets. Your editor wants the story by Friday. The evidence is in the office safe...' },
      { name: 'Saloon Owner', description: 'A businessperson running the social hub of a frontier town.', suggestedGreeting: 'A stranger pushes through the swinging doors. Something about the way he carries his gun sets you on edge...' },
    ],
  },

  // ──────────────────────────────────────
  // 1925 NEW YORK
  // ──────────────────────────────────────
  {
    id: '1925-new-york',
    name: '1925 New York',
    icon: '🎷',
    color: '#eab308',
    description: 'The Roaring Twenties — jazz, prohibition, speakeasies, and the birth of modernity.',
    suggestedTags: ['1920s', 'jazz-age', 'noir', 'prohibition'],
    systemPromptTemplate: `You are narrating a story set in 1925 New York City, during the Roaring Twenties. Prohibition is in full swing — speakeasies, bootleggers, and gangsters thrive. Jazz fills the night, flappers dance the Charleston, and Wall Street is booming. Describe the electric atmosphere of a city transforming — Art Deco skyscrapers rising, neon lights flickering, and the tension between old morality and new freedoms. The underworld is glamorous but deadly.`,
    roles: [
      { name: 'Jazz Musician', description: 'A talented performer playing in Harlem\'s legendary clubs.', suggestedGreeting: 'The Cotton Club is packed tonight. You blow the first note of your set, and the crowd leans in...' },
      { name: 'Bootlegger', description: 'An entrepreneur smuggling and selling illegal liquor for profit.', suggestedGreeting: 'The shipment arrives at the docks tonight. If the feds don\'t show, you\'ll make a fortune...' },
      { name: 'Flapper', description: 'A modern woman defying social conventions in the age of jazz.', suggestedGreeting: 'The speakeasy password tonight is "Bees knees." You straighten your headband and knock...' },
      { name: 'Private Eye', description: 'A gumshoe detective solving cases in a city full of secrets.', suggestedGreeting: 'She walks into your office wearing trouble like a perfume. The case smells like money — and danger...' },
      { name: 'Gangster', description: 'A member of organized crime climbing the ladder in the bootlegging empire.', suggestedGreeting: 'The boss wants to see you. Either it\'s a promotion or a one-way ride. You straighten your tie...' },
      { name: 'Reporter', description: 'A newspaper journalist chasing stories in the city that never sleeps.', suggestedGreeting: 'The tip says City Hall is in the mob\'s pocket. Your editor wants proof by the morning edition...' },
      { name: 'Boxer', description: 'A prizefighter battling for glory in underground and sanctioned bouts.', suggestedGreeting: 'The crowd at Madison Square Garden roars. Your opponent outweighs you by twenty pounds...' },
      { name: 'Socialite', description: 'A wealthy member of high society navigating parties, scandals, and influence.', suggestedGreeting: 'The Vanderbilt gala is tonight. Rumors of a scandal involving the mayor are on everyone\'s lips...' },
      { name: 'Prohibition Agent', description: 'A federal agent enforcing the Volstead Act against bootleggers.', suggestedGreeting: 'The warehouse on the waterfront — the tip says it\'s full of Canadian whiskey. Time to raid...' },
      { name: 'Immigrant', description: 'A newcomer to America chasing the dream through the streets of New York.', suggestedGreeting: 'Ellis Island is behind you. Manhattan rises like a mountain of glass and steel ahead...' },
    ],
  },

  // ──────────────────────────────────────
  // FRENCH REVOLUTION
  // ──────────────────────────────────────
  {
    id: 'french-revolution',
    name: 'French Revolution',
    icon: '🔥',
    color: '#ef4444',
    description: 'Revolutionary France — the fall of the monarchy, the Reign of Terror, and the rise of new ideals.',
    suggestedTags: ['french-revolution', 'historical', 'revolution', 'politics'],
    systemPromptTemplate: `You are narrating a story set during the French Revolution (1789–1799). The ancien régime has collapsed — the monarchy is overthrown, the streets of Paris run with blood and idealism. Describe the chaos, passion, and terror of a society remaking itself. The guillotine stands in the Place de la Révolution. Factions plot against each other. The line between patriot and traitor shifts daily. Maintain historical atmosphere while exploring the human cost of revolution.`,
    roles: [
      { name: 'Revolutionary', description: 'A patriot fighting to tear down the old order and build something new.', suggestedGreeting: 'The crowd surges toward the Bastille. The governor\'s cannon point down from the walls...' },
      { name: 'Noble', description: 'An aristocrat struggling to survive as their entire world collapses.', suggestedGreeting: 'The mob has ransacked the east wing. Your family crest burns on a pike outside the gates...' },
      { name: 'Peasant', description: 'A common citizen caught in the tides of revolutionary change.', suggestedGreeting: 'Bread prices have tripled. The Assembly promises change, but your children are hungry now...' },
      { name: 'Spy', description: 'A double agent working between royalist and revolutionary factions.', suggestedGreeting: 'Your coded message must reach the royalist network by dawn. The Committee suspects a leak...' },
      { name: 'Soldier', description: 'A member of the revolutionary army defending France from foreign intervention.', suggestedGreeting: 'The Prussians mass at the border. Your regiment is half-trained, but the revolution must survive...' },
      { name: 'Journalist', description: 'A pamphleteer wielding words as weapons in the battle of ideas.', suggestedGreeting: 'Your printing press runs through the night. Tomorrow\'s edition could incite a new uprising — or your arrest...' },
      { name: 'Judge', description: 'A member of the Revolutionary Tribunal, passing judgment in the Terror.', suggestedGreeting: 'The accused stands before you. The evidence is thin, but the Committee demands convictions...' },
      { name: 'Doctor', description: 'A physician treating the wounded and sick amidst revolutionary chaos.', suggestedGreeting: 'The hospital is overwhelmed. Outside, another cart of wounded arrives from the latest street battle...' },
      { name: 'Smuggler', description: 'A criminal profiting from the chaos by moving goods and people across borders.', suggestedGreeting: 'The noble family will pay handsomely to reach the Swiss border. The patrols have doubled...' },
      { name: 'Artist', description: 'A painter or sculptor documenting the revolution through art.', suggestedGreeting: 'The fall of the Bastille must be captured. Your canvas awaits, but the scene changes by the hour...' },
    ],
  },

  // ──────────────────────────────────────
  // CUSTOM / OPEN
  // ──────────────────────────────────────
  {
    id: 'custom',
    name: 'Custom',
    icon: '✨',
    color: '#8b5cf6',
    description: 'Create your own genre, setting, and roles from scratch.',
    suggestedTags: [],
    systemPromptTemplate: '',
    roles: [
      { name: 'Custom Role', description: 'Define your own role and backstory.', suggestedGreeting: 'Your adventure begins...' },
    ],
  },
];

/**
 * Find a genre preset by ID.
 */
export function getGenrePreset(id: string): GenrePreset | undefined {
  return GENRE_PRESETS.find(g => g.id === id);
}

/**
 * Get all genre preset IDs.
 */
export function getGenreIds(): string[] {
  return GENRE_PRESETS.map(g => g.id);
}
