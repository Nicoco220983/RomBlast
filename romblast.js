const { assign } = Object
const { abs, floor, min, max, pow, random: rand, cos, sin, tan, PI } = Math
const { log } = console

import * as MSG from './msgame.js'
const { Game, Scene, Sprite, SpriteSheet, Anim, Text, Aud } = MSG
const { randge, range, bound } = MSG

// game

const WIDTH = 600, HEIGHT = 400
const RUN_SPD = 400
const ANCHOR_X = .5
const ANCHOR_Y = 1

const VOLUME_LEVEL = 0.3

let it = 0
const SKY_Z = it++
const VOLCANO_FLAME_Z = it++
const VOLCANO_FIREBALL_Z = it++
const FIREBAND_Z = it++
const GROUND_Z = it++
const BUSH_Z = it++
const SHADOW_Z = it++
const WALKING_Z = it++
const EXPLOSION_Z = it++
const FLYING_Z = it++
const NOTIF_Z = it++


export class ExampleGame extends Game {

    width = WIDTH
    height = HEIGHT
    paused = false

    start() {
        super.start()
        document.addEventListener("focus", () => this.pause(false))
        document.addEventListener("blur", () => this.pause(true))
        this.on("click", (...args) => {
            this.scene.trigger("click", ...args)
            this.addVolumeBut()
            if (MSG.collide(this.volumeBut, this.pointer))
                this.volumeBut.trigger("click")
        })
        this.on("dblclick", (...args) => {
            this.scene.trigger("dblclick", ...args)
        })
        this.restart()
    }
    restart() {
        this.scene = new ExampleScene(this)
    }
    update(dt) {
        super.update(dt)
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

// scene

class ExampleScene extends Scene {

    step = null
    score = 0

    start() {
        super.start()
        this.step = "START"
        //this.addIntroSprites()
        //this.on("click", () => this.ongoing())
        this.initHero()
        ExampleScene.starters.forEach(fn => fn(this))
        this.ongoing()
    }
    initHero(){
        this.hero = this.addSprite(Hero, {
            screenX: 200,
            x: 200,
            y: HEIGHT/2,
        })
        this.on("dblclick", () => {
            if(this.step !== "ONGOING") return
            this.hero.shoot()
        })
    }
    update(dt) {
        super.update(dt)
        if (this.step == "ONGOING") {
            this.viewX += RUN_SPD * dt
            ExampleScene.updaters.forEach(fn => fn(this))
            if (this.hero.life == 0) this.finish()
        }
    }
    draw(dt) {
        const viewX = this.viewX, viewY = this.viewY, ctx = this.canvas.getContext("2d")
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
        const args = {
            x: WIDTH / 2,
            font: "30px Arial",
            color: "red",
            anchorX: .5,
            anchorY: 0,
            viewF: 0
        }
        this.addSprite(Text, {
            ...args,
            y: 200,
            value: `FINITO`,
            z: NOTIF_Z,
        })
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
            this.game.restart()
        })
    }
}
ExampleScene.starters = []
ExampleScene.ongoers = []
ExampleScene.updaters = []

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
            this.scene.canvas.requestFullscreen({
                navigationUI: "hide"
            })
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
    z = NOTIF_Z
    anchorX = .5
    anchorY = 1

    update(dt) {
        super.update(dt)
        this.y -= 20 * dt
        if (this.time > .5) this.remove()
    }
}

// Life

ExampleScene.ongoers.push(scn => {
    scn.addSprite(Text, {
        x: 450,
        y: 40,
        value: () => `Life: ${scn.hero.life}`,
        color: "red",
        viewF: 0,
        z: NOTIF_Z,
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
        z: SKY_Z,
    })
    scn.addSprite(Sprite, {
        x: 43,
        y: -17,
        width: 50,
        height: 50,
        anim: VolcanoFlameAnim,
        viewF: 0,
        z: VOLCANO_FLAME_Z,
    })
    scn.groundTiler = new GroundTiler(scn)
    scn.groundTiler.addNewTiles()
    scn.bushTiler = new  BushTiler(scn)
    scn.bushTiler.addNewTiles()
    scn.fireBandTiler = new  FireBandTiler(scn)
    scn.fireBandTiler.addNewTiles()
})

ExampleScene.updaters.push(scn => {
    scn.groundTiler.addNewTiles()
    scn.bushTiler.addNewTiles()
    scn.fireBandTiler.addNewTiles()
})

class Ground extends _Sprite {
    width = TILE_WIDTH
    height = TILE_HEIGHT
    z = GROUND_Z
    anim = GroundAnim
}

class GroundTiler extends MSG.Tiler {

    tileWidth = TILE_WIDTH
    tileHeight = TILE_HEIGHT

    addTile(nx, ny) {
        this.scene.addSprite(Ground, {
            x: nx * TILE_WIDTH,
            y: ny * TILE_HEIGHT + GROUND_Y,
        })
    }
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

class Bush extends _Sprite {

    width = BUSH_WIDTH
    height = BUSH_HEIGHT
    z = BUSH_Z

    constructor(...args){
        super(...args)
        this.anim = BushesAnims[floor(rand()*6)]
    }
}

class BushTiler extends MSG.Tiler {

    tileWidth = BUSH_WIDTH / BUSH_MULTIPLICATOR
    tileHeight = BUSH_HEIGHT / BUSH_MULTIPLICATOR

    getNyRange() {
        return [0, 0]
    }

    addTile(nx, ny) {
        this.scene.addSprite(Bush, {
            x: nx / BUSH_MULTIPLICATOR * BUSH_WIDTH,
            y: GROUND_Y - (.25 + .3 * rand()) * BUSH_HEIGHT,
        })
    }
}

// fire band

const FireBandSS = new SpriteSheet(absPath('assets/sprite_fire_band.png'), {
    frameWidth: 6000/25,
    frameHeight: 180
})
const FireBandAnim = new Anim(range(25).map(i => FireBandSS.getFrame(i)), { fps: 15 })

const FIREBAND_WIDTH = 60
const FIREBAND_HEIGHT = 50
const FIREBAND_VIEWF = .3

class FireBand extends _Sprite {
    width = FIREBAND_WIDTH
    height = FIREBAND_HEIGHT
    z = FIREBAND_Z
    anim = FireBandAnim
    viewF = FIREBAND_VIEWF
}

class FireBandTiler extends MSG.Tiler {

    tileWidth = FIREBAND_WIDTH
    tileHeight = FIREBAND_HEIGHT

    getNyRange() {
        return [0, 0]
    }

    addTile(nx, ny) {
        this.scene.addSprite(FireBand, {
            x: nx * FIREBAND_WIDTH,
            y: 50,
        })
    }
}



// hero

const SPDMAX = 2000, ACC = 2000, DEC = 2000
const DAMAGE_GRACE_TIME = 1

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
    life = 3
    lastDamageTime = -DAMAGE_GRACE_TIME
    z = WALKING_Z

    update(dt){
        super.update(dt)
        this.x = this.screenX + this.scene.viewX
        if(this.scene.step == "ONGOING") {
            this.updAnim(dt)
            this.applyPlayerControls(dt)
        }
    }
    inGrace(){
        return this.time < this.lastDamageTime + DAMAGE_GRACE_TIME
    }
    damage() {
        if(this.inGrace()) return
        const scn = this.scene
        // scn.score -= n
        // scn.addSprite(Notif, {
        //     x: this.x,
        //     y: HERO_Y - 50,
        //     value: "-" + n,
        //     color: "red"
        // })
        this.life -= 1
        scn.addSprite(MSG.Flash, {
            width: WIDTH,
            height: HEIGHT,
            rgb: "255,0,0",
            viewF: 0,
            z: NOTIF_Z,
        })
        this.lastDamageTime = this.time
        //ouchAud.replay()
    }
    updAnim(dt){
        if(this.inGrace()) {
            this.animAlpha = ((this.time - this.lastDamageTime) / .2) % 1 < .5 ? 0 : 1
        } else {
            delete this.animAlpha
        }
    }
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
    getHitBox() {
        const { x, y, width, height } = this.getBoundaries()
        return {
            x: x + 10,
            y: y + 20,
            width: width - 20,
            height: height - 20,
        }
    }
    shoot() {
        this.scene.addSprite(Iceball, {
            x: this.x + 70,
            y: this.y - 80
        })
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

    width = 130
    height = 100
    speed = FIREBALL_SPEED
    anim = FireballAnim
    anchorX = 1
    anchorY = 1
    z = FLYING_Z

    start() {
        this.initPos()
    }

    initPos() {
        const distanceToTarget = 500
        this.screenX = this.targetX - distanceToTarget * cos(this.angle)
        this.y = this.targetY - distanceToTarget * sin(this.angle)
        this.shadow = this.scene.addSprite(Shadow, {
            x: this.targetX,
            y: this.targetY
        })
    }

    update(dt){
        super.update(dt)
        this.updPos(dt)
        this.checkExistence()
    }

    updPos(dt) {
        this.screenX += this.speed * cos(this.angle) * dt
        this.x = this.screenX + this.scene.viewX
        this.y += this.speed * sin(this.angle) * dt
    }

    checkExistence() {
        if(this.y >= this.targetY) {
            this.scene.addSprite(Explosion, { x:this.x, y:this.y })
            this.scene.addSprite(Fire, { x:this.x, y:this.y })
            this.remove()
            this.shadow.remove()
            this.scene.score += 1
        }
    }

    getHitBox() {
        const { x, y } = this.getBoundaries()
        return {
            x: x + 80,
            y: y + 50,
            width: 50,
            height: 50,
        }
    }
}

class VolcanoFireball extends Fireball {

    width = 25
    height = 17
    speed = FIREBALL_SPEED/4
    viewF = 0
    z = VOLCANO_FIREBALL_Z

    initPos() {}

    updPos(dt) {
        this.x += this.speed * cos(this.angle) * dt
        this.y += this.speed * sin(this.angle) * dt
    }

    checkExistence() {
        if (this.time > 5) this.remove()
    }
}

function createRandomFireball(scn) {
    const nTime = scn.nextFireballTime || 0
    if(nTime > scn.time)
        return
    scn.addSprite(Fireball, {
        targetX: WIDTH - (300 * pow(rand(), 1.5)),
        targetY: GROUND_Y + (HEIGHT - GROUND_Y) * rand(),
        angle: PI/4,
    })
    scn.nextFireballTime = scn.time + 2 / (1 + scn.score / 10)
}

function createRandomVolcanoFireball(scn) {
    if(rand()>.02) return
    scn.addSprite(VolcanoFireball, {
        x: 70,
        y: 40,
        angle: -1 * (PI/4 + rand() * PI/2),
    })
}

ExampleScene.updaters.push(createRandomFireball)
ExampleScene.updaters.push(createRandomVolcanoFireball)


// iceball

const ICEBALL_SPEED = 500

const IceballSS = new SpriteSheet(absPath('assets/iceball.png'), {
    frameWidth: 2250/9,
    frameHeight: 175
})
const IceballAnim = new Anim(range(9).map(i => IceballSS.getFrame(i)), { fps: 15 })

class Iceball extends _Sprite {

    width = 75
    height = 53
    speed = ICEBALL_SPEED
    anim = IceballAnim
    anchorX = 1
    anchorY = 0
    z = FLYING_Z
    angle = - PI / 4

    start() {
        this.screenX = this.x - this.scene.viewX
    }

    update(dt){
        super.update(dt)
        this.updPos(dt)
        this.checkExistence()
        this.scene.sprites.forEach(fireball => {
            if(!(fireball instanceof Fireball)) return
            if (MSG.collide(this.getHitBox(), fireball.getHitBox())) this.hit(fireball)
        })
    }

    updPos(dt) {
        this.screenX += this.speed * cos(this.angle) * dt
        this.x = this.screenX + this.scene.viewX
        this.y += this.speed * sin(this.angle) * dt
    }

    checkExistence() {
        if(this.y + this.height < 0) this.remove
    }

    getHitBox() {
        const { x, y } = this.getBoundaries()
        return {
            x: x + 50,
            y,
            width: 25,
            height: 25,
        }
    }

    hit(fireball) {
        this.remove()
        fireball.remove()
        this.scene.addSprite(IceExplosion, {
            x: fireball.x,
            y: fireball.y,
        })
    }
}


// ice explosion

const IceExplosionSS = new SpriteSheet(absPath('assets/sprite_ice_explosion.png'), {
    frameWidth: 300/3,
    frameHeight: 188/2
})
const IceExplosionAnim = new Anim(range(6).map(i => IceExplosionSS.getFrame(i)), { fps: 15, loop: false })

class IceExplosion extends _Sprite {

    width = 150
    height = 150
    anim = IceExplosionAnim
    anchorX = .5
    anchorY = .5
    z = EXPLOSION_Z

    update(dt) {
        super.update(dt)
        if(this.time >= .5) this.remove()
    }
}

// shadow

class Shadow extends _Sprite {

    width = 30
    height = 15
    anim = "black"
    animShape = "circle"
    animAlpha = .5
    viewF = 0
    anchorX = .5
    anchorY = .5
    z = SHADOW_Z
}


// explosion

const ExplosionSS = new SpriteSheet(absPath('assets/sprite_explosion.png'), {
    frameWidth: 300/3,
    frameHeight: 188/2
})
const ExplosionAnim = new Anim(range(6).map(i => ExplosionSS.getFrame(i)), { fps: 15, loop: false })

class Explosion extends _Sprite {

    width = 150
    height = 150
    anim = ExplosionAnim
    anchorX = .5
    anchorY = .5
    z = EXPLOSION_Z

    start() {
        super.start()
        if (MSG.collide(this, this.scene.hero.getHitBox())) {
            this.scene.hero.damage()
        }
    }

    update(dt) {
        super.update(dt)
        if(this.time >= .5) this.remove()
    }
}

// fire

const FireSS = new SpriteSheet(absPath('assets/sprite_fire.png'), {
    frameWidth: 900/9,
    frameHeight: 100
})
const FireAnim = new Anim(range(9).map(i => FireSS.getFrame(i)), { fps: 15 })

class Fire extends _Sprite {

    width = 50
    height = 50
    anim = FireAnim
    anchorX = .5
    anchorY = 1
    z = WALKING_Z

    start() {
        super.start()
    }

    update(dt) {
        super.update(dt)
        if(this.x+this.width < this.scene.viewX) this.remove()
        if (MSG.collide(this.getHitBox(), this.scene.hero.getHitBox())) {
            this.scene.hero.damage()
        }
    }

    getHitBox() {
        const { x, y, width, height } = this.getBoundaries()
        return {
            x: x + 10,
            y: y + 20,
            width: width - 20,
            height: height - 20,
        }
    }
}


// score

ExampleScene.ongoers.push(scn => {
    scn.addSprite(Text, {
        x: 450,
        y: 15,
        value: () => `Score: ${scn.score}`,
        color: "red",
        viewF: 0,
        z: NOTIF_Z,
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