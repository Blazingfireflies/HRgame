canvas.clearScreen = () => (renderer.fill(new Color(0, 0, 0, 1)));

width = 1056;
height = 590;
const PX = 3;
let spawnerCycle = 600; // was 1200
let ourArena = new Rect(300, 100, 400, 400);
scene.physics.gravity.y = 0.3;
scene.mouseEvents = false;
const mySynth = new Synth();

/** @type {Sound} */
const explodeSound = loadResource("explode.mp3");
/** @type {Sound} */
const hitSound = loadResource("graze.mp3");
const warning = loadResource("!2.png");
const wand = loadResource("wand.png");

//#region functions

/**
 * 
 * @param {number} points 
 * @param {number} radius 
 * @param {number} reversepointiness 0.1 is very very pointy, 1 is no star for you  
 * @returns {Polygon}
 */
let getStar = (points, radius, reversepointiness) => {
    let ourStar = Polygon.regular(points * 2, radius);
    let goodArray = [];
    for (let i = 0; i < points * 2; i++) {
        goodArray[i] = ourStar.vertices[i].get();
        if ((i + 1) % 2 === 0) {
            goodArray[i].mul(reversepointiness);
        }
    }
    return new Polygon(goodArray);
};

/**
 * @param {WorldObject} star Use a getStar star's WorldObject
 * @returns Vector2 array
 */
let getStarPointVertices = (star) => {
    let goodArray = [];
    let j = 0;
    let points = star.defaultShape.vertices.length;
    let ourStar = star.getModel("default").center(Vector2.zero);
    for (let i = 0; i < points; i++) {
        if (!((i + 1) % 2 === 0)) {
            goodArray[j] = ourStar.vertices[i].normalized;
            j++;
        }
    }
    return goodArray;
};

const fToMs = frames => {
    return 1000 * frames / intervals.fps;
};




//#endregion


//#region classes
class DESTROY_ON_LEAVE extends ElementScript {
    init(obj) {
        this.entered = false;
    }
    update(obj) {
        this.entered ||= obj.onScreen;
        if (this.entered && !obj.onScreen)
            obj.remove();
    }
}

class OVER_TIME extends ElementScript {
    init(obj, count, task, delay) {
        obj.scripts.removeDefault();
        this.count = count;
        this.task = task;
        this.delay = Math.ceil(delay);
        this.index = 0;
    }
    update(obj) {
        if (this.index >= this.count) {
            obj.remove();
        } else if (obj.lifeSpan % this.delay === 0) {
            this.task(this.index);
            this.index++;
        }
    }
    static loop(count, task, delay) {
        const runner = scene.main.addElement("overTime", 0, 0);
        runner.scripts.add(OVER_TIME, count, task, delay);
        return runner;
    }
}

class SWEEPER extends ElementScript {
    static SPEED = 3;
    static ASPECT_RATIO = 2;
    static IMAGE = loadResource("sweeper.png");
    static VOLUME_FALLOFF = 8;
    // static CHAOS = 0.01;
    init(obj, dirY) {
        obj.scripts.removeDefault();
        obj.scripts.add(ONLY_COLLISION);
        obj.scripts.add(DESTROY_ON_LEAVE);
        obj.scripts(PHYSICS).velocity.y = dirY * SWEEPER.SPEED;
    }
    update(obj) {
        const DELAY = 10;
        if (obj.lifeSpan % DELAY === 0) {
            const player = scene.main.query(PLAYER)[0].transform.position;
            const model = obj.getModel("default");
            const distance = model.distanceTo(player);
            const volume = 1 / (1 + SWEEPER.VOLUME_FALLOFF * distance / Math.sqrt(ourArena.area));
            mySynth.play({
                frequency: Random.range(250, 255),
                duration: fToMs(DELAY),
                wave: "sine",
                volume: Number.clamp(volume, 0, 1)
            });
        }
        obj.scripts(PHYSICS).angularVelocity += Random.range(0.01);
        // obj.scripts(PHYSICS).velocity.rotate(Random.range(SWEEPER.CHAOS));
    }
    draw(obj, name, shape) {
        renderer.image(SWEEPER.IMAGE).rect(shape);
    }
    static create(column, normalizedWidth, dirY) {
        const width = normalizedWidth * ourArena.width;
        const x = Interpolation.lerp(
            ourArena.xRange.min,
            ourArena.xRange.max,
            column * normalizedWidth
        ) + width / 2;
        const height = width / SWEEPER.ASPECT_RATIO;
        const y = canvas.height / 2 - dirY * (canvas.height + height) / 2;
        const sweeper = scene.main.addRectElement("sweeper", x, y, width, height);
        sweeper.scripts.add(SWEEPER, dirY);
        return sweeper;
    }
}

class LOVELY_STAR extends ElementScript {


    /** @param {WorldObject} obj */
    init(obj) {
        obj.scripts.removeDefault();
        obj.transform.position.set(Random.inShape(ourArena));
        // obj.defaultShape = getStar(5, 1000, 0.4);
        obj.defaultShape = getStar(5, 1000, 0.6); // was 0.4 shape
        obj.transform.rotation = Random.angle();
        this.starRotation = 0.2; // was 0.13
        this.lineWidth = 10;
        this.starOpacity = 0;
    }

    /** @param {WorldObject} obj */
    update(obj) {
        obj.transform.rotation += this.starRotation;
        // this.starRotation *= 0.994;
        this.starRotation *= 0.99; // was 0.994
        obj.defaultShape = obj.defaultShape.scale(0.97);
        this.lineWidth *= 0.99;
        this.starOpacity += 0.005;

        if (obj.defaultShape.area < 350) {
            // let myStarPoints = getStarPointVertices(obj.defaultShape);
            // mySynth.play({duration:100, note:'A', octave:5, wave:"sine", volume:0.4});
            // mySynth.play({duration:200, note:'A', octave:4, wave:"sine", volume:0.3});
            // mySynth.play({duration:400, note:'A', octave:3, wave:"sine", volume:0.3});
            explodeSound.play(0.3);
            let myStarPoints = getStarPointVertices(obj);
            for (let i = 0; i < myStarPoints.length; i++) {
                SMALL_STAR.create(obj.transform.position.get(), myStarPoints[i].get());
            }
            obj.remove();
        }
    }

    /** @param {Polygon} shape */
    draw(obj, name, shape) {
        renderer.stroke(new Color(255, 255, 255, this.starOpacity), this.lineWidth, LineCap.ROUND, LineJoin.ROUND).shape(shape);
    }

    static create() {
        //  console.log("Hi! I'm Small Star!");
        // create scene object
        let myElement = scene.main.addElement("LovelyStar", 0, 0);
        // attach script as behavior
        myElement.scripts.add(LOVELY_STAR);
        // return it to the wonderful person who called create()
        return myElement;
    }
}

class SMALL_STAR extends ElementScript {

    /** @param {WorldObject} obj */
    init(obj, myVelocity = Vector2.zero, mySize = 15, myPointiness = 0.6) {
        obj.scripts.removeDefault();
        obj.scripts.add(ONLY_COLLISION);
        obj.scripts.add(DESTROY_ON_LEAVE);
        // obj.defaultShape = getStar(5, 15, 0.6);
        obj.defaultShape = getStar(5, mySize, myPointiness);
        obj.transform.rotation = Random.angle();
        obj.scripts(PHYSICS).velocity = myVelocity.mul(1.5);
        obj.scripts(PHYSICS).angularVelocity = 0.08;
        //console.log(this.myDirection);
    }

    /**
     *  @param {Polygon} shape 
     *  @param {WorldObject} obj
     * */
    // draw(obj, name, shape) {
    //     renderer.drawThrough(obj.transform.invMatrix, () => {
    //         renderer.clip().shape(ourArena)
    //     }, false);
    //     renderer.draw(new Color("white")).shape(obj.defaultShape);
    //     renderer.unclip();
    // }
    escapeDraw(obj) {
        renderer.clip().shape(ourArena);
        renderer.drawThrough(obj.transform.matrix, () => {
            renderer.draw(new Color("white")).shape(obj.defaultShape);
        }, false);
        renderer.unclip();
    }

    /** @param {WorldObject} obj */
    static create(myPosition, myVelocity, mySize, myPointiness) {
        // console.log(myVector2);
        // create scene object
        let myElement = scene.main.addElement("SmallStar", myPosition);
        // console.log(this.myDirection);
        // attach script as behavior
        myElement.scripts.add(SMALL_STAR, myVelocity, mySize, myPointiness);
        // return it to the wonderful person who called create()
        return myElement;
    }
}

class SCROLLING_STAR extends ElementScript {

    /** @param {WorldObject} obj */
    init(obj, mySize, myPosition, mySpeed) {
        obj.scripts.add(ONLY_COLLISION);
        obj.scripts.add(DESTROY_ON_LEAVE);
        obj.scripts.removeDefault();
        obj.defaultShape = getStar(5, mySize, 0.5);
        obj.transform.rotation = Math.PI;
        obj.transform.position = myPosition;
        obj.scripts(PHYSICS).velocity = mySpeed;
        obj.scripts(PHYSICS).angularVelocity = 0.01;
        this.opacity = 0;
        this.opacityChange = 0.01;
        // this.myDirection = new Vector2(1,1);
    }

    /** @param {WorldObject} obj */
    update(obj) {
        this.opacity += this.opacityChange;
        if (obj.transform.position.x < ourArena.middle.x) {
            this.opacityChange = -0.01;
        }
    }

    /** @param {Polygon} shape */
    draw(obj, name, shape) {
        renderer.draw(new Color(255, 255, 255, this.opacity)).shape(obj.defaultShape);
    }

    /**
     * @param {*} mySize size of star
     * @param {Vector2} myPosition starting position
     * @param {Vector2} mySpeed movement each frame
     * @returns 
     */
    static create(mySize, myPosition, mySpeed) {
        // create scene object
        let myElement = scene.main.addElement("ScrollingStar", 0, 0);
        // attach script as behavior
        myElement.scripts.add(SCROLLING_STAR, mySize, myPosition, mySpeed);
        // return it to the wonderful person who called create()
        return myElement;
    }


}

class PLAYER extends ElementScript {

    /** @param {WorldObject} obj */
    init(obj, myPosition) {
        obj.scripts.removeDefault();
        obj.scripts.add(ONLY_COLLISION, false);
        obj.scripts(PHYSICS).gravity = true;
        // obj.scripts.add(FALL_OVER);
        obj.transform.position = myPosition;
        obj.defaultShape = Polygon.regular(6, 10);
        this.maxHealth = 100;
        this.health = 0;
        this.health = this.maxHealth;
        this.iFrames = 0;
        this.alive = true;
        this.position = myPosition;
    }

    /** @param {WorldObject} obj */
    update(obj) {
        this.position = obj.transform.position;
        const physics = obj.scripts(PHYSICS);
        let grounded = !!physics.colliding.test((collision) => {  // this turns it from truthy to simply true. It is the process of research
            return collision.direction.y > 0 && collision.element.scripts.has(ARENA_WALLS);
        });
        const floatiness = 0.2;
        const acceleration = 1 / 3;
        const maxSpeed = 3;
        const jumpSpeed = -5;
        const holdingLeft = keyboard.pressed(['A', 'ArrowLeft']);
        const holdingRight = keyboard.pressed(['D', 'ArrowRight']);
        const holdingUp = keyboard.pressed(['W', ' ', 'ArrowUp']);
        const hit = !!physics.colliding.test((collision) => {
            return collision.isTrigger;
        });

        if (hit && this.iFrames === 0) {
            this.iFrames = 30;
            this.health -= 20;
            // mySynth.play({ duration: 100, note: 'E', octave: 3, wave: "sawtooth", volume: 0.5 });
            // mySynth.play({ duration: 100, note: 'F', octave: 3, volume: 2 });
            hitSound.play();
            if (this.health <= 0) {
                obj.remove();
                location.reload();
            }
        }

        if (holdingUp && grounded) {
            physics.velocity.y = jumpSpeed;
            grounded = false;
        }
        if (!grounded) {
            if (holdingUp && physics.velocity.y < 0) {
                physics.velocity.y -= floatiness;
            }
        }

        if (physics.velocity.x < maxSpeed) {
            physics.velocity.x += holdingRight * acceleration;
        }
        if (physics.velocity.x > -maxSpeed) {
            physics.velocity.x -= holdingLeft * acceleration;
        }
        if (!holdingRight && !holdingLeft) {
            physics.velocity.x /= 1.2;
        }

        if (this.iFrames > 0) {
            this.iFrames--;
        }

    }

    /** @param {Polygon} shape */
    draw(obj, name, shape) {
        renderer.draw(new Color("blue")).shape(shape);
    }

    /**
     * @param {Vector2} myPosition starting position
     * @returns 
     */
    static create(myPosition) {
        // create scene object
        let myElement = scene.main.addPhysicsElement("Player", 0, 0);
        // attach script as behavior
        myElement.scripts.add(PLAYER, myPosition);
        // return it to the wonderful person who called create()
        return myElement;
    }

}

class ARENA_WALLS extends ElementScript {
    /** @param {WorldObject} obj */
    init(obj, myRectangle, myThickness) {
        obj.scripts.removeDefault();
        obj.scripts.add(ONLY_COLLISION, false);
        obj.scripts(PHYSICS).mobile = false;
        obj.addShape("Left", new Rect(myRectangle.min.x - myThickness, myRectangle.min.y - myThickness, myThickness, myRectangle.height + myThickness));
        obj.addShape("Right", new Rect(myRectangle.max.x, myRectangle.min.y - myThickness, myThickness, myRectangle.height + myThickness));
        obj.addShape("Up", new Rect(myRectangle.min.x - myThickness, myRectangle.min.y - myThickness, myRectangle.width + myThickness, myThickness));
        obj.addShape("Down", new Rect(myRectangle.min.x - myThickness, myRectangle.max.y, myRectangle.width + myThickness + myThickness, myThickness));
    }

    /** @param {Polygon} shape */
    draw(obj, name, shape) {
        renderer.draw(new Color(255, 255, 255, 1)).shape(shape);
        // console.log("Hi, I'm " +name);
    }

    /**
     * @param {Rect} myRectangle inside of the Arena
     * @param {number} myThickness thickness of the walls of the arena (aesthetic)
     * @returns 
     */
    static create(myRectangle, myThickness) {
        // create scene object
        let myElement = scene.main.addElement("ArenaWalls", 0, 0);
        // attach script as behavior
        myElement.scripts.add(ARENA_WALLS, myRectangle, myThickness);
        // return it to the wonderful person who called create()
        return myElement;
    }
}

class BIG_FALLING_STAR extends ElementScript {
    init(obj, myTarget) {
        obj.scripts.removeDefault();
        obj.scripts.add(ONLY_COLLISION);
        obj.defaultShape = getStar(5, 75, 0.5);
        const distanceMovedX = Random.range(200);
        const distanceMovedY = myTarget.y - (ourArena.min.y - 100);
        obj.transform.position = new Vector2(myTarget.x + distanceMovedX, ourArena.min.y - 100);
        obj.scripts(PHYSICS).velocity = new Vector2(-distanceMovedX / 60, distanceMovedY / 60);
        obj.scripts(PHYSICS).angularVelocity = 0.1;
    }

    /** @param {WorldObject} obj */
    update(obj) {
        if (obj.lifeSpan > 60) {
            const hitWall = !!obj.scripts(PHYSICS).colliding.test((collision) => {
                return collision.element.scripts.has(ARENA_WALLS);
            });
            if (hitWall) {
                const count = Random.int(8, 12);
                for (let i = 0; i < count; i++) {
                    SMALL_STAR.create(obj.transform.position.get(), Random.circle(0.5));
                }
                obj.remove();
            }
        }

    }

    draw(obj, name, shape) {
        renderer.draw(new Color(255, 255, 255, 1)).shape(shape);
    }

    static create(myTarget) {
        let myElement = scene.main.addElement("BigFallingStar", 0, 0);
        // console.log(this.myDirection);
        // attach script as behavior
        myElement.scripts.add(BIG_FALLING_STAR, myTarget);
        // return it to the wonderful person who called create()
        return myElement;
    }
}

class ONLY_COLLISION extends ElementScript {
    /** @param {WorldObject} obj */
    init(obj, trigger = true) { // if trigger isn't there, defaults to true
        obj.scripts.add(PHYSICS, true);
        obj.scripts(PHYSICS).gravity = false;
        obj.scripts(PHYSICS).airResistance = false;
        obj.scripts(PHYSICS).friction = 0;
        obj.scripts(PHYSICS).isTrigger = trigger;
    }
    collideRule(obj, other) {
        return !(obj.scripts(PHYSICS).isTrigger && other.scripts(PHYSICS).isTrigger);
    }
}

class HEALTH_BAR extends ElementScript {
    init(obj, myPlayer) {
        this.maxWidth = obj.defaultShape.width;
        this.myPlayer = myPlayer;
        this.maxHealth = myPlayer.scripts(PLAYER).maxHealth;
    }

    /** @param {WorldObject} obj */
    update(obj) {
        let width = this.myPlayer.scripts(PLAYER).health * (this.maxWidth / this.maxHealth);
        obj.defaultShape = new Rect(obj.defaultShape.x, obj.defaultShape.y, width, obj.defaultShape.height);
    }

    draw(obj, name, shape) {
        ui.draw(new Color("Red")).shape(shape);
    }

    /**
     * @param {Vector2} center
     * @param {number} width
     * @param {number} height 
     * @returns 
     */
    static create(xy, width, height, myPlayer) {
        let myElement = scene.main.addUIElement("HealthBar", xy, width, height);
        // attach script as behavior
        myElement.scripts.add(HEALTH_BAR, myPlayer);
        // return it to the wonderful person who called create()
        return myElement;
    }
}

class GENERAL_SPAWNER extends ElementScript {
    init(obj, mySpawningFunction, minTime, maxTime) {
        obj.scripts.removeDefault();
        this.minTime = minTime;
        this.maxTime = maxTime;
        this.spawn = mySpawningFunction;
        this.timer = 0;
        this.yay();
    }

    yay() {
        this.threshold = Random.int(this.minTime, this.maxTime);
    }

    /** @param {WorldObject} obj */
    update(obj) {
        this.timer++;

        if (this.timer >= this.threshold) {
            this.spawn();
            this.yay();
            this.timer = 0;
        }

        if (obj.lifeSpan === spawnerCycle) {
            obj.remove();
        }
    }

    static create(mySpawningFunction, minTime, maxTime) {
        // create scene object
        let myElement = scene.main.addElement("GeneralSpawner", 0, 0);
        // attach script as behavior
        myElement.scripts.add(GENERAL_SPAWNER, mySpawningFunction, minTime, maxTime);
        // return it to the wonderful person who called create()
        return myElement;
    }
}

class WARNING extends ElementScript {
    init(obj, image, rotation, expirationTime, spawn, persistence = 0) {
        obj.scripts.removeDefault();
        this.image = image;
        obj.transform.rotation = rotation;
        this.expirationTime = expirationTime;
        this.persistence = persistence;
        this.spawn = spawn;
        this.duration = expirationTime + persistence;
    }

    /** @param {WorldObject} obj */
    update(obj) {
        if (obj.lifeSpan === this.expirationTime) {
            this.spawn();
        }
        if (obj.lifeSpan === this.duration) {
            obj.remove();
        }
    }

    draw(obj, name, shape) {
        renderer.image(this.image).rect(shape);
    }

    static create(image, position, rotation, expirationTime, spawn, persistence) {
        // create scene object
        let myElement = scene.main.addRectElement("Warning", position, image.width * PX, image.height * PX);
        // attach script as behavior
        myElement.scripts.add(WARNING, image, rotation, expirationTime, spawn, persistence);
        // return it to the wonderful person who called create()
        return myElement;
    }
}

//#endregion

//#region spawning

let starSpawners = [
    [
        () => {
            const position = ourPlayer.scripts(PLAYER).position.get();
            WARNING.create(warning, position, 0, 90, () => BIG_FALLING_STAR.create(position))
        },
        160, 200
    ],
    [
        () => LOVELY_STAR.create(),
        45, 75
    ],
    [
        () => {
            if (Random.bool(0.5)) { // was 0.2, then 0.4. Random size used to go down all the way to 5
                SCROLLING_STAR.create(
                    Random.int(10, 20),
                    new Vector2(ourArena.max.x + 75, Random.int(ourArena.min.y + 5, ourArena.max.y - 5)),
                    Vector2.left
                );
            }
        },
        15, 15
    ],
    [
        () => {
            const COLUMNS = Math.floor(ourArena.width / (40 * PX));
            const BATCH = 1;
            const DURATION = 200;
            const BATCHES = Math.ceil(COLUMNS / BATCH);
            const columns = Array.dim(COLUMNS).map((_, i) => i);
            Random.shuffle(columns);
            OVER_TIME.loop(BATCHES, i => {
                for (let j = 0; j < BATCH; j++)
                    SWEEPER.create(columns[i * BATCH + j], 1 / COLUMNS, Random.sign());
            }, DURATION / BATCHES);
        },
        500, 500
    ],
    [
        () => {
            const position = new Vector2(Random.range(ourArena.min.x - 20, ourArena.max.x + 20), ourArena.min.y - 20);
            const funPosition = position.plus(new Vector2(-30, -40));
            const starCount = 10;
            let wandAnimateVelocity = 0;
            const timeBetween = 4;
            const myWand = WARNING.create(
                wand, funPosition, 0, 40,
                () => {
                    const avgSpeed = 2;
                    const speedVar = 0.3;
                    const directionVar = 0.15;

                    OVER_TIME.loop(starCount, i => {
                        const finalPos = ourPlayer.transform.position;
                        const direction = finalPos.minus(position).normalized;
                        const yourPath = direction.times(avgSpeed + Random.range(speedVar)).rotate(Random.range(directionVar));
                        SMALL_STAR.create(position, yourPath, Random.range(10, 20), Random.range(0.5, 0.7));
                        explodeSound.play(0.1);
                    }, timeBetween);
                },
                starCount*timeBetween + 10
            );
            intervals.transition((t) => {
                const frames = t * myWand.scripts(WARNING).duration
                if (frames < 30) {
                    wandAnimateVelocity += 0.015;
                }
                else if (frames < 40) {
                    wandAnimateVelocity -= 0.045;
                }
                myWand.transform.rotation += wandAnimateVelocity;
            }, myWand.scripts(WARNING).duration);
        },
        100, 140
    ]
];
//#endregion

ARENA_WALLS.create(ourArena, 10);

let ourPlayer = PLAYER.create(ourArena.middle);
HEALTH_BAR.create(new Vector2(ourArena.middle.x, ourArena.max.y + 50), 400, 20, ourPlayer);

intervals.continuous((frameCounter) => {
    if (frameCounter % spawnerCycle === 0 && frameCounter < 5000) {
        if (starSpawners.length > 1) {
            Random.shuffle(starSpawners);
            GENERAL_SPAWNER.create(...starSpawners[0]);
            GENERAL_SPAWNER.create(...starSpawners[1]);
        }
        else {
            GENERAL_SPAWNER.create(...starSpawners[0]);
        }
    }
});