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
    buildAvatar () {
      this.player = {scale: new THREE.Vector3(1, 1, 1)}
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

