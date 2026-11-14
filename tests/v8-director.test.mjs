import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import * as THREE from 'three'

const html = fs.readFileSync('public/v8.html', 'utf8')

function loadDirector () {
  const source = fs.readFileSync('public/v8-director.js', 'utf8')
  class Features {}
  class World {
    constructor () {
      this.content = new THREE.Group()
      this.currentScene = 'campus'
      this.state = {name: '법우', level: 1, outfit: 'basic', appearance: {gender: 'female', hair: 'bob'}}
    }
    buildAvatar () {
      this.player = {scale: new THREE.Vector3(1, 1, 1)}
    }
    getState () { return this.state }
    mat (color, options = {}) { return new THREE.MeshStandardMaterial({color, ...options}) }
    mesh (geometry, material, parent, x = 0, y = 0, z = 0) {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, y, z); parent.add(mesh); return mesh
    }
  }
  const window = {
    THREE,
    innerWidth: 1440,
    HanmaumAvatar: {
      FACE: {
        neutral: {rx: .44, ry: .45, jaw: .84, brow: .025, arch: .025, eyeX: .029, eyeY: .041, mouth: .15, smile: .035},
        male: {rx: .46, ry: .44, jaw: .96, brow: .037, arch: .008, eyeX: .033, eyeY: .032, mouth: .18, smile: .018},
        female: {rx: .42, ry: .47, jaw: .74, brow: .021, arch: .05, eyeX: .034, eyeY: .048, mouth: .15, smile: .05}
      },
      appearance: value => ({
        gender: ['male', 'female', 'neutral'].includes(value?.gender) ? value.gender : 'neutral',
        hair: ['short', 'bob', 'bun', 'shaved'].includes(value?.hair) ? value.hair : 'short',
        skin: value?.skin || '#e9ba91',
        hairColor: value?.hairColor || '#3b3931',
        robeColor: value?.robeColor || '#70a994'
      }),
      poseRig () {},
      portrait () { return '<svg></svg>' },
      createActor () { return new THREE.Group() }
    },
    HanmaumFeatures: Features,
    HanmaumWorld: World
  }
  const document = {
    addEventListener () {},
    getElementById () { return null },
    body: {classList: {add () {}, remove () {}}}
  }
  const context = vm.createContext({window, document, globalThis: {}, console, setTimeout, clearTimeout})
  vm.runInContext(source, context)
  return window
}

test('director assets load after stable v8 patches and before app startup', () => {
  const director = html.indexOf('<script src="/v8-director.js"></script>')
  assert.ok(director > html.indexOf('<script src="/v8-ui.js"></script>'))
  assert.ok(director < html.indexOf('<script data-source="app.js">'))
  assert.match(html, /<link rel="stylesheet" href="\/v8-director\.css">/)
})

test('modern young adult actors preserve the complete gesture rig and stand above the floor', () => {
  const window = loadDirector()
  for (const gender of ['male', 'female', 'neutral']) {
    for (const hair of ['short', 'bob', 'bun', 'shaved']) {
      const actor = window.HanmaumAvatar.createActor({name: '법우', appearance: {gender, hair}, outfit: 'basic'})
      const rig = actor.userData.rig
      assert.equal(rig.arms.length, 2)
      assert.equal(rig.elbows.length, 2)
      assert.equal(rig.wrists.length, 2)
      assert.equal(rig.hands.length, 2)
      assert.equal(rig.legs.length, 2)
      assert.ok(rig.torso.position.y >= 0.85)
      assert.ok(new THREE.Box3().setFromObject(actor).min.y >= -0.01)
    }
  }
})

test('the local 3D player uses the modern actor instead of the closed-over legacy builder', () => {
  const window = loadDirector()
  const world = new window.HanmaumWorld()
  world.buildAvatar()
  assert.equal(world.player.userData.directorStyle.outfit, 'field-jacket')
  assert.equal(world.player.userData.rig.elbows.length, 2)
  assert.equal(world.player.parent, world.content)
})

test('female basic look uses the approved field jacket while every portrait stays modern', () => {
  const window = loadDirector()
  const female = window.HanmaumAvatar.portrait('hae', 'basic', false, {gender: 'female', hair: 'bob'})
  const male = window.HanmaumAvatar.portrait('hae', 'basic', false, {gender: 'male', hair: 'short'})
  assert.match(female, /data-style="modern-youth"/)
  assert.match(female, /data-outfit="field-jacket"/)
  assert.match(female, /#f4f1e9/i)
  assert.match(female, /#3f4748/i)
  assert.match(male, /data-style="modern-youth"/)
  assert.doesNotMatch(male, /data-outfit="field-jacket"/)
  assert.equal(window.HanmaumDirector.characterStyle({gender: 'female', outfit: 'basic'}).outfit, 'field-jacket')
})

test('fresh entry asks only for a nickname and presentation before the first lantern route', () => {
  const window = loadDirector()
  const female = window.HanmaumDirector.firstEntry({name: '법우', appearance: {gender: 'female'}})
  assert.equal(female.promise, '마음을 담은 등을 만들어 도량에 남겨보세요')
  assert.deepEqual(Array.from(female.fields), ['name', 'gender'])
  assert.equal(female.appearance.gender, 'female')
  assert.equal(female.appearance.hair, 'bob')
  assert.equal(female.appearance.robeColor, '#819985')
  assert.doesNotMatch(female.markup, /setupHair|type="color"|피부색|머리색/)
  assert.match(female.markup, /첫 등 만들기/)
  assert.match(fs.readFileSync('public/v8-director.js', 'utf8'), /featurePrototype[\s\S]*showProfile/)
  assert.match(fs.readFileSync('public/v8-director.js', 'utf8'), /featurePrototype\.previewProfile[\s\S]*data-director-entry/)
  assert.match(html, /머리 모양/)
  assert.match(html, /profile-colors/)
})

test('director HUD keeps controls reachable while meeting mobile touch sizes', () => {
  const css = fs.readFileSync('public/v8-director.css', 'utf8')
  assert.match(css, /#mGoal[^}]*min-height:\s*44px/s)
  assert.match(css, /#mSheetClose[^}]*min-width:\s*44px/s)
  assert.match(css, /#mBack[^}]*width:\s*44px/s)
  assert.match(css, /\.world-label[^}]*min-height:\s*44px/s)
  assert.match(css, /\.world-marker[^}]*min-height:\s*44px/s)
  assert.match(css, /#dailyPeek[^}]*display:\s*none/s)
  assert.match(css, /#currencyPill[^}]*display:\s*none/s)
  assert.match(fs.readFileSync('public/v8-director.js', 'utf8'), /hanmaum-journey-touch-hint-v1/)
})

