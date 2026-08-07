canvas.clearScreen = () => (renderer.fill(new Color(0, 0, 0, 1)));

width = 1056;
height = 590;
let spawnerCycle = 300; // was 1200
let ourArena = new Rect(300, 100, 400, 400);
scene.physics.gravity.y = 0.3;
scene.mouseEvents = false;
const mySynth = new Synth();

/** @type {Sound} */
const explodeSound = loadResource("explode.mp3");
/** @type {Sound} */
const hitSound = loadResource("graze.mp3");
const warning = loadResource("!2.png"); 

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




//#endregion


//#region classes
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
                SMALL_STAR.create(myStarPoints[i].get(), obj.transform.position.get());
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
    init(obj, myVector2, myPosition) {
        obj.scripts.add(ONLY_COLLISION);
        obj.scripts.removeDefault();
        // obj.defaultShape = getStar(5, 15, 0.6);
        obj.defaultShape = getStar(5, 15, 0.6);
        obj.transform.rotation = Random.angle();
        obj.transform.position = myPosition;
        this.starRotation = 0.08;
        this.myDirection = myVector2.mul(1.5);
        //console.log(this.myDirection);
    }

    /** @param {WorldObject} obj */
    update(obj) {
        obj.transform.rotation += this.starRotation;
        obj.transform.position.add(this.myDirection);
        if (!obj.onScreen) {
            obj.remove();
        }
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
    static create(myVector2, myPosition) {
        // console.log(myVector2);
        // create scene object
        let myElement = scene.main.addElement("SmallStar", 0, 0);

        // console.log(this.myDirection);
        // attach script as behavior
        myElement.scripts.add(SMALL_STAR, myVector2, myPosition);
        // return it to the wonderful person who called create()
        return myElement;
    }
}

class SCROLLING_STAR extends ElementScript {

    /** @param {WorldObject} obj */
    init(obj, mySize, myPosition, mySpeed) {
        obj.scripts.add(ONLY_COLLISION);
        obj.scripts.removeDefault();
        obj.defaultShape = getStar(5, mySize, 0.5);
        obj.transform.rotation = Math.PI;
        obj.transform.position = myPosition;
        this.speed = mySpeed;
        this.starRotation = 0.01;
        this.opacity = 0;
        this.opacityChange = 0.01;
        // this.myDirection = new Vector2(1,1);
    }

    /** @param {WorldObject} obj */
    update(obj) {
        obj.transform.rotation += this.starRotation;
        obj.transform.position.add(this.speed);
        this.opacity += this.opacityChange;
        if (!obj.onScreen) {
            obj.remove();
        }
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
        obj.scripts(PHYSICS).mobile = true;
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
        this.position = myTarget;
        this.target = myTarget;
        this.widthHeight = 50;
        obj.defaultShape = new Rect(0,0, this.widthHeight, this.widthHeight).center(myTarget);
        this.star = false;
    }

    /** @param {WorldObject} obj */
    update(obj) {
        if (obj.lifeSpan === 90) {
            obj.scripts.add(ONLY_COLLISION);
            obj.scripts(PHYSICS).mobile = true;
            obj.defaultShape = getStar(5, 75, 0.5);
            const distanceMovedX = Random.int(-200, 200);
            const distanceMovedY = this.target.y - (ourArena.min.y - 100);
            obj.transform.position = new Vector2(this.target.x + distanceMovedX, ourArena.min.y - 100);
            // obj.transform.position = ourArena.middle;
            obj.scripts(PHYSICS).velocity = new Vector2(-distanceMovedX / 60, distanceMovedY / 60);
            obj.scripts(PHYSICS).angularVelocity = 0.1;
            this.star = true;
        }

        if (obj.lifeSpan > 150) {
            const hitWall = !!obj.scripts(PHYSICS).colliding.test((collision) => {
                return collision.element.scripts.has(ARENA_WALLS);
            });
            if (hitWall) {
                const count = Random.int(8, 12);
                for (let i = 0; i < count; i++) {
                    SMALL_STAR.create(Random.circle(0.5), obj.transform.position.get());
                }
                obj.remove();
            }
        }

    }

    draw(obj, name, shape) {
        if (!this.star) {
            // renderer.stroke(new Color(255, 0, 0, 1), 10, LineCap.ROUND, LineJoin.ROUND).shape(shape);
            renderer.image(warning).rect(shape);
        }
        else {
            renderer.draw(new Color(255, 255, 255, 1)).shape(shape);
        }
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
        obj.scripts.add(PHYSICS, false);
        obj.scripts(PHYSICS).gravity = false;
        obj.scripts(PHYSICS).airResistance = false;
        obj.scripts(PHYSICS).friction = 0;
        obj.scripts(PHYSICS).isTrigger = trigger;
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

//#endregion

//#region spawning

let starSpawners = [
    [
        () => BIG_FALLING_STAR.create(ourPlayer.scripts(PLAYER).position.get()),
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
                    new Vector2(-1, 0)
                );
            }
        },
        15, 15
    ]
];

//#endregion

ARENA_WALLS.create(ourArena, 10);

let ourPlayer = PLAYER.create(ourArena.middle);
HEALTH_BAR.create(new Vector2(ourArena.middle.x, ourArena.max.y + 50), 400, 20, ourPlayer);

intervals.continuous((frameCounter) => {
    if (frameCounter % spawnerCycle === 0) {
        Random.shuffle(starSpawners);
        GENERAL_SPAWNER.create(...starSpawners[0]);
        GENERAL_SPAWNER.create(...starSpawners[1]);
        
    }
});