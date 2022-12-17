const { assign } = Object
const { abs, floor, ceil, min, max, pow, sqrt, random: rand, cos, sin, tan, PI } = Math
const { log } = console

import * as MSG from './msgame.js'
const { Game, Scene, Sprite, SpriteSheet, Anim, Text, Aud, absPath } = MSG
const { randge, range, bound } = MSG

// game

const WIDTH = 600, HEIGHT = 400
const RUN_SPD = 400
const ANCHOR_X = .5
const ANCHOR_Y = 1
const LIFE = 5
const FONT = "Serif"
const SHOOT_PERIOD = .5

Aud.MaxVolumeLevel = 0.3

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


export class RomblastGame extends Game {

    width = WIDTH
    height = HEIGHT

    start() {
        super.start()
        document.addEventListener("focus", () => this.pause(false))
        document.addEventListener("blur", () => this.pause(true))
        this.addGameButtons()
        this.addPointerDownListener(pos => {
            for(let but of this.gameButs) {
                if (MSG.collide(but, pos)) {
                    but.trigger("click")
                    return
                }
            }
            this.scene.trigger("click", pos)
        })
        this.on("dblclick", (...args) => {
            this.scene.trigger("dblclick", ...args)
        })
        this.restart("INTRO")
    }
    restart(step) {
        this.scene = new RomblastScene(this, step)
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
        this.gameButs.forEach(b => b.drawTo(ctx, dt, 0, 0))
    }
    addGameButtons() {
        this.gameButs = []
        const size = 40, padding = 10
        for(let cls of [MSG.VolumeBut, MSG.FullscreenBut, MSG.PauseBut]) {
            this.gameButs.push(new cls(this, {
                anchorX: 1,
                anchorY: 0,
                width: size,
                height: size,
                x: this.width - padding - (size + padding) * this.gameButs.length,
                y: padding,
                animCall: "compose,source-in,0,red",
            }))
        }
    }
}

// scene

const SCORE_BONUS_LIFETIME = 2

class RomblastScene extends Scene {

    constructor(game, startStep, kwargs){
        super(game, {
            score: 0,
            scoreBonus: 0,
            scoreBonusLastUpdTime: 0,
            ...kwargs
        })
        this.startStep = startStep
    }
    start() {
        super.start()
        RomblastScene.starters.forEach(fn => fn(this))
        this.setStep(this.startStep)
    }
    setStep(step) {
        if(step === this.step) return
        this.step = step
        if(step === "INTRO") {
            this.addIntroSprites()
            this.once("click", () => this.setStep("GAME"))
        } else if(step === "GAME") {
            this.sprites.forEach(s => { if(s.isIntro) s.remove() })
            RomblastScene.ongoers.forEach(fn => fn(this))
            this.initHero()
            this.gameMusic = new Aud(absPath('assets/Gigakoops-Revenge_from_Behind_the_Grave.mp3'))
            MSG.waitLoads(this.gameMusic).then(() => this.gameMusic.replay({ baseVolume: .1, loop: true }))
            this.once("remove", () => this.gameMusic.remove())
        } else if(step === "GAMEOVER") {
            this.hero.remove()
            this.addGameoverSprites()
            this.gameMusic.pause()
            this.gameoverMusic = new Aud(absPath('assets/Steve_Combs-Ambient_507050.mp3'))
            MSG.waitLoads(this.gameoverMusic).then(() => this.gameoverMusic.replay({ baseVolume: .2, loop: true }))
            this.once("remove", () => this.gameoverMusic.remove())
        }
    }
    initHero(){
        this.hero = this.addSprite(Hero)
        this.on("dblclick", () => {
            if(this.hero && !this.hero.removed)
                this.hero.shoot()
        })
    }
    update(dt) {
        super.update(dt)
        this.viewX += RUN_SPD * dt
        RomblastScene.updaters.forEach(fn => fn(this))
        if(this.step === "GAME") {
            if (this.hero.life == 0) {
                this.setStep("GAMEOVER")
            }
            if(this.time > this.scoreBonusLastUpdTime) {
                const malus = ceil(this.scoreBonus / 2)
                this.updScoreBonus(-malus)
            }
        }
    }
    updScoreBonus(up) {
        this.scoreBonus = max(0, this.scoreBonus + up)
        this.scoreBonusLastUpdTime = this.time + SCORE_BONUS_LIFETIME
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
    addIntroSprites() {
        const args = {
            x: WIDTH / 2,
            font: `20px ${FONT}`,
            color: "red",
            anchorX: .5,
            anchorY: 0,
            z: NOTIF_Z,
            viewF: 0,
            isIntro: true,
        }
        this.addSprite(Text, {
            ...args, y: 180,
            value: "RomBlast",
            font: `60px Cursive`,
        })
        this.addSprite(Text, {
            ...args, y: 350,
            value: "Touchez pour commencer"
        })
    }
    addGameoverSprites() {
        const args = {
            x: WIDTH / 2,
            color: "red",
            anchorX: .5,
            anchorY: 0,
            z: NOTIF_Z,
            viewF: 0,
        }
        this.addSprite(Text, {
            ...args,
            y: 180,
            value: `GAME OVER`,
            font: `60px Cursive`,
        })
        this.on(2, () => {
            this.addSprite(Text, {
                ...args, y: 350,
                font: `20px ${FONT}`,
                value: "Touchez pour recommencer"
            })
            this.once("click", () => {
                this.remove()
                this.game.restart("GAME")
            })
        })
    }
}
RomblastScene.starters = []
RomblastScene.ongoers = []
RomblastScene.updaters = []

// pause

class PauseScene extends Scene {
    constructor(...args) {
        super(...args)
        this.initCanvas()
    }
    initCanvas() {
        // background
        const ctx = this.canvas.getContext("2d")
        ctx.fillStyle = "rgb(0,0,0,0.2)"
        ctx.fillRect(0, 0, this.width, this.height)
        // text
        const text = new Text(this, {
            x: this.width/2,
            y: this.height/2,
            font: `40px ${FONT}`,
            color: "#F99",
            anchorX: .5,
            anchorY: .5,
            value: "Pause"
        })
        text.drawTo(ctx, 0, 0, 0)
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

// Hearts

const HeartSS = new SpriteSheet(absPath('assets/heart.png'), {
    frameWidth: 50,
    frameHeight: 50
})
const HeartAnims = range(2).map(i => new Anim(HeartSS.getFrame(i)))

class Heart extends _Sprite {

    width = 20
    height = 20
    viewF = 0
    z = NOTIF_Z

    update(dt){
        super.update(dt)
        this.anim = HeartAnims[(this.scene.hero.life > this.num) ? 0 : 1]
    }
}

RomblastScene.ongoers.push(scn => {
    for(let i of range(LIFE)) {
        scn.addSprite(Heart, {
            num: i,
            x: 150 + i * 25,
            y: 10,
        })
    }
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

RomblastScene.starters.push(scn => {
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

RomblastScene.updaters.push(scn => {
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
const DAMAGE_GRACE_DURATION = 1
const SUPERPOWER_DURATION = 3

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
    z = WALKING_Z

    constructor(scn, kwargs){
        super(scn, {
            screenX: -50,
            x: -50,
            y: HEIGHT*2/3,
            dx: 0,
            dy: 0,
            life: LIFE,
            lastDamageTime: -DAMAGE_GRACE_DURATION,
            lastSuperPowerTime: -SUPERPOWER_DURATION,
            startPos: null,
            step: "INTRO",
            ...kwargs
        })
    }

    update(dt){
        super.update(dt)
        this.updAnim(dt)
        this.applyPlayerControls(dt)
        this.x = this.screenX + this.scene.viewX
    }
    isSuperPower(){
        return this.time < this.lastSuperPowerTime + SUPERPOWER_DURATION
    }
    isVulnerable(){
        return this.time >= this.lastDamageTime + DAMAGE_GRACE_DURATION
    }
    damage() {
        if(!this.isVulnerable() || this.isSuperPower()) return
        const scn = this.scene
        this.life -= 1
        // this.scene.scoreBonus = 0
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
    hitBonus() {
        this.lastSuperPowerTime = this.time
    }
    updAnim(dt){
        if(this.isSuperPower()) {
            const callStr = "compose,destination-in,yellow,0;compose,overlay,0,1"
            this.animCall = ((this.time - this.lastDamageTime) / .2) % 1 < .5 ? callStr : null
        } else {
            this.animCall = null
        }
        if(this.isVulnerable()) {
            delete this.animAlpha
        } else {
            this.animAlpha = ((this.time - this.lastDamageTime) / .2) % 1 < .5 ? 0 : 1
        }
    }
    applyPlayerControls(dt){
        if(this.step === "INTRO") {
            this.dx = MSG.accToPos(this.screenX, this.width, this.dx, SPDMAX, ACC, DEC, dt)
            this.screenX +=this.dx * dt
            if(this.screenX > this.width) this.step = "GAME"
            return
        }
        const pointer = this.scene.game.pointer
        if (pointer.isDown) {
            if(this.startPos === null) {
                this.startPos = {
                    pointerX: pointer.x,
                    pointerY: pointer.y,
                    screenX: this.screenX,
                    y: this.y,
                }
            }
            this.dx = MSG.accToPos(this.screenX, this.startPos.screenX + pointer.x - this.startPos.pointerX, this.dx, SPDMAX, ACC, DEC, dt)
            this.dy = MSG.accToPos(this.y, this.startPos.y + pointer.y - this.startPos.pointerY, this.dy, SPDMAX, ACC, DEC, dt)
        } else {
            this.startPos = null
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
        this.every("shoot", this.isSuperPower() ? SHOOT_PERIOD/4 : SHOOT_PERIOD, () => {
            this.scene.addSprite(Iceball, {
                x: this.x + 70,
                y: this.y - 80
            })
        })
    }
    remove(){
        super.remove()
        this.scene.addSprite(IceExplosion, {
            x: this.x,
            y: this.y
        })
    }
}

// RomblastScene.ongoers.push(scn => {
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
        const distanceToTarget = 500
        this.screenX = this.targetX - distanceToTarget * cos(this.angle) + 40
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
        }
    }

    remove(removedByHero) {
        super.remove()
        if(this.shadow) this.shadow.remove()
        if(this.scene.step === "GAME") {
            this.scene.score += 1
            if(removedByHero) this.scene.score += this.scene.scoreBonus
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

class VolcanoFireball extends _Sprite {

    width = 25
    height = 17
    speed = FIREBALL_SPEED/4
    anim = FireballAnim
    anchorX = 1
    anchorY = 1
    viewF = 0
    z = VOLCANO_FIREBALL_Z

    update(dt){
        super.update(dt)
        this.updPos(dt)
        this.checkExistence()
    }

    updPos(dt) {
        this.x += this.speed * cos(this.angle) * dt
        this.y += this.speed * sin(this.angle) * dt
    }

    checkExistence() {
        if (this.time > 5) this.remove()
    }
}

function createRandomFireball(scn) {
    if(scn.step === "INTRO") return
    const nTime = scn.nextFireballTime || 0
    if(nTime > scn.time)
        return
    const minY = GROUND_Y + 40
    scn.addSprite(Fireball, {
        targetX: WIDTH - (300 * pow(rand(), 1.5)),
        targetY: minY+ (HEIGHT - minY) * rand(),
        angle: PI/4,
    })
    scn.nextFireballTime = scn.time + getNextFireballPeriod(scn)
}

function createRandomVolcanoFireball(scn) {
    const nTime = scn.nextVolcanoFireballTime || 0
    if(nTime > scn.time)
        return
    scn.addSprite(VolcanoFireball, {
        x: 80,
        y: 40,
        angle: -1 * (PI/4 + rand() * PI/2),
    })
    scn.nextVolcanoFireballTime = scn.time + getNextFireballPeriod(scn) / 2
}

function getNextFireballPeriod(scn) {
    return 2 / sqrt(1 + scn.score / 5)
}

RomblastScene.updaters.push(createRandomFireball)
RomblastScene.updaters.push(createRandomVolcanoFireball)


class BonusFireball extends _Sprite {

    width = 130
    height = 100
    speed = FIREBALL_SPEED
    anim = IceballAnim
    anchorX = 1
    anchorY = 1
    z = FLYING_Z

    start() {
        const distanceToTarget = 500
        this.screenX = this.targetX - distanceToTarget * cos(this.angle) + 40
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
            this.scene.addSprite(IceExplosion, { x:this.x, y:this.y })
            this.scene.addSprite(Bonus, { x:this.x, y:this.y })
            this.remove()
        }
    }

    remove() {
        super.remove()
        if(this.shadow) this.shadow.remove()
    }
}

function createRandomBonusFireball(scn) {
    if(scn.step === "INTRO") return
    const nTime = scn.nextBonusFireballTime || 0
    if(nTime > scn.time)
        return
    const minY = GROUND_Y + 40
    scn.addSprite(BonusFireball, {
        targetX: WIDTH - (300 * pow(rand(), 1.5)),
        targetY: minY+ (HEIGHT - minY) * rand(),
        angle: PI/4,
    })
    scn.nextBonusFireballTime = scn.time + 5
}

RomblastScene.updaters.push(createRandomBonusFireball)


// bonus

const BonusAnim = new Anim(absPath('assets/bonus.png'))

class Bonus extends _Sprite {

    width = 50
    height = 50
    anim = BonusAnim
    anchorX = .5
    anchorY = 1
    z = WALKING_Z

    update(dt){
        super.update(dt)
        if(this.x+this.width < this.scene.viewX) this.remove()
        if(MSG.collide(this, this.scene.hero.getHitBox())) {
            this.scene.hero.hitBonus()
            this.remove()
        }
    }
}


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
            if(MSG.collide(this.getHitBox(), fireball.getHitBox())) this.hit(fireball)
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
        fireball.remove(true)
        this.remove(true)
        this.scene.addSprite(IceExplosion, {
            x: fireball.x + 5,
            y: fireball.y - 25,
        })
    }

    remove(removedByHit) {
        super.remove()
        if(removedByHit) this.scene.updScoreBonus(1)
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

    start() {
        super.start()
        explosionAudPool.next().replay({ force: true })
    }

    update(dt) {
        super.update(dt)
        if(this.time >= .5) this.remove()
    }
}

// shadow

class Shadow extends _Sprite {
    width = 30
    height = 15
    anim = "black_circle"
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

const explosionAudPool = new MSG.AudPool(3, absPath(`assets/boom.mp3`), { baseVolume: .1 })

class Explosion extends _Sprite {

    width = 150
    height = 150
    anim = ExplosionAnim
    anchorX = .5
    anchorY = .5
    z = EXPLOSION_Z

    start() {
        super.start()
        if (MSG.collide(this, this.scene.hero.getHitBox()))
            this.scene.hero.damage()
        if(this.scene.step === "GAME")
            explosionAudPool.next().replay({ force: true })
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

RomblastScene.ongoers.push(scn => {
    scn.addSprite(Text, {
        x: 330,
        y: 5,
        value: () => `Score: ${scn.score}`,
        font: `20px ${FONT}`,
        color: "red",
        viewF: 0,
        z: NOTIF_Z,
    })
    scn.addSprite(Text, {
        x: 330,
        y: 25,
        value: () => `Bonus: ${scn.scoreBonus}`,
        font: `20px ${FONT}`,
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

// RomblastScene.updaters.push(scn => {
//     if (scn.time > DURATION) return
//     const nextTime = scn.enemyNextTime || 0
//     if (scn.time > nextTime) {
//         scn.addSprite(Enemy)
//         scn.enemyNextTime = scn.time + randge(.3, .7)
//     }
// })
