
        class BirdwatchingGame {
            constructor() {
                this.canvas = document.getElementById('gameCanvas');
                this.ctx = this.canvas.getContext('2d');
                
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
                    viewRadius: 120,
                    x: 0,
                    y: 0
                };
                
                // Bird system
                this.birds = [];
                this.birdSpawnTimer = 0;
                this.birdSpawnInterval = 3000;
                this.birdsSpotted = 0;
                this.discoveredSpecies = new Set();
                this.totalScore = 0;

                // Species catalog (20 species total)
                this.speciesCatalog = [
                    // Common backyard birds
                    { type: 'robin',        name: 'American Robin',            weight: 14, points: 10, minSize: 15, maxSize: 25, minSpeed: 50,  maxSpeed: 100, color: '#CD853F',  flightPattern: 'steady' },
                    { type: 'bluejay',      name: 'Blue Jay',                  weight: 10, points: 15, minSize: 18, maxSize: 28, minSpeed: 70,  maxSpeed: 120, color: '#4169E1',  flightPattern: 'sineFast' },
                    { type: 'cardinal',     name: 'Northern Cardinal',         weight: 8,  points: 25, minSize: 16, maxSize: 24, minSpeed: 40,  maxSpeed: 80,  color: '#DC143C',  flightPattern: 'steady' },
                    { type: 'sparrow',      name: 'House Sparrow',             weight: 12, points: 12, minSize: 12, maxSize: 18, minSpeed: 80,  maxSpeed: 130, color: '#8B7355',  flightPattern: 'dart' },
                    { type: 'chickadee',    name: 'Black-capped Chickadee',    weight: 9,  points: 18, minSize: 12, maxSize: 18, minSpeed: 70,  maxSpeed: 110, color: '#3C3C3C',  flightPattern: 'flutter' },
                    { type: 'goldfinch',    name: 'American Goldfinch',        weight: 7,  points: 22, minSize: 12, maxSize: 16, minSpeed: 70,  maxSpeed: 120, color: '#FFD700',  flightPattern: 'bounce' },
                    { type: 'swallow',      name: 'Barn Swallow',              weight: 6,  points: 24, minSize: 12, maxSize: 18, minSpeed: 110, maxSpeed: 170, color: '#1E3A8A',  flightPattern: 'swoop' },
                    { type: 'oriole',       name: 'Baltimore Oriole',          weight: 4,  points: 28, minSize: 14, maxSize: 20, minSpeed: 80,  maxSpeed: 130, color: '#FF8C00',  flightPattern: 'sineSlow' },
                    { type: 'woodpecker',   name: 'Downy Woodpecker',          weight: 5,  points: 26, minSize: 14, maxSize: 20, minSpeed: 60,  maxSpeed: 90,  color: '#2F4F4F',  flightPattern: 'zigzag' },
                    { type: 'crow',         name: 'American Crow',             weight: 5,  points: 20, minSize: 22, maxSize: 30, minSpeed: 60,  maxSpeed: 100, color: '#111111',  flightPattern: 'glide' },
                    { type: 'raven',        name: 'Common Raven',              weight: 3,  points: 30, minSize: 24, maxSize: 34, minSpeed: 60,  maxSpeed: 100, color: '#0B0B0B',  flightPattern: 'glide' },
                    { type: 'owl',          name: 'Great Horned Owl',          weight: 2,  points: 45, minSize: 28, maxSize: 40, minSpeed: 40,  maxSpeed: 70,  color: '#6B4423',  flightPattern: 'smooth' },
                    { type: 'hawk',         name: 'Red-tailed Hawk',           weight: 3,  points: 40, minSize: 35, maxSize: 50, minSpeed: 30,  maxSpeed: 60,  color: '#8B4513',  flightPattern: 'sineVerySlow' },
                    { type: 'eagle',        name: 'Bald Eagle',                 weight: 1,  points: 80, minSize: 40, maxSize: 60, minSpeed: 35,  maxSpeed: 55,  color: '#5C4033',  flightPattern: 'majestic' },
                    { type: 'heron',        name: 'Great Blue Heron',          weight: 1,  points: 70, minSize: 38, maxSize: 55, minSpeed: 35,  maxSpeed: 50,  color: '#6A7FA0',  flightPattern: 'slowFlap' },
                    { type: 'duck',         name: 'Mallard',                    weight: 4,  points: 22, minSize: 24, maxSize: 32, minSpeed: 70,  maxSpeed: 110, color: '#2E8B57',  flightPattern: 'steady' },
                    { type: 'goose',        name: 'Canada Goose',              weight: 2,  points: 35, minSize: 34, maxSize: 50, minSpeed: 60,  maxSpeed: 90,  color: '#4B3F2F',  flightPattern: 'vGlide' },
                    { type: 'pelican',      name: 'Brown Pelican',              weight: 1,  points: 65, minSize: 42, maxSize: 60, minSpeed: 35,  maxSpeed: 55,  color: '#A47C48',  flightPattern: 'seaGlide' },
                    { type: 'kingfisher',   name: 'Belted Kingfisher',          weight: 2,  points: 38, minSize: 16, maxSize: 22, minSpeed: 90,  maxSpeed: 140, color: '#4682B4',  flightPattern: 'hoverDive' },
                    { type: 'hummingbird',  name: 'Ruby-throated Hummingbird', weight: 1,  points: 100,minSize: 8,  maxSize: 12, minSpeed: 120, maxSpeed: 200, color: '#228B22',  flightPattern: 'hover' },
                    { type: 'flamingo',     name: 'American Flamingo',          weight: 10,  points: 85, minSize: 35, maxSize: 50, minSpeed: 40,  maxSpeed: 70,  color: '#FF69B4',  flightPattern: 'majestic' }
                ];
                
                // Bird journal system
                this.todaysSpecies = [];
                this.currentDate = new Date();
                
                // Bird sprites system
                this.birdSprites = {};
                this.spriteImages = {};
                
                // Particle system for enhanced effects
                this.particles = [];

				// Unified text size for score and new-species banners
				this.textPopupSize = 20;

				// Cohesive hand-drawn palette
				this.palette = {
					ink: '#2d2d2d',
					softInk: 'rgba(45,45,45,0.85)',
					leaf: '#4A7C59',
					accent: '#8B4513',
					gold: '#C8A34B',
					sky: '#6A7FA0',
					cream: '#F5F0E6'
				};

                // Background image (drawn on canvas so it zooms)
                this.backgroundImage = new Image();
                this.isBackgroundLoaded = false;
                this.backgroundImage.onload = () => {
                    this.isBackgroundLoaded = true;
                };
                this.backgroundImage.src = 'background.png';
                
                // Binocs cursor image
                this.binocsImage = new Image();
                this.isBinocsLoaded = false;
                this.binocsImage.onload = () => {
                    this.isBinocsLoaded = true;
                };
                this.binocsImage.src = 'Binocs.png';
                
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
                this.spriteSheet.src = 'bird-spritesheet.png';

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
                this.flamingoSpriteSheet.src = 'flamingo.png';

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
                this.robinSpriteSheet.src = 'AmericanRobin.png';

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
                this.cardinalSpriteSheet.src = 'NorthernCardinal.png';

                // Sound system (visual feedback for now)
                this.soundEnabled = true;
                
                // Notebook system
                this.notebookData = this.createNotebookData();
                this.currentNotebookBird = null;
                
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
                    title: document.getElementById('poemTitle'),
                    author: document.getElementById('poemAuthor'),
                    text: document.getElementById('poemText'),
                    image: document.getElementById('poemImage'),
                    date: document.getElementById('notebookDate'),
                    speciesCount: document.getElementById('notebookSpeciesCount'),
                    speciesList: document.getElementById('notebookSpeciesList')
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

                // Setup species list clicks
                this.notebookElements.speciesList.addEventListener('click', (e) => {
                    if (e.target.classList.contains('species-item')) {
                        const birdName = e.target.textContent.trim();
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

                // Initialize with default content
                this.updateNotebookSpeciesList();
            }
            
            createNotebookData() {
                return {
                    flamingo: {
                        title: "Flying Flamingos",
                        author: "by Lamar Cole",
                        poem: `It was the ending of a beautiful day.<br>
And the flamingos were sailing away.<br>
They looked so beautiful in flight<br>
And the breezes were just right.<br>
They had spent a day of fun.<br>
Floating in the duck pond.`,
                        image: "Flamingoimage.png"
                    },
                    robin: {
                        title: "The Early Robin",
                        author: "by Sarah Williams",
                        poem: `The robin sings at break of day,<br>
Her melody so sweet and gay.<br>
She hops about with cheerful heart,<br>
Nature's artist, playing her part.<br>
Red breast bright against the green,<br>
The most beautiful bird I've seen.`,
                        image: "AmericanRobin.png"
                    },
                    cardinal: {
                        title: "Crimson Cardinal",
                        author: "by Michael Chen",
                        poem: `A flash of red against the snow,<br>
The cardinal comes and goes.<br>
His song rings clear in winter's chill,<br>
A promise that spring will fulfill.<br>
Crested head held proud and high,<br>
Painting hope across the sky.`,
                        image: "NorthernCardinal.png"
                    },
                    bluejay: {
                        title: "The Bold Blue Jay",
                        author: "by Emma Rodriguez",
                        poem: `Bold and brash, the blue jay calls,<br>
His voice echoes through the halls<br>
Of ancient trees and morning mist,<br>
A creature that cannot be missed.<br>
Blue and white in perfect blend,<br>
Nature's message he will send.`,
                        image: "bird-spritesheet.png"
                    },
                    sparrow: {
                        title: "Little Sparrow",
                        author: "by David Kim",
                        poem: `Small and brown, the sparrow flies,<br>
Underneath the open skies.<br>
Quick and nimble, never still,<br>
Fulfilling nature's perfect will.<br>
Common beauty, often missed,<br>
In morning's golden light she's kissed.`,
                        image: "bird-spritesheet.png"
                    },
                    chickadee: {
                        title: "Chickadee's Song",
                        author: "by Alice Thompson",
                        poem: `Chick-a-dee-dee-dee they say,<br>
Through the cold of winter's day.<br>
Small but mighty, brave and true,<br>
With a cap of midnight blue.<br>
In the feeder they appear,<br>
Bringing joy throughout the year.`,
                        image: "bird-spritesheet.png"
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
                        image: "bird-spritesheet.png"
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
                        image: "bird-spritesheet.png"
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
                        image: "bird-spritesheet.png"
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
                        image: "bird-spritesheet.png"
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
                
                // Check if click is on a bird
                for (let bird of this.birds) {
                    const distance = Math.sqrt(
                        Math.pow(bird.x - clickX, 2) + 
                        Math.pow(bird.y - clickY, 2)
                    );
                    
                    if (distance < bird.size * 1.5) { // Click within bird area
                        this.showNotebookForBird(bird.type);
                        break;
                    }
                }
            }
            
            showNotebookForBird(birdType) {
                const birdData = this.notebookData[birdType];
                if (!birdData) return;
                
                this.currentNotebookBird = birdType;
                
                // Update poem content
                this.notebookElements.title.textContent = birdData.title;
                this.notebookElements.author.textContent = birdData.author;
                this.notebookElements.text.innerHTML = birdData.poem;
                this.notebookElements.image.src = birdData.image;
                
                // Update species list
                this.updateNotebookSpeciesList();
            }
            
            updateNotebookSpeciesList() {
                const speciesList = this.notebookElements.speciesList;
                speciesList.innerHTML = '';
                
                // Add discovered species
                this.todaysSpecies.forEach(species => {
                    const item = document.createElement('div');
                    item.className = 'species-item';
                    if (species.type === this.currentNotebookBird) {
                        item.classList.add('active');
                    }
                    item.textContent = species.name;
                    speciesList.appendChild(item);
                });
                
                // Update species count
                this.notebookElements.speciesCount.textContent = 
                    `${this.todaysSpecies.length} species`;
                
                // Update date
                const options = { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric'
                };
                this.notebookElements.date.textContent = 
                    this.currentDate.toLocaleDateString('en-US', options);
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

                // Disable image smoothing for crisp rendering
                this.ctx.imageSmoothingEnabled = false;

                // Update canvas style to fill the entire viewport
                this.canvas.style.width = '100vw';
                this.canvas.style.height = '100vh';
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
                
                this.birdSpawnTimer += this.deltaTime;
                if (this.birdSpawnTimer >= this.birdSpawnInterval) {
                    this.spawnBird();
                    this.birdSpawnTimer = 0;
                    this.birdSpawnInterval = 2000 + Math.random() * 3000;
                }
                
                this.checkBirdSpotting();
                this.updateUI();
            }
            
            updateUI() {
                this.uiElements.binocularStatus.textContent = this.binoculars.isActive ? 'Active' : 'Ready';
                this.uiElements.birdCount.textContent = this.birdsSpotted;
                this.uiElements.mousePos.textContent = `Species: ${this.discoveredSpecies.size}/${this.speciesCatalog.length}`;
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

                const bird = {
                    id: Date.now() + Math.random(),
                    x: this.frameBounds.left - 30,
                    y: this.frameBounds.top + Math.random() * (this.frameBounds.bottom - this.frameBounds.top - 100),
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
                    
                    // Compute per-bird alpha for gentle fade in/out near edges
                    const fadeDistance = 20; // pixels to fully fade
                    const leftEdge = this.frameBounds.left;
                    const rightEdge = this.frameBounds.right;

                    // Fade in as the bird enters from the left
                    let alphaIn = (bird.x - leftEdge) / fadeDistance;
                    if (alphaIn < 0) alphaIn = 0;
                    if (alphaIn > 1) alphaIn = 1;

                    // Fade out as the bird approaches/exits the right edge
                    let alphaOut = 1;
                    if (bird.x > rightEdge - fadeDistance) {
                        const denom = fadeDistance + 20; // include offscreen removal buffer
                        alphaOut = (rightEdge + 20 - bird.x) / denom;
                        if (alphaOut < 0) alphaOut = 0;
                        if (alphaOut > 1) alphaOut = 1;
                    }

                    bird.alpha = Math.min(alphaIn, alphaOut);

                    bird.wingPhase += 10 * (this.deltaTime / 1000);
                });
                
                // Remove birds that have flown past the right edge of the frame
                this.birds = this.birds.filter(bird => bird.x < this.frameBounds.right + 50);
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
                    y: y - 20,
                    velocityX: 0,
                    velocityY: -22,
					size: this.textPopupSize,
                    color: isNewSpecies ? this.palette.gold : this.palette.leaf,
                    life: 2.0,
                    maxLife: 2.0,
                    alpha: 1,
                    isText: true,
                    text: `+${totalPoints}`
                });

                if (isNewSpecies) {
					this.particles.push({
                        x: x,
                        y: y - 48,
                        velocityX: 0,
                        velocityY: -18,
						size: this.textPopupSize,
                        color: this.palette.accent,
                        life: 3.0,
                        maxLife: 3.4,
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
                        ctx.font = `600 ${particle.size}px "Cormorant", serif`;
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
                if (!this.binoculars.isActive) return;
                
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
                        
                        console.log(`✅ ${bird.name} spotted! (+${bird.points} points)`);
                        if (isNewSpecies) {
                            console.log(`🎉 NEW SPECIES DISCOVERED: ${bird.name}! (+${bird.points * 2} bonus points)`);
                        }
                        
                        // Create particles and subtle feedback
                        this.createSpottingParticles(bird.x, bird.y, isNewSpecies);
                        this.showScorePopup(bird.x, bird.y, bird.points, isNewSpecies);
                        // Remove flashing effect; we will instead add a single expanding ring particle
                        this.particles.push({
                            x: bird.x,
                            y: bird.y,
                            velocityX: 0,
                            velocityY: 0,
                            size: 0,
                            ring: true,
                            maxRingRadius: bird.size + 15,
                            stroke: isNewSpecies ? this.palette.gold : this.palette.leaf,
                            life: 0.5,
                            maxLife: 0.6,
                            alpha: 1
                        });
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
            }
            
            renderNormalView() {
                this.drawBackground();
                this.drawBirds();
                this.drawParticles();
                this.drawCursor();
            }
            
            renderBinocularView() {
                const ctx = this.ctx;

                // 1) Draw normal (unzoomed) scene
                this.drawBackground();
                this.drawBirds();

                // 2) Draw zoomed scene clipped to circular view
                const centerX = this.binoculars.x;
                const centerY = this.binoculars.y;
                const radius = this.binoculars.viewRadius;

                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.clip();

                ctx.translate(centerX, centerY);
                ctx.scale(this.binoculars.zoomLevel, this.binoculars.zoomLevel);
                ctx.translate(-centerX, -centerY);

                this.drawBackground();
                this.drawBirds();

                ctx.restore();

                // 3) Draw particles clipped to scope but NOT zoomed
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.clip();
                this.drawParticles();
                ctx.restore();

                // 4) HUD/overlays on top (not zoomed) - only draw if binoculars are still active
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
                    // Apply per-bird alpha if present for smooth fade in/out
                    if (bird.alpha !== undefined) {
                        ctx.globalAlpha = bird.alpha;
                    }
                    ctx.translate(bird.x, bird.y);
                    
                    const size = bird.size;
                    const wingFlap = Math.sin(bird.wingPhase) * 0.3;
                    
                    // Scale the sprite based on bird size
                    const scale = size / 20; // Base size is 20, so scale accordingly
                    ctx.scale(scale, scale);
                    
                    // Apply wing flapping animation by scaling vertically
                    ctx.scale(1, 1 + wingFlap * 0.2);
                    
                    // Use specific sprite sheets for flamingos, robins, and cardinals, regular sprite sheet for others
                    if (bird.type === 'flamingo' && this.isFlamingoSpriteSheetLoaded) {
                        const cols = this.flamingoSpriteSheetCols;
                        const rows = this.flamingoSpriteSheetRows;
                        const frameW = this.flamingoSpriteSheet.width / cols;
                        const frameH = this.flamingoSpriteSheet.height / rows;
                        const frameIndex = bird.frameIndex % (cols * rows);
                        const sx = (frameIndex % cols) * frameW;
                        const sy = Math.floor(frameIndex / cols) * frameH;
                        // Draw frame to a consistent destination box (60x40 pre-scale)
                        ctx.drawImage(this.flamingoSpriteSheet, sx, sy, frameW, frameH, -30, -20, 60, 40);
                    } else if (bird.type === 'robin' && this.isRobinSpriteSheetLoaded) {
                        const cols = this.robinSpriteSheetCols;
                        const rows = this.robinSpriteSheetRows;
                        const frameW = this.robinSpriteSheet.width / cols;
                        const frameH = this.robinSpriteSheet.height / rows;
                        const frameIndex = bird.frameIndex % (cols * rows);
                        const sx = (frameIndex % cols) * frameW;
                        const sy = Math.floor(frameIndex / cols) * frameH;
                        // Draw frame to a consistent destination box (60x40 pre-scale)
                        ctx.drawImage(this.robinSpriteSheet, sx, sy, frameW, frameH, -30, -20, 60, 40);
                    } else if (bird.type === 'cardinal' && this.isCardinalSpriteSheetLoaded) {
                        const cols = this.cardinalSpriteSheetCols;
                        const rows = this.cardinalSpriteSheetRows;
                        const frameW = this.cardinalSpriteSheet.width / cols;
                        const frameH = this.cardinalSpriteSheet.height / rows;
                        const frameIndex = bird.frameIndex % (cols * rows);
                        const sx = (frameIndex % cols) * frameW;
                        const sy = Math.floor(frameIndex / cols) * frameH;
                        // Draw frame to a consistent destination box (60x40 pre-scale)
                        ctx.drawImage(this.cardinalSpriteSheet, sx, sy, frameW, frameH, -30, -20, 60, 40);
                    } else if (this.isSpriteSheetLoaded) {
                        const cols = this.spriteSheetCols;
                        const rows = this.spriteSheetRows;
                        const frameW = this.spriteSheet.width / cols;
                        const frameH = this.spriteSheet.height / rows;
                        const frameIndex = bird.frameIndex % (cols * rows);
                        const sx = (frameIndex % cols) * frameW;
                        const sy = Math.floor(frameIndex / cols) * frameH;
                        // Draw frame to a consistent destination box (60x40 pre-scale)
                        ctx.drawImage(this.spriteSheet, sx, sy, frameW, frameH, -30, -20, 60, 40);
                    } else if (this.spriteImages[bird.type]) {
                        // Fallback to original SVG sprite per species
                        ctx.drawImage(this.spriteImages[bird.type], -30, -20, 60, 40);
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
                    hummingbird: this.createHummingbirdSprite(),
                    hawk: this.createHawkSprite(),
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
                    heron: this.createHeronSprite(),
                    duck: this.createDuckSprite(),
                    goose: this.createGooseSprite(),
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
                        img.src = 'flamingo.png'; // Your PNG sprite file
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
                            <path d="M18 26 Q16 28 14 28"/>
                        </g>
                    </svg>
                `;
            }

            createPelicanSprite() {
                return `
                    <svg width="60" height="40" viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
                        <g stroke="#2d2d2d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <ellipse cx="26" cy="22" rx="18" ry="11" fill="#A47C48"/>
                            <circle cx="44" cy="18" r="6" fill="#A47C48"/>
                            <path d="M44 19 L56 19 L48 22 Z" fill="#E0C060" stroke="#2d2d2d" stroke-width="1"/>
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
            if (e.key === 'p' || e.key === 'P') {
                if (game.isRunning) {
                    game.stop();
                } else {
                    game.start();
                }
            }
        });

