        // Mobile detection - block mobile devices
        (function() {
            function isMobileDevice() {
                // Check for touch capability
                const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

                // Check user agent for mobile/tablet devices
                const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
                const isMobileUA = mobileRegex.test(navigator.userAgent);

                // Check screen width (tablets and phones)
                const isSmallScreen = window.innerWidth < 768;

                return (hasTouch && isMobileUA) || (hasTouch && isSmallScreen);
            }

            if (isMobileDevice()) {
                // Show mobile warning
                document.addEventListener('DOMContentLoaded', function() {
                    const mobileWarning = document.getElementById('mobileWarning');
                    const gameContainer = document.getElementById('gameContainer');

                    if (mobileWarning) {
                        mobileWarning.style.display = 'flex';
                    }
                    if (gameContainer) {
                        gameContainer.style.display = 'none';
                    }
                });

                // Prevent game initialization
                return;
            }
        })();

        class BirdwatchingGame {
            constructor() {
                this.canvas = document.getElementById('gameCanvas');
                this.ctx = this.canvas.getContext('2d');

                // Create off-screen canvas for binocular zoom rendering (performance optimization)
                this.offscreenCanvas = document.createElement('canvas');
                this.offscreenCtx = this.offscreenCanvas.getContext('2d');

                // Game state
                this.isRunning = false;
                this.frameCount = 0;
                this.lastTime = 0;
                this.fps = 0;
                this.deltaTime = 0;

                // Mouse state
                this.mouse = { x: 0, y: 0, isDown: false };

                // Binocular system
                this.binoculars = {
                    isActive: false,
                    zoomLevel: 1.0,
                    viewRadius: 160, // 20% smaller than quiz mode (200 * 0.8 = 160)
                    x: 0,
                    y: 0
                };
                
                // Bird system
                this.birds = [];
                this.birdSpawnTimer = 0;
                this.birdSpawnInterval = 6000;
                this.birdsSpotted = 0;
                this.discoveredSpecies = new Set();
                this.totalScore = 0;

                // Species catalog (23 species total)
                this.speciesCatalog = [
                    // Common backyard birds
                    { type: 'robin',        name: 'American Robin',            scientificName: 'Turdus migratorius',     weight: 14, points: 10, minSize: 15, maxSize: 25, minSpeed: 50,  maxSpeed: 100, color: '#CD853F',  flightPattern: 'steady' },
                    { type: 'bluejay',      name: 'Blue Jay',                  scientificName: 'Cyanocitta cristata',    weight: 6, points: 15, minSize: 18, maxSize: 28, minSpeed: 70,  maxSpeed: 120, color: '#4169E1',  flightPattern: 'sineFast' },
                    { type: 'cardinal',     name: 'Northern Cardinal',         scientificName: 'Cardinalis cardinalis',  weight: 8,  points: 25, minSize: 16, maxSize: 24, minSpeed: 120,  maxSpeed: 240,  color: '#DC143C',  flightPattern: 'steady' },
                    { type: 'sparrow',      name: 'House Sparrow',             scientificName: 'Passer domesticus',      weight: 0, points: 12, minSize: 12, maxSize: 18, minSpeed: 80,  maxSpeed: 130, color: '#8B7355',  flightPattern: 'dart' },
                    { type: 'chickadee',    name: 'Black-capped Chickadee',    scientificName: 'Poecile atricapillus',   weight: 9,  points: 18, minSize: 12, maxSize: 18, minSpeed: 70,  maxSpeed: 110, color: '#3C3C3C',  flightPattern: 'flutter' },
                    { type: 'darkeyedjunco', name: 'Dark-eyed Junco',          scientificName: 'Junco hyemalis',         weight: 2,  points: 20, minSize: 12, maxSize: 18, minSpeed: 70,  maxSpeed: 115, color: '#4A4A4A',  flightPattern: 'bounce' },
                    { type: 'goldfinch',    name: 'American Goldfinch',        scientificName: 'Spinus tristis', weight: 7,  points: 22, minSize: 12, maxSize: 16, minSpeed: 70,  maxSpeed: 120, color: '#FFD700',  flightPattern: 'bounce' },
                    { type: 'swallow',      name: 'Barn Swallow',              scientificName: 'Hirundo rustica', weight: 0,  points: 24, minSize: 12, maxSize: 18, minSpeed: 110, maxSpeed: 170, color: '#1E3A8A',  flightPattern: 'swoop' },
                    { type: 'oriole',       name: 'Baltimore Oriole',          scientificName: 'Icterus galbula', weight: 4,  points: 28, minSize: 14, maxSize: 20, minSpeed: 80,  maxSpeed: 130, color: '#FF8C00',  flightPattern: 'sineSlow' },
                    { type: 'woodpecker',   name: 'Downy Woodpecker',          scientificName: 'Picoides pubescens', weight: 5,  points: 26, minSize: 14, maxSize: 20, minSpeed: 60,  maxSpeed: 90,  color: '#2F4F4F',  flightPattern: 'zigzag' },
                    { type: 'acornwoodpecker', name: 'Acorn Woodpecker',       scientificName: 'Melanerpes formicivorus', weight: 5,  points: 32, minSize: 16, maxSize: 22, minSpeed: 65,  maxSpeed: 95,  color: '#8B4513',  flightPattern: 'zigzag' },
                    { type: 'crow',         name: 'American Crow',             scientificName: 'Corvus brachyrhynchos', weight: 5,  points: 20, minSize: 22, maxSize: 30, minSpeed: 60,  maxSpeed: 100, color: '#111111',  flightPattern: 'glide' },
                    { type: 'raven',        name: 'Common Raven',              scientificName: 'Corvus corax', weight: 3,  points: 30, minSize: 24, maxSize: 34, minSpeed: 60,  maxSpeed: 100, color: '#0B0B0B',  flightPattern: 'glide' },
                    { type: 'owl',          name: 'Great Horned Owl',          scientificName: 'Bubo virginianus', weight: 0,  points: 45, minSize: 28, maxSize: 40, minSpeed: 40,  maxSpeed: 70,  color: '#6B4423',  flightPattern: 'smooth' },
                    { type: 'vulture',      name: 'Turkey Vulture',            scientificName: 'Cathartes aura', weight: 6,  points: 50, minSize: 32, maxSize: 46, minSpeed: 35,  maxSpeed: 65,  color: '#3D2817',  flightPattern: 'sineVerySlow' },
                    { type: 'hawk',         name: 'Red-tailed Hawk',           scientificName: 'Buteo jamaicensis', weight: 2,  points: 40, minSize: 18, maxSize: 25, minSpeed: 100,  maxSpeed: 150,  color: '#8B4513',  flightPattern: 'sineVerySlow' },
                    { type: 'eagle',        name: 'Bald Eagle',                 scientificName: 'Haliaeetus leucocephalus', weight: 2,  points: 80, minSize: 30, maxSize: 45, minSpeed: 105,  maxSpeed: 165,  color: '#5C4033',  flightPattern: 'majestic' },
                    { type: 'heron',        name: 'Great Blue Heron',          scientificName: 'Ardea herodias', weight: 0,  points: 70, minSize: 38, maxSize: 55, minSpeed: 60,  maxSpeed: 85,  color: '#6A7FA0',  flightPattern: 'slowFlap' },
                    { type: 'duck',         name: 'Mallard',                    scientificName: 'Anas platyrhynchos', weight: 4,  points: 22, minSize: 24, maxSize: 32, minSpeed: 70,  maxSpeed: 110, color: '#2E8B57',  flightPattern: 'steady' },
                    { type: 'goose',        name: 'Canada Goose',              scientificName: 'Branta canadensis', weight: 6,  points: 35, minSize: 34, maxSize: 50, minSpeed: 60,  maxSpeed: 90,  color: '#4B3F2F',  flightPattern: 'vGlide' },
                    { type: 'pelican',      name: 'White Pelican',              scientificName: 'Pelecanus erythrorhynchos', weight: 3,  points: 65, minSize: 42, maxSize: 60, minSpeed: 35,  maxSpeed: 55,  color: '#F5F5F5',  flightPattern: 'seaGlide' },
                    { type: 'westerngull',  name: 'Western Gull',               scientificName: 'Larus occidentalis', weight: 5,  points: 30, minSize: 28, maxSize: 38, minSpeed: 50,  maxSpeed: 80,  color: '#8B8B8B',  flightPattern: 'seaGlide' },
                    { type: 'cormorant',    name: 'Double-crested Cormorant',   scientificName: 'Nannopterum auritum', weight: 4,  points: 35, minSize: 26, maxSize: 36, minSpeed: 60,  maxSpeed: 95,  color: '#2C2C2C',  flightPattern: 'steady' },
                    { type: 'cedarwaxwing', name: 'Cedar Waxwing',              scientificName: 'Bombycilla cedrorum', weight: 2,  points: 32, minSize: 14, maxSize: 20, minSpeed: 70,  maxSpeed: 115, color: '#C9A55A',  flightPattern: 'bounce' },
                    { type: 'europeanstarling', name: 'European Starling',      scientificName: 'Sturnus vulgaris', weight: 4,  points: 18, minSize: 14, maxSize: 20, minSpeed: 75,  maxSpeed: 120, color: '#2C2416',  flightPattern: 'bounce' },
                    { type: 'cascrubjay',   name: 'California Scrub-Jay',       scientificName: 'Aphelocoma californica', weight: 6,  points: 26, minSize: 16, maxSize: 24, minSpeed: 70,  maxSpeed: 115, color: '#4A6FA5',  flightPattern: 'bounce' },
                    { type: 'redwingedblackbird', name: 'Red-winged Blackbird',  scientificName: 'Agelaius phoeniceus', weight: 8,  points: 20, minSize: 14, maxSize: 20, minSpeed: 75,  maxSpeed: 120, color: '#000000',  flightPattern: 'bounce' },
                    { type: 'brewersblackbird', name: 'Brewer\'s Blackbird',  scientificName: 'Euphagus cyanocephalus', weight: 7,  points: 22, minSize: 14, maxSize: 20, minSpeed: 70,  maxSpeed: 115, color: '#1A1A1A',  flightPattern: 'bounce' },
                    { type: 'kingfisher',   name: 'Belted Kingfisher',          scientificName: 'Megaceryle alcyon', weight: 2,  points: 38, minSize: 16, maxSize: 22, minSpeed: 90,  maxSpeed: 140, color: '#4682B4',  flightPattern: 'hoverDive' },
                    { type: 'hummingbird',  name: 'Ruby-throated Hummingbird', scientificName: 'Archilochus colubris', weight: 1,  points: 100,minSize: 8,  maxSize: 12, minSpeed: 120, maxSpeed: 200, color: '#228B22',  flightPattern: 'hover' },
                    { type: 'annashummingbird', name: "Anna's Hummingbird",    scientificName: 'Calypte anna', weight: 6,  points: 95, minSize: 8,  maxSize: 12, minSpeed: 120, maxSpeed: 200, color: '#E91E8C',  flightPattern: 'hover' },
                    { type: 'bushtit',      name: 'American Bushtit',           scientificName: 'Psaltriparus minimus', weight: 7,  points: 24, minSize: 10, maxSize: 14, minSpeed: 80,  maxSpeed: 130, color: '#8B8B7A',  flightPattern: 'flutter' },
                    { type: 'westernmeadowlark', name: 'Western Meadowlark',    scientificName: 'Sturnella neglecta', weight: 6,  points: 28, minSize: 16, maxSize: 22, minSpeed: 70,  maxSpeed: 115, color: '#F4D03F',  flightPattern: 'bounce' },
                    { type: 'longbilledcurlew', name: 'Long-billed Curlew',     scientificName: 'Numenius americanus', weight: 5,  points: 42, minSize: 26, maxSize: 36, minSpeed: 60,  maxSpeed: 95,  color: '#C9A776',  flightPattern: 'steady' },
                    { type: 'flamingo',     name: 'American Flamingo',          scientificName: 'Phoenicopterus ruber',  weight: 10,  points: 85, minSize: 35, maxSize: 50, minSpeed: 40,  maxSpeed: 70,  color: '#FF69B4',  flightPattern: 'majestic' },
                    { type: 'stilt',        name: 'Black-necked Stilt',         scientificName: 'Himantopus mexicanus', weight: 5,  points: 32, minSize: 20, maxSize: 28, minSpeed: 70,  maxSpeed: 110, color: '#2F2F2F',  flightPattern: 'steady' },
                    { type: 'grebe',        name: 'Western Grebe',              scientificName: 'Aechmophorus occidentalis', weight: 7,  points: 45, minSize: 25, maxSize: 35, minSpeed: 65,  maxSpeed: 95,  color: '#3A3A3A',  flightPattern: 'steady' },
                    { type: 'plover',       name: 'Snowy Plover',               scientificName: 'Charadrius nivosus', weight: 6,  points: 35, minSize: 14, maxSize: 20, minSpeed: 80,  maxSpeed: 120, color: '#D3D3D3',  flightPattern: 'flutter' },
                    // { type: 'piedbilledgrebe', name: 'Pied-billed Grebe',       scientificName: 'Podilymbus podiceps', weight: 7,  points: 42, minSize: 20, maxSize: 28, minSpeed: 60,  maxSpeed: 90,  color: '#5C4A3A',  flightPattern: 'steady' },
                    // { type: 'loon',         name: 'Common Loon',                scientificName: 'Gavia immer', weight: 5,  points: 55, minSize: 30, maxSize: 42, minSpeed: 50,  maxSpeed: 80,  color: '#2C3E50',  flightPattern: 'steady' },
                    { type: 'stellersjay',  name: "Steller's Jay",              scientificName: 'Cyanocitta stelleri', weight: 6,  points: 28, minSize: 16, maxSize: 24, minSpeed: 70,  maxSpeed: 115, color: '#1E3A5F',  flightPattern: 'bounce' },
                    { type: 'grackle',      name: 'Great-tailed Grackle',       scientificName: 'Quiscalus mexicanus', weight: 6,  points: 24, minSize: 18, maxSize: 26, minSpeed: 75,  maxSpeed: 120, color: '#1A1A2E',  flightPattern: 'steady' },
                    { type: 'blackheadedgrosbeak', name: 'Black-headed Grosbeak',  scientificName: 'Pheucticus melanocephalus', weight: 7,  points: 26, minSize: 15, maxSize: 21, minSpeed: 70,  maxSpeed: 115, color: '#D2691E',  flightPattern: 'bounce' },
                    { type: 'housefinch',   name: 'House Finch',                scientificName: 'Haemorhous mexicanus', weight: 8,  points: 16, minSize: 12, maxSize: 18, minSpeed: 65,  maxSpeed: 110, color: '#DC143C',  flightPattern: 'bounce' },
                    { type: 'rockdove',     name: 'Rock Dove',                  scientificName: 'Columba livia', weight: 7,  points: 14, minSize: 16, maxSize: 22, minSpeed: 80,  maxSpeed: 130, color: '#6E7C8E',  flightPattern: 'steady' },
                    { type: 'mourningdove', name: 'Mourning Dove',              scientificName: 'Zenaida macroura', weight: 6,  points: 18, minSize: 15, maxSize: 22, minSpeed: 75,  maxSpeed: 120, color: '#B5A397',  flightPattern: 'steady' },
                    { type: 'whitecrownedsparrow', name: 'White-crowned Sparrow', scientificName: 'Zonotrichia leucophrys', weight: 6,  points: 20, minSize: 13, maxSize: 19, minSpeed: 90,  maxSpeed: 140, color: '#8B7D6B',  flightPattern: 'bounce' },
                    { type: 'spottedtowhee', name: 'Spotted Towhee',            scientificName: 'Pipilo maculatus', weight: 6,  points: 24, minSize: 14, maxSize: 20, minSpeed: 80,  maxSpeed: 125, color: '#3D1F1F',  flightPattern: 'bounce' }
                ];
                
                // Bird journal system
                this.todaysSpecies = [];
                this.currentDate = new Date();
                
                // Bird sprites system
                this.birdSprites = {};
                this.spriteImages = {};
                
                // Particle system for enhanced effects
                this.particles = [];

                // Quiz Mode Settings
                this.gameSettings = {
                    quizMode: false
                };

                // Quiz Mode State
                this.quizState = {
                    lockedBird: null,
                    isIdentifying: false,
                    isTracking: false,  // NEW: for live bird tracking
                    attemptedGuesses: new Set(),
                    focusTimeoutId: null,
                    closeTimeoutId: null,
                    feedbackTimeoutId: null
                };
                
                // Quiz animation loop ID
                this.quizAnimationId = null;
                
                // Quiz animation state
                this.quizAnimTime = 0;
                this.quizLastFrame = -1;


				// Unified text size for score and new-species banners
				this.textPopupSize = 24;

				// Cohesive hand-drawn palette
				this.palette = {
					ink: '#2d2d2d',
					softInk: 'rgba(45,45,45,0.85)',
					leaf: '#4A7C59',
					accent: '#8B4513',
					gold: '#C8A34B',
					sky: '#6A7FA0',
					cream: '#F5F0E6',
					date: '#334155'
				};

                // Background image (drawn on canvas so it zooms)
                this.backgroundImage = new Image();
                this.isBackgroundLoaded = false;
                this.backgroundImage.onload = () => {
                    this.isBackgroundLoaded = true;
                };
                this.backgroundImage.src = 'assets/images/ui/background.png';
                
                // Binocs cursor image
                this.binocsImage = new Image();
                this.isBinocsLoaded = false;
                this.binocsImage.onload = () => {
                    this.isBinocsLoaded = true;
                };
                this.binocsImage.src = 'assets/images/ui/Binocs.png';
                
                // Sprite sheet for birds (replaces per-species drawings)
                this.spriteSheet = new Image();
                this.isSpriteSheetLoaded = false;
                // Configure your sheet layout here. The provided sheet is a 4x4 grid (16 frames)
                this.spriteSheetCols = 4;
                this.spriteSheetRows = 4;
                this.spriteTotalFrames = this.spriteSheetCols * this.spriteSheetRows;
                this.spriteAnimFps = 12; // animation speed in frames per second
                this.spriteSheet.onload = () => {
                    this.isSpriteSheetLoaded = true;
                };
                // Place the sprite sheet image in the project root with this name
                this.spriteSheet.src = 'assets/images/sprites/bird-spritesheet.png';

                // Flamingo-specific sprite sheet
                this.flamingoSpriteSheet = new Image();
                this.isFlamingoSpriteSheetLoaded = false;
                // Configure flamingo sprite sheet layout (assuming same 4x4 grid)
                this.flamingoSpriteSheetCols = 4;
                this.flamingoSpriteSheetRows = 4;
                this.flamingoSpriteTotalFrames = this.flamingoSpriteSheetCols * this.flamingoSpriteSheetRows;
                this.flamingoSpriteAnimFps = 12; // animation speed in frames per second
                this.flamingoSpriteSheet.onload = () => {
                    this.isFlamingoSpriteSheetLoaded = true;
                };
                this.flamingoSpriteSheet.src = 'assets/images/sprites/flamingo.png';

                // American Robin-specific sprite sheet
                this.robinSpriteSheet = new Image();
                this.isRobinSpriteSheetLoaded = false;
                // Configure robin sprite sheet layout (assuming same 4x4 grid)
                this.robinSpriteSheetCols = 4;
                this.robinSpriteSheetRows = 4;
                this.robinSpriteTotalFrames = this.robinSpriteSheetCols * this.robinSpriteSheetRows;
                this.robinSpriteAnimFps = 12; // animation speed in frames per second
                this.robinSpriteSheet.onload = () => {
                    this.isRobinSpriteSheetLoaded = true;
                };
                this.robinSpriteSheet.src = 'assets/images/sprites/AmericanRobin.png';

                // Northern Cardinal-specific sprite sheet
                this.cardinalSpriteSheet = new Image();
                this.isCardinalSpriteSheetLoaded = false;
                // Configure cardinal sprite sheet layout (3x3 grid)
                this.cardinalSpriteSheetCols = 3;
                this.cardinalSpriteSheetRows = 3;
                this.cardinalSpriteTotalFrames = this.cardinalSpriteSheetCols * this.cardinalSpriteSheetRows;
                this.cardinalSpriteAnimFps = 12; // animation speed in frames per second
                this.cardinalSpriteSheet.onload = () => {
                    this.isCardinalSpriteSheetLoaded = true;
                };
                this.cardinalSpriteSheet.src = 'assets/images/sprites/NorthernCardinal.png';

                // Downy Woodpecker-specific sprite sheet
                this.woodpeckerSpriteSheet = new Image();
                this.isWoodpeckerSpriteSheetLoaded = false;
                // Configure woodpecker sprite sheet layout (assuming same 4x4 grid)
                this.woodpeckerSpriteSheetCols = 4;
                this.woodpeckerSpriteSheetRows = 4;
                this.woodpeckerSpriteTotalFrames = this.woodpeckerSpriteSheetCols * this.woodpeckerSpriteSheetRows;
                this.woodpeckerSpriteAnimFps = 12; // animation speed in frames per second
                this.woodpeckerSpriteSheet.onload = () => {
                    this.isWoodpeckerSpriteSheetLoaded = true;
                };
                this.woodpeckerSpriteSheet.src = 'assets/images/sprites/DownySprite.png';

                // Mallard-specific sprite sheet
                this.mallardSpriteSheet = new Image();
                this.isMallardSpriteSheetLoaded = false;
                // Configure mallard sprite sheet layout (4x4 grid)
                this.mallardSpriteSheetCols = 4;
                this.mallardSpriteSheetRows = 4;
                this.mallardSpriteTotalFrames = this.mallardSpriteSheetCols * this.mallardSpriteSheetRows;
                this.mallardSpriteAnimFps = 12; // animation speed in frames per second
                this.mallardSpriteSheet.onload = () => {
                    this.isMallardSpriteSheetLoaded = true;
                };
                this.mallardSpriteSheet.src = 'assets/images/sprites/mallard-sprite.png';

                // American Goldfinch-specific sprite sheet
                this.goldfinchSpriteSheet = new Image();
                this.isGoldfinchSpriteSheetLoaded = false;
                // Configure goldfinch sprite sheet layout (4x4 grid)
                this.goldfinchSpriteSheetCols = 4;
                this.goldfinchSpriteSheetRows = 4;
                this.goldfinchSpriteTotalFrames = this.goldfinchSpriteSheetCols * this.goldfinchSpriteSheetRows;
                this.goldfinchSpriteAnimFps = 12; // animation speed in frames per second
                this.goldfinchSpriteSheet.onload = () => {
                    this.isGoldfinchSpriteSheetLoaded = true;
                };
                this.goldfinchSpriteSheet.src = 'assets/images/sprites/American-Goldfinch-Sprite.png';

                // Pelican-specific sprite sheet
                this.pelicanSpriteSheet = new Image();
                this.isPelicanSpriteSheetLoaded = false;
                // Configure pelican sprite sheet layout (4x4 grid)
                this.pelicanSpriteSheetCols = 4;
                this.pelicanSpriteSheetRows = 4;
                this.pelicanSpriteTotalFrames = this.pelicanSpriteSheetCols * this.pelicanSpriteSheetRows;
                this.pelicanSpriteAnimFps = 12; // animation speed in frames per second
                this.pelicanSpriteSheet.onload = () => {
                    this.isPelicanSpriteSheetLoaded = true;
                };
                this.pelicanSpriteSheet.src = 'assets/images/sprites/pelican-spritesheet.png';

                // Blue Jay-specific sprite sheet
                this.bluejaySpriteSheet = new Image();
                this.isBluejayeSpriteSheetLoaded = false;
                // Configure bluejay sprite sheet layout (4x4 grid)
                this.bluejaySpriteSheetCols = 4;
                this.bluejaySpriteSheetRows = 4;
                this.bluejaySpriteTotalFrames = this.bluejaySpriteSheetCols * this.bluejaySpriteSheetRows;
                this.bluejaySpriteAnimFps = 12; // animation speed in frames per second
                this.bluejaySpriteSheet.onload = () => {
                    this.isBluejayeSpriteSheetLoaded = true;
                };
                this.bluejaySpriteSheet.src = 'assets/images/sprites/bluejay-sprite-128px-16-4.png';

                // Chickadee-specific sprite sheet
                this.chickadeeSpriteSheet = new Image();
                this.isChickadeeSpriteSheetLoaded = false;
                // Configure chickadee sprite sheet layout (4x4 grid)
                this.chickadeeSpriteSheetCols = 4;
                this.chickadeeSpriteSheetRows = 4;
                this.chickadeeSpriteTotalFrames = this.chickadeeSpriteSheetCols * this.chickadeeSpriteSheetRows;
                this.chickadeeSpriteAnimFps = 12; // animation speed in frames per second
                this.chickadeeSpriteSheet.onload = () => {
                    this.isChickadeeSpriteSheetLoaded = true;
                };
                this.chickadeeSpriteSheet.src = 'assets/images/sprites/black-capped-chickadee-spritesheet.png';

                // Dark-eyed Junco-specific sprite sheet
                this.darkeyedjuncoSpriteSheet = new Image();
                this.isDarkeyedjuncoSpriteSheetLoaded = false;
                // Configure dark-eyed junco sprite sheet layout (4x4 grid)
                this.darkeyedjuncoSpriteSheetCols = 4;
                this.darkeyedjuncoSpriteSheetRows = 4;
                this.darkeyedjuncoSpriteTotalFrames = this.darkeyedjuncoSpriteSheetCols * this.darkeyedjuncoSpriteSheetRows;
                this.darkeyedjuncoSpriteAnimFps = 12; // animation speed in frames per second
                this.darkeyedjuncoSpriteSheet.onload = () => {
                    this.isDarkeyedjuncoSpriteSheetLoaded = true;
                };
                this.darkeyedjuncoSpriteSheet.src = 'assets/images/sprites/darkeyedjunco-sprite-128px-16-4.png';

                // Bald Eagle-specific sprite sheet
                this.baldeagleSpriteSheet = new Image();
                this.isBaldEagleSpriteSheetLoaded = false;
                // Configure bald eagle sprite sheet layout (4x4 grid = 16 frames)
                this.baldeagleSpriteSheetCols = 4;
                this.baldeagleSpriteSheetRows = 4;
                this.baldeagleSpriteTotalFrames = this.baldeagleSpriteSheetCols * this.baldeagleSpriteSheetRows;
                this.baldeagleSpriteAnimFps = 12; // animation speed in frames per second
                this.baldeagleSpriteSheet.onload = () => {
                    this.isBaldEagleSpriteSheetLoaded = true;
                };
                this.baldeagleSpriteSheet.src = 'assets/be-sprite-256px-16-2.png';

                // American Crow-specific sprite sheet
                this.crowSpriteSheet = new Image();
                this.isCrowSpriteSheetLoaded = false;
                // Configure crow sprite sheet layout (4x4 grid)
                this.crowSpriteSheetCols = 5;
                this.crowSpriteSheetRows = 5;
                this.crowSpriteTotalFrames = this.crowSpriteSheetCols * this.crowSpriteSheetRows;
                this.crowSpriteAnimFps = 12; // animation speed in frames per second
                this.crowSpriteSheet.onload = () => {
                    this.isCrowSpriteSheetLoaded = true;
                };
                this.crowSpriteSheet.src = 'assets/images/sprites/American Crowsprite.png';

                // Canada Goose-specific sprite sheet
                this.gooseSpriteSheet = new Image();
                this.isGooseSpriteSheetLoaded = false;
                // Configure goose sprite sheet layout (4x4 grid)
                this.gooseSpriteSheetCols = 4;
                this.gooseSpriteSheetRows = 4;
                this.gooseSpriteTotalFrames = this.gooseSpriteSheetCols * this.gooseSpriteSheetRows;
                this.gooseSpriteAnimFps = 12; // animation speed in frames per second
                this.gooseSpriteSheet.onload = () => {
                    this.isGooseSpriteSheetLoaded = true;
                };
                this.gooseSpriteSheet.src = 'assets/images/sprites/cg-sprite-256px-16-2.png';

                // Red-tailed Hawk-specific sprite sheet
                this.hawkSpriteSheet = new Image();
                this.isHawkSpriteSheetLoaded = false;
                // Configure hawk sprite sheet layout (4x4 grid)
                this.hawkSpriteSheetCols = 4;
                this.hawkSpriteSheetRows = 4;
                this.hawkSpriteTotalFrames = this.hawkSpriteSheetCols * this.hawkSpriteSheetRows;
                this.hawkSpriteAnimFps = 12; // animation speed in frames per second
                this.hawkSpriteSheet.onload = () => {
                    this.isHawkSpriteSheetLoaded = true;
                };
                this.hawkSpriteSheet.src = 'assets/images/sprites/hawksprite.png';

                // Ruby-throated Hummingbird-specific sprite sheet
                this.hummingbirdSpriteSheet = new Image();
                this.isHummingbirdSpriteSheetLoaded = false;
                // Configure hummingbird sprite sheet layout (4x4 grid)
                this.hummingbirdSpriteSheetCols = 4;
                this.hummingbirdSpriteSheetRows = 4;
                this.hummingbirdSpriteTotalFrames = this.hummingbirdSpriteSheetCols * this.hummingbirdSpriteSheetRows;
                this.hummingbirdSpriteAnimFps = 12; // animation speed in frames per second
                this.hummingbirdSpriteSheet.onload = () => {
                    this.isHummingbirdSpriteSheetLoaded = true;
                };
                this.hummingbirdSpriteSheet.src = 'assets/images/sprites/Ruby-Hummingbird-sprite.png';

                // Great Blue Heron-specific sprite sheet
                this.heronSpriteSheet = new Image();
                this.isHeronSpriteSheetLoaded = false;
                // Configure heron sprite sheet layout (5x5 grid)
                this.heronSpriteSheetCols = 5;
                this.heronSpriteSheetRows = 5;
                this.heronSpriteTotalFrames = this.heronSpriteSheetCols * this.heronSpriteSheetRows;
                this.heronSpriteAnimFps = 12; // animation speed in frames per second
                this.heronSpriteSheet.onload = () => {
                    this.isHeronSpriteSheetLoaded = true;
                };
                this.heronSpriteSheet.src = 'assets/images/sprites/GBH-sprite-256px-25.png';

                // Great Horned Owl-specific sprite sheet
                this.owlSpriteSheet = new Image();
                this.isOwlSpriteSheetLoaded = false;
                // Configure owl sprite sheet layout (5x5 grid)
                this.owlSpriteSheetCols = 5;
                this.owlSpriteSheetRows = 5;
                this.owlSpriteTotalFrames = this.owlSpriteSheetCols * this.owlSpriteSheetRows;
                this.owlSpriteAnimFps = 12; // animation speed in frames per second
                this.owlSpriteSheet.onload = () => {
                    this.isOwlSpriteSheetLoaded = true;
                };
                this.owlSpriteSheet.src = 'assets/images/sprites/GHO-Sprite.png';

                // Turkey Vulture-specific sprite sheet
                this.vultureSpriteSheet = new Image();
                this.isVultureSpriteSheetLoaded = false;
                // Configure vulture sprite sheet layout (4x4 grid - 16 frames)
                this.vultureSpriteSheetCols = 4;
                this.vultureSpriteSheetRows = 4;
                this.vultureSpriteTotalFrames = this.vultureSpriteSheetCols * this.vultureSpriteSheetRows;
                this.vultureSpriteAnimFps = 8; // slower animation for soaring
                this.vultureSpriteSheet.onload = () => {
                    this.isVultureSpriteSheetLoaded = true;
                };
                this.vultureSpriteSheet.src = 'assets/images/sprites/Turkey-Vulture-Sprite.png';

                // Baltimore Oriole-specific sprite sheet
                this.oriolSpriteSheet = new Image();
                this.isOriolSpriteSheetLoaded = false;
                // Configure oriole sprite sheet layout (5x5 grid)
                this.oriolSpriteSheetCols = 5;
                this.oriolSpriteSheetRows = 5;
                this.oriolSpriteTotalFrames = this.oriolSpriteSheetCols * this.oriolSpriteSheetRows;
                this.oriolSpriteAnimFps = 12; // animation speed in frames per second
                this.oriolSpriteSheet.onload = () => {
                    this.isOriolSpriteSheetLoaded = true;
                };
                this.oriolSpriteSheet.src = 'assets/images/sprites/Baltimore-Oriole-Sprite.png';

                // Common Raven-specific sprite sheet
                this.ravenSpriteSheet = new Image();
                this.isRavenSpriteSheetLoaded = false;
                // Configure raven sprite sheet layout (assuming 4x4 grid based on typical sprite sheets)
                this.ravenSpriteSheetCols = 4;
                this.ravenSpriteSheetRows = 4;
                this.ravenSpriteTotalFrames = this.ravenSpriteSheetCols * this.ravenSpriteSheetRows;
                this.ravenSpriteAnimFps = 12; // animation speed in frames per second
                this.ravenSpriteSheet.onload = () => {
                    this.isRavenSpriteSheetLoaded = true;
                };
                this.ravenSpriteSheet.src = 'assets/images/sprites/CommonRavenSprite.png';

                // Belted Kingfisher-specific sprite sheet
                this.kingfisherSpriteSheet = new Image();
                this.isKingfisherSpriteSheetLoaded = false;
                // Configure kingfisher sprite sheet layout (4x4 grid - 16 frames)
                this.kingfisherSpriteSheetCols = 4;
                this.kingfisherSpriteSheetRows = 4;
                this.kingfisherSpriteTotalFrames = this.kingfisherSpriteSheetCols * this.kingfisherSpriteSheetRows;
                this.kingfisherSpriteAnimFps = 12; // animation speed in frames per second
                this.kingfisherSpriteSheet.onload = () => {
                    this.isKingfisherSpriteSheetLoaded = true;
                };
                this.kingfisherSpriteSheet.src = 'assets/images/sprites/beltedkingfisher-sprite-128px-16-4.png';

                // Black-necked Stilt-specific sprite sheet
                this.stiltSpriteSheet = new Image();
                this.isStiltSpriteSheetLoaded = false;
                // Configure stilt sprite sheet layout (4x4 grid - 16 frames)
                this.stiltSpriteSheetCols = 4;
                this.stiltSpriteSheetRows = 4;
                this.stiltSpriteTotalFrames = this.stiltSpriteSheetCols * this.stiltSpriteSheetRows;
                this.stiltSpriteAnimFps = 12; // animation speed in frames per second
                this.stiltSpriteSheet.onload = () => {
                    this.isStiltSpriteSheetLoaded = true;
                };
                this.stiltSpriteSheet.src = 'assets/images/sprites/blackneckedstiltsprite-256px-16.png';

                // Western Grebe-specific sprite sheet
                this.grebeSpriteSheet = new Image();
                this.isGrebeSpriteSheetLoaded = false;
                // Configure grebe sprite sheet layout (4x4 grid - 16 frames)
                this.grebeSpriteSheetCols = 4;
                this.grebeSpriteSheetRows = 4;
                this.grebeSpriteTotalFrames = this.grebeSpriteSheetCols * this.grebeSpriteSheetRows;
                this.grebeSpriteAnimFps = 12; // animation speed in frames per second
                this.grebeSpriteSheet.onload = () => {
                    this.isGrebeSpriteSheetLoaded = true;
                };
                this.grebeSpriteSheet.src = 'assets/images/sprites/westerngrebe-sprite-128px-16-4.png';

                // Great-tailed Grackle-specific sprite sheet
                this.grackleSpriteSheet = new Image();
                this.isGrackleSpriteSheetLoaded = false;
                // Configure grackle sprite sheet layout (4x4 grid - 16 frames)
                this.grackleSpriteSheetCols = 4;
                this.grackleSpriteSheetRows = 4;
                this.grackleSpriteTotalFrames = this.grackleSpriteSheetCols * this.grackleSpriteSheetRows;
                this.grackleSpriteAnimFps = 12; // animation speed in frames per second
                this.grackleSpriteSheet.onload = () => {
                    this.isGrackleSpriteSheetLoaded = true;
                };
                this.grackleSpriteSheet.src = 'assets/images/sprites/great tailed grackle sprite-256px-16-2.png';

                // House Finch-specific sprite sheet
                this.housefinchSpriteSheet = new Image();
                this.isHousefinchSpriteSheetLoaded = false;
                // Configure house finch sprite sheet layout (4x4 grid - 16 frames)
                this.housefinchSpriteSheetCols = 4;
                this.housefinchSpriteSheetRows = 4;
                this.housefinchSpriteTotalFrames = this.housefinchSpriteSheetCols * this.housefinchSpriteSheetRows;
                this.housefinchSpriteAnimFps = 12; // animation speed in frames per second
                this.housefinchSpriteSheet.onload = () => {
                    this.isHousefinchSpriteSheetLoaded = true;
                };
                this.housefinchSpriteSheet.src = 'assets/images/sprites/housefinch-sprite-128px-16-4.png';

                // Rock Dove-specific sprite sheet
                this.rockdoveSpriteSheet = new Image();
                this.isRockdoveSpriteSheetLoaded = false;
                // Configure rock dove sprite sheet layout (4x4 grid - 16 frames)
                this.rockdoveSpriteSheetCols = 4;
                this.rockdoveSpriteSheetRows = 4;
                this.rockdoveSpriteTotalFrames = this.rockdoveSpriteSheetCols * this.rockdoveSpriteSheetRows;
                this.rockdoveSpriteAnimFps = 10; // animation speed in frames per second
                this.rockdoveSpriteSheet.onload = () => {
                    this.isRockdoveSpriteSheetLoaded = true;
                };
                this.rockdoveSpriteSheet.src = 'assets/images/sprites/rockdove-sprite-128px-16.png';

                // White-crowned Sparrow-specific sprite sheet
                this.whitecrownedsparrowSpriteSheet = new Image();
                this.isWhitecrownedsparrowSpriteSheetLoaded = false;
                // Configure white-crowned sparrow sprite sheet layout (4x4 grid - 16 frames)
                this.whitecrownedsparrowSpriteSheetCols = 4;
                this.whitecrownedsparrowSpriteSheetRows = 4;
                this.whitecrownedsparrowSpriteTotalFrames = this.whitecrownedsparrowSpriteSheetCols * this.whitecrownedsparrowSpriteSheetRows;
                this.whitecrownedsparrowSpriteAnimFps = 12; // animation speed in frames per second
                this.whitecrownedsparrowSpriteSheet.onload = () => {
                    this.isWhitecrownedsparrowSpriteSheetLoaded = true;
                };
                this.whitecrownedsparrowSpriteSheet.src = 'assets/images/sprites/whitecrownedsparrow-sprite-128px-16.png';

                // Snowy Plover-specific sprite sheet
                this.ploverSpriteSheet = new Image();
                this.isPloverSpriteSheetLoaded = false;
                // Configure snowy plover sprite sheet layout (4x4 grid - 16 frames)
                this.ploverSpriteSheetCols = 4;
                this.ploverSpriteSheetRows = 4;
                this.ploverSpriteTotalFrames = this.ploverSpriteSheetCols * this.ploverSpriteSheetRows;
                this.ploverSpriteAnimFps = 12; // animation speed in frames per second
                this.ploverSpriteSheet.onload = () => {
                    this.isPloverSpriteSheetLoaded = true;
                };
                this.ploverSpriteSheet.src = 'assets/images/sprites/snowyplover-sprite-128px-16-4.png';

                // Pied-billed Grebe-specific sprite sheet
                this.piedbilledgrebeSpriteSheet = new Image();
                this.isPiedbilledgrebeSpriteSheetLoaded = false;
                // Configure pied-billed grebe sprite sheet layout (4x4 grid - 16 frames)
                this.piedbilledgrebeSpriteSheetCols = 4;
                this.piedbilledgrebeSpriteSheetRows = 4;
                this.piedbilledgrebeSpriteTotalFrames = this.piedbilledgrebeSpriteSheetCols * this.piedbilledgrebeSpriteSheetRows;
                this.piedbilledgrebeSpriteAnimFps = 12; // animation speed in frames per second
                this.piedbilledgrebeSpriteSheet.onload = () => {
                    this.isPiedbilledgrebeSpriteSheetLoaded = true;
                };
                this.piedbilledgrebeSpriteSheet.src = 'assets/images/sprites/piedbilledgrebe-sprite-128px-16-5.png';

                // Common Loon-specific sprite sheet
                this.loonSpriteSheet = new Image();
                this.isLoonSpriteSheetLoaded = false;
                // Configure common loon sprite sheet layout (4x4 grid - 16 frames)
                this.loonSpriteSheetCols = 4;
                this.loonSpriteSheetRows = 4;
                this.loonSpriteTotalFrames = this.loonSpriteSheetCols * this.loonSpriteSheetRows;
                this.loonSpriteAnimFps = 12; // animation speed in frames per second
                this.loonSpriteSheet.onload = () => {
                    this.isLoonSpriteSheetLoaded = true;
                };
                this.loonSpriteSheet.src = 'assets/images/sprites/commonloon-sprite-128px-16-4.png';

                // Steller's Jay-specific sprite sheet
                this.stellersjaySpriteSheet = new Image();
                this.isStellersjaySpriteSheetLoaded = false;
                // Configure Steller's Jay sprite sheet layout (4x4 grid - 16 frames)
                this.stellersjaySpriteSheetCols = 4;
                this.stellersjaySpriteSheetRows = 4;
                this.stellersjaySpriteTotalFrames = this.stellersjaySpriteSheetCols * this.stellersjaySpriteSheetRows;
                this.stellersjaySpriteAnimFps = 12; // animation speed in frames per second
                this.stellersjaySpriteSheet.onload = () => {
                    this.isStellersjaySpriteSheetLoaded = true;
                };
                this.stellersjaySpriteSheet.src = 'assets/images/sprites/stellers-sprite-128px-16-4.png';

                // Black-headed Grosbeak-specific sprite sheet
                this.blackheadedgrosbeakSpriteSheet = new Image();
                this.isBlackheadedgrosbeakSpriteSheetLoaded = false;
                // Configure Black-headed Grosbeak sprite sheet layout (4x4 grid - 16 frames)
                this.blackheadedgrosbeakSpriteSheetCols = 4;
                this.blackheadedgrosbeakSpriteSheetRows = 4;
                this.blackheadedgrosbeakSpriteTotalFrames = this.blackheadedgrosbeakSpriteSheetCols * this.blackheadedgrosbeakSpriteSheetRows;
                this.blackheadedgrosbeakSpriteAnimFps = 12; // animation speed in frames per second
                this.blackheadedgrosbeakSpriteSheet.onload = () => {
                    this.isBlackheadedgrosbeakSpriteSheetLoaded = true;
                };
                this.blackheadedgrosbeakSpriteSheet.src = 'assets/images/sprites/blackheaded grosbeaksprite-128px-16-4.png';

                // Mourning Dove-specific sprite sheet
                this.mourningdoveSpriteSheet = new Image();
                this.isMourningdoveSpriteSheetLoaded = false;
                // Configure Mourning Dove sprite sheet layout (4x4 grid - 16 frames)
                this.mourningdoveSpriteSheetCols = 4;
                this.mourningdoveSpriteSheetRows = 4;
                this.mourningdoveSpriteTotalFrames = this.mourningdoveSpriteSheetCols * this.mourningdoveSpriteSheetRows;
                this.mourningdoveSpriteAnimFps = 12; // animation speed in frames per second
                this.mourningdoveSpriteSheet.onload = () => {
                    this.isMourningdoveSpriteSheetLoaded = true;
                };
                this.mourningdoveSpriteSheet.src = 'assets/images/sprites/mourning dove-sprite-128px-16 (2).png';

                // Acorn Woodpecker-specific sprite sheet
                this.acornwoodpeckerSpriteSheet = new Image();
                this.isAcornwoodpeckerSpriteSheetLoaded = false;
                // Configure Acorn Woodpecker sprite sheet layout (4x4 grid - 16 frames)
                this.acornwoodpeckerSpriteSheetCols = 4;
                this.acornwoodpeckerSpriteSheetRows = 4;
                this.acornwoodpeckerSpriteTotalFrames = this.acornwoodpeckerSpriteSheetCols * this.acornwoodpeckerSpriteSheetRows;
                this.acornwoodpeckerSpriteAnimFps = 12; // animation speed in frames per second
                this.acornwoodpeckerSpriteSheet.onload = () => {
                    this.isAcornwoodpeckerSpriteSheetLoaded = true;
                };
                this.acornwoodpeckerSpriteSheet.src = 'assets/images/sprites/acornwoodpeckersprite-128px-16-4.png';

                // Spotted Towhee-specific sprite sheet
                this.spottedtowheeSpriteSheet = new Image();
                this.isSpottedtowheeSpriteSheetLoaded = false;
                // Configure Spotted Towhee sprite sheet layout (4x4 grid - 16 frames)
                this.spottedtowheeSpriteSheetCols = 4;
                this.spottedtowheeSpriteSheetRows = 4;
                this.spottedtowheeSpriteTotalFrames = this.spottedtowheeSpriteSheetCols * this.spottedtowheeSpriteSheetRows;
                this.spottedtowheeSpriteAnimFps = 12; // animation speed in frames per second
                this.spottedtowheeSpriteSheet.onload = () => {
                    this.isSpottedtowheeSpriteSheetLoaded = true;
                };
                this.spottedtowheeSpriteSheet.src = 'assets/images/sprites/spotted towhee sprite-128px-16-4.png';

                // Western Gull-specific sprite sheet
                this.westerngullSpriteSheet = new Image();
                this.isWesterngullSpriteSheetLoaded = false;
                // Configure Western Gull sprite sheet layout (4x4 grid - 16 frames)
                this.westerngullSpriteSheetCols = 4;
                this.westerngullSpriteSheetRows = 4;
                this.westerngullSpriteTotalFrames = this.westerngullSpriteSheetCols * this.westerngullSpriteSheetRows;
                this.westerngullSpriteAnimFps = 12; // animation speed in frames per second
                this.westerngullSpriteSheet.onload = () => {
                    this.isWesterngullSpriteSheetLoaded = true;
                };
                this.westerngullSpriteSheet.src = 'assets/images/sprites/westerngull sprite.png';

                // Double-crested Cormorant-specific sprite sheet
                this.cormorantSpriteSheet = new Image();
                this.isCormorantSpriteSheetLoaded = false;
                // Configure cormorant sprite sheet layout (4x4 grid - 16 frames)
                this.cormorantSpriteSheetCols = 4;
                this.cormorantSpriteSheetRows = 4;
                this.cormorantSpriteTotalFrames = this.cormorantSpriteSheetCols * this.cormorantSpriteSheetRows;
                this.cormorantSpriteAnimFps = 12; // animation speed in frames per second
                this.cormorantSpriteSheet.onload = () => {
                    this.isCormorantSpriteSheetLoaded = true;
                };
                this.cormorantSpriteSheet.src = 'assets/images/sprites/doublecrestedcormorant-sprite-128px-16-4.png';

                // Cedar Waxwing-specific sprite sheet
                this.cedarwaxwingSpriteSheet = new Image();
                this.isCedarwaxwingSpriteSheetLoaded = false;
                // Configure Cedar Waxwing sprite sheet layout (4x4 grid - 16 frames)
                this.cedarwaxwingSpriteSheetCols = 4;
                this.cedarwaxwingSpriteSheetRows = 4;
                this.cedarwaxwingSpriteTotalFrames = this.cedarwaxwingSpriteSheetCols * this.cedarwaxwingSpriteSheetRows;
                this.cedarwaxwingSpriteAnimFps = 12; // animation speed in frames per second
                this.cedarwaxwingSpriteSheet.onload = () => {
                    this.isCedarwaxwingSpriteSheetLoaded = true;
                };
                this.cedarwaxwingSpriteSheet.src = 'assets/images/sprites/cedarwaxwing-sprite-128px-16-4.png';

                // European Starling-specific sprite sheet
                this.europeanstarlingSpriteSheet = new Image();
                this.isEuropeanstarlingSpriteSheetLoaded = false;
                // Configure European Starling sprite sheet layout (4x4 grid - 16 frames)
                this.europeanstarlingSpriteSheetCols = 4;
                this.europeanstarlingSpriteSheetRows = 4;
                this.europeanstarlingSpriteTotalFrames = this.europeanstarlingSpriteSheetCols * this.europeanstarlingSpriteSheetRows;
                this.europeanstarlingSpriteAnimFps = 12; // animation speed in frames per second
                this.europeanstarlingSpriteSheet.onload = () => {
                    this.isEuropeanstarlingSpriteSheetLoaded = true;
                };
                this.europeanstarlingSpriteSheet.src = 'assets/images/sprites/europeanstarling-sprite-128px-16-4.png';

                // California Scrub-Jay-specific sprite sheet
                this.cascrubjaySpriteSheet = new Image();
                this.isCascrubjaySpriteSheetLoaded = false;
                // Configure CA Scrub-Jay sprite sheet layout (4x4 grid - 16 frames)
                this.cascrubjaySpriteSheetCols = 4;
                this.cascrubjaySpriteSheetRows = 4;
                this.cascrubjaySpriteTotalFrames = this.cascrubjaySpriteSheetCols * this.cascrubjaySpriteSheetRows;
                this.cascrubjaySpriteAnimFps = 12; // animation speed in frames per second
                this.cascrubjaySpriteSheet.onload = () => {
                    this.isCascrubjaySpriteSheetLoaded = true;
                };
                this.cascrubjaySpriteSheet.src = 'assets/images/sprites/cascrubjay-sprite-128px-16-4.png';

                // Red-winged Blackbird-specific sprite sheet
                this.redwingedblackbirdSpriteSheet = new Image();
                this.isRedwingedblackbirdSpriteSheetLoaded = false;
                // Configure Red-winged Blackbird sprite sheet layout (4x4 grid - 16 frames)
                this.redwingedblackbirdSpriteSheetCols = 4;
                this.redwingedblackbirdSpriteSheetRows = 4;
                this.redwingedblackbirdSpriteTotalFrames = this.redwingedblackbirdSpriteSheetCols * this.redwingedblackbirdSpriteSheetRows;
                this.redwingedblackbirdSpriteAnimFps = 12; // animation speed in frames per second
                this.redwingedblackbirdSpriteSheet.onload = () => {
                    this.isRedwingedblackbirdSpriteSheetLoaded = true;
                };
                this.redwingedblackbirdSpriteSheet.src = 'assets/images/sprites/redwingedblack bird sprite-128px-16-4.png';

                // Brewer's Blackbird-specific sprite sheet
                this.brewersblackbirdSpriteSheet = new Image();
                this.isBrewersblackbirdSpriteSheetLoaded = false;
                // Configure Brewer's Blackbird sprite sheet layout (4x4 grid - 16 frames)
                this.brewersblackbirdSpriteSheetCols = 4;
                this.brewersblackbirdSpriteSheetRows = 4;
                this.brewersblackbirdSpriteTotalFrames = this.brewersblackbirdSpriteSheetCols * this.brewersblackbirdSpriteSheetRows;
                this.brewersblackbirdSpriteAnimFps = 12; // animation speed in frames per second
                this.brewersblackbirdSpriteSheet.onload = () => {
                    this.isBrewersblackbirdSpriteSheetLoaded = true;
                };
                this.brewersblackbirdSpriteSheet.src = 'assets/images/sprites/brewers black bird sprite-128px-16-4.png';

                // Anna's Hummingbird-specific sprite sheet
                this.annashummingbirdSpriteSheet = new Image();
                this.isAnnashummingbirdSpriteSheetLoaded = false;
                // Configure Anna's Hummingbird sprite sheet layout (4x4 grid - 16 frames)
                this.annashummingbirdSpriteSheetCols = 4;
                this.annashummingbirdSpriteSheetRows = 4;
                this.annashummingbirdSpriteTotalFrames = this.annashummingbirdSpriteSheetCols * this.annashummingbirdSpriteSheetRows;
                this.annashummingbirdSpriteAnimFps = 12; // animation speed in frames per second
                this.annashummingbirdSpriteSheet.onload = () => {
                    this.isAnnashummingbirdSpriteSheetLoaded = true;
                };
                this.annashummingbirdSpriteSheet.src = "assets/images/sprites/anna's hummingbird-sprite-128px-16-4.png";

                // American Bushtit-specific sprite sheet
                this.bushtitSpriteSheet = new Image();
                this.isBushtitSpriteSheetLoaded = false;
                // Configure American Bushtit sprite sheet layout (4x4 grid - 16 frames)
                this.bushtitSpriteSheetCols = 4;
                this.bushtitSpriteSheetRows = 4;
                this.bushtitSpriteTotalFrames = this.bushtitSpriteSheetCols * this.bushtitSpriteSheetRows;
                this.bushtitSpriteAnimFps = 12; // animation speed in frames per second
                this.bushtitSpriteSheet.onload = () => {
                    this.isBushtitSpriteSheetLoaded = true;
                };
                this.bushtitSpriteSheet.src = 'assets/images/sprites/american-bushtit-sprite-128px-16-4.png';

                // Western Meadowlark-specific sprite sheet
                this.westernmeadowlarkSpriteSheet = new Image();
                this.isWesternmeadowlarkSpriteSheetLoaded = false;
                // Configure Western Meadowlark sprite sheet layout (4x4 grid - 16 frames)
                this.westernmeadowlarkSpriteSheetCols = 4;
                this.westernmeadowlarkSpriteSheetRows = 4;
                this.westernmeadowlarkSpriteTotalFrames = this.westernmeadowlarkSpriteSheetCols * this.westernmeadowlarkSpriteSheetRows;
                this.westernmeadowlarkSpriteAnimFps = 12; // animation speed in frames per second
                this.westernmeadowlarkSpriteSheet.onload = () => {
                    this.isWesternmeadowlarkSpriteSheetLoaded = true;
                };
                this.westernmeadowlarkSpriteSheet.src = 'assets/images/sprites/western-meadowlark-sprite-128px-16-4.png';

                // Long-billed Curlew-specific sprite sheet
                this.longbilledcurlewSpriteSheet = new Image();
                this.isLongbilledcurlewSpriteSheetLoaded = false;
                // Configure Long-billed Curlew sprite sheet layout (4x4 grid - 16 frames)
                this.longbilledcurlewSpriteSheetCols = 4;
                this.longbilledcurlewSpriteSheetRows = 4;
                this.longbilledcurlewSpriteTotalFrames = this.longbilledcurlewSpriteSheetCols * this.longbilledcurlewSpriteSheetRows;
                this.longbilledcurlewSpriteAnimFps = 12; // animation speed in frames per second
                this.longbilledcurlewSpriteSheet.onload = () => {
                    this.isLongbilledcurlewSpriteSheetLoaded = true;
                };
                this.longbilledcurlewSpriteSheet.src = 'assets/images/sprites/long billed curlew sprite-128px-16-4.png';

                // Sound system (visual feedback for now)
                this.soundEnabled = true;

                // PERFORMANCE OPTIMIZATION: Sprite lookup table for O(1) sprite selection
                // Maps bird type to sprite configuration (replaces 500-line if-else chain)
                this.spriteConfig = {
                    'flamingo': { sheet: 'flamingoSpriteSheet', loaded: 'isFlamingoSpriteSheetLoaded', cols: 'flamingoSpriteSheetCols', rows: 'flamingoSpriteSheetRows', height: 80 },
                    'robin': { sheet: 'robinSpriteSheet', loaded: 'isRobinSpriteSheetLoaded', cols: 'robinSpriteSheetCols', rows: 'robinSpriteSheetRows', height: 80 },
                    'cardinal': { sheet: 'cardinalSpriteSheet', loaded: 'isCardinalSpriteSheetLoaded', cols: 'cardinalSpriteSheetCols', rows: 'cardinalSpriteSheetRows', height: 80 },
                    'woodpecker': { sheet: 'woodpeckerSpriteSheet', loaded: 'isWoodpeckerSpriteSheetLoaded', cols: 'woodpeckerSpriteSheetCols', rows: 'woodpeckerSpriteSheetRows', height: 80 },
                    'duck': { sheet: 'mallardSpriteSheet', loaded: 'isMallardSpriteSheetLoaded', cols: 'mallardSpriteSheetCols', rows: 'mallardSpriteSheetRows', height: 80 },
                    'goldfinch': { sheet: 'goldfinchSpriteSheet', loaded: 'isGoldfinchSpriteSheetLoaded', cols: 'goldfinchSpriteSheetCols', rows: 'goldfinchSpriteSheetRows', height: 80 },
                    'pelican': { sheet: 'pelicanSpriteSheet', loaded: 'isPelicanSpriteSheetLoaded', cols: 'pelicanSpriteSheetCols', rows: 'pelicanSpriteSheetRows', height: 80 },
                    'bluejay': { sheet: 'bluejaySpriteSheet', loaded: 'isBluejayeSpriteSheetLoaded', cols: 'bluejaySpriteSheetCols', rows: 'bluejaySpriteSheetRows', height: 80 },
                    'chickadee': { sheet: 'chickadeeSpriteSheet', loaded: 'isChickadeeSpriteSheetLoaded', cols: 'chickadeeSpriteSheetCols', rows: 'chickadeeSpriteSheetRows', height: 80 },
                    'darkeyedjunco': { sheet: 'darkeyedjuncoSpriteSheet', loaded: 'isDarkeyedjuncoSpriteSheetLoaded', cols: 'darkeyedjuncoSpriteSheetCols', rows: 'darkeyedjuncoSpriteSheetRows', height: 80 },
                    'eagle': { sheet: 'baldeagleSpriteSheet', loaded: 'isBaldEagleSpriteSheetLoaded', cols: 'baldeagleSpriteSheetCols', rows: 'baldeagleSpriteSheetRows', height: 120 },
                    'crow': { sheet: 'crowSpriteSheet', loaded: 'isCrowSpriteSheetLoaded', cols: 'crowSpriteSheetCols', rows: 'crowSpriteSheetRows', height: 80 },
                    'goose': { sheet: 'gooseSpriteSheet', loaded: 'isGooseSpriteSheetLoaded', cols: 'gooseSpriteSheetCols', rows: 'gooseSpriteSheetRows', height: 80 },
                    'hawk': { sheet: 'hawkSpriteSheet', loaded: 'isHawkSpriteSheetLoaded', cols: 'hawkSpriteSheetCols', rows: 'hawkSpriteSheetRows', height: 80 },
                    'hummingbird': { sheet: 'hummingbirdSpriteSheet', loaded: 'isHummingbirdSpriteSheetLoaded', cols: 'hummingbirdSpriteSheetCols', rows: 'hummingbirdSpriteSheetRows', height: 80 },
                    'heron': { sheet: 'heronSpriteSheet', loaded: 'isHeronSpriteSheetLoaded', cols: 'heronSpriteSheetCols', rows: 'heronSpriteSheetRows', height: 80 },
                    'owl': { sheet: 'owlSpriteSheet', loaded: 'isOwlSpriteSheetLoaded', cols: 'owlSpriteSheetCols', rows: 'owlSpriteSheetRows', height: 80 },
                    'vulture': { sheet: 'vultureSpriteSheet', loaded: 'isVultureSpriteSheetLoaded', cols: 'vultureSpriteSheetCols', rows: 'vultureSpriteSheetRows', height: 90 },
                    'oriole': { sheet: 'oriolSpriteSheet', loaded: 'isOriolSpriteSheetLoaded', cols: 'oriolSpriteSheetCols', rows: 'oriolSpriteSheetRows', height: 80 },
                    'raven': { sheet: 'ravenSpriteSheet', loaded: 'isRavenSpriteSheetLoaded', cols: 'ravenSpriteSheetCols', rows: 'ravenSpriteSheetRows', height: 80 },
                    'kingfisher': { sheet: 'kingfisherSpriteSheet', loaded: 'isKingfisherSpriteSheetLoaded', cols: 'kingfisherSpriteSheetCols', rows: 'kingfisherSpriteSheetRows', height: 80 },
                    'stilt': { sheet: 'stiltSpriteSheet', loaded: 'isStiltSpriteSheetLoaded', cols: 'stiltSpriteSheetCols', rows: 'stiltSpriteSheetRows', height: 80 },
                    'grebe': { sheet: 'grebeSpriteSheet', loaded: 'isGrebeSpriteSheetLoaded', cols: 'grebeSpriteSheetCols', rows: 'grebeSpriteSheetRows', height: 80 },
                    'grackle': { sheet: 'grackleSpriteSheet', loaded: 'isGrackleSpriteSheetLoaded', cols: 'grackleSpriteSheetCols', rows: 'grackleSpriteSheetRows', height: 75 },
                    'housefinch': { sheet: 'housefinchSpriteSheet', loaded: 'isHousefinchSpriteSheetLoaded', cols: 'housefinchSpriteSheetCols', rows: 'housefinchSpriteSheetRows', height: 80 },
                    'rockdove': { sheet: 'rockdoveSpriteSheet', loaded: 'isRockdoveSpriteSheetLoaded', cols: 'rockdoveSpriteSheetCols', rows: 'rockdoveSpriteSheetRows', height: 85 },
                    'whitecrownedsparrow': { sheet: 'whitecrownedsparrowSpriteSheet', loaded: 'isWhitecrownedsparrowSpriteSheetLoaded', cols: 'whitecrownedsparrowSpriteSheetCols', rows: 'whitecrownedsparrowSpriteSheetRows', height: 80 },
                    'plover': { sheet: 'ploverSpriteSheet', loaded: 'isPloverSpriteSheetLoaded', cols: 'ploverSpriteSheetCols', rows: 'ploverSpriteSheetRows', height: 75 },
                    'piedbilledgrebe': { sheet: 'piedbilledgrebeSpriteSheet', loaded: 'isPiedbilledgrebeSpriteSheetLoaded', cols: 'piedbilledgrebeSpriteSheetCols', rows: 'piedbilledgrebeSpriteSheetRows', height: 85 },
                    'loon': { sheet: 'loonSpriteSheet', loaded: 'isLoonSpriteSheetLoaded', cols: 'loonSpriteSheetCols', rows: 'loonSpriteSheetRows', height: 100 },
                    'stellersjay': { sheet: 'stellersjaySpriteSheet', loaded: 'isStellersjaySpriteSheetLoaded', cols: 'stellersjaySpriteSheetCols', rows: 'stellersjaySpriteSheetRows', height: 75 },
                    'blackheadedgrosbeak': { sheet: 'blackheadedgrosbeakSpriteSheet', loaded: 'isBlackheadedgrosbeakSpriteSheetLoaded', cols: 'blackheadedgrosbeakSpriteSheetCols', rows: 'blackheadedgrosbeakSpriteSheetRows', height: 70 },
                    'mourningdove': { sheet: 'mourningdoveSpriteSheet', loaded: 'isMourningdoveSpriteSheetLoaded', cols: 'mourningdoveSpriteSheetCols', rows: 'mourningdoveSpriteSheetRows', height: 72 },
                    'acornwoodpecker': { sheet: 'acornwoodpeckerSpriteSheet', loaded: 'isAcornwoodpeckerSpriteSheetLoaded', cols: 'acornwoodpeckerSpriteSheetCols', rows: 'acornwoodpeckerSpriteSheetRows', height: 74 },
                    'spottedtowhee': { sheet: 'spottedtowheeSpriteSheet', loaded: 'isSpottedtowheeSpriteSheetLoaded', cols: 'spottedtowheeSpriteSheetCols', rows: 'spottedtowheeSpriteSheetRows', height: 71 },
                    'westerngull': { sheet: 'westerngullSpriteSheet', loaded: 'isWesterngullSpriteSheetLoaded', cols: 'westerngullSpriteSheetCols', rows: 'westerngullSpriteSheetRows', height: 90 },
                    'cormorant': { sheet: 'cormorantSpriteSheet', loaded: 'isCormorantSpriteSheetLoaded', cols: 'cormorantSpriteSheetCols', rows: 'cormorantSpriteSheetRows', height: 85 },
                    'cedarwaxwing': { sheet: 'cedarwaxwingSpriteSheet', loaded: 'isCedarwaxwingSpriteSheetLoaded', cols: 'cedarwaxwingSpriteSheetCols', rows: 'cedarwaxwingSpriteSheetRows', height: 70 },
                    'europeanstarling': { sheet: 'europeanstarlingSpriteSheet', loaded: 'isEuropeanstarlingSpriteSheetLoaded', cols: 'europeanstarlingSpriteSheetCols', rows: 'europeanstarlingSpriteSheetRows', height: 72 },
                    'cascrubjay': { sheet: 'cascrubjaySpriteSheet', loaded: 'isCascrubjaySpriteSheetLoaded', cols: 'cascrubjaySpriteSheetCols', rows: 'cascrubjaySpriteSheetRows', height: 76 },
                    'redwingedblackbird': { sheet: 'redwingedblackbirdSpriteSheet', loaded: 'isRedwingedblackbirdSpriteSheetLoaded', cols: 'redwingedblackbirdSpriteSheetCols', rows: 'redwingedblackbirdSpriteSheetRows', height: 73 },
                    'brewersblackbird': { sheet: 'brewersblackbirdSpriteSheet', loaded: 'isBrewersblackbirdSpriteSheetLoaded', cols: 'brewersblackbirdSpriteSheetCols', rows: 'brewersblackbirdSpriteSheetRows', height: 73 },
                    'annashummingbird': { sheet: 'annashummingbirdSpriteSheet', loaded: 'isAnnashummingbirdSpriteSheetLoaded', cols: 'annashummingbirdSpriteSheetCols', rows: 'annashummingbirdSpriteSheetRows', height: 65 },
                    'bushtit': { sheet: 'bushtitSpriteSheet', loaded: 'isBushtitSpriteSheetLoaded', cols: 'bushtitSpriteSheetCols', rows: 'bushtitSpriteSheetRows', height: 68 },
                    'westernmeadowlark': { sheet: 'westernmeadowlarkSpriteSheet', loaded: 'isWesternmeadowlarkSpriteSheetLoaded', cols: 'westernmeadowlarkSpriteSheetCols', rows: 'westernmeadowlarkSpriteSheetRows', height: 74 },
                    'longbilledcurlew': { sheet: 'longbilledcurlewSpriteSheet', loaded: 'isLongbilledcurlewSpriteSheetLoaded', cols: 'longbilledcurlewSpriteSheetCols', rows: 'longbilledcurlewSpriteSheetRows', height: 85 }
                };

                // Notebook system
                this.notebookData = this.createNotebookData();
                this.currentNotebookBird = null;
                this.notebookOpen = true;
                this.currentPage = 1; // Track current page to avoid unnecessary DOM updates

                // Game settings - now dynamic based on viewport
                this.updateCanvasSize();
                
                // Frame boundaries for bird movement (based on background image frame)
                // These will be set proportionally in updateCanvasSize()
                this.frameBounds = {
                    left: 0,       // Left edge of screen
                    right: 1200,   // Right edge of screen
                    top: 0,        // Top edge of screen
                    bottom: 800    // Bottom edge of screen
                };
                
                this.setupCanvas();
                this.setupEventListeners();
                this.setupUI();
                this.setupNotebook();
                // Keep SVG sprites available as a fallback if no sprite sheet is present
                this.createBirdSprites();
            }
            
            updateCanvasSize() {
                // Set canvas size to match the viewport
                this.canvasWidth = window.innerWidth;
                this.canvasHeight = window.innerHeight;
                
                // Update frame bounds to use full screen
                this.frameBounds = {
                    left: 0,
                    right: this.canvasWidth,
                    top: 0,
                    bottom: this.canvasHeight
                };
            }
            
            setupCanvas() {
                this.canvas.width = this.canvasWidth;
                this.canvas.height = this.canvasHeight;
                this.ctx.imageSmoothingEnabled = true;

                // Set up offscreen canvas for binocular rendering (same size as main canvas)
                this.offscreenCanvas.width = this.canvasWidth;
                this.offscreenCanvas.height = this.canvasHeight;
                this.offscreenCtx.imageSmoothingEnabled = true;

                // Set canvas style to fill the entire viewport
                this.canvas.style.width = '100vw';
                this.canvas.style.height = '100vh';
            }
            
            setupEventListeners() {
                this.canvas.addEventListener('mousemove', (e) => {
                    const rect = this.canvas.getBoundingClientRect();
                    // Account for pixel ratio in mouse coordinate calculation
                    const pixelRatio = window.devicePixelRatio || 1;
                    const scaleX = (this.canvas.width / pixelRatio) / rect.width;
                    const scaleY = (this.canvas.height / pixelRatio) / rect.height;

                    this.mouse.x = (e.clientX - rect.left) * scaleX;
                    this.mouse.y = (e.clientY - rect.top) * scaleY;
                });
                
                this.canvas.addEventListener('mousedown', (e) => {
                    this.mouse.isDown = true;
                    this.binoculars.isActive = true;
                    this.binoculars.zoomLevel = 2.5;
                    this.canvas.classList.add('zoomed');
                });
                
                this.canvas.addEventListener('mouseup', (e) => {
                    this.mouse.isDown = false;
                    this.binoculars.isActive = false;
                    this.binoculars.zoomLevel = 1.0;
                    this.canvas.classList.remove('zoomed');
                });
                
                this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
                this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
                window.addEventListener('resize', () => this.handleResize());
            }
            
            setupUI() {
                this.uiElements = {
                    binocularStatus: document.getElementById('binocularStatus'),
                    birdCount: document.getElementById('birdCount'),
                    mousePos: document.getElementById('mousePos'),
                    scoreDisplay: document.getElementById('scoreDisplay')
                };

                // Quiz Mode UI Elements
                this.quizElements = {
                    checkbox: document.getElementById('quizModeCheckbox'),
                    status: document.getElementById('quizModeStatus'),
                    modal: document.getElementById('identificationModal'),
                    input: document.getElementById('birdNameInput'),
                    submitBtn: document.getElementById('submitGuessBtn'),
                    feedback: document.getElementById('feedbackMessage'),
                    canvas: document.getElementById('identificationCanvas'),
                    // NEW: Tracking mode elements
                    trackingCanvas: document.getElementById('trackingCircleCanvas'),
                    bottomInput: document.getElementById('bottomIdentificationInput'),
                    bottomBirdNameInput: document.getElementById('bottomBirdNameInput'),
                    bottomSubmitBtn: document.getElementById('bottomSubmitBtn'),
                    bottomFeedback: document.getElementById('bottomFeedbackMessage')
                };

                // Setup quiz mode toggle
                this.quizElements.checkbox.addEventListener('change', async (e) => {
                    this.gameSettings.quizMode = e.target.checked;
                    this.quizElements.status.textContent = this.gameSettings.quizMode ? 'ON' : 'OFF';

                });

                // Setup identification input - DO NOT auto-check, only check when submitted
                // (listener kept for potential future use)

                // Handle Enter key to submit
                this.quizElements.input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.submitGuess();
                    }
                });

                // Handle submit button click
                this.quizElements.submitBtn.addEventListener('click', () => {
                    this.submitGuess();
                });

                // Setup identification canvas
                const idCtx = this.quizElements.canvas.getContext('2d');
                this.quizElements.canvas.width = 400;
                this.quizElements.canvas.height = 400;
                this.identificationCtx = idCtx;

                // NEW: Setup tracking mode elements
                // Handle Enter key in bottom input
                this.quizElements.bottomBirdNameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.submitTrackingGuess();
                    } else if (e.key === 'Escape') {
                        e.preventDefault();
                        this.cancelTracking();
                    }
                });

                // Handle input changes to enable/disable submit button
                this.quizElements.bottomBirdNameInput.addEventListener('input', (e) => {
                    const hasText = e.target.value.trim().length > 0;
                    this.quizElements.bottomSubmitBtn.disabled = !hasText;
                });

                // Handle bottom submit button click
                this.quizElements.bottomSubmitBtn.addEventListener('click', () => {
                    this.submitTrackingGuess();
                });

                // Setup tracking canvas with pixel ratio
                const trackingCtx = this.quizElements.trackingCanvas.getContext('2d');
                const pixelRatio = window.devicePixelRatio || 1;
                this.quizElements.trackingCanvas.width = this.canvasWidth * pixelRatio;
                this.quizElements.trackingCanvas.height = this.canvasHeight * pixelRatio;
                this.trackingCtx = trackingCtx;
                this.trackingCtx.scale(pixelRatio, pixelRatio);
                this.trackingCtx.imageSmoothingEnabled = true;

                // Handle ESC key globally to cancel tracking
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && this.quizState.isTracking) {
                        this.cancelTracking();
                    }
                });

            }
            
            addSpeciesToJournal(bird) {
                const isNewSpecies = !this.discoveredSpecies.has(bird.type);
                
                // Check if this species already exists in today's list
                const existingSpecies = this.todaysSpecies.find(species => species.type === bird.type);
                
                if (existingSpecies) {
                    // Increment count for existing species
                    existingSpecies.count++;
                } else {
                    // Add new species entry
                    const speciesEntry = {
                        name: bird.name,
                        type: bird.type,
                        count: 1,
                        isNewSpecies: isNewSpecies
                    };
                    
                    this.todaysSpecies.unshift(speciesEntry); // Add to beginning of list
                }
                
                // Update notebook species list
                this.updateNotebookSpeciesList();
            }
            
            setupNotebook() {
                this.notebookElements = {
                    container: document.getElementById('birdNotebook'),
                    closedNotebook: document.getElementById('closedNotebook'),
                    closeBtn: document.getElementById('notebookCloseBtn'),
                    title: document.getElementById('poemTitle'),
                    author: document.getElementById('poemAuthor'),
                    text: document.getElementById('poemText'),
                    birdImage: document.getElementById('birdImage'),
                    birdName: document.getElementById('birdName'),
                    birdScientificName: document.getElementById('birdScientificName'),
                    date: document.getElementById('notebookDate'),
                    speciesList: document.getElementById('notebookSpeciesList'),
                    poemHawkImage: document.getElementById('poemHawkImage'),
                    // New multi-page elements
                    scrollContainer: document.querySelector('.left-panel-scroll-container'),
                    trainingPage: document.querySelector('.training-page'),
                    birdInfoPage: document.querySelector('.bird-info-page'),
                    poemPage: document.querySelector('.poem-page'),
                    poemTitleDisplay: document.getElementById('poemTitleDisplay'),
                    poemAuthorDisplay: document.getElementById('poemAuthorDisplay'),
                    poemTextDisplay: document.getElementById('poemTextDisplay'),
                    // Scroll indicator dots
                    scrollDotsContainer: document.querySelector('.scroll-indicator-dots'),
                    scrollDots: document.querySelectorAll('.scroll-dot')
                };

                // Track if mouse is over notebook
                this.isMouseOverNotebookElement = false;

                // Add mouse enter/leave listeners to notebook
                this.notebookElements.container.addEventListener('mouseenter', () => {
                    this.isMouseOverNotebookElement = true;
                });

                this.notebookElements.container.addEventListener('mouseleave', () => {
                    this.isMouseOverNotebookElement = false;
                });

                this.notebookElements.closedNotebook.addEventListener('mouseenter', () => {
                    this.isMouseOverNotebookElement = true;
                });

                this.notebookElements.closedNotebook.addEventListener('mouseleave', () => {
                    this.isMouseOverNotebookElement = false;
                });

                // Close button click handler
                this.notebookElements.closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleNotebook();
                });

                // Closed notebook click handler
                this.notebookElements.closedNotebook.addEventListener('click', () => {
                    this.toggleNotebook();
                });

                // Setup species list clicks
                this.notebookElements.speciesList.addEventListener('click', (e) => {
                    if (e.target.classList.contains('species-item') || e.target.classList.contains('species-name')) {
                        const birdName = e.target.textContent.trim().replace(/\s*\(\d+\)$/, '');
                        // Find the bird type based on the name from discovered species
                        const matchingSpecies = this.todaysSpecies.find(species => species.name === birdName);
                        if (matchingSpecies) {
                            this.showNotebookForBird(matchingSpecies.type);
                        } else {
                            // Fallback: try to match by converting name to type
                            const birdType = birdName.toLowerCase().replace(/\s+/g, '').replace('american', '').replace('northern', '');
                            this.showNotebookForBird(birdType);
                        }
                    }
                });

                // Setup scroll detection for right panel
                this.setupScrollDetection();

                // Initialize with empty state since no species are discovered yet
                this.showEmptyState();
            }
            
            setupScrollDetection() {
                const rightPanel = document.querySelector('.notebook-right-panel');
                const leftScrollContainer = document.querySelector('.left-panel-scroll-container');
                let rightScrollTimeout;
                let leftScrollTimeout;
                
                // Right panel scroll detection
                rightPanel.addEventListener('scroll', () => {
                    // Add scrolling class when user scrolls
                    rightPanel.classList.add('scrolling');
                    
                    // Clear existing timeout
                    clearTimeout(rightScrollTimeout);
                    
                    // Remove scrolling class after 1 second of no scrolling
                    rightScrollTimeout = setTimeout(() => {
                        rightPanel.classList.remove('scrolling');
                    }, 1000);
                });
                
                // Left panel scroll detection with page switching
                leftScrollContainer.addEventListener('scroll', () => {
                    // Add scrolling class when user scrolls
                    leftScrollContainer.classList.add('scrolling');
                    
                    // Clear existing timeout
                    clearTimeout(leftScrollTimeout);
                    
                    // Remove scrolling class after 1 second of no scrolling
                    leftScrollTimeout = setTimeout(() => {
                        leftScrollContainer.classList.remove('scrolling');
                    }, 1000);
                    
                    // Handle page switching based on scroll position
                    this.handleLeftPanelScroll();
                });
            }

            toggleNotebook() {
                this.notebookOpen = !this.notebookOpen;

                if (this.notebookOpen) {
                    // Opening: Show closed button fading out, notebook expanding in
                    this.notebookElements.closedNotebook.classList.add('button-hidden');
                    // Small delay to ensure transition triggers
                    setTimeout(() => {
                        this.notebookElements.container.classList.remove('notebook-hidden');
                    }, 10);
                } else {
                    // Closing: Notebook shrinks down, closed button fades in
                    this.notebookElements.container.classList.add('notebook-hidden');
                    setTimeout(() => {
                        this.notebookElements.closedNotebook.classList.remove('button-hidden');
                    }, 10);
                }
            }

            handleLeftPanelScroll() {
                const scrollContainer = this.notebookElements.scrollContainer;
                const scrollTop = scrollContainer.scrollTop;
                const pageHeight = 320; // Height of each page

                // Calculate which page should be visible based on scroll position
                // When a bird is selected, page 0 = bird info (page 2), page 1 = poem (page 3)
                const scrollPage = Math.round(scrollTop / pageHeight);
                const currentPage = this.currentNotebookBird ? scrollPage + 2 : 1;

                console.log('Scroll detected:', { scrollTop, scrollPage, currentPage, hasBird: !!this.currentNotebookBird });

                // Only update if we have a bird selected and are on pages 2 or 3
                if (this.currentNotebookBird && (currentPage === 2 || currentPage === 3)) {
                    this.showPage(currentPage);
                } else if (!this.currentNotebookBird) {
                    // Always show page 1 when no bird is selected
                    this.showPage(1);
                }
            }
            
            showPage(pageNumber) {
                // Skip if we're already on this page to avoid unnecessary DOM manipulation
                if (this.currentPage === pageNumber && this.currentNotebookBird) {
                    return;
                }

                this.currentPage = pageNumber;

                const trainingPage = this.notebookElements.trainingPage;
                const birdInfoPage = this.notebookElements.birdInfoPage;
                const poemPage = this.notebookElements.poemPage;

                // If no bird is selected, hide dots and only show training page
                if (!this.currentNotebookBird) {
                    this.notebookElements.scrollDotsContainer.style.display = 'none';
                    trainingPage.style.display = 'flex';
                    birdInfoPage.style.display = 'none';
                    poemPage.style.display = 'none';
                    return;
                }

                // If bird is selected, show dots and update them
                this.notebookElements.scrollDotsContainer.style.display = 'flex';

                // Update scroll indicator dots (only for pages 2 and 3)
                this.notebookElements.scrollDots.forEach((dot, index) => {
                    const dotPage = parseInt(dot.getAttribute('data-page'));
                    if (dotPage === pageNumber) {
                        dot.classList.add('active');
                    } else {
                        dot.classList.remove('active');
                    }
                });

                // Hide training page and show bird pages
                trainingPage.style.display = 'none';
                birdInfoPage.style.display = 'flex';
                poemPage.style.display = 'flex';

            }
            
            createNotebookData() {
                return {
                    flamingo: {
                        title: "Flamingo Observations",
                        author: "by Iris Martinez",
                        poem: `Soft light fades across the water,<br>
Flamingos depart, necks stretched, wings beating.<br>
Hours spent filtering the shallows,<br>
Now they move as one, painting the sky pink.`,
                        image: "assets/images/notebook/Flamingo drawing.png"
                    },
                    robin: {
                        title: "Morning Robin",
                        author: "by Sarah Williams",
                        poem: `First light breaks, there she is—the robin.<br>
Her song cuts through the morning silence,<br>
Moving with purpose across the lawn,<br>
Red breast catching light, impossible to ignore.`,
                        image: "assets/images/notebook/American Robin.png"
                    },
                    cardinal: {
                        title: "Winter Cardinal",
                        author: "by Michael Chen",
                        poem: `Against winter snow, a living flame.<br>
His song pierces the cold air,<br>
Crest standing tall, a crown of confidence.<br>
Life persists through the harshest seasons.`,
                        image: "assets/images/notebook/Northern Cardinal.png"
                    },
                    bluejay: {
                        title: "Blue Jay Study",
                        author: "by Emma Rodriguez",
                        poem: `The blue jay announces itself with authority,<br>
Voice cutting through the forest canopy.<br>
Blue wings catching sunlight, white markings contrasting,<br>
A master of its woodland domain.`,
                        image: "assets/images/notebook/Bluejay.png"
                    },
                    sparrow: {
                        title: "Little Sparrow",
                        author: "by David Kim",
                        poem: `Small and brown, the sparrow flies,<br>
Quick and nimble, never still.<br>
Common beauty, often missed,<br>
In morning's golden light she's kissed.`,
                        image: "assets/images/notebook/Housesparrow.png"
                    },
                    chickadee: {
                        title: "Chickadee's Song",
                        author: "by Alice Thompson",
                        poem: `Chick-a-dee-dee-dee they say,<br>
Small but mighty, brave and true.<br>
With a cap of midnight blue,<br>
Bringing joy throughout the year.`,
                        image: "assets/images/notebook/Black-capped-chickadee.png"
                    },
                    darkeyedjunco: {
                        title: "Snowbird",
                        author: "by Margaret Williams",
                        poem: `Gray as winter's cloudy sky,<br>
White belly flashing as you fly.<br>
Hopping softly on the ground,<br>
Seeds beneath the snow you've found.<br>
Herald of the colder days,<br>
Snowbird in your winter ways.`,
                        image: "assets/images/notebook/darkeyedjunco.png"
                    },
                    goldfinch: {
                        title: "Golden Flight",
                        author: "by Robert Hayes",
                        poem: `Like sunshine with wings they fly,<br>
Golden finches in the sky.<br>
Dancing through the summer air,<br>
Bright and beautiful beyond compare.<br>
On thistle seeds they love to dine,<br>
These treasures of the bird divine.`,
                        image: "assets/images/notebook/American-Goldfinch.png"
                    },
                    oriole: {
                        title: "Baltimore Beauty",
                        author: "by Sarah Johnson",
                        poem: `Orange bright against the green,<br>
The oriole is rarely seen.<br>
High in branches, sweetly singing,<br>
Spring's arrival it is bringing.<br>
With black and orange, bold and bright,<br>
A flash of color in morning light.`,
                        image: "assets/images/notebook/Baltimore-Oriole.png"
                    },
                    hawk: {
                        title: "Red-Tailed Hunter",
                        author: "by Maria Santos",
                        poem: `High above on thermal's rise,<br>
The hawk surveys with keen, sharp eyes.<br>
Majestic wings spread wide and strong,<br>
A wild and ancient freedom song.<br>
Red tail catches morning light,<br>
A ruler of the endless flight.`,
                        image: "assets/images/notebook/Red-Tailed-Hawk.png"
                    },
                    crow: {
                        title: "The Clever Crow",
                        author: "by James Mitchell",
                        poem: `Black as midnight, smart as can be,<br>
The crow calls from the old oak tree.<br>
With intelligence beyond compare,<br>
They solve problems with cunning care.<br>
In family groups they stick together,<br>
Through every season, every weather.`,
                        image: "assets/images/sprites/bird-spritesheet.png"
                    },
                    hummingbird: {
                        title: "Ruby Jewel",
                        author: "by Lisa Park",
                        poem: `Tiny jewel of emerald green,<br>
The fastest wings I've ever seen.<br>
Hovering at the flower's face,<br>
Moving with impossible grace.<br>
Ruby throat that catches light,<br>
A miracle of nature's flight.`,
                        image: "assets/images/notebook/Ruby-Hummingbird.png"
                    },
                    woodpecker: {
                        title: "The Downy Drummer",
                        author: "by Thomas Wright",
                        poem: `Tap-tap-tap on the old oak tree,<br>
The downy woodpecker works so free.<br>
Black and white with a touch of red,<br>
Nature's carpenter, so well-bred.<br>
Drilling holes with rhythmic beat,<br>
Finding insects, a tasty treat.`,
                        image: "assets/images/notebook/Downy-Woodpecker.png"
                    },
                    duck: {
                        title: "Mallard's Journey",
                        author: "by Catherine Lee",
                        poem: `Green head gleaming in the sun,<br>
The mallard's daily flight begun.<br>
Across the pond with graceful glide,<br>
Orange feet spread far and wide.<br>
From water's edge to sky so blue,<br>
A perfect sight to welcome you.`,
                        image: "assets/images/notebook/Mallard.png"
                    },
                    pelican: {
                        title: "Coastal Voyager",
                        author: "by Marina Rodriguez",
                        poem: `Above the waves with wings spread wide,<br>
The white pelican takes its glide.<br>
With pouch so large and bill so long,<br>
It soars the coast where currents throng.<br>
In graceful dives it claims its meal,<br>
A coastal beauty, wild and real.`,
                        image: "assets/images/notebook/White-pelican-drawing.png"
                    },
                    eagle: {
                        title: "Eagle's Majesty",
                        author: "by Thomas Jefferson",
                        poem: `High above the mountain peak,<br>
The eagle soars with grace unique.<br>
White head gleaming in the sun,<br>
Symbol of the brave and strong.<br>
With talons sharp and eyes so keen,<br>
The noblest bird that's ever seen.`,
                        image: "assets/images/notebook/Bald-Eagle.png"
                    },
                    crow: {
                        title: "Black as Midnight",
                        author: "by Thomas Fletcher",
                        poem: `Black as midnight, smart as can be,<br>
The crow calls out from the old oak tree.<br>
With clever mind and watchful eye,<br>
It sees all beneath the sky.<br>
In groups they gather, bold and loud,<br>
A murder dark against the cloud.`,
                        image: "assets/images/notebook/American-Crow.png"
                    },
                    raven: {
                        title: "The Raven",
                        author: "by Edgar Allan Poe",
                        poem: `Once upon a midnight dreary,<br>
While I pondered, weak and weary,<br>
Over many a quaint and curious volume of forgotten lore,<br>
While I nodded, nearly napping,<br>
Suddenly there came a tapping,<br>
As of some one gently rapping, rapping at my chamber door.`,
                        image: "assets/images/notebook/raven.png"
                    },
                    swallow: {
                        title: "Swift Swallow",
                        author: "by Anna Martinez",
                        poem: `Forked tail cutting through the air,<br>
The swallow darts with graceful flair.<br>
Blue back gleaming in the sun,<br>
Aerial acrobat, never done.<br>
Building nests in barns so high,<br>
Master of the summer sky.`,
                        image: "assets/images/notebook/Barn-Swallow.png"
                    },
                    kingfisher: {
                        title: "Riverside Hunter",
                        author: "by Carlos Rivera",
                        poem: `Perched above the flowing stream,<br>
The kingfisher waits, a hunter's dream.<br>
Blue and white with crest so bold,<br>
Watching waters, patient and cold.<br>
Diving down with lightning speed,<br>
Nature's fisherman, indeed.`,
                        image: "assets/images/notebook/Belted-Kingfisher.png"
                    },
                    stilt: {
                        title: "Wading Elegance",
                        author: "by Rebecca Stone",
                        poem: `On legs of brilliant pink so long,<br>
The stilt walks where the shallows throng.<br>
Black and white against the water bright,<br>
A study in contrasts, bold and light.<br>
With needle bill it sweeps the tide,<br>
Grace and purpose unified.`,
                        image: "assets/images/notebook/Black-necked-Stilt.png"
                    },
                    grebe: {
                        title: "Dance of the Grebe",
                        author: "by Elena Martinez",
                        poem: `Sleek and striking, neck stretched tall,<br>
The grebe performs its courtship call.<br>
Racing across the water's sheen,<br>
Most elegant dance I've ever seen.<br>
Black and white in perfect dress,<br>
A master of the lake's finesse.`,
                        image: "assets/images/illustrations/westerngrebe-illo.png"
                    },
                    goose: {
                        title: "Honking V-Formation",
                        author: "by Jennifer Walsh",
                        poem: `In perfect V they cross the sky,<br>
The Canada geese flying high.<br>
Black head and neck, so proud and strong,<br>
Their honking calls a wild song.<br>
From north to south and back again,<br>
Masters of the migration plan.`,
                        image: "assets/images/notebook/Canada Goose.png"
                    },
                    heron: {
                        title: "Patient Fisher",
                        author: "by Marcus Johnson",
                        poem: `Standing still in shallow water,<br>
The heron waits, a patient daughter.<br>
Long legs wading, neck so long,<br>
Waiting for the fish to come along.<br>
Blue-gray feathers, graceful stance,<br>
Nature's fisherman in a trance.`,
                        image: "assets/images/notebook/Great-Blue-Heron.png"
                    },
                    owl: {
                        title: "Night's Silent Hunter",
                        author: "by Luna Nightshade",
                        poem: `Eyes that pierce the darkest night,<br>
The great horned owl takes its flight.<br>
Silent wings and tufted ears,<br>
Hunting through the midnight years.<br>
Golden eyes that never blink,<br>
Master of the shadows' brink.`,
                        image: "assets/images/notebook/Great-Horned-Owl.png"
                    },
                    vulture: {
                        title: "Sky's Circling Cleaner",
                        author: "by Maya Windrider",
                        poem: `Wings spread wide in circles high,<br>
The turkey vulture owns the sky.<br>
Dark silhouette on thermal's rise,<br>
Red head bare beneath blue skies.<br>
Patient glider, nature's way,<br>
Cleaning earth from decay.`,
                        image: "assets/images/notebook/Turkey-Vulture.png"
                    },
                    grackle: {
                        title: "Iridescent Wanderer",
                        author: "by Carlos Ramirez",
                        poem: `With tail spread long and eyes of gold,<br>
The grackle's swagger, brave and bold.<br>
Purple sheen on feathers black,<br>
A raucous call to call you back.`,
                        image: "assets/images/notebook/great tailed grackle notebook.png"
                    },
                    housefinch: {
                        title: "Backyard Visitor",
                        author: "by Emily Foster",
                        poem: `Cheerful song from the garden tree,<br>
The house finch brings such joy to me.<br>
Red head on the male so bright,<br>
Brown streaked female, subtle light.<br>
At feeders they come every day,<br>
A common beauty in its own way.`,
                        image: "assets/images/notebook/housefinchnotebook.png"
                    },
                    rockdove: {
                        title: "City Companion",
                        author: "by Marcus Thompson",
                        poem: `Gray and blue with iridescent sheen,<br>
The rock dove thrives in urban scene.<br>
On city streets and park benches near,<br>
A familiar friend throughout the year.<br>
Cooing softly in the morning light,<br>
Faithful companion, morning to night.`,
                        image: "assets/images/notebook/RockDove.png"
                    },
                    whitecrownedsparrow: {
                        title: "Crowned Wanderer",
                        author: "by Rachel Winters",
                        poem: `Bold black and white stripes upon its head,<br>
The white-crowned sparrow, proudly bred.<br>
Through brush and bramble it makes its way,<br>
Singing sweetly at break of day.<br>
A traveler from the northern lands,<br>
Gracing us with its striking bands.`,
                        image: "assets/images/notebook/White Crowned Sparrow.png"
                    },
                    plover: {
                        title: "Shore Runner",
                        author: "by Maya Sandstone",
                        poem: `Along the sandy shore so bright,<br>
The snowy plover, pure and white.<br>
Quick feet dancing on the sand,<br>
A tiny jewel of the land.<br>
Between the waves and dunes it runs,<br>
Beneath the warmth of coastal suns.`,
                        image: "assets/images/notebook/Snowy Plover.png"
                    },
                    piedbilledgrebe: {
                        title: "Diving Beauty",
                        author: "by Jordan Rivers",
                        poem: `In quiet ponds where waters still,<br>
The pied-billed grebe displays its skill.<br>
With striped bill and eyes so bright,<br>
It dives below, then out of sight.<br>
A master of the water's realm,<br>
With nature's grace at diving's helm.`,
                        image: "assets/images/notebook/piedbilled grebe.png"
                    },
                    loon: {
                        title: "The Loon's Call",
                        author: "by Thomas Lakewood",
                        poem: `Across the misty morning lake,<br>
The common loon begins to wake.<br>
Its haunting call cuts through the air,<br>
A wild song beyond compare.<br>
Black and white in checkered dress,<br>
A symbol of the wilderness.`,
                        image: "assets/images/notebook/Commonloon.png"
                    },
                    stellersjay: {
                        title: "Mountain Sentinel",
                        author: "by Sierra Pines",
                        poem: `Among the pines, bold and blue,<br>
The Steller's jay comes into view.<br>
With crested head and fearless call,<br>
A mountain spirit, standing tall.<br>
Through forests deep, it swoops and plays,<br>
A jewel of the mountain ways.`,
                        image: "assets/images/notebook/stellersjaynotebook.png"
                    },
                    blackheadedgrosbeak: {
                        title: "Summer Songster",
                        author: "by Robin Meadows",
                        poem: `In orchards green where blossoms grow,<br>
The grosbeak sings from branches low.<br>
With orange breast and ebony crown,<br>
A melody rings through the town.<br>
Sweet warbler of the summer breeze,<br>
A troubadour among the trees.`,
                        image: "assets/images/notebook/Blackheaded grosbeak.png"
                    },
                    mourningdove: {
                        title: "Dawn's Gentle Voice",
                        author: "by Olivia Dawn",
                        poem: `In morning light with mournful coo,<br>
The gentle dove greets morning's dew.<br>
With tapered tail and graceful flight,<br>
A peaceful presence, soft and light.<br>
Through fields and yards its song does flow,<br>
A soothing voice both high and low.`,
                        image: "assets/images/notebook/Mourning Dove.png"
                    },
                    acornwoodpecker: {
                        title: "Keeper of the Oaks",
                        author: "by Oak Valley",
                        poem: `With clownish face and crimson cap,<br>
The acorn woodpecker fills the gap.<br>
In oak tree homes it stores its prize,<br>
Thousands of acorns, organized.<br>
A master hoarder, bold and bright,<br>
A striking bird in black and white.`,
                        image: "assets/images/notebook/acorn woodpecker.png"
                    },
                    spottedtowhee: {
                        title: "Ground Dweller",
                        author: "by Forest Floor",
                        poem: `In undergrowth with scratching sound,<br>
The spotted towhee scours the ground.<br>
With rusty flanks and eyes of red,<br>
It kicks through leaves to find its bread.<br>
A woodland sprite, both bold and shy,<br>
Its "drink-your-tea" call fills the sky.`,
                        image: "assets/images/notebook/Spotted Towhee.png"
                    },
                    westerngull: {
                        title: "Coast Guardian",
                        author: "by Pacific Shores",
                        poem: `Along the rocky coastal line,<br>
The western gull rules maritime.<br>
With yellow bill and piercing cry,<br>
It soars beneath the ocean sky.<br>
A scavenger both bold and free,<br>
The master of the coastal sea.`,
                        image: "assets/images/notebook/Western Gull.png"
                    },
                    cormorant: {
                        title: "Diving Fisher",
                        author: "by Marina Deepwater",
                        poem: `With double crest and emerald eyes,<br>
The cormorant beneath waves flies.<br>
Dark wings spread to dry in sun,<br>
A fisher's work is never done.<br>
Diving deep for silvered prize,<br>
Master of the waterways.`,
                        image: "assets/images/notebook/doublecrested.png"
                    },
                    cedarwaxwing: {
                        title: "Berry Bandit",
                        author: "by Orchard Dawn",
                        poem: `Sleek and crested, masked in black,<br>
The waxwing travels in a pack.<br>
Yellow-tipped tail, a touch of red,<br>
Feasting where the berries spread.<br>
With silky plumage, soft and brown,<br>
The finest dandy in the town.`,
                        image: "assets/images/notebook/Cedar Waxwing.png"
                    },
                    europeanstarling: {
                        title: "Iridescent Invader",
                        author: "by Urban Watch",
                        poem: `From distant shores, the starling came,<br>
With speckled coat and Shakespeare's name.<br>
In flocks they swirl, murmurations dance,<br>
A spectacle of circumstance.<br>
Though common now in every town,<br>
Their beauty cannot be turned down.`,
                        image: "assets/images/notebook/euro starling.png"
                    },
                    cascrubjay: {
                        title: "Bold Blue Thief",
                        author: "by Oak Ridge",
                        poem: `Blue and gray, without a crest,<br>
The scrub-jay raids the acorn nest.<br>
Bold and clever, quick and loud,<br>
A fearless bird, unbowed.<br>
Through chaparral and oak they roam,<br>
California is their home.`,
                        image: "assets/images/notebook/ca scrubjay.png"
                    },
                    redwingedblackbird: {
                        title: "Marshland Guardian",
                        author: "by Wetland Watch",
                        poem: `With scarlet shoulders blazing bright,<br>
The blackbird claims his marshland right.<br>
His konk-la-ree rings loud and clear,<br>
Warning all who venture near.<br>
On cattail thrones through spring they reign,<br>
Masters of the wetland plain.`,
                        image: "assets/images/notebook/Red winged blackbird.png"
                    },
                    brewersblackbird: {
                        title: "Urban Wanderer",
                        author: "by City Naturalist",
                        poem: `With yellow eyes that pierce the day,<br>
Through parking lots and fields they stray.<br>
Glossy black with purple sheen,<br>
The most adaptable bird I've seen.<br>
From mountain pass to city street,<br>
Brewer's blackbird makes life complete.`,
                        image: "assets/images/notebook/brewers blackbird.png"
                    },
                    annashummingbird: {
                        title: "Rose-crowned Jewel",
                        author: "by Garden Observer",
                        poem: `With gorget flashing rose and red,<br>
Through garden blooms the jewel is led.<br>
So swift and small, a blur in flight,<br>
Wings beating faster than our sight.<br>
Year-round this beauty makes its home,<br>
Through western lands it loves to roam.`,
                        image: "assets/images/notebook/anna's hummingbird.png"
                    },
                    bushtit: {
                        title: "Tiny Acrobat",
                        author: "by Branch Watchers",
                        poem: `In restless flocks they bounce and cling,<br>
The smallest songbirds on the wing.<br>
Gray and brown, with beady eyes,<br>
Through twigs and leaves their laughter flies.<br>
Pendulous nests like socks they weave,<br>
In oak and pine they never leave.`,
                        image: "assets/images/notebook/Amerian Bushtit.png"
                    },
                    westernmeadowlark: {
                        title: "Prairie Songster",
                        author: "by Grassland Watcher",
                        poem: `From fence posts high, its flute-like song,<br>
Echoes meadows all day long.<br>
With yellow breast and black V bold,<br>
A treasure worth more than gold.<br>
Through prairie grasses, low it flies,<br>
A symphony beneath the skies.`,
                        image: "assets/images/notebook/westernmeadowlark.png"
                    },
                    longbilledcurlew: {
                        title: "Shore's Sentinel",
                        author: "by Coastal Observer",
                        poem: `With downward bill, impossibly long,<br>
The curlew probes wet sand for song.<br>
In mudflats wide and coastal plains,<br>
Its haunting cry forever reigns.<br>
Cinnamon wings on graceful flight,<br>
A shorebird's ancient, wild delight.`,
                        image: "assets/images/notebook/long billed curlew.png"
                    }
                };
            }
            
            handleCanvasClick(e) {
                if (this.binoculars.isActive) return; // Don't open notebook when using binoculars

                const rect = this.canvas.getBoundingClientRect();
                // Account for pixel ratio in mouse coordinate calculation
                const pixelRatio = window.devicePixelRatio || 1;
                const scaleX = (this.canvas.width / pixelRatio) / rect.width;
                const scaleY = (this.canvas.height / pixelRatio) / rect.height;

                const clickX = (e.clientX - rect.left) * scaleX;
                const clickY = (e.clientY - rect.top) * scaleY;

                // NEW: If in tracking mode, check if click is outside tracking circle
                if (this.quizState.isTracking && this.quizState.lockedBird) {
                    const bird = this.quizState.lockedBird;
                    const distanceFromBird = Math.sqrt(
                        Math.pow(bird.x - clickX, 2) +
                        Math.pow(bird.y - clickY, 2)
                    );
                    const trackingRadius = 200; // Same as in renderTrackingCircle

                    // If click is outside the tracking circle, cancel tracking
                    if (distanceFromBird > trackingRadius) {
                        this.cancelTracking();
                        return;
                    }
                    // If inside circle, don't process other clicks
                    return;
                }

                // Check if click is on a bird
                for (let bird of this.birds) {
                    const distance = Math.sqrt(
                        Math.pow(bird.x - clickX, 2) +
                        Math.pow(bird.y - clickY, 2)
                    );

                    if (distance < bird.size * 1.5) { // Click within bird area
                        if (this.gameSettings.quizMode) {
                            // Quiz mode: lock bird for identification
                            if (!bird.spotted) {
                                this.lockBirdForIdentification(bird);
                            } else {
                                // If already spotted, show notebook
                                this.showNotebookForBird(bird.type);
                            }
                        } else {
                            // Normal mode: open notebook
                            this.showNotebookForBird(bird.type);
                        }
                        break;
                    }
                }
            }
            
            showNotebookForBird(birdType) {
                const birdData = this.notebookData[birdType];
                if (!birdData) {
                    console.warn(`No poem data found for bird type: ${birdType}`);
                    return;
                }

                this.currentNotebookBird = birdType;

                // Find the species data to get the common and scientific names
                const speciesData = this.speciesCatalog.find(s => s.type === birdType);

                // Fade out bird info page during transition
                const birdInfoPage = this.notebookElements.birdInfoPage;
                birdInfoPage.style.opacity = '0';

                // Update content while hidden
                this.notebookElements.birdImage.src = birdData.image;
                this.notebookElements.birdImage.style.display = 'block';

                if (speciesData) {
                    this.notebookElements.birdName.textContent = speciesData.name.toUpperCase() + '.';
                    this.notebookElements.birdScientificName.textContent = speciesData.scientificName || 'Scientific name not available';
                }

                // Fade back in after a brief delay to ensure image has updated
                requestAnimationFrame(() => {
                    birdInfoPage.style.opacity = '1';
                });

                // Update poem content
                if (this.notebookElements.poemTitleDisplay) this.notebookElements.poemTitleDisplay.textContent = birdData.title;
                if (this.notebookElements.poemAuthorDisplay) this.notebookElements.poemAuthorDisplay.textContent = birdData.author;
                if (this.notebookElements.poemTextDisplay) {
                    this.notebookElements.poemTextDisplay.innerHTML = birdData.poem;
                }

                // Hide the poem hawk image
                this.notebookElements.poemHawkImage.style.display = 'none';

                // Detect current page from scroll position to preserve it when switching birds
                const scrollContainer = this.notebookElements.scrollContainer;
                const scrollTop = scrollContainer.scrollTop;
                const pageHeight = 320;
                const scrollPage = Math.round(scrollTop / pageHeight);
                const currentPage = scrollPage + 2; // Convert to page 2 or 3

                // Reset currentPage to force showPage to update the display
                this.currentPage = null;

                // Show the current page (2 or 3) to preserve scroll position
                this.showPage(currentPage >= 2 && currentPage <= 3 ? currentPage : 2);

                // Update species list
                this.updateNotebookSpeciesList();
            }

            // ===== QUIZ MODE METHODS =====


            lockBirdForIdentification(bird) {
                // Clear any pending timeouts from previous identification
                if (this.quizState.focusTimeoutId) {
                    clearTimeout(this.quizState.focusTimeoutId);
                    this.quizState.focusTimeoutId = null;
                }

                this.quizState.lockedBird = bird;
                this.quizState.isIdentifying = true;
                this.quizState.isTracking = true;  // NEW: Enable tracking mode
                this.quizState.attemptedGuesses.clear();

                // Show tracking canvas and bottom input
                this.quizElements.trackingCanvas.style.display = 'block';
                this.quizElements.bottomInput.style.display = 'block';
                document.body.classList.add('quiz-input-active');

                // Clear input and feedback
                this.quizElements.bottomBirdNameInput.value = '';
                this.quizElements.bottomFeedback.innerHTML = '';
                this.quizElements.bottomFeedback.className = 'bottom-feedback-message';
                this.quizElements.bottomSubmitBtn.disabled = true;

                // Focus input with tracked timeout
                this.quizState.focusTimeoutId = setTimeout(() => {
                    if (this.quizElements.bottomBirdNameInput) {
                        this.quizElements.bottomBirdNameInput.focus();
                    }
                    this.quizState.focusTimeoutId = null;
                }, 100);

            }


            submitGuess() {
                const guess = this.quizElements.input.value.trim();
                if (!guess || !this.quizState.lockedBird) return;

                const bird = this.quizState.lockedBird;
                const speciesData = this.speciesCatalog.find(s => s.type === bird.type);
                if (!speciesData) return;

                const normalizedGuess = this.normalizeString(guess);
                const normalizedCommonName = this.normalizeString(speciesData.name);
                const normalizedScientificName = this.normalizeString(speciesData.scientificName);

                // Split bird name into words for flexible matching
                const birdWords = normalizedCommonName.split(' ');
                const guessWords = normalizedGuess.split(' ');

                // Match if:
                // 1. Exact match of full name
                // 2. Any significant word (4+ chars) in the bird name is in the guess
                // 3. Any significant word in the guess matches a word in the bird name
                const isMatch =
                    normalizedGuess === normalizedCommonName ||  // Exact match
                    normalizedGuess === normalizedScientificName ||  // Scientific name exact
                    birdWords.some(word => word.length >= 4 && normalizedGuess.includes(word)) ||  // Bird word in guess
                    guessWords.some(word => word.length >= 4 && normalizedCommonName.includes(word));  // Guess word in bird name

                if (isMatch) {
                    this.handleCorrectIdentification();
                } else {
                    this.handleIncorrectIdentification(guess);
                }
            }


            normalizeString(str) {
                return str.toLowerCase()
                    .replace(/[^\w\s]/g, '') // Remove punctuation
                    .replace(/\s+/g, ' ')     // Normalize whitespace
                    .trim();
            }

            handleCorrectIdentification() {
                const bird = this.quizState.lockedBird;


                // Show correct feedback
                this.quizElements.feedback.innerHTML = `
                    <span class="feedback-icon correct">✓</span>
                    <span>${bird.name}</span>
                `;
                this.quizElements.feedback.className = 'feedback-message correct';

                // Mark bird as spotted and award points
                bird.spotted = true;
                this.birdsSpotted++;
                this.totalScore += bird.points;

                const isNewSpecies = !this.discoveredSpecies.has(bird.type);
                this.discoveredSpecies.add(bird.type);

                // Bonus points for new species
                if (isNewSpecies) {
                    this.totalScore += bird.points * 2;
                }

                // Add to journal
                this.addSpeciesToJournal(bird);

                // Create visual feedback
                this.showScorePopup(bird.x, bird.y, bird.points, isNewSpecies);

                // Switch notebook to show the newly identified bird
                this.showNotebookForBird(bird.type);

                // Close modal after delay with tracked timeout
                if (this.quizState.closeTimeoutId) {
                    clearTimeout(this.quizState.closeTimeoutId);
                }
                this.quizState.closeTimeoutId = setTimeout(() => {
                    this.closeIdentificationModal();
                    this.quizState.closeTimeoutId = null;
                }, 1500);
            }

            handleIncorrectIdentification(guess) {
                // Store the incorrect guess
                this.quizState.attemptedGuesses.add(guess);

                // Show incorrect feedback
                this.quizElements.feedback.innerHTML = `
                    <span class="feedback-icon incorrect">✕</span>
                    <span>${guess}</span>
                `;
                this.quizElements.feedback.className = 'feedback-message incorrect';

                // Clear input for next attempt with tracked timeout
                if (this.quizState.feedbackTimeoutId) {
                    clearTimeout(this.quizState.feedbackTimeoutId);
                }
                this.quizState.feedbackTimeoutId = setTimeout(() => {
                    this.quizElements.input.value = '';
                    this.quizElements.feedback.innerHTML = '';
                    this.quizElements.feedback.className = 'feedback-message';
                    this.quizState.feedbackTimeoutId = null;
                }, 2000);
            }

            closeIdentificationModal() {
                // Clear all pending timeouts to prevent memory leaks and stale callbacks
                if (this.quizState.focusTimeoutId) {
                    clearTimeout(this.quizState.focusTimeoutId);
                    this.quizState.focusTimeoutId = null;
                }
                if (this.quizState.closeTimeoutId) {
                    clearTimeout(this.quizState.closeTimeoutId);
                    this.quizState.closeTimeoutId = null;
                }
                if (this.quizState.feedbackTimeoutId) {
                    clearTimeout(this.quizState.feedbackTimeoutId);
                    this.quizState.feedbackTimeoutId = null;
                }

                // Reset mouse and binocular state to ensure clean state
                this.mouse.isDown = false;
                this.binoculars.isActive = false;
                this.binoculars.zoomLevel = 1.0;
                this.canvas.classList.remove('zoomed');

                this.quizElements.modal.style.display = 'none';
                this.quizState.lockedBird = null;
                this.quizState.isIdentifying = false;
                this.quizState.attemptedGuesses.clear();

                // Stop quiz animation loop
                this.stopQuizAnimation();
            }

            // NEW: Submit guess from tracking mode
            submitTrackingGuess() {
                const guess = this.quizElements.bottomBirdNameInput.value.trim();
                if (!guess || !this.quizState.lockedBird) return;

                const bird = this.quizState.lockedBird;
                const speciesData = this.speciesCatalog.find(s => s.type === bird.type);
                if (!speciesData) return;

                const normalizedGuess = this.normalizeString(guess);
                const normalizedCommonName = this.normalizeString(speciesData.name);
                const normalizedScientificName = this.normalizeString(speciesData.scientificName);

                // Split bird name into words for flexible matching
                const birdWords = normalizedCommonName.split(' ');
                const guessWords = normalizedGuess.split(' ');

                // Match if:
                // 1. Exact match of full name
                // 2. Any significant word (4+ chars) in the bird name is in the guess
                // 3. Any significant word in the guess matches a word in the bird name
                const isMatch =
                    normalizedGuess === normalizedCommonName ||  // Exact match
                    normalizedGuess === normalizedScientificName ||  // Scientific name exact
                    birdWords.some(word => word.length >= 4 && normalizedGuess.includes(word)) ||  // Bird word in guess
                    guessWords.some(word => word.length >= 4 && normalizedCommonName.includes(word));  // Guess word in bird name

                if (isMatch) {
                    this.handleCorrectTrackingIdentification();
                } else {
                    this.handleIncorrectTrackingIdentification(guess);
                }
            }

            // NEW: Handle correct identification in tracking mode
            handleCorrectTrackingIdentification() {
                const bird = this.quizState.lockedBird;

                // Show correct feedback
                this.quizElements.bottomInput.classList.add('success');
                this.quizElements.bottomFeedback.innerHTML = `${bird.name}`;
                this.quizElements.bottomFeedback.className = 'bottom-feedback-message correct';

                // Mark bird as spotted and award points
                bird.spotted = true;
                this.birdsSpotted++;
                this.totalScore += bird.points;

                const isNewSpecies = !this.discoveredSpecies.has(bird.type);
                this.discoveredSpecies.add(bird.type);

                // Bonus points for new species
                if (isNewSpecies) {
                    this.totalScore += bird.points * 2;
                }

                // Add to journal
                this.addSpeciesToJournal(bird);

                // Create visual feedback
                this.showScorePopup(bird.x, bird.y, bird.points, isNewSpecies);

                // Switch notebook to show the newly identified bird
                this.showNotebookForBird(bird.type);

                // Close tracking mode after delay with tracked timeout
                if (this.quizState.closeTimeoutId) {
                    clearTimeout(this.quizState.closeTimeoutId);
                }
                this.quizState.closeTimeoutId = setTimeout(() => {
                    this.cancelTracking();
                    this.quizState.closeTimeoutId = null;
                }, 1500);
            }

            // NEW: Handle incorrect identification in tracking mode
            handleIncorrectTrackingIdentification(guess) {
                // Store the incorrect guess
                this.quizState.attemptedGuesses.add(guess);

                // Show incorrect feedback
                this.quizElements.bottomInput.classList.add('fail');
                this.quizElements.bottomFeedback.innerHTML = `${guess}`;
                this.quizElements.bottomFeedback.className = 'bottom-feedback-message incorrect';

                // Clear input for next attempt with tracked timeout
                if (this.quizState.feedbackTimeoutId) {
                    clearTimeout(this.quizState.feedbackTimeoutId);
                }
                this.quizState.feedbackTimeoutId = setTimeout(() => {
                    this.quizElements.bottomInput.classList.remove('fail');
                    this.quizElements.bottomBirdNameInput.value = '';
                    this.quizElements.bottomFeedback.innerHTML = '';
                    this.quizElements.bottomFeedback.className = 'bottom-feedback-message';
                    this.quizState.feedbackTimeoutId = null;
                }, 2000);
            }

            // NEW: Cancel tracking mode
            cancelTracking() {
                // Clear all pending timeouts
                if (this.quizState.focusTimeoutId) {
                    clearTimeout(this.quizState.focusTimeoutId);
                    this.quizState.focusTimeoutId = null;
                }
                if (this.quizState.closeTimeoutId) {
                    clearTimeout(this.quizState.closeTimeoutId);
                    this.quizState.closeTimeoutId = null;
                }
                if (this.quizState.feedbackTimeoutId) {
                    clearTimeout(this.quizState.feedbackTimeoutId);
                    this.quizState.feedbackTimeoutId = null;
                }

                // Hide tracking UI
                this.quizElements.trackingCanvas.style.display = 'none';
                this.quizElements.bottomInput.style.display = 'none';
                this.quizElements.bottomInput.classList.remove('success', 'fail');
                document.body.classList.remove('quiz-input-active');

                // Clear tracking canvas
                this.trackingCtx.clearRect(0, 0, this.quizElements.trackingCanvas.width, this.quizElements.trackingCanvas.height);

                // Reset state
                this.quizState.lockedBird = null;
                this.quizState.isIdentifying = false;
                this.quizState.isTracking = false;
                this.quizState.attemptedGuesses.clear();
            }

            // NEW: Update tracking state (check if bird flew away)
            updateQuizTracking() {
                if (!this.quizState.isTracking || !this.quizState.lockedBird) return;

                const bird = this.quizState.lockedBird;

                // Check if bird has flown off-screen (removed from birds array)
                if (!this.birds.includes(bird)) {
                    // Bird flew away - cancel tracking
                    this.cancelTracking();
                }
            }

            // NEW: Render tracking circle following the bird
            renderTrackingCircle() {
                if (!this.quizState.lockedBird || !this.trackingCtx) return;

                const bird = this.quizState.lockedBird;
                const ctx = this.trackingCtx;
                const canvas = this.quizElements.trackingCanvas;

                // Clear previous frame
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const centerX = bird.x;
                const centerY = bird.y;
                const radius = 200; // 400px diameter circle

                // Calculate dynamic zoom based on bird size
                // Small birds (8-15): 2.5x zoom
                // Medium birds (15-30): 1.8x zoom
                // Large birds (30+): 1.3x zoom
                let zoomLevel;
                if (bird.size < 15) {
                    zoomLevel = 2.5;
                } else if (bird.size < 30) {
                    zoomLevel = 1.8;
                } else {
                    zoomLevel = 1.3;
                }

                // 1) Draw background section in the circle
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.clip();

                // Draw background zoomed dynamically based on bird size
                ctx.translate(centerX, centerY);
                ctx.scale(zoomLevel, zoomLevel);
                ctx.translate(-centerX, -centerY);

                // Draw background image section
                if (this.isBackgroundLoaded) {
                    const imgW = this.backgroundImage.naturalWidth || this.backgroundImage.width;
                    const imgH = this.backgroundImage.naturalHeight || this.backgroundImage.height;
                    const scaleX = this.canvasWidth / imgW;
                    const scaleY = this.canvasHeight / imgH;
                    const scale = Math.max(scaleX, scaleY);
                    const scaledW = imgW * scale;
                    const scaledH = imgH * scale;
                    const offsetX = (this.canvasWidth - scaledW) / 2;
                    const offsetY = (this.canvasHeight - scaledH) / 2;
                    ctx.drawImage(this.backgroundImage, offsetX, offsetY, scaledW, scaledH);
                }

                // 2) Draw the bird zoomed at its current position
                this.drawBirdOnCanvas(ctx, bird, bird.x, bird.y);

                ctx.restore();

                // 3) Draw circle border/mask
                const ringGradient = ctx.createRadialGradient(centerX, centerY, radius - 6, centerX, centerY, radius + 1);
                ringGradient.addColorStop(0, 'rgba(139, 69, 19, 0.9)'); // Brown like binoculars
                ringGradient.addColorStop(1, 'rgba(101, 50, 15, 0.95)');

                ctx.strokeStyle = ringGradient;
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();

                // Inner highlight ring
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius - 8, 0, Math.PI * 2);
                ctx.stroke();
            }

            updateIdentificationCanvas() {
                if (!this.quizState.lockedBird || !this.identificationCtx) return;

                const bird = this.quizState.lockedBird;
                const ctx = this.identificationCtx;
                const canvas = this.quizElements.canvas;

                // Complete canvas reset - clear everything
                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#87CEEB';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();

                // Draw background (simplified)
                if (this.isBackgroundLoaded) {
                    ctx.drawImage(this.backgroundImage,
                        bird.x - 200, bird.y - 200, 400, 400,
                        0, 0, 400, 400);
                }

                // Draw bird centered
                const centerX = canvas.width / 2;
                const centerY = canvas.height / 2;

                // Use sprite if available
                this.drawBirdOnCanvas(ctx, bird, centerX, centerY);
            }

            drawBirdOnCanvas(ctx, bird, x, y) {
                // Simplified bird drawing for identification canvas
                ctx.save();
                ctx.translate(x, y);

                if (bird.direction === 'left') {
                    ctx.scale(-1, 1);
                }

                // Draw bird sprite or fallback
                const spriteSheet = this.getSpriteSheetForBird(bird);
                if (spriteSheet && spriteSheet.complete) {
                    const frameIndex = bird.frameIndex || 0;
                    const cols = this.getSpriteColsForBird(bird);
                    const rows = this.getSpriteRowsForBird(bird);
                    const frameW = spriteSheet.width / cols;
                    const frameH = spriteSheet.height / rows;
                    const frameX = (frameIndex % cols) * frameW;
                    const frameY = Math.floor(frameIndex / cols) * frameH;

                    // Make all birds much bigger in identification modal
                    const sizeMultiplier = (bird.type === 'flamingo' || bird.type === 'grebe' || bird.type === 'goose') ? 8 : 10;
                    const baseSize = bird.size * sizeMultiplier;

                    // Maintain aspect ratio of the sprite frame
                    const aspectRatio = frameW / frameH;
                    const renderedWidth = aspectRatio >= 1 ? baseSize : baseSize * aspectRatio;
                    const renderedHeight = aspectRatio >= 1 ? baseSize / aspectRatio : baseSize;

                    ctx.drawImage(spriteSheet,
                        frameX, frameY, frameW, frameH,
                        -renderedWidth/2, -renderedHeight/2, renderedWidth, renderedHeight);
                } else {
                    // Fallback circle - make it bigger too
                    const fallbackSizeMultiplier = (bird.type === 'flamingo' || bird.type === 'grebe' || bird.type === 'goose') ? 8 : 10;
                    const renderedRadius = bird.size * fallbackSizeMultiplier / 2;
                    ctx.fillStyle = bird.color || '#8B4513';
                    ctx.beginPath();
                    ctx.arc(0, 0, renderedRadius, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }

            getSpriteSheetForBird(bird) {
                const typeMap = {
                    'flamingo': this.flamingoSpriteSheet,
                    'robin': this.robinSpriteSheet,
                    'cardinal': this.cardinalSpriteSheet,
                    'woodpecker': this.woodpeckerSpriteSheet,
                    'duck': this.mallardSpriteSheet,
                    'goldfinch': this.goldfinchSpriteSheet,
                    'pelican': this.pelicanSpriteSheet,
                    'bluejay': this.bluejaySpriteSheet,
                    'chickadee': this.chickadeeSpriteSheet,
                    'darkeyedjunco': this.darkeyedjuncoSpriteSheet,
                    'eagle': this.baldeagleSpriteSheet,
                    'crow': this.crowSpriteSheet,
                    'goose': this.gooseSpriteSheet,
                    'hawk': this.hawkSpriteSheet,
                    'hummingbird': this.hummingbirdSpriteSheet,
                    'heron': this.heronSpriteSheet,
                    'owl': this.owlSpriteSheet,
                    'oriole': this.oriolSpriteSheet,
                    'raven': this.ravenSpriteSheet,
                    'kingfisher': this.kingfisherSpriteSheet,
                    'vulture': this.vultureSpriteSheet,
                    'stilt': this.stiltSpriteSheet,
                    'grebe': this.grebeSpriteSheet,
                    'grackle': this.grackleSpriteSheet,
                    'housefinch': this.housefinchSpriteSheet,
                    'rockdove': this.rockdoveSpriteSheet,
                    'whitecrownedsparrow': this.whitecrownedsparrowSpriteSheet,
                    'plover': this.ploverSpriteSheet,
                    'piedbilledgrebe': this.piedbilledgrebeSpriteSheet,
                    'loon': this.loonSpriteSheet,
                    'stellersjay': this.stellersjaySpriteSheet,
                    'blackheadedgrosbeak': this.blackheadedgrosbeakSpriteSheet,
                    'mourningdove': this.mourningdoveSpriteSheet,
                    'acornwoodpecker': this.acornwoodpeckerSpriteSheet,
                    'spottedtowhee': this.spottedtowheeSpriteSheet,
                    'westerngull': this.westerngullSpriteSheet,
                    'brewersblackbird': this.brewersblackbirdSpriteSheet,
                    'longbilledcurlew': this.longbilledcurlewSpriteSheet
                };
                return typeMap[bird.type] || this.spriteSheet;
            }

            getSpriteColsForBird(bird) {
                const colsMap = {
                    'flamingo': 4, 'robin': 4, 'cardinal': 3, 'woodpecker': 4,
                    'duck': 4, 'goldfinch': 4, 'pelican': 4, 'bluejay': 4,
                    'chickadee': 4, 'eagle': 6, 'crow': 5, 'goose': 4,
                    'hawk': 6, 'hummingbird': 4, 'heron': 5, 'owl': 5,
                    'oriole': 5, 'raven': 4, 'kingfisher': 4, 'vulture': 4, 'stilt': 4,
                    'grebe': 4, 'grackle': 4, 'housefinch': 4, 'rockdove': 4, 'whitecrownedsparrow': 4,
                    'plover': 4, 'piedbilledgrebe': 4, 'loon': 4,
                    'stellersjay': 4, 'blackheadedgrosbeak': 4, 'mourningdove': 4, 'acornwoodpecker': 4,
                    'spottedtowhee': 4, 'westerngull': 4, 'brewersblackbird': 4, 'longbilledcurlew': 4
                };
                return colsMap[bird.type] || 4;
            }

            getSpriteRowsForBird(bird) {
                const rowsMap = {
                    'flamingo': 4, 'robin': 4, 'cardinal': 3, 'woodpecker': 4,
                    'duck': 4, 'goldfinch': 4, 'pelican': 4, 'bluejay': 4,
                    'chickadee': 4, 'eagle': 6, 'crow': 5, 'goose': 4,
                    'hawk': 6, 'hummingbird': 4, 'heron': 5, 'owl': 5,
                    'oriole': 5, 'raven': 4, 'kingfisher': 4, 'vulture': 4, 'stilt': 4,
                    'grebe': 4, 'grackle': 4, 'housefinch': 4, 'rockdove': 4, 'whitecrownedsparrow': 4,
                    'plover': 4, 'piedbilledgrebe': 4, 'loon': 4,
                    'stellersjay': 4, 'blackheadedgrosbeak': 4, 'mourningdove': 4, 'acornwoodpecker': 4,
                    'spottedtowhee': 4, 'westerngull': 4, 'brewersblackbird': 4, 'longbilledcurlew': 4
                };
                return rowsMap[bird.type] || 4;
            }

            startQuizAnimation() {
                if (this.quizAnimationId) {
                    cancelAnimationFrame(this.quizAnimationId);
                }
                
                // Initialize animation state
                this.quizAnimTime = 0;
                this.quizLastFrame = -1;
                
                // Start efficient frame-based animation
                const animate = () => {
                    if (this.quizState.isIdentifying && this.quizState.lockedBird) {
                        this.updateQuizBirdAnimation();
                        this.quizAnimationId = requestAnimationFrame(animate);
                    }
                };
                
                this.quizAnimationId = requestAnimationFrame(animate);
                console.log('Quiz mode: Frame-based animation started');
            }

            stopQuizAnimation() {
                if (this.quizAnimationId) {
                    cancelAnimationFrame(this.quizAnimationId);
                    this.quizAnimationId = null;
                }
                console.log('Quiz mode: Animation stopped');
            }

            updateQuizBirdAnimation() {
                // Disable animation to prevent ghosting artifacts
                // Static bird is better than ghosted animation
                return;
            }

            // ===== END QUIZ MODE METHODS =====

            scrollToPage(pageNumber) {
                const scrollContainer = this.notebookElements.scrollContainer;
                const pageHeight = 320; // Height of each page
                const targetScrollTop = (pageNumber - 1) * pageHeight;
                
                scrollContainer.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth'
                });
            }
            
            updateNotebookSpeciesList() {
                const speciesList = this.notebookElements.speciesList;

                // Check if we need to rebuild the list (new species added or list is empty)
                const existingItems = speciesList.querySelectorAll('.species-item');
                const needsRebuild = existingItems.length !== this.todaysSpecies.length;

                if (needsRebuild) {
                    // Full rebuild needed
                    speciesList.innerHTML = '';

                    // Show empty state if no species discovered yet
                    if (this.todaysSpecies.length === 0) {
                        this.showEmptyState();
                        return;
                    }

                    // Add discovered species
                    this.todaysSpecies.forEach((species, index) => {
                        const item = document.createElement('div');
                        item.className = 'species-item';
                        item.dataset.birdType = species.type;
                        if (species.type === this.currentNotebookBird) {
                            item.classList.add('active');
                        }

                        const nameDiv = document.createElement('div');
                        nameDiv.className = 'species-name';
                        nameDiv.textContent = species.count > 1 ? `${species.name} (${species.count})` : species.name;
                        item.appendChild(nameDiv);
                        speciesList.appendChild(item);

                        // Add divider after each item except the last one
                        if (index < this.todaysSpecies.length - 1) {
                            const divider = document.createElement('div');
                            divider.className = 'species-divider';
                            speciesList.appendChild(divider);
                        }
                    });
                } else {
                    // Update active state and counts without full rebuild
                    let activeItem = null;
                    existingItems.forEach((item, index) => {
                        const species = this.todaysSpecies[index];

                        // Update active state
                        if (species.type === this.currentNotebookBird) {
                            item.classList.add('active');
                            activeItem = item;
                        } else {
                            item.classList.remove('active');
                        }

                        // Update count text if it changed
                        const nameDiv = item.querySelector('.species-name');
                        const newText = species.count > 1 ? `${species.name} (${species.count})` : species.name;
                        if (nameDiv && nameDiv.textContent !== newText) {
                            nameDiv.textContent = newText;
                        }
                    });

                    // Auto-scroll to show the active item
                    if (activeItem) {
                        activeItem.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                            inline: 'nearest'
                        });
                    }
                }

                // Species count removed from UI
                // this.notebookElements.speciesCount.textContent =
                //     `${this.todaysSpecies.length} species`;
                
                // Update date in short format (M/D/YY)
                const month = this.currentDate.getMonth() + 1;
                const day = this.currentDate.getDate();
                const year = this.currentDate.getFullYear().toString().slice(-2);
                this.notebookElements.date.textContent = `${month}/${day}/${year}`;
            }

            showEmptyState() {
                // Switch to training section to show the guide content
                this.showNotebookGuide();
                
                // Show training page (page 1) and scroll to it
                this.showPage(1);
                this.scrollToPage(1);
                
                // Show the hawk image for empty state
                this.notebookElements.poemHawkImage.style.display = 'block';

                // Hide the bird image for empty state
                this.notebookElements.birdImage.style.display = 'none';

                // Species count removed from UI
                // this.notebookElements.speciesCount.textContent = "0 species";
                
                // Use today's date in short format (M/D/YY)
                const month = this.currentDate.getMonth() + 1;
                const day = this.currentDate.getDate();
                const year = this.currentDate.getFullYear().toString().slice(-2);
                this.notebookElements.date.textContent = `${month}/${day}/${year}`;
                
                const speciesList = this.notebookElements.speciesList;
                speciesList.innerHTML = '';
            }
            
            showNotebookGuide() {
                // Update left panel to show the bird spotting guide
                this.notebookElements.title.textContent = "How to spot birds";
                this.notebookElements.author.textContent = "";
                // The training content is now static in the HTML, so we don't need to update the text
            }

            handleResize() {
                // Update canvas size to match new viewport
                this.updateCanvasSize();

                // Get device pixel ratio for crisp rendering
                const pixelRatio = window.devicePixelRatio || 1;

                // Set canvas size accounting for pixel ratio
                this.canvas.width = this.canvasWidth * pixelRatio;
                this.canvas.height = this.canvasHeight * pixelRatio;

                // Scale the canvas context to account for pixel ratio
                this.ctx.scale(pixelRatio, pixelRatio);

                // Enable image smoothing for better scaling
                this.ctx.imageSmoothingEnabled = true;

                // Update canvas style to fill the entire viewport
                this.canvas.style.width = '100vw';
                this.canvas.style.height = '100vh';

                // Update tracking canvas size to match viewport
                if (this.quizElements.trackingCanvas) {
                    this.quizElements.trackingCanvas.width = this.canvasWidth * pixelRatio;
                    this.quizElements.trackingCanvas.height = this.canvasHeight * pixelRatio;
                    this.trackingCtx.scale(pixelRatio, pixelRatio);
                    this.trackingCtx.imageSmoothingEnabled = true;
                }
            }
            
            update(currentTime) {
                this.deltaTime = currentTime - this.lastTime;
                this.lastTime = currentTime;
                this.frameCount++;

                if (this.frameCount % 60 === 0) {
                    this.fps = Math.round(1000 / this.deltaTime);
                }

                this.updateBinoculars();
                this.updateBirds();
                this.updateParticles();
                this.updateQuizTracking();  // NEW: Update tracking circle

                this.birdSpawnTimer += this.deltaTime;
                if (this.birdSpawnTimer >= this.birdSpawnInterval) {
                    this.spawnBird();
                    this.birdSpawnTimer = 0;
                    this.birdSpawnInterval = 4000 + Math.random() * 6000;
                }

                this.checkBirdSpotting();
                this.updateUI();

                // Note: updateIdentificationCanvas is now only called when needed
                // (when bird is locked, not every frame) - this fixes Safari freezing
            }
            
            updateUI() {
                if (this.uiElements.binocularStatus) {
                    this.uiElements.binocularStatus.textContent = this.binoculars.isActive ? 'Active' : 'Ready';
                }
                this.uiElements.birdCount.textContent = this.birdsSpotted;
                // Count only spawnable species (weight > 0)
                const spawnableSpeciesCount = this.speciesCatalog.filter(s => s.weight > 0).length;
                this.uiElements.mousePos.textContent = `${this.discoveredSpecies.size}/${spawnableSpeciesCount}`;
                this.uiElements.scoreDisplay.textContent = this.totalScore.toLocaleString();
            }
            
            updateBinoculars() {
                this.binoculars.x = this.mouse.x;
                this.binoculars.y = this.mouse.y;
            }
            
            spawnBird() {
                // Weighted random selection from species catalog
                const totalWeight = this.speciesCatalog.reduce((sum, s) => sum + s.weight, 0);
                let roll = Math.random() * totalWeight;
                let selected = this.speciesCatalog[0];
                for (let i = 0; i < this.speciesCatalog.length; i++) {
                    const s = this.speciesCatalog[i];
                    if (roll < s.weight) { selected = s; break; }
                    roll -= s.weight;
                }

                const minSize = selected.minSize;
                const maxSize = selected.maxSize;
                const minSpeed = selected.minSpeed;
                const maxSpeed = selected.maxSpeed;
                const birdName = selected.name;

                // Eagles fly in the top 20% of the screen
                const screenHeight = this.frameBounds.bottom - this.frameBounds.top;
                const yRange = selected.type === 'eagle'
                    ? screenHeight * 0.2  // Top 20% for eagles
                    : screenHeight - 100;  // Full height for other birds

                const bird = {
                    id: Date.now() + Math.random(),
                    x: this.frameBounds.left - 50,
                    y: this.frameBounds.top + Math.random() * yRange,
                    velocityX: minSpeed + Math.random() * (maxSpeed - minSpeed),
                    velocityY: (Math.random() - 0.5) * 20,
                    type: selected.type,
                    name: birdName,
                    points: selected.points,
                    size: minSize + Math.random() * (maxSize - minSize),
                    wingPhase: Math.random() * Math.PI * 2,
                    spotted: false,
                    timeAlive: 0,
                    color: selected.color,
                    flightPattern: selected.flightPattern,
                    // sprite animation state (for sprite sheet rendering)
                    animTime: 0,
                    frameIndex: selected.type === 'flamingo'
                        ? Math.floor(Math.random() * (this.flamingoSpriteTotalFrames || 1))
                        : selected.type === 'robin'
                        ? Math.floor(Math.random() * (this.robinSpriteTotalFrames || 1))
                        : selected.type === 'cardinal'
                        ? Math.floor(Math.random() * (this.cardinalSpriteTotalFrames || 1))
                        : selected.type === 'woodpecker'
                        ? Math.floor(Math.random() * (this.woodpeckerSpriteTotalFrames || 1))
                        : selected.type === 'bluejay'
                        ? Math.floor(Math.random() * (this.bluejaySpriteTotalFrames || 1))
                        : selected.type === 'hawk'
                        ? Math.floor(Math.random() * (this.hawkSpriteTotalFrames || 1))
                        : selected.type === 'goose'
                        ? Math.floor(Math.random() * (this.gooseSpriteTotalFrames || 1))
                        : selected.type === 'heron'
                        ? Math.floor(Math.random() * (this.heronSpriteTotalFrames || 1))
                        : selected.type === 'eagle'
                        ? Math.floor(Math.random() * (this.baldeagleSpriteTotalFrames || 1))
                        : selected.type === 'stilt'
                        ? Math.floor(Math.random() * (this.stiltSpriteTotalFrames || 1))
                        : selected.type === 'housefinch'
                        ? Math.floor(Math.random() * (this.housefinchSpriteTotalFrames || 1))
                        : selected.type === 'rockdove'
                        ? Math.floor(Math.random() * (this.rockdoveSpriteTotalFrames || 1))
                        : selected.type === 'whitecrownedsparrow'
                        ? Math.floor(Math.random() * (this.whitecrownedsparrowSpriteTotalFrames || 1))
                        : Math.floor(Math.random() * (this.spriteTotalFrames || 1))
                };
                
                this.birds.push(bird);
                console.log(`🐦 ${birdName} spawned!`);
            }
            
            updateBirds() {
                this.birds.forEach(bird => {
                    bird.timeAlive += this.deltaTime / 1000;
                    // Advance sprite animation time
                    bird.animTime += this.deltaTime / 1000;
                    if (bird.type === 'flamingo' && this.flamingoSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.flamingoSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.flamingoSpriteTotalFrames;
                    } else if (bird.type === 'robin' && this.robinSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.robinSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.robinSpriteTotalFrames;
                    } else if (bird.type === 'cardinal' && this.cardinalSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.cardinalSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.cardinalSpriteTotalFrames;
                    } else if (bird.type === 'woodpecker' && this.woodpeckerSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.woodpeckerSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.woodpeckerSpriteTotalFrames;
                    } else if (bird.type === 'hawk' && this.hawkSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.hawkSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.hawkSpriteTotalFrames;
                    } else if (bird.type === 'goose' && this.gooseSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.gooseSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.gooseSpriteTotalFrames;
                    } else if (bird.type === 'heron' && this.heronSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.heronSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.heronSpriteTotalFrames;
                    } else if (bird.type === 'stilt' && this.stiltSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.stiltSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.stiltSpriteTotalFrames;
                    } else if (bird.type === 'grebe' && this.grebeSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.grebeSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.grebeSpriteTotalFrames;
                    } else if (bird.type === 'grackle' && this.grackleSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.grackleSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.grackleSpriteTotalFrames;
                    } else if (bird.type === 'housefinch' && this.housefinchSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.housefinchSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.housefinchSpriteTotalFrames;
                    } else if (bird.type === 'rockdove' && this.rockdoveSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.rockdoveSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.rockdoveSpriteTotalFrames;
                    } else if (bird.type === 'whitecrownedsparrow' && this.whitecrownedsparrowSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.whitecrownedsparrowSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.whitecrownedsparrowSpriteTotalFrames;
                    } else if (bird.type === 'plover' && this.ploverSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.ploverSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.ploverSpriteTotalFrames;
                    } else if (bird.type === 'piedbilledgrebe' && this.piedbilledgrebeSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.piedbilledgrebeSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.piedbilledgrebeSpriteTotalFrames;
                    } else if (bird.type === 'loon' && this.loonSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.loonSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.loonSpriteTotalFrames;
                    } else if (bird.type === 'darkeyedjunco' && this.darkeyedjuncoSpriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.darkeyedjuncoSpriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.darkeyedjuncoSpriteTotalFrames;
                    } else if (this.spriteTotalFrames) {
                        const advance = Math.max(1, Math.floor(this.spriteAnimFps * bird.animTime));
                        bird.frameIndex = advance % this.spriteTotalFrames;
                    }
                    
                    // Apply flight patterns
                    const t = bird.timeAlive;
                    switch (bird.flightPattern) {
                        case 'sineFast':
                            bird.velocityY = Math.sin(t * 2.0) * 15; break;
                        case 'sineSlow':
                            bird.velocityY = Math.sin(t * 1.0) * 12; break;
                        case 'sineVerySlow':
                            bird.velocityY = Math.sin(t * 0.5) * 10; break;
                        case 'dart':
                            if (Math.random() < 0.2) bird.velocityY = (Math.random() - 0.5) * 80; break;
                        case 'flutter':
                            bird.velocityY = Math.sin(t * 6.0) * 8 + (Math.random() - 0.5) * 6; break;
                        case 'bounce':
                            bird.velocityY = Math.sin(t * 3.5) * 14; break;
                        case 'swoop':
                            bird.velocityY = Math.sin(t * 1.8) * 20; break;
                        case 'zigzag':
                            bird.velocityY = (Math.sin(t * 3) > 0 ? 1 : -1) * 20; break;
                        case 'glide':
                            bird.velocityY = Math.sin(t * 0.6) * 6; break;
                        case 'smooth':
                            bird.velocityY = Math.sin(t * 0.4) * 8; break;
                        case 'majestic':
                            bird.velocityY = Math.sin(t * 0.3) * 6; break;
                        case 'slowFlap':
                            bird.velocityY = Math.sin(t * 0.7) * 8; break;
                        case 'vGlide':
                            bird.velocityY = Math.sin(t * 0.5) * 7; break;
                        case 'seaGlide':
                            bird.velocityY = Math.sin(t * 0.4) * 9; break;
                        case 'hoverDive':
                            if (Math.random() < 0.08) bird.velocityY = (Math.random() - 0.5) * 120; break;
                        case 'hover':
                            if (Math.random() < 0.1) bird.velocityY = (Math.random() - 0.5) * 60; break;
                        default:
                            // 'steady' or unknown: keep current velocityY
                            break;
                    }
                    
                    // Update position with 20% slower speed
                    bird.x += bird.velocityX * 0.8 * (this.deltaTime / 1000);
                    bird.y += bird.velocityY * 0.8 * (this.deltaTime / 1000);
                    
                    // Constrain birds within frame boundaries
                    if (bird.y < this.frameBounds.top) {
                        bird.y = this.frameBounds.top;
                        bird.velocityY = Math.abs(bird.velocityY); // Bounce off top
                    } else if (bird.y > this.frameBounds.bottom) {
                        bird.y = this.frameBounds.bottom;
                        bird.velocityY = -Math.abs(bird.velocityY); // Bounce off bottom
                    }
                    
                    // Birds fly naturally without fade effects

                    bird.wingPhase += 10 * (this.deltaTime / 1000);
                });
                
                // Remove birds that have flown past the right edge of the frame
                this.birds = this.birds.filter(bird => {
                    const isOffscreen = bird.x >= this.frameBounds.right + 50;

                    // Don't remove locked birds in quiz mode - let them continue flying
                    if (this.quizState.lockedBird === bird) {
                        return true;  // Keep the bird in the array
                    }

                    return !isOffscreen;
                });
            }
            
            // Particle System
            updateParticles() {
                this.particles = this.particles.filter(particle => {
                    const dt = this.deltaTime / 1000;

                    // Apply gravity and gentle drag for falling firework effect
                    const gravity = particle.isText ? 0 : (particle.gravity || 200);
                    const drag = particle.isText ? 1.0 : (particle.drag || 0.98);

                    // Handle ring particles (non-flashing, expanding and fading)
                    if (particle.ring) {
                        particle.size += (particle.expandSpeed || 60) * dt;
                        particle.life -= dt;
                        const t = Math.max(0, particle.life / particle.maxLife);
                        particle.alpha = Math.pow(t, 1.4);
                        return particle.life > 0;
                    }

                    particle.velocityY += gravity * dt;
                    particle.velocityX *= drag;
                    particle.velocityY *= drag;

                    particle.x += particle.velocityX * dt;
                    particle.y += particle.velocityY * dt;

                    particle.life -= dt;
                    const t = Math.max(0, particle.life / particle.maxLife);
                    // Gentler fade for text to stay legible a bit longer
                    const fadePower = particle.isText ? 1.1 : 2.5;
                    particle.alpha = Math.pow(t, fadePower);
                    
                    return particle.life > 0;
                });
            }
            
            createSpottingParticles(x, y, isNewSpecies) {
                const particleCount = isNewSpecies ? 18 : 10;
                const colors = isNewSpecies
                    ? [this.palette.gold, '#D8B76A', '#B7923A']
                    : [this.palette.leaf, '#6E9D7A', '#8BB193'];

                for (let i = 0; i < particleCount; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = (isNewSpecies ? 65 : 45) + Math.random() * (isNewSpecies ? 55 : 35);

                    this.particles.push({
                        x: x,
                        y: y,
                        velocityX: Math.cos(angle) * speed,
                        velocityY: Math.sin(angle) * speed - Math.random() * 20,
                        size: (isNewSpecies ? 3.5 : 2.5) + Math.random() * (isNewSpecies ? 3 : 2),
                        color: colors[Math.floor(Math.random() * colors.length)],
                        life: 1.9 + Math.random() * 0.9,
                        maxLife: 2.6 + Math.random() * 0.8,
                        alpha: 1,
                        isText: false
                    });
                }
            }
            
            showScorePopup(x, y, points, isNewSpecies) {
                const totalPoints = isNewSpecies ? points * 3 : points;

				this.particles.push({
                    x: x,
                    y: y - 60,
                    velocityX: 0,
                    velocityY: -22,
					size: this.textPopupSize,
                    color: this.palette.date,
                    life: 2.0,
                    maxLife: 2.0,
                    alpha: 1,
                    isText: true,
                    text: `+${totalPoints}`
                });

                if (isNewSpecies) {
					this.particles.push({
                        x: x,
                        y: y - 88,
                        velocityX: 0,
                        velocityY: -18,
						size: this.textPopupSize,
                        color: this.palette.date,
                        life: 1.5,
                        maxLife: 1.5,
                        alpha: 1,
                        isText: true,
                    	text: 'New species!'
                    });
                }
            }
            
            drawParticles() {
                const ctx = this.ctx;

                this.particles.forEach(particle => {
                    ctx.save();
                    ctx.globalAlpha = particle.alpha;

                    if (particle.isText) {
                        ctx.fillStyle = particle.color;
                        ctx.font = `600 ${particle.size}px "Caveat", cursive`;
                        ctx.textAlign = 'center';
                        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
                        ctx.lineWidth = 2;
                        ctx.strokeText(particle.text, particle.x, particle.y);
                        ctx.fillText(particle.text, particle.x, particle.y);
                    } else if (particle.ring) {
                        // subtle expanding ring, no flashing
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.strokeStyle = particle.stroke || this.palette.softInk;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                        ctx.stroke();
                    } else {
                        // watercolor blot with multiply blend
                        ctx.globalCompositeOperation = 'multiply';

                        const r = particle.size;
                        const grad = ctx.createRadialGradient(particle.x, particle.y, r * 0.1, particle.x, particle.y, r);
                        grad.addColorStop(0, particle.color);
                        grad.addColorStop(1, 'rgba(0,0,0,0)');

                        ctx.fillStyle = grad;
                        ctx.beginPath();
                        ctx.arc(particle.x, particle.y, r, 0, Math.PI * 2);
                        ctx.fill();

                        // subtle ink edge
                        ctx.globalCompositeOperation = 'source-over';
                        ctx.strokeStyle = 'rgba(45,45,45,0.15)';
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }

                    ctx.restore();
                });
            }
            
            checkBirdSpotting() {
                // In quiz mode, binoculars only zoom, they don't auto-spot
                if (!this.binoculars.isActive || this.gameSettings.quizMode) return;

                const detectionRadius = this.binoculars.viewRadius * 0.6;
                
                this.birds.forEach(bird => {
                    if (bird.spotted) return;
                    
                    const distance = Math.sqrt(
                        Math.pow(bird.x - this.binoculars.x, 2) + 
                        Math.pow(bird.y - this.binoculars.y, 2)
                    );
                    
                    if (distance < detectionRadius) {
                        bird.spotted = true;
                        this.birdsSpotted++;
                        this.totalScore += bird.points;
                        
                        const isNewSpecies = !this.discoveredSpecies.has(bird.type);
                        this.discoveredSpecies.add(bird.type);
                        
                        // Bonus points for new species
                        if (isNewSpecies) {
                            this.totalScore += bird.points * 2; // Double points bonus
                        }
                        
                        // Add to bird journal
                        this.addSpeciesToJournal(bird);

                        // Show the bird in the notebook
                        this.showNotebookForBird(bird.type);

                        console.log(`✅ ${bird.name} spotted! (+${bird.points} points)`);
                        if (isNewSpecies) {
                            console.log(`🎉 NEW SPECIES DISCOVERED: ${bird.name}! (+${bird.points * 2} bonus points)`);
                        }

                        // Show score popup
                        this.showScorePopup(bird.x, bird.y, bird.points, isNewSpecies);
                    }
                });
            }
            
            render() {
                // Clear canvas with transparent background to show CSS background
                this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

                if (this.binoculars.isActive) {
                    this.renderBinocularView();
                } else {
                    this.renderNormalView();
                }

                // NEW: Render tracking circle if in tracking mode
                if (this.quizState.isTracking) {
                    this.renderTrackingCircle();
                }
            }
            
            renderNormalView() {
                this.drawBackground();
                this.drawBirds();
                this.drawParticles();
                this.drawCursor();
            }
            
            renderBinocularView() {
                const ctx = this.ctx;
                const centerX = this.binoculars.x;
                const centerY = this.binoculars.y;
                const radius = this.binoculars.viewRadius;

                // 1) Draw normal (unzoomed) background and birds to main canvas
                this.drawBackground();
                this.drawBirds();

                // 2) Draw zoomed scene to offscreen canvas (PERFORMANCE: avoid redrawing background/birds twice)
                const offCtx = this.offscreenCtx;
                offCtx.save();
                offCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

                // Apply zoom transformation on offscreen canvas
                offCtx.translate(centerX, centerY);
                offCtx.scale(this.binoculars.zoomLevel, this.binoculars.zoomLevel);
                offCtx.translate(-centerX, -centerY);

                // Draw zoomed background and birds to offscreen canvas
                const tempCtx = this.ctx;
                this.ctx = offCtx;
                this.drawBackground();
                this.drawBirds();
                this.ctx = tempCtx;

                offCtx.restore();

                // 3) Copy circular region from offscreen canvas to main canvas
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(this.offscreenCanvas, 0, 0);
                ctx.restore();

                // 4) Draw particles clipped to scope but NOT zoomed
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.clip();
                this.drawParticles();
                ctx.restore();

                // 5) HUD/overlays on top (not zoomed) - only draw if binoculars are still active
                if (this.binoculars.isActive) {
                    this.drawBinocularMask();
                }
            }
            
            drawBinocularMask() {
                const ctx = this.ctx;
                const centerX = this.binoculars.x;
                const centerY = this.binoculars.y;
                const radius = this.binoculars.viewRadius;

                // Remove semi-transparent feathered vignette around scope for a cleaner look

                // ink ring, thinner and desaturated
                const ringGradient = ctx.createRadialGradient(centerX, centerY, radius - 6, centerX, centerY, radius + 1);
                ringGradient.addColorStop(0, 'rgba(30,30,30,0.9)');
                ringGradient.addColorStop(1, 'rgba(20,20,20,0.95)');

                ctx.strokeStyle = ringGradient;
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();

                // inner highlight ring (very subtle)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius - 7, 0, Math.PI * 2);
                ctx.stroke();

                // zoom label in journal font
                ctx.fillStyle = this.palette.softInk;
                ctx.font = '600 14px "Cormorant", serif';
                ctx.textAlign = 'center';
                ctx.strokeStyle = 'rgba(245, 240, 230, 0.7)';
                ctx.lineWidth = 2;
                ctx.strokeText(`${this.binoculars.zoomLevel.toFixed(1)}x`, centerX, centerY + radius + 20);
                ctx.fillText(`${this.binoculars.zoomLevel.toFixed(1)}x`, centerX, centerY + radius + 20);
            }
            
            drawBackground() {
                const ctx = this.ctx;
                if (this.isBackgroundLoaded) {
                    const imgW = this.backgroundImage.naturalWidth || this.backgroundImage.width;
                    const imgH = this.backgroundImage.naturalHeight || this.backgroundImage.height;
                    
                    // Use "cover" approach - maintain aspect ratio but fill entire canvas
                    const scale = Math.max(this.canvasWidth / imgW, this.canvasHeight / imgH);
                    const drawW = imgW * scale;
                    const drawH = imgH * scale;
                    const offsetX = (this.canvasWidth - drawW) / 2;
                    const offsetY = (this.canvasHeight - drawH) / 2;
                    
                    ctx.drawImage(this.backgroundImage, 0, 0, imgW, imgH, offsetX, offsetY, drawW, drawH);
                }
            }
            
            drawHandDrawnBackground() {
                const ctx = this.ctx;
                
                // Clean, simple sky - just the off-white background
                // No gradients or extra effects
                
                // Draw elegant, distant mountain silhouettes
                this.drawMountainSilhouettes();
                
                // Draw a curated selection of beautiful trees
                this.drawArtisticTrees();
                
                // Simple, clean ground line
                this.drawCleanGround();
                
                // Add a few subtle details
                this.drawMinimalDetails();
            }
            
            drawMountainSilhouettes() {
                const ctx = this.ctx;
                ctx.strokeStyle = '#d0d0d0'; // Very light gray
                ctx.lineWidth = 1.5;
                ctx.lineCap = 'round';
                
                // Far distant mountains (very light)
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.moveTo(0, this.canvasHeight * 0.35);
                ctx.quadraticCurveTo(200, this.canvasHeight * 0.25, 400, this.canvasHeight * 0.3);
                ctx.quadraticCurveTo(600, this.canvasHeight * 0.35, 800, this.canvasHeight * 0.28);
                ctx.quadraticCurveTo(1000, this.canvasHeight * 0.32, 1200, this.canvasHeight * 0.3);
                ctx.stroke();
                
                // Mid-distance mountains
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = '#b0b0b0';
                ctx.beginPath();
                ctx.moveTo(0, this.canvasHeight * 0.45);
                ctx.quadraticCurveTo(300, this.canvasHeight * 0.35, 600, this.canvasHeight * 0.4);
                ctx.quadraticCurveTo(900, this.canvasHeight * 0.38, 1200, this.canvasHeight * 0.42);
                ctx.stroke();
                
                ctx.globalAlpha = 1.0;
            }
            
            drawArtisticTrees() {
                const ctx = this.ctx;
                ctx.strokeStyle = '#2d2d2d';
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                const groundLevel = this.canvasHeight * 0.8;
                
                // Carefully positioned trees for artistic composition
                const trees = [
                    { x: 150, height: 160, type: 'tall_pine', prominent: true },
                    { x: 220, height: 120, type: 'pine' },
                    { x: 320, height: 140, type: 'deciduous' },
                    { x: 500, height: 180, type: 'tall_pine', prominent: true },
                    { x: 580, height: 100, type: 'pine' },
                    { x: 750, height: 130, type: 'deciduous' },
                    { x: 950, height: 170, type: 'tall_pine', prominent: true },
                    { x: 1050, height: 110, type: 'pine' }
                ];
                
                trees.forEach(tree => {
                    if (tree.type === 'tall_pine') {
                        this.drawTallPine(tree.x, groundLevel, tree.height, tree.prominent);
                    } else if (tree.type === 'pine') {
                        this.drawSimplePine(tree.x, groundLevel, tree.height);
                    } else {
                        this.drawSimpleDeciduous(tree.x, groundLevel, tree.height);
                    }
                });
            }
            
            drawTallPine(x, groundY, height, prominent = false) {
                const ctx = this.ctx;
                
                // Trunk
                ctx.lineWidth = prominent ? 3 : 2;
                ctx.beginPath();
                ctx.moveTo(x, groundY);
                ctx.lineTo(x, groundY - height * 0.25);
                ctx.stroke();
                
                // Pine layers - elegant and sparse
                const layers = prominent ? 6 : 4;
                for (let i = 0; i < layers; i++) {
                    const layerY = groundY - (height * 0.15) - (height * 0.7 * i / layers);
                    const layerWidth = (height * 0.3) - (i * height * 0.04);
                    
                    ctx.lineWidth = prominent ? 2 : 1.5;
                    ctx.beginPath();
                    
                    // Create organic, hand-drawn pine shape
                    ctx.moveTo(x - layerWidth/2, layerY);
                    const segments = 8;
                    for (let j = 0; j <= segments; j++) {
                        const segmentX = x - layerWidth/2 + (layerWidth * j / segments);
                        const peak = j === segments/2;
                        const segmentY = layerY - (peak ? height * 0.08 : 0) + Math.sin(j * 0.8) * 3;
                        ctx.lineTo(segmentX, segmentY);
                    }
                    ctx.stroke();
                }
            }
            
            drawSimplePine(x, groundY, height) {
                const ctx = this.ctx;
                ctx.lineWidth = 1.5;
                
                // Simple trunk
                ctx.beginPath();
                ctx.moveTo(x, groundY);
                ctx.lineTo(x, groundY - height * 0.2);
                ctx.stroke();
                
                // Simple triangular pine shape
                ctx.beginPath();
                ctx.moveTo(x, groundY - height * 0.85);
                ctx.lineTo(x - height * 0.15, groundY - height * 0.3);
                ctx.lineTo(x + height * 0.15, groundY - height * 0.3);
                ctx.closePath();
                ctx.stroke();
                
                // Second layer
                ctx.beginPath();
                ctx.moveTo(x, groundY - height * 0.65);
                ctx.lineTo(x - height * 0.12, groundY - height * 0.15);
                ctx.lineTo(x + height * 0.12, groundY - height * 0.15);
                ctx.closePath();
                ctx.stroke();
            }
            
            drawSimpleDeciduous(x, groundY, height) {
                const ctx = this.ctx;
                ctx.lineWidth = 2;
                
                // Trunk
                ctx.beginPath();
                ctx.moveTo(x, groundY);
                ctx.lineTo(x, groundY - height * 0.4);
                ctx.stroke();
                
                // Simple branches
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, groundY - height * 0.3);
                ctx.quadraticCurveTo(x - 15, groundY - height * 0.5, x - 25, groundY - height * 0.7);
                ctx.moveTo(x, groundY - height * 0.35);
                ctx.quadraticCurveTo(x + 12, groundY - height * 0.55, x + 20, groundY - height * 0.75);
                ctx.stroke();
                
                // Elegant leaf crown - simple irregular circle
                const crownY = groundY - height * 0.7;
                const radius = height * 0.25;
                
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                
                // Hand-drawn irregular circle with 8 points
                const points = [
                    [x + radius * 0.9, crownY - radius * 0.2],
                    [x + radius * 0.6, crownY - radius * 0.8],
                    [x + radius * 0.1, crownY - radius * 1.0],
                    [x - radius * 0.4, crownY - radius * 0.9],
                    [x - radius * 0.9, crownY - radius * 0.3],
                    [x - radius * 0.8, crownY + radius * 0.4],
                    [x - radius * 0.2, crownY + radius * 0.8],
                    [x + radius * 0.5, crownY + radius * 0.6],
                ];
                
                points.forEach(([px, py], i) => {
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.closePath();
                ctx.stroke();
            }
            
            drawCleanGround() {
                const ctx = this.ctx;
                const groundLevel = this.canvasHeight * 0.8;
                
                // Single, clean ground line
                ctx.strokeStyle = '#2d2d2d';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, groundLevel);
                ctx.lineTo(this.canvasWidth, groundLevel);
                ctx.stroke();
            }
            
            drawMinimalDetails() {
                const ctx = this.ctx;
                const groundLevel = this.canvasHeight * 0.8;
                
                // Just a few small grass tufts in key spots
                const grassSpots = [
                    { x: 280, y: groundLevel },
                    { x: 650, y: groundLevel },
                    { x: 900, y: groundLevel }
                ];
                
                ctx.strokeStyle = '#2d2d2d';
                ctx.lineWidth = 1;
                
                grassSpots.forEach(spot => {
                    for (let i = 0; i < 5; i++) {
                        ctx.beginPath();
                        const grassX = spot.x + (i - 2) * 4;
                        ctx.moveTo(grassX, spot.y);
                        ctx.lineTo(grassX + Math.sin(i) * 2, spot.y - 6 - Math.random() * 3);
                        ctx.stroke();
                    }
                });
                
                // Add one or two small clouds - very simple
                ctx.strokeStyle = '#d0d0d0';
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.4;
                
                // Simple cloud shapes
                this.drawSimpleCloud(300, 120, 0.8);
                this.drawSimpleCloud(800, 100, 1.0);
                
                ctx.globalAlpha = 1.0;
            }
            
            drawSimpleCloud(x, y, scale) {
                const ctx = this.ctx;
                
                // Very simple cloud outline
                ctx.beginPath();
                ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
                ctx.arc(x + 25 * scale, y, 30 * scale, 0, Math.PI * 2);
                ctx.arc(x + 50 * scale, y, 25 * scale, 0, Math.PI * 2);
                ctx.arc(x + 25 * scale, y - 15 * scale, 25 * scale, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            isMouseOverNotebook() {
                // Simple bounds check using viewport coordinates
                // Notebook is positioned: bottom: 20px, right: 20px, width: 500px, height: 320px
                const notebookLeft = window.innerWidth - 520;  // right margin + width
                const notebookRight = window.innerWidth - 20;  // right margin
                const notebookTop = window.innerHeight - 340;  // bottom margin + height
                const notebookBottom = window.innerHeight - 20; // bottom margin

                // Convert canvas mouse coordinates to viewport coordinates
                const viewportX = (this.mouse.x / this.canvasWidth) * window.innerWidth;
                const viewportY = (this.mouse.y / this.canvasHeight) * window.innerHeight;

                return viewportX >= notebookLeft &&
                       viewportX <= notebookRight &&
                       viewportY >= notebookTop &&
                       viewportY <= notebookBottom;
            }

            updateCursorStyle() {
                if (this.isMouseOverNotebook()) {
                    // Show normal cursor when over notebook
                    document.body.style.cursor = 'auto';
                    this.canvas.style.cursor = 'auto';
                } else {
                    // Hide cursor when not over notebook (let custom binoculars show)
                    document.body.style.cursor = 'none';
                    this.canvas.style.cursor = 'none';
                }
            }

            drawCursor() {
                if (!this.binoculars.isActive && this.isBinocsLoaded && !this.isMouseOverNotebookElement) {
                    const ctx = this.ctx;
                    ctx.save();

                    // Draw binoculars image at mouse position with proper aspect ratio
                    const scale = 1; // Scale factor for the binoculars
                    const width = this.binocsImage.naturalWidth * scale;
                    const height = this.binocsImage.naturalHeight * scale;

                    ctx.drawImage(
                        this.binocsImage,
                        this.mouse.x - width/2,
                        this.mouse.y - height/2,
                        width,
                        height
                    );

                    ctx.restore();
                }
            }
            
            drawBirds() {
                const ctx = this.ctx;

                this.birds.forEach(bird => {
                    ctx.save();
                    ctx.translate(bird.x, bird.y);

                    const size = bird.size;
                    const wingFlap = Math.sin(bird.wingPhase) * 0.3;

                    // Scale the sprite based on bird size
                    const scale = size / 15; // Base size is 15, so scale accordingly (doubled from 30)
                    ctx.scale(scale, scale);

                    // Apply wing flapping animation by scaling vertically
                    ctx.scale(1, 1 + wingFlap * 0.2);

                    // Apply species-specific rotation adjustments
                    if (bird.type === 'cedarwaxwing') {
                        ctx.rotate(-25 * Math.PI / 180); // Rotate 25 degrees left (counterclockwise)
                    }

                    // PERFORMANCE: Use O(1) sprite lookup table instead of O(n) if-else chain
                    const spriteInfo = this.spriteConfig[bird.type];
                    if (spriteInfo && this[spriteInfo.loaded]) {
                        // Get sprite data from lookup table
                        const spriteSheet = this[spriteInfo.sheet];
                        const cols = this[spriteInfo.cols];
                        const rows = this[spriteInfo.rows];
                        const destHeight = spriteInfo.height;

                        // Calculate frame position
                        const frameW = spriteSheet.width / cols;
                        const frameH = spriteSheet.height / rows;
                        const frameIndex = bird.frameIndex % (cols * rows);
                        const sx = (frameIndex % cols) * frameW;
                        const sy = Math.floor(frameIndex / cols) * frameH;

                        // Draw frame maintaining aspect ratio
                        const aspectRatio = frameW / frameH;
                        const destWidth = destHeight * aspectRatio;
                        ctx.drawImage(spriteSheet, sx, sy, frameW, frameH, -destWidth/2, -destHeight/2, destWidth, destHeight);
                    } else if (this.isSpriteSheetLoaded) {
                        const cols = this.spriteSheetCols;
                        const rows = this.spriteSheetRows;
                        const frameW = this.spriteSheet.width / cols;
                        const frameH = this.spriteSheet.height / rows;
                        const frameIndex = bird.frameIndex % (cols * rows);
                        const sx = (frameIndex % cols) * frameW;
                        const sy = Math.floor(frameIndex / cols) * frameH;
                        // Draw frame maintaining aspect ratio
                        const aspectRatio = frameW / frameH;
                        const destHeight = 80;
                        const destWidth = destHeight * aspectRatio;
                        ctx.drawImage(this.spriteSheet, sx, sy, frameW, frameH, -destWidth/2, -destHeight/2, destWidth, destHeight);
                    } else if (this.spriteImages[bird.type]) {
                        // Fallback to original SVG sprite per species
                        ctx.drawImage(this.spriteImages[bird.type], -40, -30, 80, 60);
                    } else {
                        // Fallback to simple shape if sprite not loaded yet
                        this.drawFallbackBird(bird, size);
                    }
                    
                    // No flashing effect anymore
                    
                    ctx.restore();
                });
            }

            drawFallbackBird(bird, size) {
                // Simple fallback bird shape if sprites aren't loaded yet
                const ctx = this.ctx;
                
                // Set bird color based on catalog or fallback by known types
                if (bird.color) {
                    ctx.fillStyle = bird.color;
                } else if (bird.type === 'robin') {
                    ctx.fillStyle = '#CD853F';
                } else if (bird.type === 'bluejay') {
                    ctx.fillStyle = '#4169E1';
                } else if (bird.type === 'cardinal') {
                    ctx.fillStyle = '#DC143C';
                } else if (bird.type === 'hummingbird') {
                    ctx.fillStyle = '#228B22';
                } else if (bird.type === 'hawk') {
                    ctx.fillStyle = '#8B4513';
                } else if (bird.type === 'flamingo') {
                    ctx.fillStyle = '#FF69B4';
                } else {
                    ctx.fillStyle = '#8B4513';
                }
                
                // Simple body
                ctx.beginPath();
                ctx.ellipse(0, 0, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                // Simple head
                ctx.beginPath();
                ctx.arc(size * 0.6, -size * 0.2, size * 0.4, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
            
            createBirdSprites() {
                // Create SVG bird sprites for each bird type
                this.birdSprites = {
                    robin: this.createRobinSprite(),
                    bluejay: this.createBluejaySprite(),
                    cardinal: this.createCardinalSprite(),
                    sparrow: this.createSparrowSprite(),
                    chickadee: this.createChickadeeSprite(),
                    goldfinch: this.createGoldfinchSprite(),
                    swallow: this.createSwallowSprite(),
                    oriole: this.createOrioleSprite(),
                    woodpecker: this.createWoodpeckerSprite(),
                    crow: this.createCrowSprite(),
                    raven: this.createRavenSprite(),
                    owl: this.createOwlSprite(),
                    eagle: this.createEagleSprite(),
                    duck: this.createDuckSprite(),
                    pelican: this.createPelicanSprite(),
                    kingfisher: this.createKingfisherSprite(),
                    flamingo: null // Using PNG sprite instead
                };

                // Convert SVG strings to images
                Object.keys(this.birdSprites).forEach(birdType => {
                    if (birdType === 'flamingo') {
                        // Load PNG sprite for flamingo
                        const img = new Image();
                        img.onload = () => {
                            this.spriteImages[birdType] = img;
                        };
                        img.src = 'assets/images/sprites/flamingo.png'; // Your PNG sprite file
                    } else {
                        // Load SVG sprites for other birds
                        const svgString = this.birdSprites[birdType];
                        const img = new Image();
                        img.onload = () => {
                            this.spriteImages[birdType] = img;
                        };
                        img.src = 'data:image/svg+xml;base64,' + btoa(svgString);
                    }
                });
            }

            createRobinSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 24 C20 16, 32 16, 40 20 C32 26, 20 28, 12 24" fill="#CD853F"/>
                        <circle cx="42" cy="18" r="6" fill="#CD853F"/>
                        <path d="M22 18 Q16 10 8 12 Q12 18 20 22" fill="#8B4513"/>
                        <path d="M16 22 L8 20 M16 24 L8 26"/>
                        <path d="M44 18 L49 17"/>
                        <circle cx="40" cy="16" r="1.5" fill="#2d2d2d"/>
                        <ellipse cx="20" cy="22" rx="4" ry="3" fill="#A0522D" stroke="#2d2d2d" stroke-width="1"/>
                    </g>
                </svg>
                `;
            }

            createBluejaySprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 24 C20 16, 32 16, 40 20 C32 26, 20 28, 12 24" fill="#4169E1"/>
                        <circle cx="42" cy="18" r="6" fill="#4169E1"/>
                        <path d="M42 12 L38 8 L44 9 Z" fill="#1E3A8A"/>
                        <path d="M22 18 Q16 10 8 12 Q12 18 20 22" fill="#1E3A8A"/>
                        <path d="M10 12 L14 12 M8 16 L12 16" stroke="#fff" stroke-width="1"/>
                        <path d="M16 22 L8 20 M16 24 L8 26"/>
                        <path d="M44 18 L49 17"/>
                        <circle cx="40" cy="16" r="1.5" fill="#2d2d2d"/>
                    </g>
                </svg>
                `;
            }

            createCardinalSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 24 C20 16, 32 16, 40 20 C32 26, 20 28, 12 24" fill="#DC143C"/>
                        <circle cx="42" cy="18" r="6" fill="#DC143C"/>
                        <path d="M42 12 L36 6 L46 7 Z" fill="#8B0000"/>
                        <path d="M22 18 Q16 10 8 12 Q12 18 20 22" fill="#8B0000"/>
                        <path d="M16 22 L8 20 M16 24 L8 26"/>
                        <path d="M44 18 L49 17" stroke="#FFD700"/>
                        <circle cx="40" cy="16" r="1.5" fill="#2d2d2d"/>
                    </g>
                </svg>
                `;
            }

            createHummingbirdSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <ellipse cx="26" cy="20" rx="8" ry="5" fill="#228B22"/>
                        <circle cx="31" cy="18" r="4" fill="#228B22"/>
                        <path d="M33 18 L46 17" stroke="#FFD700"/>
                        <path d="M20 18 Q12 6 6 12 Q10 20 18 22" fill="#006400"/>
                        <path d="M18 20 L10 18 M18 22 L10 24 M18 20 L8 20"/>
                        <circle cx="33" cy="17" r="1" fill="#2d2d2d"/>
                    </g>
                </svg>
                `;
            }

            createHawkSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <ellipse cx="26" cy="20" rx="15" ry="10" fill="#8B4513"/>
                        <circle cx="38" cy="16" r="7" fill="#8B4513"/>
                        <path d="M12 16 Q4 6 -1 10 Q4 20 12 26" fill="#654321"/>
                        <path d="M4 8 L8 8 M2 12 L6 12 M1 16 L5 16"/>
                        <path d="M10 20 L0 18 M10 22 L0 24 M10 20 L0 20"/>
                        <path d="M40 16 L46 15 L44 17 Z" fill="#FFD700" stroke="#2d2d2d" stroke-width="1"/>
                        <circle cx="38" cy="14" r="1.6" fill="#2d2d2d"/>
                    </g>
                </svg>
                `;
            }

            // Line-drawn style sprites for remaining species
            createSparrowSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g fill="none" stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22 C18 16, 28 16, 34 20 C28 24, 18 26, 12 22" fill="#8B7355"/>
                            <circle cx="38" cy="18" r="4" fill="#8B7355"/>
                            <path d="M40 18 L46 17"/>
                            <circle cx="39" cy="17" r="1" fill="#2d2d2d"/>
                            <path d="M20 18 Q14 14 8 16 Q12 20 18 22"/>
                            <path d="M14 22 L8 21 M14 24 L8 25"/>
                        </g>
                    </svg>
                `;
            }

            createChickadeeSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g fill="none" stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 22 C20 16, 30 16, 34 20 C28 24, 20 26, 14 22" fill="#c9c9c9"/>
                            <circle cx="36" cy="18" r="4" fill="#3C3C3C"/>
                            <path d="M36 14 C34 16, 40 16, 38 18" fill="#111"/>
                            <path d="M38 18 L43 17"/>
                            <circle cx="39" cy="17" r="1" fill="#2d2d2d"/>
                            <path d="M18 18 Q12 12 6 16 Q10 20 16 22"/>
                        </g>
                    </svg>
                `;
            }

            createGoldfinchSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 22 C20 16, 30 16, 36 20 C30 24, 20 26, 14 22" fill="#FFD700"/>
                            <circle cx="38" cy="18" r="4" fill="#000"/>
                            <path d="M38 18 L44 17" stroke="#2d2d2d"/>
                            <circle cx="39" cy="17" r="1" fill="#fff"/>
                            <path d="M20 18 Q14 14 8 16 Q12 20 18 22" fill="#000"/>
                            <path d="M14 22 L8 21 M14 24 L8 25"/>
                        </g>
                    </svg>
                `;
            }

            createSwallowSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g fill="none" stroke="#1E3A8A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22 C22 14, 34 14, 44 20"/>
                            <path d="M30 18 Q20 8 10 12"/>
                            <path d="M16 24 L8 20 M16 24 L8 28"/>
                        </g>
                        <circle cx="44" cy="20" r="3" fill="#1E3A8A" stroke="#2d2d2d" stroke-width="1"/>
                        <path d="M46 20 L52 19" stroke="#2d2d2d" stroke-width="1.5"/>
                    </svg>
                `;
            }

            createOrioleSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 22 C22 16, 32 16, 38 20 C32 24, 22 26, 14 22" fill="#FF8C00"/>
                            <circle cx="40" cy="18" r="4" fill="#111"/>
                            <path d="M40 18 L46 17"/>
                            <circle cx="41" cy="17" r="1" fill="#fff"/>
                            <path d="M20 18 Q14 12 8 14 Q12 20 18 22" fill="#111"/>
                        </g>
                    </svg>
                `;
            }

            createWoodpeckerSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M16 24 C22 18, 30 18, 36 22 C30 26, 22 28, 16 24" fill="#d9d9d9"/>
                            <circle cx="38" cy="20" r="4" fill="#2F4F4F"/>
                            <path d="M38 16 L34 12 L40 14 Z" fill="#DC143C"/>
                            <path d="M40 20 L46 19"/>
                            <path d="M22 20 Q18 12 12 10"/>
                        </g>
                    </svg>
                `;
            }

            createCrowSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="#111111">
                            <path d="M14 22 C22 16, 34 16, 42 20 C34 24, 22 26, 14 22"/>
                            <circle cx="44" cy="18" r="5"/>
                        </g>
                        <path d="M46 18 L52 17" stroke="#2d2d2d" stroke-width="1.5"/>
                        <circle cx="45" cy="17" r="1" fill="#fff"/>
                    </svg>
                `;
            }

            createRavenSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="#0B0B0B">
                            <path d="M12 24 C22 16, 36 16, 46 20 C36 26, 22 28, 12 24"/>
                            <circle cx="48" cy="18" r="5"/>
                        </g>
                        <path d="M50 18 L56 17" stroke="#2d2d2d" stroke-width="1.5"/>
                        <circle cx="49" cy="17" r="1" fill="#fff"/>
                    </svg>
                `;
            }

            createOwlSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <ellipse cx="28" cy="22" rx="14" ry="10" fill="#6B4423"/>
                            <circle cx="36" cy="16" r="5" fill="#6B4423"/>
                            <circle cx="34" cy="15" r="2.2" fill="#fff"/>
                            <circle cx="38" cy="15" r="2.2" fill="#fff"/>
                            <circle cx="34" cy="15" r="1" fill="#111"/>
                            <circle cx="38" cy="15" r="1" fill="#111"/>
                            <path d="M36 18 L40 20 L36 20 Z" fill="#FFD700"/>
                            <path d="M16 22 Q12 16 8 14"/>
                        </g>
                    </svg>
                `;
            }

            createEagleSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10 22 C22 14, 38 14, 50 22" fill="#5C4033"/>
                            <circle cx="50" cy="20" r="6" fill="#5C4033"/>
                            <path d="M52 20 L58 19 L56 21 Z" fill="#FFD700" stroke="#2d2d2d" stroke-width="1"/>
                            <circle cx="52" cy="18" r="1.2" fill="#111"/>
                            <path d="M22 18 Q12 10 6 12"/>
                        </g>
                    </svg>
                `;
            }

            createHeronSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g fill="none" stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 24 C24 18, 36 18, 48 22"/>
                            <path d="M46 20 C42 16, 50 14, 56 16"/>
                            <path d="M48 22 L55 21"/>
                            <circle cx="48" cy="20" r="5" fill="#6A7FA0" stroke="#2d2d2d"/>
                            <path d="M22 20 Q16 12 8 10"/>
                        </g>
                    </svg>
                `;
            }

            createDuckSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <ellipse cx="26" cy="22" rx="16" ry="10" fill="#2E8B57"/>
                            <circle cx="40" cy="18" r="5" fill="#2E8B57"/>
                            <path d="M42 18 L48 19 L42 21 Z" fill="#FFA500" stroke="#2d2d2d" stroke-width="1"/>
                            <circle cx="42" cy="17" r="1" fill="#111"/>
                            <path d="M18 26 Q16 28 14 28"/>
                        </g>
                    </svg>
                `;
            }

            createGooseSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <ellipse cx="26" cy="22" rx="18" ry="10" fill="#4B3F2F"/>
                            <circle cx="42" cy="18" r="6" fill="#4B3F2F"/>
                            <path d="M44 18 L50 19 L44 21 Z" fill="#FFA500" stroke="#2d2d2d" stroke-width="1"/>
                            <circle cx="44" cy="17" r="1.2" fill="#111"/>
                            <path d="M18 26 Q16 28 14 28" fill="none" stroke="#2d2d2d" stroke-width="1.5"/>
                        </g>
                    </svg>
                `;
            }

            createPelicanSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <ellipse cx="26" cy="22" rx="18" ry="11" fill="#F5F5F5"/>
                            <circle cx="44" cy="18" r="6" fill="#F5F5F5"/>
                            <path d="M44 19 L56 19 L48 22 Z" fill="#FFD700" stroke="#2d2d2d" stroke-width="1"/>
                            <circle cx="45" cy="17" r="1.2" fill="#111"/>
                            <path d="M12 24 Q20 18 32 18 Q44 18 52 22" fill="none"/>
                        </g>
                    </svg>
                `;
            }

            createKingfisherSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22 C20 16, 32 16, 40 20 C32 24, 20 26, 12 22" fill="#4682B4"/>
                            <circle cx="42" cy="18" r="5" fill="#4682B4"/>
                            <path d="M44 18 L54 17"/>
                            <circle cx="44" cy="17" r="1.1" fill="#111"/>
                            <path d="M38 14 L34 10 L40 12 Z" fill="#1E3A8A"/>
                        </g>
                    </svg>
                `;
            }

            
            gameLoop(currentTime) {
                if (!this.isRunning) return;
                
                this.update(currentTime);
                this.render();
                
                requestAnimationFrame((time) => this.gameLoop(time));
            }
            
            start() {
                this.isRunning = true;
                this.handleResize();
                console.log('🎮 Birdwatching Game Started!');
                requestAnimationFrame((time) => this.gameLoop(time));
            }
            
            stop() {
                this.isRunning = false;
                console.log('🎮 Game Stopped');
            }
        }
        
        // Initialize game
        const game = new BirdwatchingGame();
        
        window.addEventListener('load', () => {
            game.start();
        });
        
        window.addEventListener('keydown', (e) => {
            // Don't trigger pause if typing in quiz mode input
            if ((e.key === 'p' || e.key === 'P') && !game.quizState.isIdentifying) {
                if (game.isRunning) {
                    game.stop();
                } else {
                    game.start();
                }
            }

            // ESC key to close identification modal
            if (e.key === 'Escape' && game.quizState.isIdentifying) {
                game.closeIdentificationModal();
            }
        });


