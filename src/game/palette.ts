/** Shared color palette for generated pixel art (hex numbers, as Phaser expects). */
export const PALETTE = {
  background: 0x07080d,

  floor: 0x1a1d29,
  floorSeam: 0x141720,
  floorSpeck: 0x232738,

  wallTop: 0x343a52,
  wallTopHighlight: 0x4b5172,
  wallFace: 0x262a3d,
  wallMortar: 0x1b1e2c,

  playerOutline: 0x0b0d14,
  playerBody: 0x2c7a7b,
  playerHead: 0x4fd1c5,
  playerVisor: 0xe6fffb,
  shadow: 0x000000,

  guardOutline: 0x0b0d14,
  guardBody: 0x9b2c2c,
  guardHead: 0xe8a87c,
  guardCap: 0x2d3748,
  guardVisor: 0xfefcbf,

  // Vision cone and state icons
  visionCalm: 0xf6e05e,
  visionAlert: 0xed8936,
  visionChase: 0xe53e3e,
  noise: 0x90cdf4,

  // Characters
  playerBodyDark: 0x1d5556,
  playerHeadDark: 0x2c7a7b,
  pants: 0x1a202c,

  // Tiles (7A)
  floorPlate: 0x1c2030,
  floorPlateLight: 0x23283a,
  floorGrate: 0x151824,
  floorShadow: 0x10121b,
  wallPanel: 0x2a2f45,
  wallBase: 0x151826,
  wallAccent: 0x2c5a63,

  // Decorations
  crate: 0x6b4f2a,
  crateLight: 0x8a6a3c,
  crateDark: 0x3f2e18,
  metal: 0x4a5170,
  metalDark: 0x2b3047,
  screen: 0x0f2a2a,
  screenText: 0x4fd1c5,
  ledRed: 0xff4d4d,
  ledGreen: 0x68d391,
  hazardYellow: 0xd69e2e,

  // State icons
  iconPatrol: 0xa0aec0,
  iconCapture: 0xff4d4d,
} as const;
