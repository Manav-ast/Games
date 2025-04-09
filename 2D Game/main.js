// Extend the base functionality of JavaScript
Array.prototype.last = function () {
    return this[this.length - 1];
};

// A sinus function that acceps degrees instead of radians
Math.sinus = function (degree) {
    return Math.sin((degree / 180) * Math.PI);
};

// Game data
let phase = "waiting"; // waiting | stretching | turning | walking | transitioning | falling
let lastTimestamp; // The timestamp of the previous requestAnimationFrame cycle

let heroX; // Changes when moving forward
let heroY; // Only changes when falling
let sceneOffset; // Moves the whole game

let platforms = [];
let sticks = [];
let trees = [];

// Save high score to localStorage

let score = 0;
let highScore = localStorage.getItem("highScore") || 0;

// Configuration
const canvasWidth = 375;
const canvasHeight = 375;
const platformHeight = 100;
const heroDistanceFromEdge = 10; // While waiting
const paddingX = 100; // The waiting position of the hero in from the original canvas size
const perfectAreaSize = 10;

// Set a single theme instead of day/night switching
let currentTheme = 'original';

// Retro styling configuration
const pixelSize = 2; // Size of our "pixels" for the retro effect
const retroColors = {
    original: {
        background: ['#BBD691', '#FEF1E1'],
        trees: ['#6D8821', '#8FAC34', '#98B333'],
        platforms: ['#000000', '#000000', '#000000'],
        hero: {
            body: '#000000',
            eye: '#ffffff',
            band: '#ff0000'
        },
        hill1: '#95C629',
        hill2: '#659F1C',
        sky: ['#BBD691', '#FEF1E1'],
        stars: false
    }
};

// The background moves slower than the hero
const backgroundSpeedMultiplier = 0.2;

const hill1BaseHeight = 100;
const hill1Amplitude = 10;
const hill1Stretch = 1;
const hill2BaseHeight = 70;
const hill2Amplitude = 20;
const hill2Stretch = 0.5;

const stretchingSpeed = 4; // Milliseconds it takes to draw a pixel
const turningSpeed = 4; // Milliseconds it takes to turn a degree
const walkingSpeed = 4;
const transitioningSpeed = 2;
const fallingSpeed = 2;

const heroWidth = 17;
const heroHeight = 30;

const canvas = document.getElementById("game");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const ctx = canvas.getContext("2d");

// Reference existing elements instead of creating new ones
const introductionElement = document.getElementById("introduction");
const perfectElement = document.getElementById("perfect");
const retroScoreElement = document.getElementById("score");
const retroHighScoreElement = document.getElementById("highestScore");

// Add retro styling to existing elements
retroScoreElement.style.cssText = `
    font-family: 'Pixelify Sans', sans-serif;
    font-size: 40px;
    color: #00ff00;
    text-shadow: 2px 2px #000;
`;

retroHighScoreElement.style.cssText = `
    font-family: 'Pixelify Sans', sans-serif;
    font-size: 40px;
    color: #ff00ff;
    text-shadow: 2px 2px #000;
`;

// Retro UI Elements - Font loading
document.addEventListener('DOMContentLoaded', function () {
    try {
        const retroFont = new FontFace('Pixelify Sans', sans - serif);
        retroFont.load().then(() => {
            document.fonts.add(retroFont);
        }).catch(err => {
            console.warn('Could not load the font', err);
        });
    } catch (error) {
        console.warn('Font loading not supported', error);
    }

    // Start audio if available
    if (typeof audioManager !== 'undefined') {
        try {
            audioManager.startBackgroundMusic();
        } catch (error) {
            console.warn('Audio could not be started', error);
        }
    }
});

// Create retro game over screen
const gameOverScreen = document.createElement('div');
gameOverScreen.id = 'retro-game-over';
gameOverScreen.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Pixelify Sans', sans-serif;
    font-size: 48px;
    color: #ff0000;
    // text-shadow: 4px 4px #000;
    text-align: center;
    display: none;
    z-index: 1000;
`;
gameOverScreen.innerHTML = `
    <div>GAME OVER</div>
    <div style="font-size: 24px; margin-top: 20px;">Press SPACE to restart</div>
`;
document.body.appendChild(gameOverScreen);

// Initialize layout
resetGame();

// Resets game variables and layouts but does not start the game (game starts on keypress)
function resetGame(event) {
    event?.preventDefault();
    // Reset game progress
    phase = "waiting";
    lastTimestamp = undefined;
    sceneOffset = 0;
    score = 0;

    introductionElement.style.opacity = 1;
    perfectElement.style.opacity = 0;
    gameOverScreen.style.display = "none";
    retroScoreElement.innerText = score;

    // The first platform is always the same
    // x + w has to match paddingX
    platforms = [{ x: 50, w: 50 }];
    generatePlatform();
    generatePlatform();
    generatePlatform();
    generatePlatform();

    sticks = [{ x: platforms[0].x + platforms[0].w, length: 0, rotation: 0 }];

    trees = [];
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();

    heroX = platforms[0].x + platforms[0].w - heroDistanceFromEdge;
    heroY = 0;

    draw();
}

function generateTree() {
    const minimumGap = 30;
    const maximumGap = 150;

    // X coordinate of the right edge of the furthest tree
    const lastTree = trees[trees.length - 1];
    let furthestX = lastTree ? lastTree.x : 0;

    const x =
        furthestX +
        minimumGap +
        Math.floor(Math.random() * (maximumGap - minimumGap));

    const treeColors = ["#6D8821", "#8FAC34", "#98B333"];
    const color = treeColors[Math.floor(Math.random() * 3)];

    trees.push({ x, color });
}

function generatePlatform() {
    const minimumGap = 40;
    const maximumGap = 200;
    const minimumWidth = 20;
    const maximumWidth = 100;

    // X coordinate of the right edge of the furthest platform
    const lastPlatform = platforms[platforms.length - 1];
    let furthestX = lastPlatform.x + lastPlatform.w;

    const x =
        furthestX +
        minimumGap +
        Math.floor(Math.random() * (maximumGap - minimumGap));
    const w =
        minimumWidth + Math.floor(Math.random() * (maximumWidth - minimumWidth));

    platforms.push({ x, w });
}

// If space was pressed restart the game
window.addEventListener("keydown", function (event) {
    if (event.key == " ") {
        event.preventDefault();
        resetGame();
        return;
    }
});

window.addEventListener("mousedown", function (event) {
    if (phase == "waiting") {
        lastTimestamp = undefined;
        introductionElement.style.opacity = 0;
        phase = "stretching";
        window.requestAnimationFrame(animate);
    }
});

window.addEventListener("mouseup", function (event) {
    if (phase == "stretching") {
        phase = "turning";
    }
});

window.addEventListener("resize", function (event) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});

window.addEventListener("touchstart", function (event) {
    event.preventDefault(); // Prevents blue highlight
    if (phase == "waiting") {
        lastTimestamp = undefined;
        introductionElement.style.opacity = 0;
        phase = "stretching";
        window.requestAnimationFrame(animate);
    }
}, { passive: false }); // Important to prevent default touch behavior

window.addEventListener("touchend", function (event) {
    event.preventDefault(); // Prevents blue highlight
    if (phase == "stretching") {
        phase = "turning";
    }
}, { passive: false });

// Add a fallback font if Pixelify Sans is not available
document.body.style.fontFamily = "'Pixelify Sans', monospace, Arial, sans-serif";

window.requestAnimationFrame(animate);

// The main game loop
function animate(timestamp) {
    if (!lastTimestamp) {
        lastTimestamp = timestamp;
        window.requestAnimationFrame(animate);
        return;
    }

    switch (phase) {
        case "waiting":
            return; // Stop the loop
        case "stretching": {
            sticks.last().length += (timestamp - lastTimestamp) / stretchingSpeed;
            break;
        }
        case "turning": {
            sticks.last().rotation += (timestamp - lastTimestamp) / turningSpeed;

            if (sticks.last().rotation > 90) {
                sticks.last().rotation = 90;

                const [nextPlatform, perfectHit] = thePlatformTheStickHits();
                if (nextPlatform) {
                    // Increase score
                    score += perfectHit ? 2 : 1;
                    retroScoreElement.innerText = score;

                    if (perfectHit) {
                        perfectElement.style.opacity = 1;
                        setTimeout(() => (perfectElement.style.opacity = 0), 1000);
                    }

                    generatePlatform();
                    generateTree();
                    generateTree();
                }

                phase = "walking";
            }
            break;
        }
        case "walking": {
            heroX += (timestamp - lastTimestamp) / walkingSpeed;

            const [nextPlatform] = thePlatformTheStickHits();
            if (nextPlatform) {
                // If hero will reach another platform then limit it's position at it's edge
                const maxHeroX = nextPlatform.x + nextPlatform.w - heroDistanceFromEdge;
                if (heroX > maxHeroX) {
                    heroX = maxHeroX;
                    phase = "transitioning";
                }
            } else {
                // If hero won't reach another platform then limit it's position at the end of the pole
                const maxHeroX = sticks.last().x + sticks.last().length + heroWidth;
                if (heroX > maxHeroX) {
                    heroX = maxHeroX;
                    phase = "falling";
                }
            }
            break;
        }
        case "transitioning": {
            sceneOffset += (timestamp - lastTimestamp) / transitioningSpeed;

            const [nextPlatform] = thePlatformTheStickHits();
            if (sceneOffset > nextPlatform.x + nextPlatform.w - paddingX) {
                // Add the next step
                sticks.push({
                    x: nextPlatform.x + nextPlatform.w,
                    length: 0,
                    rotation: 0
                });
                phase = "waiting";
            }
            break;
        }
        case "falling": {
            if (sticks.last().rotation < 180)
                sticks.last().rotation += (timestamp - lastTimestamp) / turningSpeed;

            heroY += (timestamp - lastTimestamp) / fallingSpeed;
            const maxHeroY =
                platformHeight + 100 + (window.innerHeight - canvasHeight) / 2;
            if (heroY > maxHeroY) {
                gameOver();
                return;
            }
            break;
        }
        default:
            throw Error("Wrong phase");
    }

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
    }

    draw();
    window.requestAnimationFrame(animate);

    lastTimestamp = timestamp;
}

// Returns the platform the stick hit (if it didn't hit any stick then return undefined)
function thePlatformTheStickHits() {
    if (sticks.last().rotation != 90)
        throw Error(`Stick is ${sticks.last().rotation}°`);
    const stickFarX = sticks.last().x + sticks.last().length;

    const platformTheStickHits = platforms.find(
        (platform) => platform.x < stickFarX && stickFarX < platform.x + platform.w
    );

    // If the stick hits the perfect area
    if (
        platformTheStickHits &&
        platformTheStickHits.x + platformTheStickHits.w / 2 - perfectAreaSize / 2 <
        stickFarX &&
        stickFarX <
        platformTheStickHits.x + platformTheStickHits.w / 2 + perfectAreaSize / 2
    )
        return [platformTheStickHits, true];

    return [platformTheStickHits, false];
}

function draw() {
    ctx.save();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    drawBackground();

    // Center main canvas area to the middle of the screen
    ctx.translate(
        (window.innerWidth - canvasWidth) / 2 - sceneOffset,
        (window.innerHeight - canvasHeight) / 2
    );

    // Apply retro pixel effect - sets imageSmoothingEnabled to false for crisp pixels
    ctx.imageSmoothingEnabled = false;

    // Draw scene
    drawPlatforms();
    drawHero();
    drawSticks();

    // Restore transformation
    ctx.restore();

    // Update retro UI elements
    retroScoreElement.textContent = `SCORE: ${score}`;
    retroHighScoreElement.textContent = `HIGH SCORE: ${highScore}`;

    // Add retro-style scanlines effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < canvas.height; i += 2) {
        ctx.fillRect(0, i, canvas.width, 1);
    }
}

function drawPlatforms() {
    const colors = retroColors[currentTheme];

    platforms.forEach(({ x, w }) => {
        // Draw platform with retro styling using current theme colors
        drawRetroRect(
            x,
            canvasHeight - platformHeight,
            w,
            platformHeight + (window.innerHeight - canvasHeight) / 2,
            colors.platforms[0],
            colors.platforms[1]
        );

        // Draw perfect area only if hero did not yet reach the platform
        if (sticks.last().x < x) {
            ctx.fillStyle = '#ff0000';
            drawRetroRect(
                x + w / 2 - perfectAreaSize / 2,
                canvasHeight - platformHeight,
                perfectAreaSize,
                perfectAreaSize,
                '#ff0000'
            );
        }
    });
}

function drawHero() {
    ctx.save();
    ctx.translate(
        heroX - heroWidth / 2,
        heroY + canvasHeight - platformHeight - heroHeight / 2
    );

    // Hero outline for better visibility
    const outlineColor = '#ffffff';

    // Draw body outline - pixelated rectangle
    drawRetroRect(
        -heroWidth / 2 - 1,
        -heroHeight / 2 - 1,
        heroWidth + 2,
        heroHeight - 2,
        outlineColor
    );

    // Body - pixelated rectangle
    drawRetroRect(
        -heroWidth / 2,
        -heroHeight / 2,
        heroWidth,
        heroHeight - 4,
        retroColors[currentTheme].hero.body
    );

    // Legs - pixelated circles
    const legDistance = 5;

    // Leg outlines
    drawRetroCircle(legDistance, 11.5, 4, outlineColor);
    drawRetroCircle(-legDistance, 11.5, 4, outlineColor);

    // Actual legs
    drawRetroCircle(legDistance, 11.5, 3, retroColors[currentTheme].hero.body);
    drawRetroCircle(-legDistance, 11.5, 3, retroColors[currentTheme].hero.body);

    // Eye outline - pixelated circle
    drawRetroCircle(5, -7, 4, outlineColor);

    // Eye - pixelated circle
    drawRetroCircle(5, -7, 3, retroColors[currentTheme].hero.eye);

    // Band - pixelated rectangles
    ctx.fillStyle = retroColors[currentTheme].hero.band;
    drawRetroRect(-heroWidth / 2 - 1, -12, heroWidth + 2, 4.5, retroColors[currentTheme].hero.band);

    // Band tails - pixelated triangles
    drawRetroTriangle(-9, -14.5, -17, -18.5, -14, -8.5, retroColors[currentTheme].hero.band);
    drawRetroTriangle(-10, -10.5, -15, -3.5, -5, -7, retroColors[currentTheme].hero.band);

    ctx.restore();
}

function drawSticks() {
    sticks.forEach((stick) => {
        ctx.save();

        // Move the anchor point to the start of the stick and rotate
        ctx.translate(stick.x, canvasHeight - platformHeight);
        ctx.rotate((Math.PI / 180) * stick.rotation);

        // Draw stick with pixel effect
        ctx.strokeStyle = '#f5bb00';
        ctx.lineWidth = pixelSize * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -stick.length);
        ctx.stroke();

        // Restore transformations
        ctx.restore();
    });
}

function drawBackground() {
    const colors = retroColors[currentTheme];

    // Draw sky with gradient
    var gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    gradient.addColorStop(0, colors.sky[0]);
    gradient.addColorStop(1, colors.sky[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Draw hills with pixelated effect
    drawPixelatedHill(hill1BaseHeight, hill1Amplitude, hill1Stretch, colors.hill1);
    drawPixelatedHill(hill2BaseHeight, hill2Amplitude, hill2Stretch, colors.hill2);

    // Draw trees
    trees.forEach((tree) => drawRetroTree(tree.x, tree.color));
}

// Draw sun for day theme
function drawSun() {
    ctx.save();

    // Draw pixelated sun
    const sunX = window.innerWidth * 0.8;
    const sunY = window.innerHeight * 0.2;
    const sunRadius = 30;

    // Draw sun rays
    ctx.fillStyle = '#FFD700';
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const rayX = sunX + Math.cos(angle) * (sunRadius + 15);
        const rayY = sunY + Math.sin(angle) * (sunRadius + 15);
        const rayWidth = 5;
        const rayLength = 15;

        ctx.save();
        ctx.translate(rayX, rayY);
        ctx.rotate(angle);
        drawRetroRect(-rayWidth / 2, -rayLength / 2, rayWidth, rayLength, '#FFD700');
        ctx.restore();
    }

    // Draw sun circle
    drawRetroCircle(sunX, sunY, sunRadius, '#FFF200');

    ctx.restore();
}

// Draw pixelated stars in the background
function drawPixelatedStars() {
    const starColors = ['#ffffff', '#f0f0f0', '#e0e0e0'];
    const starCount = 50;

    ctx.save();

    // Use a fixed seed for consistent star positions
    const seed = 12345;
    const random = (min, max) => {
        const x = Math.sin(seed + trees.length) * 10000;
        return min + (x - Math.floor(x)) * (max - min);
    };

    for (let i = 0; i < starCount; i++) {
        const x = random(0, window.innerWidth);
        const y = random(0, window.innerHeight / 2);
        const size = random(1, 3) * pixelSize;
        const colorIndex = Math.floor(random(0, 3));

        ctx.fillStyle = starColors[colorIndex];
        ctx.fillRect(
            Math.floor(x / pixelSize) * pixelSize,
            Math.floor(y / pixelSize) * pixelSize,
            size, size
        );
    }

    ctx.restore();
}

// A pixelated hill under a stretched out sinus wave
function drawPixelatedHill(baseHeight, amplitude, stretch, color) {
    ctx.beginPath();
    ctx.moveTo(0, window.innerHeight);

    // Create pixelated hill effect
    for (let i = 0; i < window.innerWidth; i += pixelSize) {
        const y = getHillY(i, baseHeight, amplitude, stretch);
        // Round to nearest pixel grid
        const pixelY = Math.floor(y / pixelSize) * pixelSize;
        ctx.lineTo(i, pixelY);
    }

    ctx.lineTo(window.innerWidth, window.innerHeight);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawRetroTree(x, color) {
    ctx.save();
    ctx.translate(
        (-sceneOffset * backgroundSpeedMultiplier + x) * hill1Stretch,
        getTreeY(x, hill1BaseHeight, hill1Amplitude)
    );

    const treeTrunkHeight = 5;
    const treeTrunkWidth = 2 * pixelSize;
    const treeCrownHeight = 25;
    const treeCrownWidth = 10 * pixelSize;

    // Get colors based on current theme
    const colors = retroColors[currentTheme];

    // Draw trunk with pixel effect
    drawRetroRect(
        -treeTrunkWidth / 2,
        -treeTrunkHeight,
        treeTrunkWidth,
        treeTrunkHeight,
        '#7D833C'
    );

    // Draw crown with pixel effect - use theme colors or provided color
    drawRetroTriangle(
        -treeCrownWidth / 2,
        -treeTrunkHeight,
        0,
        -(treeTrunkHeight + treeCrownHeight),
        treeCrownWidth / 2,
        -treeTrunkHeight,
        color || colors.trees[Math.floor(Math.random() * colors.trees.length)]
    );

    ctx.restore();
}

// Helper functions for drawing pixelated shapes

function drawRetroRect(x, y, width, height, color, strokeColor) {
    // Round to nearest pixel grid
    const pixelX = Math.floor(x / pixelSize) * pixelSize;
    const pixelY = Math.floor(y / pixelSize) * pixelSize;
    const pixelWidth = Math.ceil(width / pixelSize) * pixelSize;
    const pixelHeight = Math.ceil(height / pixelSize) * pixelSize;

    ctx.fillStyle = color;
    ctx.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);

    if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = pixelSize;
        ctx.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
    }
}

function drawRetroCircle(x, y, radius, color) {
    const pixelRadius = Math.ceil(radius / pixelSize) * pixelSize;

    // Draw the circle using small squares
    for (let px = -pixelRadius; px <= pixelRadius; px += pixelSize) {
        for (let py = -pixelRadius; py <= pixelRadius; py += pixelSize) {
            // If the pixel is inside the circle
            if (px * px + py * py <= pixelRadius * pixelRadius) {
                ctx.fillStyle = color;
                ctx.fillRect(
                    Math.floor((x + px) / pixelSize) * pixelSize,
                    Math.floor((y + py) / pixelSize) * pixelSize,
                    pixelSize,
                    pixelSize
                );
            }
        }
    }
}

function drawRetroTriangle(x1, y1, x2, y2, x3, y3, color) {
    // Convert to pixel grid
    const px1 = Math.floor(x1 / pixelSize) * pixelSize;
    const py1 = Math.floor(y1 / pixelSize) * pixelSize;
    const px2 = Math.floor(x2 / pixelSize) * pixelSize;
    const py2 = Math.floor(y2 / pixelSize) * pixelSize;
    const px3 = Math.floor(x3 / pixelSize) * pixelSize;
    const py3 = Math.floor(y3 / pixelSize) * pixelSize;

    // Create a filled path
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(px1, py1);
    ctx.lineTo(px2, py2);
    ctx.lineTo(px3, py3);
    ctx.closePath();
    ctx.fill();
}

function getHillY(windowX, baseHeight, amplitude, stretch) {
    const sineBaseY = window.innerHeight - baseHeight;
    return (
        Math.sinus((sceneOffset * backgroundSpeedMultiplier + windowX) * stretch) *
        amplitude +
        sineBaseY
    );
}

function getTreeY(x, baseHeight, amplitude) {
    const sineBaseY = window.innerHeight - baseHeight;
    return Math.sinus(x) * amplitude + sineBaseY;
}

// Add game over screen
function gameOver() {
    gameOverScreen.style.display = 'block';
}
