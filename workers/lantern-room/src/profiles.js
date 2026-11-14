/* 방마다 다른 것만 모아 둔 곳입니다. 방 로직(room.js)은 이 프로필을 통해서만
   장면 경계·좌표 검사·명단 모양을 봅니다. 그래서 등불사장(v1)과 v8 이
   같은 방 코드를 씁니다. 방 이름으로 갈립니다.

   v1 을 고치지 않습니다. 이미 배포돼 돌고 있습니다. */
import { validatePose, validateEvent, validateHello } from '../../../src/deungbul/realtime/protocol.js'
import {
  V8_SCENES, V8_LIMITS, V8_ROOM, V8_MAP_VERSION,
  validateV8Hello, validateV8Pose, validateV8Event, v8PublicOf
} from '../../../src/v8/relayProtocol.js'

export const SCENE_BOUNDS = {
  yard: { w: 36, h: 26, maxSpeed: 8 },
  grounds: { w: 48, h: 34, maxSpeed: 8 },
  hall: { w: 26, h: 20, maxSpeed: 8 },
  campus: { w: 126, h: 70, maxSpeed: 8 }
}

/* 등불사장·도량·대법당. 지금 배포돼 있는 그 동작입니다. */
export const V1_PROFILE = {
  name: 'campus-v2',
  allowSceneChange: false,
  mapVersion: 'campus-v2',
  bounds: scene => SCENE_BOUNDS[scene],
  validateHello,
  validatePose,
  validateEvent,
  publicOf: s => ({
    id: s.id, nick: s.nickname, sex: s.appearance.sex, color: s.appearance.color,
    scene: s.sceneId, x: s.x, z: s.z, vx: s.vx, vz: s.vz, yaw: s.yaw,
    motion: s.motion, at: s.at, linkState: s.linkState
  }),
  spawn: (hello, b) => ({ x: b.w / 2, z: b.h / 2, vx: 0, vz: 0, yaw: 0, motion: 'stand' }),
  apply: (s, v) => Object.assign(s, {
    sceneId: v.sceneId, x: v.x, z: v.z, vx: v.vx, vz: v.vz, yaw: v.yaw, motion: v.motion
  }),
  freeze: s => { s.vx = s.vz = 0 }
}

/* v8 한 파일. 장면이 아홉이고 높이(y)와 생김새·옷이 따로 있습니다. */
const V8_BOUNDS = Object.fromEntries(V8_SCENES.map(scene => [scene, { coord: V8_LIMITS.coord, maxSpeed: V8_LIMITS.maxSpeed }]))

export const V8_PROFILE = {
  name: V8_ROOM,
  allowSceneChange: true,
  mapVersion: V8_MAP_VERSION,
  bounds: scene => V8_BOUNDS[scene],
  validateHello: validateV8Hello,
  validatePose: validateV8Pose,
  validateEvent: validateV8Event,
  publicOf: v8PublicOf,
  // v8 은 사람이 선 자리를 클라이언트가 정합니다. 첫 pose 가 올 때까지 원점에 둡니다.
  spawn: hello => ({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rotation: 0, outfit: hello.outfit }),
  apply: (s, v) => Object.assign(s, {
    sceneId: v.sceneId, x: v.x, y: v.y, z: v.z, vx: v.vx, vy: v.vy, vz: v.vz, rotation: v.rotation
  }),
  freeze: s => { s.vx = s.vy = s.vz = 0 },

  /* 이름·생김새·옷은 들어올 때 정하고 바뀌지 않습니다. 매번 다시 보내면
     80명이 다 움직일 때 1인당 초당 56KB 가 됩니다(2026-11-14 측정).
     처음 한 번과 전체 명단에만 싣고, 이후에는 움직이는 값만 보냅니다.
     좌표는 소수 셋째 자리까지면 충분합니다(한 칸 2.5m 이므로 2.5mm).
     linkState 는 'live' 가 보통이라 그때는 빼고, 받는 쪽이 기본값으로 둡니다. */
  deltaOf: s => {
    const r = {
      id: s.id, scene: s.sceneId,
      x: round(s.x), y: round(s.y), z: round(s.z),
      vx: round(s.vx), vy: round(s.vy), vz: round(s.vz),
      rotation: round(s.rotation), at: s.at
    }
    if (s.linkState !== 'live') r.linkState = s.linkState
    return r
  }
}

const round = v => Math.round((Number(v) || 0) * 1000) / 1000

// 'load-test' 는 v1 용, 'v8-load-test' 는 v8 용 전용 시험 방입니다.
// 봇은 운영 방(campus-v2 · v8)에 넣지 않습니다.
export const V8_LOAD_ROOM = 'v8-load-test'
export const PROFILES = {
  'campus-v2': V1_PROFILE,
  'load-test': V1_PROFILE,
  [V8_ROOM]: V8_PROFILE,
  [V8_LOAD_ROOM]: V8_PROFILE
}
export const profileFor = roomName => PROFILES[roomName] || null
