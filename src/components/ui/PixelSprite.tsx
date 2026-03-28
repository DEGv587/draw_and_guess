/**
 * 像素画精灵组件
 * 使用 CSS box-shadow 技术绘制像素画
 * 每个 "像素" 是 1px 的 box-shadow，通过 scale() 放大
 */

// ============================================================
// 像素画基础渲染器
// ============================================================

interface PixelData {
  /** 像素网格宽度 */
  width: number
  /** 像素网格高度 */
  height: number
  /** 像素数据: [x, y, color][] */
  pixels: [number, number, string][]
}

function PixelRenderer({
  data,
  scale = 4,
  className = '',
  style = {},
}: {
  data: PixelData
  scale?: number
  className?: string
  style?: React.CSSProperties
}) {
  const shadows = data.pixels
    .map(([x, y, color]) => `${x}px ${y}px 0 ${color}`)
    .join(',')

  return (
    <div
      className={className}
      style={{
        width: data.width * scale,
        height: data.height * scale,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          width: '1px',
          height: '1px',
          boxShadow: shadows,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  )
}

// ============================================================
// 颜色常量
// ============================================================

const C = {
  // 马桶
  toiletWhite: '#f0f0ea',
  toiletLight: '#e0e0d6',
  toiletMid: '#c8c8be',
  toiletDark: '#a0a096',
  toiletShadow: '#787870',
  // 金色马桶
  goldLight: '#ffe066',
  goldMid: '#fbbf24',
  goldDark: '#d97706',
  goldShadow: '#92400e',
  // 角色
  skin: '#ffcc99',
  skinDark: '#e6b380',
  skinShadow: '#cc9966',
  hair: '#4a3728',
  hairDark: '#2e2218',
  eye: '#1a1a1a',
  mouth: '#cc6666',
  // 衣服颜色调色板
  shirts: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ec4899', '#14b8a6', '#f97316'] as const,
  // 门
  doorWood: '#c4943a',
  doorWoodLight: '#d4a44a',
  doorWoodDark: '#8b6914',
  doorFrame: '#5a4a2a',
  doorHandle: '#d4d4d4',
  doorHandleDark: '#a0a0a0',
  doorHinge: '#888888',
  // 绿灯/红灯
  lightGreen: '#4ade80',
  lightRed: '#ef4444',
  lightYellow: '#facc15',
  lightOff: '#3a3a3a',
  // 屎
  poopDark: '#5c3a1e',
  poopMid: '#8b5e34',
  poopLight: '#a67c52',
  poopHighlight: '#c49a6c',
  // 皇冠
  crownGold: '#fbbf24',
  crownDark: '#d97706',
  crownGem: '#ef4444',
  // 通用
  black: '#1a1a1a',
  transparent: 'transparent',
}

// ============================================================
// PixelToilet — 马桶
// ============================================================

function makeToiletPixels(variant: 'front' | 'back', gold = false): PixelData {
  const w = gold ? C.goldLight : C.toiletWhite
  const m = gold ? C.goldMid : C.toiletMid
  const d = gold ? C.goldDark : C.toiletDark
  const s = gold ? C.goldShadow : C.toiletShadow
  const l = gold ? C.goldLight : C.toiletLight

  if (variant === 'front') {
    // 16x14 正面马桶
    const pixels: [number, number, string][] = [
      // 水箱 (row 0-3)
      ...[4,5,6,7,8,9,10,11].map(x => [x, 0, m] as [number, number, string]),
      ...[3,4,5,6,7,8,9,10,11,12].map(x => [x, 1, w] as [number, number, string]),
      [3, 1, l], [12, 1, d],
      ...[3,4,5,6,7,8,9,10,11,12].map(x => [x, 2, w] as [number, number, string]),
      [3, 2, l], [12, 2, d],
      // 按钮
      [7, 1, d], [8, 1, d],
      ...[4,5,6,7,8,9,10,11].map(x => [x, 3, m] as [number, number, string]),
      // 马桶盖 (row 4)
      ...[2,3,4,5,6,7,8,9,10,11,12,13].map(x => [x, 4, m] as [number, number, string]),
      // 马桶身 (row 5-9)
      ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(x => [x, 5, w] as [number, number, string]),
      [1, 5, l], [14, 5, d],
      ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(x => [x, 6, w] as [number, number, string]),
      [1, 6, l], [14, 6, d],
      // 马桶洞
      ...[5,6,7,8,9,10].map(x => [x, 6, m] as [number, number, string]),
      ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(x => [x, 7, w] as [number, number, string]),
      [1, 7, l], [14, 7, d],
      ...[5,6,7,8,9,10].map(x => [x, 7, m] as [number, number, string]),
      ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(x => [x, 8, w] as [number, number, string]),
      [1, 8, l], [14, 8, d],
      ...[2,3,4,5,6,7,8,9,10,11,12,13].map(x => [x, 9, w] as [number, number, string]),
      [2, 9, l], [13, 9, d],
      // 马桶底座 (row 10-13)
      ...[3,4,5,6,7,8,9,10,11,12].map(x => [x, 10, w] as [number, number, string]),
      [3, 10, l], [12, 10, d],
      ...[3,4,5,6,7,8,9,10,11,12].map(x => [x, 11, w] as [number, number, string]),
      [3, 11, l], [12, 11, d],
      ...[2,3,4,5,6,7,8,9,10,11,12,13].map(x => [x, 12, m] as [number, number, string]),
      ...[2,3,4,5,6,7,8,9,10,11,12,13].map(x => [x, 13, s] as [number, number, string]),
    ]
    return { width: 16, height: 14, pixels }
  } else {
    // 16x12 背面马桶
    const pixels: [number, number, string][] = [
      // 水箱 (row 0-3)
      ...[4,5,6,7,8,9,10,11].map(x => [x, 0, d] as [number, number, string]),
      ...[3,4,5,6,7,8,9,10,11,12].map(x => [x, 1, m] as [number, number, string]),
      ...[3,4,5,6,7,8,9,10,11,12].map(x => [x, 2, m] as [number, number, string]),
      ...[4,5,6,7,8,9,10,11].map(x => [x, 3, d] as [number, number, string]),
      // 马桶盖 (row 4)
      ...[2,3,4,5,6,7,8,9,10,11,12,13].map(x => [x, 4, d] as [number, number, string]),
      // 马桶身背面 (row 5-8)
      ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(x => [x, 5, m] as [number, number, string]),
      ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(x => [x, 6, m] as [number, number, string]),
      ...[2,3,4,5,6,7,8,9,10,11,12,13].map(x => [x, 7, m] as [number, number, string]),
      ...[2,3,4,5,6,7,8,9,10,11,12,13].map(x => [x, 8, d] as [number, number, string]),
      // 底座
      ...[3,4,5,6,7,8,9,10,11,12].map(x => [x, 9, m] as [number, number, string]),
      ...[3,4,5,6,7,8,9,10,11,12].map(x => [x, 10, d] as [number, number, string]),
      ...[2,3,4,5,6,7,8,9,10,11,12,13].map(x => [x, 11, s] as [number, number, string]),
    ]
    return { width: 16, height: 12, pixels }
  }
}

export function PixelToilet({
  variant = 'front',
  gold = false,
  scale = 3,
  className = '',
}: {
  variant?: 'front' | 'back'
  gold?: boolean
  scale?: number
  className?: string
}) {
  return <PixelRenderer data={makeToiletPixels(variant, gold)} scale={scale} className={className} />
}

// ============================================================
// PixelCharacter — 角色
// ============================================================

function makeCharacterPixels(variant: 'front' | 'back', colorIndex: number, shocked = false): PixelData {
  const shirt = C.shirts[colorIndex % C.shirts.length]

  if (variant === 'front') {
    // 12x14 正面角色（坐姿，比例更真实）
    const pixels: [number, number, string][] = [
      // 头发 (row 0-1)
      [4, 0, C.hair], [5, 0, C.hair], [6, 0, C.hair], [7, 0, C.hair],
      [3, 1, C.hair], [4, 1, C.hair], [5, 1, C.hair], [6, 1, C.hair], [7, 1, C.hair], [8, 1, C.hair],
      // 脸 (row 2-5)
      [3, 2, C.skin], [4, 2, C.skin], [5, 2, C.skin], [6, 2, C.skin], [7, 2, C.skin], [8, 2, C.skin],
    ]

    if (shocked) {
      // 惊讶表情：眼睛更大（上下各加一像素），嘴张大成 O 形
      pixels.push(
        // 眼睛加大 — 上方加白色高光
        [4, 2, '#ffffff'], [7, 2, '#ffffff'],
        // 眼珠
        [4, 3, C.eye], [7, 3, C.eye],
        // 眼睛下方也加白
        [3, 3, C.skin], [5, 3, C.skin], [6, 3, C.skin], [8, 3, C.skin],
        // row 4 — 嘴部区域，张大O嘴
        [3, 4, C.skin], [4, 4, C.skin], [5, 4, C.black], [6, 4, C.black], [7, 4, C.skin], [8, 4, C.skin],
        // row 5 — O嘴下半部分
        [3, 5, C.skin], [4, 5, C.skin], [5, 5, C.black], [6, 5, C.black], [7, 5, C.skin], [8, 5, C.skin],
      )
    } else {
      pixels.push(
        [3, 3, C.skin], [4, 3, C.eye], [5, 3, C.skin], [6, 3, C.skin], [7, 3, C.eye], [8, 3, C.skin],
        [3, 4, C.skin], [4, 4, C.skin], [5, 4, C.skin], [6, 4, C.skin], [7, 4, C.skin], [8, 4, C.skin],
        [5, 4, C.mouth], [6, 4, C.mouth],
        [3, 5, C.skin], [4, 5, C.skin], [5, 5, C.skin], [6, 5, C.skin], [7, 5, C.skin], [8, 5, C.skin],
      )
    }

    pixels.push(
      // 脖子 (row 6)
      [4, 6, C.skinDark], [5, 6, C.skinDark], [6, 6, C.skinDark], [7, 6, C.skinDark],
      // 身体上部 (row 7-9)
      [3, 7, shirt], [4, 7, shirt], [5, 7, shirt], [6, 7, shirt], [7, 7, shirt], [8, 7, shirt],
      [2, 8, C.skin], [3, 8, shirt], [4, 8, shirt], [5, 8, shirt], [6, 8, shirt], [7, 8, shirt], [8, 8, shirt], [9, 8, C.skin],
      [2, 9, C.skin], [3, 9, shirt], [4, 9, shirt], [5, 9, shirt], [6, 9, shirt], [7, 9, shirt], [8, 9, shirt], [9, 9, C.skin],
    )

    if (shocked) {
      // 惊讶时双手举起 — 手臂伸出
      pixels.push(
        [1, 7, C.skin], [10, 7, C.skin],
        [0, 6, C.skin], [11, 6, C.skin],
      )
    }

    pixels.push(
      // 身体下部，坐姿弯曲 (row 10-11)
      [1, 10, C.skin], [2, 10, shirt], [3, 10, shirt], [4, 10, shirt], [5, 10, shirt], [6, 10, shirt], [7, 10, shirt], [8, 10, shirt], [9, 10, shirt], [10, 10, C.skin],
      [1, 11, C.skinDark], [2, 11, shirt], [3, 11, shirt], [4, 11, shirt], [5, 11, shirt], [6, 11, shirt], [7, 11, shirt], [8, 11, shirt], [9, 11, shirt], [10, 11, C.skinDark],
      // 大腿，水平坐姿 (row 12-13)
      [1, 12, C.skin], [2, 12, C.skin], [3, 12, shirt], [4, 12, shirt], [7, 12, shirt], [8, 12, shirt], [9, 12, C.skin], [10, 12, C.skin],
      [1, 13, C.skinDark], [2, 13, C.skinDark], [3, 13, C.skinDark], [4, 13, C.skinDark], [7, 13, C.skinDark], [8, 13, C.skinDark], [9, 13, C.skinDark], [10, 13, C.skinDark],
    )
    return { width: 12, height: 14, pixels }
  } else {
    // 12x14 背面角色（坐姿，比例更真实）
    const pixels: [number, number, string][] = [
      // 头发 (row 0-2)
      [4, 0, C.hair], [5, 0, C.hair], [6, 0, C.hair], [7, 0, C.hair],
      [3, 1, C.hair], [4, 1, C.hairDark], [5, 1, C.hairDark], [6, 1, C.hairDark], [7, 1, C.hairDark], [8, 1, C.hair],
      [3, 2, C.hair], [4, 2, C.hairDark], [5, 2, C.hairDark], [6, 2, C.hairDark], [7, 2, C.hairDark], [8, 2, C.hair],
      // 头发下部 (row 3-4)
      [3, 3, C.hair], [4, 3, C.hairDark], [5, 3, C.hairDark], [6, 3, C.hairDark], [7, 3, C.hairDark], [8, 3, C.hair],
      [3, 4, C.hair], [4, 4, C.hairDark], [5, 4, C.hairDark], [6, 4, C.hairDark], [7, 4, C.hairDark], [8, 4, C.hair],
      // 脖子 (row 5)
      [4, 5, C.skinDark], [5, 5, C.skinDark], [6, 5, C.skinDark], [7, 5, C.skinDark],
      // 身体背面 (row 6-10)
      [3, 6, shirt], [4, 6, shirt], [5, 6, shirt], [6, 6, shirt], [7, 6, shirt], [8, 6, shirt],
      [2, 7, C.skinDark], [3, 7, shirt], [4, 7, shirt], [5, 7, shirt], [6, 7, shirt], [7, 7, shirt], [8, 7, shirt], [9, 7, C.skinDark],
      [2, 8, C.skinDark], [3, 8, shirt], [4, 8, shirt], [5, 8, shirt], [6, 8, shirt], [7, 8, shirt], [8, 8, shirt], [9, 8, C.skinDark],
      [1, 9, C.skinDark], [2, 9, shirt], [3, 9, shirt], [4, 9, shirt], [5, 9, shirt], [6, 9, shirt], [7, 9, shirt], [8, 9, shirt], [9, 9, shirt], [10, 9, C.skinDark],
      [1, 10, C.skinShadow], [2, 10, shirt], [3, 10, shirt], [4, 10, shirt], [5, 10, shirt], [6, 10, shirt], [7, 10, shirt], [8, 10, shirt], [9, 10, shirt], [10, 10, C.skinShadow],
      // 臀部和大腿，坐姿 (row 11-13)
      [1, 11, C.skinDark], [2, 11, C.skinDark], [3, 11, shirt], [4, 11, shirt], [7, 11, shirt], [8, 11, shirt], [9, 11, C.skinDark], [10, 11, C.skinDark],
      [1, 12, C.skinShadow], [2, 12, C.skinShadow], [3, 12, C.skinShadow], [4, 12, C.skinShadow], [7, 12, C.skinShadow], [8, 12, C.skinShadow], [9, 12, C.skinShadow], [10, 12, C.skinShadow],
      [2, 13, C.skinShadow], [3, 13, C.skinShadow], [8, 13, C.skinShadow], [9, 13, C.skinShadow],
    ]
    return { width: 12, height: 14, pixels }
  }
}

export function PixelCharacter({
  variant = 'front',
  colorIndex = 0,
  shocked = false,
  scale = 3,
  className = '',
}: {
  variant?: 'front' | 'back'
  colorIndex?: number
  shocked?: boolean
  scale?: number
  className?: string
}) {
  return <PixelRenderer data={makeCharacterPixels(variant, colorIndex, shocked)} scale={scale} className={className} />
}

// ============================================================
// PixelDoor — 厕所门
// ============================================================

function makeDoorPixels(status: 'empty' | 'playing' | 'full'): PixelData {
  const lightColor = status === 'empty' ? C.lightGreen : status === 'playing' ? C.lightYellow : C.lightRed

  // 18x28 厕所门
  const pixels: [number, number, string][] = []

  // 门框顶部 (row 0-1)
  for (let x = 0; x < 18; x++) {
    pixels.push([x, 0, C.doorFrame])
    pixels.push([x, 1, C.doorFrame])
  }

  // 门主体 (row 2-25)
  for (let y = 2; y < 26; y++) {
    // 左右门框
    pixels.push([0, y, C.doorFrame])
    pixels.push([1, y, C.doorFrame])
    pixels.push([16, y, C.doorFrame])
    pixels.push([17, y, C.doorFrame])

    // 门板
    for (let x = 2; x < 16; x++) {
      pixels.push([x, y, C.doorWood])
    }
    // 左边高光
    pixels.push([2, y, C.doorWoodLight])
    // 右边阴影
    pixels.push([15, y, C.doorWoodDark])
  }

  // 通风口 (row 4-8) — 水平百叶窗
  for (let y = 4; y <= 8; y += 2) {
    for (let x = 5; x <= 12; x++) {
      pixels.push([x, y, C.doorWoodDark])
    }
  }

  // 状态指示灯 (row 11-12)
  for (let dx = 0; dx < 2; dx++) {
    for (let dy = 0; dy < 2; dy++) {
      pixels.push([8 + dx, 11 + dy, lightColor])
    }
  }

  // 门把手 (row 15-17)
  pixels.push([13, 15, C.doorHandle])
  pixels.push([14, 15, C.doorHandle])
  pixels.push([13, 16, C.doorHandle])
  pixels.push([14, 16, C.doorHandleDark])
  pixels.push([13, 17, C.doorHandleDark])
  pixels.push([14, 17, C.doorHandleDark])

  // 锁孔 (row 14)
  pixels.push([13, 14, C.black])

  // 门板纹理 — 中间横线
  for (let x = 3; x < 15; x++) {
    pixels.push([x, 20, C.doorWoodDark])
  }

  // 门底部缝隙 (row 26-27)
  for (let x = 2; x < 16; x++) {
    pixels.push([x, 26, C.doorWoodDark])
  }
  for (let x = 0; x < 18; x++) {
    pixels.push([x, 27, C.doorFrame])
  }

  return { width: 18, height: 28, pixels }
}

export function PixelDoor({
  status = 'empty',
  scale = 4,
  className = '',
}: {
  status?: 'empty' | 'playing' | 'full'
  scale?: number
  className?: string
}) {
  return <PixelRenderer data={makeDoorPixels(status)} scale={scale} className={className} />
}

// ============================================================
// PixelPoop — 屎粑粑
// ============================================================

function makePoopPixels(): PixelData {
  const pixels: [number, number, string][] = [
    // 顶部旋卷 (row 0-1)
    [4, 0, C.poopLight], [5, 0, C.poopMid],
    [3, 1, C.poopLight], [4, 1, C.poopMid], [5, 1, C.poopMid], [6, 1, C.poopDark],
    // 中层 (row 2-3)
    [2, 2, C.poopLight], [3, 2, C.poopMid], [4, 2, C.poopMid], [5, 2, C.poopMid], [6, 2, C.poopDark], [7, 2, C.poopDark],
    [1, 3, C.poopHighlight], [2, 3, C.poopLight], [3, 3, C.poopMid], [4, 3, C.poopMid], [5, 3, C.poopMid], [6, 3, C.poopDark], [7, 3, C.poopDark], [8, 3, C.poopDark],
    // 底层 (row 4-6)
    [1, 4, C.poopHighlight], [2, 4, C.poopLight], [3, 4, C.poopMid], [4, 4, C.poopMid], [5, 4, C.poopMid], [6, 4, C.poopMid], [7, 4, C.poopDark], [8, 4, C.poopDark],
    [1, 5, C.poopLight], [2, 5, C.poopMid], [3, 5, C.poopMid], [4, 5, C.poopMid], [5, 5, C.poopMid], [6, 5, C.poopMid], [7, 5, C.poopDark], [8, 5, C.poopDark],
    [2, 6, C.poopDark], [3, 6, C.poopDark], [4, 6, C.poopDark], [5, 6, C.poopDark], [6, 6, C.poopDark], [7, 6, C.poopDark],
    // 眼睛
    [3, 4, C.toiletWhite], [4, 4, C.black], [6, 4, C.toiletWhite], [7, 4, C.black],
    // 嘴
    [4, 5, C.black], [5, 5, C.black],
  ]
  return { width: 10, height: 7, pixels }
}

export function PixelPoop({
  scale = 3,
  className = '',
}: {
  scale?: number
  className?: string
}) {
  return <PixelRenderer data={makePoopPixels()} scale={scale} className={className} />
}

// ============================================================
// PixelCrown — 皇冠
// ============================================================

function makeCrownPixels(): PixelData {
  const pixels: [number, number, string][] = [
    // 三个尖 (row 0-1)
    [1, 0, C.crownGold], [5, 0, C.crownGold], [9, 0, C.crownGold],
    [1, 1, C.crownGold], [3, 1, C.crownGold], [5, 1, C.crownGold], [7, 1, C.crownGold], [9, 1, C.crownGold],
    // 主体 (row 2-4)
    [0, 2, C.crownGold], [1, 2, C.crownGold], [2, 2, C.crownGold], [3, 2, C.crownGold], [4, 2, C.crownGold],
    [5, 2, C.crownGold], [6, 2, C.crownGold], [7, 2, C.crownGold], [8, 2, C.crownGold], [9, 2, C.crownGold], [10, 2, C.crownGold],
    [0, 3, C.crownDark], [1, 3, C.crownGold], [2, 3, C.crownGold], [3, 3, C.crownGem], [4, 3, C.crownGold],
    [5, 3, C.crownGem], [6, 3, C.crownGold], [7, 3, C.crownGem], [8, 3, C.crownGold], [9, 3, C.crownGold], [10, 3, C.crownDark],
    [0, 4, C.crownDark], [1, 4, C.crownDark], [2, 4, C.crownDark], [3, 4, C.crownDark], [4, 4, C.crownDark],
    [5, 4, C.crownDark], [6, 4, C.crownDark], [7, 4, C.crownDark], [8, 4, C.crownDark], [9, 4, C.crownDark], [10, 4, C.crownDark],
  ]
  return { width: 11, height: 5, pixels }
}

export function PixelCrown({
  scale = 3,
  className = '',
}: {
  scale?: number
  className?: string
}) {
  return <PixelRenderer data={makeCrownPixels()} scale={scale} className={className} />
}

// ============================================================
// PixelPencil — 画笔
// ============================================================

function makePencilPixels(): PixelData {
  const pixels: [number, number, string][] = [
    // 笔尖
    [0, 7, '#facc15'],
    [0, 6, '#facc15'], [1, 6, '#a16207'],
    // 笔身
    [0, 5, '#ef4444'], [1, 5, '#dc2626'], [2, 5, '#dc2626'],
    [0, 4, '#ef4444'], [1, 4, '#dc2626'], [2, 4, '#dc2626'],
    [0, 3, '#ef4444'], [1, 3, '#dc2626'], [2, 3, '#dc2626'],
    [0, 2, '#ef4444'], [1, 2, '#dc2626'], [2, 2, '#dc2626'],
    // 金属环
    [0, 1, '#d4d4d4'], [1, 1, '#a0a0a0'], [2, 1, '#a0a0a0'],
    // 橡皮
    [0, 0, '#f9a8d4'], [1, 0, '#ec4899'], [2, 0, '#ec4899'],
  ]
  return { width: 3, height: 8, pixels }
}

export function PixelPencil({
  scale = 3,
  className = '',
}: {
  scale?: number
  className?: string
}) {
  return <PixelRenderer data={makePencilPixels()} scale={scale} className={className} />
}

// ============================================================
// PixelPipe — 水管装饰
// ============================================================

export function PixelPipe({
  length = 80,
  direction = 'horizontal',
  className = '',
}: {
  length?: number
  direction?: 'horizontal' | 'vertical'
  className?: string
}) {
  const isH = direction === 'horizontal'
  return (
    <div
      className={className}
      style={{
        width: isH ? length : 12,
        height: isH ? 12 : length,
        backgroundColor: '#8a9a8a',
        boxShadow: isH
          ? 'inset 0 2px 0 #a0b0a0, inset 0 -2px 0 #6a7a6a'
          : 'inset 2px 0 0 #a0b0a0, inset -2px 0 0 #6a7a6a',
        borderRadius: 0,
      }}
    />
  )
}

// ============================================================
// PixelPlayerSeat — 角色坐马桶组合
// ============================================================

export function PixelPlayerSeat({
  name,
  score,
  colorIndex = 0,
  variant = 'back',
  isHost = false,
  guessedCorrect = false,
  hasPoopOnHead = false,
  shocked = false,
  gold = false,
  scale = 3,
  className = '',
  onClick,
}: {
  name: string
  score: number
  colorIndex?: number
  variant?: 'front' | 'back'
  isHost?: boolean
  guessedCorrect?: boolean
  hasPoopOnHead?: boolean
  shocked?: boolean
  gold?: boolean
  scale?: number
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      className={`flex flex-col items-center ${onClick ? 'cursor-pointer hover:scale-110 transition-transform' : ''} ${className}`}
      onClick={onClick}
    >
      {/* 头上的屎粑粑 */}
      {hasPoopOnHead && (
        <div className="animate-bounce-pixel mb-[-8px]">
          <PixelPoop scale={2} />
        </div>
      )}
      {/* 角色坐在马桶上 — 角色下半身嵌入马桶 */}
      <div className="relative">
        <div className="relative z-10" style={{ marginBottom: -scale * 6 }}>
          <PixelCharacter variant={variant} colorIndex={colorIndex} shocked={shocked} scale={scale} />
        </div>
        <div className="relative z-0">
          <PixelToilet variant={variant} gold={gold} scale={scale} />
        </div>
      </div>
      {/* 名字和分数 */}
      <span className="text-[10px] md:text-xs mt-1 text-white pixel-text-shadow truncate max-w-[60px] md:max-w-[80px] text-center">
        {name}{isHost ? '👑' : ''}
      </span>
      <span className="font-pixel text-[8px] md:text-[10px] text-pixel-yellow pixel-text-shadow">
        {score}
        {guessedCorrect && <span className="text-pixel-green ml-1">&#10003;</span>}
      </span>
    </div>
  )
}
