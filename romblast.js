const { assign } = Object
const { abs, floor, min, max, pow, random: rand, cos, sin, PI } = Math
const { log } = console

import * as MSG from './msgame.js'
const { Game, Scene, Sprite, SpriteSheet, Anim, Text, Aud } = MSG
const { randge, range, bound } = MSG

// game

const WIDTH = 600, HEIGHT = 400
const RUN_SPD = 400
const ANCHOR_X = .5
const ANCHOR_Y = 1
const DURATION = 60

const VOLUME_LEVEL = 0.3

export class ExampleGame extends Game {

    paused = false

    constructor(...args) {
        super(...args)
        document.addEventListener("focus", () => this.pause(false))
        document.addEventListener("blur", () => this.pause(true))
        this.addPointerDownListener(pos => {
            this.addVolumeBut()
            this.scene.trigger("click", pos)
            if (MSG.collide(this.volumeBut, pos))
                this.volumeBut.trigger("click")
        })
    }
    start() {
        this.scene = new ExampleScene(this)
    }
    update(dt) {
        if(this.paused) {
            if(!this.pauseScene) this.pauseScene = new PauseScene(this)
            this.pauseScene.update(dt)
            return
        }
        this.scene.update(dt)
    }
    draw(dt) {
        const ctx = this.canvas.getContext("2d")
        this.scene.drawTo(ctx, this.paused ? 0 : dt)
        if(this.paused) this.pauseScene.drawTo(ctx, dt)
        if(this.volumeBut) this.volumeBut.drawTo(ctx, dt, 0, 0)
    }
    addVolumeBut() {
        if(this.volumeBut) return
        this.volumeBut = new VolumeBut(this)
        this.volumeBut.set({ x: this.width - 40, y: 40 })
    }
    pause(val) {
        if (val === this.paused) return
        this.paused = val
        MSG.pauseAudios(val)
    }
}
ExampleGame.prototype.width = WIDTH
ExampleGame.prototype.height = HEIGHT

// scene

class ExampleScene extends Scene {

    viewX = 0
    viewY = 0
    step = "START"

    constructor(...args) {
        super(...args)
        this.start()
    }
    initHero(){
        this.hero = this.addSprite(Hero, {
            screenX: 200,
            x: 200,
            y: HEIGHT/2,
        })
    }
    update(dt) {
        super.update(dt)
        if (this.step == "ONGOING") {
            this.viewX += RUN_SPD * dt
            ExampleScene.updaters.forEach(fn => fn(this))
            if (this.time > DURATION + 3) this.finish()
        }
    }
    draw(dt) {
        const viewX = this.viewX, viewY = this.viewY, ctx = this.canvas.getContext("2d")
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, WIDTH, HEIGHT)
        this.sprites.sort((a, b) => {
            const dz = (a.z - b.z)
            if(dz !== 0) return dz > 0
            return (a.y - b.y) > 0
        })
        this.sprites.forEach(sprite => {
            if(sprite.removed) return
            const viewF = sprite.viewF === undefined ? 1 : sprite.viewF
            sprite.drawTo(ctx, dt, viewX * viewF, viewY * viewF)
        })
    }
    start() {
        this.step = "START"
        //this.addIntroSprites()
        //this.on("click", () => this.ongoing())
        this.initHero()
        ExampleScene.starters.forEach(fn => fn(this))
        this.ongoing()
    }
    // addIntroSprites() {
    //     this.introSprites = []
    //     const addIntro = (cls, kwargs) => {
    //         const sprite = this.addSprite(cls, kwargs)
    //         this.introSprites.push(sprite)
    //     }
    //     const args = {
    //         x: WIDTH / 2,
    //         font: "20px Arial",
    //         anchorX: .5,
    //         anchorY: 0
    //     }
    //     addIntro(Text, {
    //         ...args, y: 60,
    //         value: "MsGame",
    //         font: "60px Arial",
    //     })
    //     addIntro(Text, {
    //         ...args, y: 130,
    //         value: "What a light game engine !",
    //         lineHeight: 30
    //     })
    //     addIntro(Text, {
    //         ...args, y: 550,
    //         value: "Touchez pour commencer"
    //     })
    // }
    ongoing() {
        if (this.step != "START") return
        this.step = "ONGOING"
        ExampleScene.ongoers.forEach(fn => fn(this))
        // const aud = new Aud(absPath('assets/music.mp3'))
        // MSG.waitLoads(aud).then(() => aud.replay({ baseVolume: .2, loop: true }))
        // this.once("remove", () => aud.pause())
    }
    finish() {
        this.step = "END"
        // this.hero.anim = HeroAnims.happy
        // let x = WIDTH / 2
        // let font = "30px Arial"
        // const anchorX = .5, anchorY = 0
        // this.addSprite(Text, {
        //     x, y: 200,
        //     font, anchorX, anchorY,
        //     value: `SCORE: ${this.score}`,
        //     fixed: true
        // })
        // font = "20px Arial"
        // let text = "J'espere que ce jeu vous a plu ;)"
        // this.addSprite(Text, {
        //     x, y: 300,
        //     font, anchorX, anchorY,
        //     value: text,
        //     lineHeight: 40,
        //     fixed: true
        // })
        // this.addSprite(Text, {
        //     x, y: 550,
        //     font, anchorX, anchorY,
        //     value: `Touchez pour recommencer`,
        //     fixed: true
        // })
        this.once("click", () => {
            this.remove()
            this.game.start()
        })
    }
}
ExampleScene.starters = []
ExampleScene.ongoers = []
ExampleScene.updaters = []

// function removeIfOut(sprite) {
//     const scn = sprite.scene
//     if((sprite.y - sprite.height) > ( scn.viewX + scn.height)) {
//         sprite.remove()
//     }
// }

// pause

class PauseScene extends Scene {
    constructor(...args) {
        super(...args)
        this.initCanvas()
    }
    initCanvas() {
        // background
        const ctx = this.canvas.getContext("2d")
        ctx.fillStyle = "rgb(0,0,0,0.5)"
        ctx.fillRect(0, 0, this.width, this.height)
        // text
        const text = new Text(this, {
            x: this.width/2,
            y: this.height/2,
            font: "40px Arial",
            anchorX: .5,
            anchorY: .5,
            value: "Pause"
        })
        text.drawTo(ctx, 0, 0, 0)
    }
}

// volume

let volumeMuted = false

MSG.setVolumeLevel(VOLUME_LEVEL)

const volumeSS = new SpriteSheet(absPath('assets/volume.png'), {
    frameWidth: 50,
    frameHeight: 50
})

const VolumeAnims = [0, 1].map(i => new Anim(volumeSS.getFrame(i)))

class VolumeBut extends Sprite {

    width = 50
    height = 50
    anchorX = .5
    anchorY = .5

    constructor(...args) {
        super(...args)
        this.syncAnim()
        this.on("click", () => {
            volumeMuted = !volumeMuted
            MSG.setVolumeLevel(volumeMuted ? 0 : VOLUME_LEVEL)
            this.syncAnim()
        })
    }
    syncAnim() {
        this.anim = VolumeAnims[volumeMuted ? 1 : 0]
    }
}

// common

class _Sprite extends Sprite {
    
    update(dt) {
        super.update(dt)
        // remove if out
        const scn = this.scene
        if((this.x - this.width) > ( scn.viewX + scn.width)) {
            this.remove()
        }
    }
}

class Notif extends Text {

    viewF = 0
    z = 10
    anchorX = .5
    anchorY = 1

    update(dt) {
        super.update(dt)
        this.y -= 20 * dt
        if (this.time > .5) this.remove()
    }
}

// time

ExampleScene.ongoers.push(scn => {
    scn.time = 0
    scn.addSprite(Text, {
        x: 450,
        y: 40,
        value: () => `Time: ${max(0, floor(DURATION - scn.time))}`,
        color: "red",
        viewF: 0,
        z: 10
    })
})

// background

const GROUND_Y = 100

const TILE_WIDTH = 1000
const TILE_HEIGHT = 300

const GroundAnim = new Anim(absPath('assets/ground.jpg'))

const VolcanoAnim = new Anim(absPath('assets/volcano.jpg'))
const VolcanoFlameSS = new SpriteSheet(absPath('assets/volcano_flame.png'), {
    frameWidth: 4200/84,
    frameHeight: 45
})
const VolcanoFlameAnim = new Anim(range(84).map(i => VolcanoFlameSS.getFrame(i)), { fps: 15 })

ExampleScene.starters.push(scn => {
    scn.addSprite(Sprite, {
        width: WIDTH,
        height: GROUND_Y,
        anim: VolcanoAnim,
        viewF: 0,
        z: -1
    })
    scn.addSprite(Sprite, {
        x: 43,
        y: -17,
        width: 50,
        height: 50,
        anim: VolcanoFlameAnim,
        viewF: 0,
        z: -.9
    })
    createNewTiles(scn)
    createNewBushes(scn)
    createNewFires(scn)
})

ExampleScene.updaters.push(scn => {
    createNewTiles(scn)
    createNewBushes(scn)
    createNewFires(scn)
})

let TilesMinNx = 1, TilesMaxNx = 0, TilesMinNy = 1, TilesMaxNy = 0

function createNewTiles(scn) {
    let _tilesMinNx = TilesMinNx, _tilesMaxNx = TilesMaxNx, _tilesMinNy = TilesMinNy, _tilesMaxNy = TilesMaxNy
    for(let nx = floor(scn.viewX/TILE_WIDTH); nx < (scn.viewX + WIDTH)/TILE_WIDTH; ++nx) {
        for(let ny = floor(scn.viewY/TILE_HEIGHT); ny < (scn.viewY + HEIGHT - GROUND_Y)/TILE_HEIGHT; ++ny) {
            if(nx >= TilesMinNx && nx <= TilesMaxNx && ny >= TilesMinNy && ny <= TilesMaxNy) continue
            scn.addSprite(Tile, {
                x: nx * TILE_WIDTH,
                y: ny * TILE_HEIGHT + GROUND_Y,
            })
            _tilesMinNx = min(_tilesMinNx, nx)
            _tilesMaxNx = max(_tilesMaxNx, nx)
            _tilesMinNy = min(_tilesMinNy, ny)
            _tilesMaxNy = max(_tilesMaxNy, ny)
        }
    }
    TilesMinNx = _tilesMinNx
    TilesMaxNx = _tilesMaxNx
    TilesMinNy = _tilesMinNy
    TilesMaxNy = _tilesMaxNy
}

class Tile extends _Sprite {
    width = TILE_WIDTH
    height = TILE_HEIGHT
    z = -1
    autoTransformImg = false
    anim = GroundAnim
}


// bushes

const BushesSS = new SpriteSheet(absPath('assets/bushes.png'), {
    frameWidth: 150,
    frameHeight: 100
})
const BushesAnims = range(6).map(i => new Anim(BushesSS.getFrame(i)))

const BUSH_WIDTH = 75
const BUSH_HEIGHT = 50
const BUSH_MULTIPLICATOR = 3

let BushesMinNx = 1, BushesMaxNx = 0

function createNewBushes(scn) {
    let _bushesMinNx = BushesMinNx, _bushesMaxNx = BushesMaxNx
    for(let nx = 0; nx < (scn.viewX + WIDTH)/BUSH_WIDTH*BUSH_MULTIPLICATOR; ++nx) {
        if(nx >= BushesMinNx && nx <= BushesMaxNx) continue
        scn.addSprite(Bush, {
            x: nx * BUSH_WIDTH / BUSH_MULTIPLICATOR,
            y: GROUND_Y - (.25 + .3 * rand()) * BUSH_HEIGHT,
        })
        _bushesMinNx = min(_bushesMinNx, nx)
        _bushesMaxNx = max(_bushesMaxNx, nx)
    }
    BushesMinNx = _bushesMinNx
    BushesMaxNx = _bushesMaxNx
}

class Bush extends _Sprite {

    width = BUSH_WIDTH
    height = BUSH_HEIGHT
    z = -.8
    autoTransformImg = false

    constructor(...args){
        super(...args)
        this.anim = BushesAnims[floor(rand()*6)]
    }
}

// fire

const FireSS = new SpriteSheet(absPath('assets/sprites_fire.png'), {
    frameWidth: 6000/25,
    frameHeight: 180
})
const FireAnim = new Anim(range(25).map(i => FireSS.getFrame(i)), { fps: 15 })

const FIRE_WIDTH = 60
const FIRE_HEIGHT = 50
const FIRE_VIEWF = .3

class Fire extends _Sprite {
    width = FIRE_WIDTH
    height = FIRE_HEIGHT
    z = -.9
    autoTransformImg = false
    anim = FireAnim
    viewF = FIRE_VIEWF
}

let FiresMinNx = 1, FiresMaxNx = 0

function createNewFires(scn) {
    let minNx = FiresMinNx, maxNx = FiresMaxNx
    for(let nx = 0; nx < (scn.viewX*FIRE_VIEWF + WIDTH)/FIRE_WIDTH; ++nx) {
        if(nx >= FiresMinNx && nx <= FiresMaxNx) continue
        scn.addSprite(Fire, {
            x: nx * FIRE_WIDTH,
            y: 50,
        })
        minNx = min(minNx, nx)
        maxNx = max(maxNx, nx)
    }
    FiresMinNx = minNx
    FiresMaxNx = maxNx
}

// hero

const SPDMAX = 2000, ACC = 2000, DEC = 2000

const heroSS = new SpriteSheet(absPath('assets/loup_running.png'), {
    frameWidth: 107,
    frameHeight: 67
})
const HeroAnims = {
    run: new Anim([0,3,2,1].map(i => heroSS.getFrame(i)), { fps: 15 }),
}

//const ouchAud = new Aud(absPath('assets/ouch.mp3'), { baseVolume: .2 })

class Hero extends _Sprite {

    anim = HeroAnims.run
    width = 107
    height = 67
    anchorX = ANCHOR_X
    anchorY = ANCHOR_Y
    screenX = 0
    dx = 0
    dy = 0
    damageTime = null
    autoTransformImg = false

    update(dt){
        super.update(dt)
        this.x = this.screenX + this.scene.viewX
        if(this.scene.step == "ONGOING") {
            //this.updAnim(dt)
            this.applyPlayerControls(dt)
        }
    }
    // damage(n) {
    //     const scn = this.scene
    //     scn.score -= n
    //     scn.addSprite(Notif, {
    //         x: this.x,
    //         y: HERO_Y - 50,
    //         value: "-" + n,
    //         color: "red"
    //     })
    //     scn.addSprite(MSG.Flash, {
    //         width: WIDTH,
    //         height: HEIGHT,
    //         rgb: "255,0,0",
    //         fixed: true
    //     })
    //     this.damageTime = this.time
    //     ouchAud.replay()
    // }
    // updAnim(dt){
    //     if(this.damageTime !== null && this.time < this.damageTime + 1) {
    //         this.anim = HeroAnims.aouch
    //         this.animAlpha = ((this.time - this.damageTime) / .2) % 1 < .5
    //     } else {
    //         this.anim = HeroAnims.run
    //         delete this.animAlpha
    //     }
    // }
    applyPlayerControls(dt){
        const pointer = this.scene.game.pointer
        if (pointer.isDown) {
            this.dx = MSG.accToPos(this.screenX, pointer.x, this.dx, SPDMAX, ACC, DEC, dt)
            this.dy = MSG.accToPos(this.y, pointer.y, this.dy, SPDMAX, ACC, DEC, dt)
        } else {
            this.dx = MSG.accToSpd(this.dx, 0, ACC, DEC, dt)
            this.dy = MSG.accToSpd(this.dy, 0, ACC, DEC, dt)
        }
        this.screenX = bound(this.screenX + this.dx * dt, this.width/2, WIDTH - this.width/2)
        this.y = bound(this.y + this.dy * dt, GROUND_Y + this.height*.7, HEIGHT)
    }
}

// ExampleScene.ongoers.push(scn => {
//     const game = scn.game, hero = scn.hero
//     hero.anim = HeroAnims.run
// })


// fireball

const FIREBALL_SPEED = 150

const FireballSS = new SpriteSheet(absPath('assets/fireball.png'), {
    frameWidth: 2250/9,
    frameHeight: 175
})
const FireballAnim = new Anim(range(9).map(i => FireballSS.getFrame(i)), { fps: 15 })

class Fireball extends _Sprite {

    width = 100
    height = 70
    screenX = 0
    speed = FIREBALL_SPEED
    anim = FireballAnim
    anchorX = ANCHOR_X
    anchorY = ANCHOR_Y

    update(dt){
        super.update(dt)
        this.screenX += this.speed * cos(this.angle) * dt
        this.x = this.screenX + this.scene.viewX
        this.y += this.speed * sin(this.angle) * dt
    }
}

function createRandomFireball(scn) {
    if(rand()>.02) return
    scn.addSprite(Fireball, {
        screenX: rand() * 200,
        y: 0,
        angle: PI/4,
    })
}

function createRandomVolcanoFireball(scn) {
    if(rand()>.05) return
    scn.addSprite(Fireball, {
        width: 25,
        height: 17,
        screenX: 75,
        y: 40,
        angle: -1 * (PI/4 + rand() * PI/2),
        speed: FIREBALL_SPEED/4,
        ttl: 5,
    })
}

ExampleScene.updaters.push(createRandomFireball)
ExampleScene.updaters.push(createRandomVolcanoFireball)


// score

ExampleScene.ongoers.push(scn => {
    scn.score = 10
    scn.addSprite(Text, {
        x: 450,
        y: 15,
        value: () => `Score: ${scn.score}`,
        color: "red",
        viewF: 0,
        z: 10
    })
})


// enemy

// const ENEMY_SIZE = 40

// const EnemyAnim = new Anim(absPath('assets/enemy.png'))

// class Enemy extends _Sprite {
//     constructor(...args) {
//         super(...args)
//         this.x = ENEMY_SIZE / 2 + rand() * (WIDTH - ENEMY_SIZE / 2)
//         this.y = this.scene.viewY
//         this.anim = EnemyAnim
//         this.width = ENEMY_SIZE
//         this.height = ENEMY_SIZE
//         this.anchorX = ANCHOR_X
//         this.anchorY = ANCHOR_Y
//         this.score = 1
//         this.autoTransformImg = false
//     }
//     update(dt){
//         super.update(dt)
//         if (MSG.collide(this, this.scene.hero))
//             this.onCollide(this.scene.hero)
//     }
//     onCollide(hero) {
//         if(!this.collided)
//             hero.damage(this.score)
//         this.collided = true
//     }
// }

// ExampleScene.updaters.push(scn => {
//     if (scn.time > DURATION) return
//     const nextTime = scn.enemyNextTime || 0
//     if (scn.time > nextTime) {
//         scn.addSprite(Enemy)
//         scn.enemyNextTime = scn.time + randge(.3, .7)
//     }
// })

// utils

function absPath(relPath){
    const url = new URL(relPath, import.meta.url)
    return url.pathname
}