class_name CharacterSpriteEntity
extends Node2D

enum Pose { IDLE, WALK, AIM_PISTOL, LONGARM, AIM_2_PISTOLS, FLINCH, SWING_1H, THRUST_1H }
enum Direction { SOUTH, NORTH, SOUTH_WEST, NORTH_WEST, SOUTH_EAST, NORTH_EAST }
enum Spawn { TOP, RIGHT, BOT, LEFT }
enum HairColor { BLACK, BLOND, BROWN, RED }
enum HairStyle { STYLE_1, STYLE_2, STYLE_3, STYLE_4, STYLE_5, STYLE_6, STYLE_7, STYLE_8 }
enum FacialHairColor { BLACK, BLOND, BROWN, RED }
enum BeardStyle { STYLE_1, STYLE_2, STYLE_3, STYLE_4, STYLE_5, STYLE_6 }
enum MustacheStyle { STYLE_1, STYLE_2, STYLE_3, STYLE_4 }
enum SideburnsStyle { STYLE_1, STYLE_2, STYLE_3 }
enum Headwear { NONE, BANDANA, TRICORN, HELMET }
enum WeaponType { NONE, MUSKET, CUTLASS_LEFT, CUTLASS_RIGHT, PISTOL_LEFT, PISTOL_RIGHT }
enum EyeBandageColor { BLACK, RED, GREEN, BROWN }
enum EyeColor { COLOR_1, COLOR_2, COLOR_3, COLOR_4 }
enum HeadwearColor { COLOR_1, COLOR_2, COLOR_3, COLOR_4 }
enum HelmetVariant { VARIANT_1, VARIANT_2 }
enum ArmorVariant { HAUBERK, UNIFORM }
enum UniformColor { GRAY, BLUE, RED, GREEN, BROWN }
enum ShirtColor { WHITE, BLACK, BLUE, ORANGE, GREEN }
enum PantsColor { GRAY, BLACK, BLUE, RED, GREEN }
enum BootsColor { YELLOW, BLACK, BLUE, RED, GREEN }
enum SkinColor { TONE_1, TONE_2, TONE_3, TONE_4, TONE_5 }

const ASSET_ROOT: String = "res://assets/Character/Character1"
const DEFAULT_STYLE_INDEX: int = 0
const DEFAULT_SPRITE_OFFSET: Vector2 = Vector2(8, 20)
const DEFAULT_TOP_SPRITE_OFFSET: Vector2 = Vector2(-12, -30)
const BASE_POSE_FRAME_COUNT: int = 5
const DIAGONAL_POSE_FRAME_COUNT: int = 5
const WALK_NORTH_WEAPON_FRAME_COUNT: int = 4
const AIM_PISTOL_WEAPON_FRAME_COUNT: int = 3
const AIM_PISTOL_NORTH_WEAPON_FRAME_COUNT: int = 4
const LONGARM_WEAPON_FRAME_COUNT: int = 1
const AIM_2_PISTOLS_WEAPON_FRAME_COUNT: int = 1
const FLINCH_WEAPON_FRAME_COUNT: int = 5
const FLINCH_NORTH_WEST_WEAPON_FRAME_COUNT: int = 3
const SWING_1H_WEAPON_FRAME_COUNT: int = 3
const SWING_1H_NORTH_WEST_WEAPON_FRAME_COUNT: int = 2
const THRUST_1H_WEAPON_FRAME_COUNT: int = 1
const HAIR_STYLE_COUNT: int = 8
const BEARD_STYLE_COUNT: int = 6
const MUSTACHE_STYLE_COUNT: int = 4
const SIDEBURNS_STYLE_COUNT: int = 3
const FACE_STYLE_COUNT: int = 4
const ARMOR_STYLE_COUNT: int = 6
const HEADWEAR_STYLE_COUNT: int = 4
const HELMET_STYLE_COUNT: int = 2

const HAIR_COLOR_SUFFIX: Dictionary = {
	HairColor.BLACK: "blck",
	HairColor.BLOND: "blnd",
	HairColor.BROWN: "brwn",
	HairColor.RED: "red",
}

const FACIAL_HAIR_COLOR_SUFFIX: Dictionary = {
	FacialHairColor.BLACK: "blck",
	FacialHairColor.BLOND: "blnd",
	FacialHairColor.BROWN: "brwn",
	FacialHairColor.RED: "red",
}

const DIRECTION_MIRROR_FALLBACK: Dictionary = {
	Direction.SOUTH_EAST: Direction.SOUTH_WEST,
	Direction.NORTH_EAST: Direction.NORTH_WEST,
}

const LAYER_NODE_PATH: Dictionary = {
	"body": "Body",
	"boots": "Boots",
	"pants": "Pants",
	"shirts": "Shirts",
	"armor": "Armor",
	"beard": "Beard",
	"mustache": "Mustache",
	"sideburns": "Sideburns",
	"eyes": "Eyes",
	"eyebrows": "Eyebrows",
	"eye_bandage": "EyeBandage",
	"hair": "Hair",
	"headwear": "Headwear",
	"head_bandage": "HeadBandage",
	"weapon": "Weapon",
	"weapon_secondary": "WeaponSecondary",
}

const FACE_LAYER_NAMES: Array[String] = [
	"beard",
	"mustache",
	"sideburns",
	"eyes",
	"eyebrows",
	"eye_bandage",
	"hair",
]

const HEADWEAR_LAYER_NAMES: Array[String] = [
	"headwear",
	"head_bandage",
]

const CLOTHING_LAYER_NAMES: Array[String] = [
	"boots",
	"pants",
	"shirts",
	"armor",
]

const DEFAULT_POSE_DIRECTION_RENDER_CONFIG: Dictionary = {
	"idle:south": {
		"face_offset": Vector2.ZERO,
		"headwear_offset": Vector2.ZERO,
		"weapon_offset": Vector2.ZERO,
		"clothing_offset": Vector2.ZERO,
		"weapon_z": 45,
		"weapon_sheet": "idle/Char1_south_idle/Char1_weapon1.png",
		"weapon_frame_count": BASE_POSE_FRAME_COUNT,
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 1,
			WeaponType.CUTLASS_RIGHT: 2,
			WeaponType.PISTOL_LEFT: 3,
			WeaponType.PISTOL_RIGHT: 4,
		},
	},
	"idle:north": {
		"face_offset": Vector2(0, -12),
		"headwear_offset": Vector2.ZERO,
		"weapon_offset": Vector2(0, -12),
		"clothing_offset": Vector2(0, 6),
		"weapon_z": 10,
		"weapon_sheet": "idle/Char1_north_idle/Char1_back_stand_weapon.png",
		"weapon_frame_count": BASE_POSE_FRAME_COUNT,
		"weapon_frames": {
			WeaponType.MUSKET: 2,
			WeaponType.CUTLASS_LEFT: 1,
			WeaponType.CUTLASS_RIGHT: 0,
			WeaponType.PISTOL_LEFT: 3,
			WeaponType.PISTOL_RIGHT: 4,
		},
	},
	"idle:south_west": {
		"face_offset": Vector2.ZERO,
		"headwear_offset": Vector2.ZERO,
		"weapon_offset": Vector2.ZERO,
		"clothing_offset": Vector2.ZERO,
		"weapon_z": 45,
		"weapon_sheet": "idle/Char1_south_west_idle/Idle_body_SW1_weapon.png",
		"weapon_frame_count": DIAGONAL_POSE_FRAME_COUNT,
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 4,
			WeaponType.CUTLASS_RIGHT: 3,
			WeaponType.PISTOL_LEFT: 2,
			WeaponType.PISTOL_RIGHT: 1,
		},
	},
	"idle:north_west": {
		"face_offset": Vector2(0, -12),
		"headwear_offset": Vector2.ZERO,
		"weapon_offset": Vector2.ZERO,
		"clothing_offset": Vector2(0, 6),
		"weapon_z": 1,
		"weapon_sheet": "idle/Char1_north_west_idle/Idle_body_NW1_weapon.png",
		"weapon_frame_count": DIAGONAL_POSE_FRAME_COUNT,
		"weapon_frames": {
			WeaponType.MUSKET: 4,
			WeaponType.CUTLASS_LEFT: 1,
			WeaponType.CUTLASS_RIGHT: 0,
			WeaponType.PISTOL_LEFT: 3,
			WeaponType.PISTOL_RIGHT: 2,
		},
	},
	"walk:south": {
		"face_offset": Vector2(0, 7),
		"headwear_offset": Vector2(-1, -7),
		"weapon_offset": Vector2(1, 7),
		"clothing_offset": Vector2.ZERO,
		"weapon_z": 45,
		"weapon_sheet": "walk/Char1_Walk/Char1_walk_weapon1.png",
		"weapon_frame_count": DIAGONAL_POSE_FRAME_COUNT,
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.PISTOL_LEFT: 1,
			WeaponType.CUTLASS_LEFT: 2,
			WeaponType.CUTLASS_RIGHT: 3,
			WeaponType.PISTOL_RIGHT: 4,
		},
	},
	"walk:north": {
		"face_offset": Vector2(0, -12),
		"headwear_offset": Vector2.ZERO,
		"weapon_offset": Vector2(0, -12),
		"clothing_offset": Vector2(0, 6),
		"weapon_z": -10,
		"weapon_sheet": "walk/Char1_walk_back/Char1_back_walk_weapon.png",
		"weapon_frame_count": WALK_NORTH_WEAPON_FRAME_COUNT,
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 2,
			WeaponType.CUTLASS_RIGHT: 3,
			WeaponType.PISTOL_LEFT: 1,
			WeaponType.PISTOL_RIGHT: 3,
		},
	},
	"walk:south_west": {
		"face_offset": Vector2(0, 7),
		"headwear_offset": Vector2(-1, -7),
		"weapon_offset": Vector2.ZERO,
		"clothing_offset": Vector2.ZERO,
		"weapon_z": 45,
		"weapon_sheet": "walk/Char1_south_west_walk/Walk_body_SW1_weapon.png",
		"weapon_frame_count": DIAGONAL_POSE_FRAME_COUNT,
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 3,
			WeaponType.CUTLASS_RIGHT: 4,
			WeaponType.PISTOL_LEFT: 1,
			WeaponType.PISTOL_RIGHT: 2,
		},
	},
	"walk:north_west": {
		"face_offset": Vector2(0, -12),
		"headwear_offset": Vector2.ZERO,
		"weapon_offset": Vector2.ZERO,
		"clothing_offset": Vector2(0, 6),
		"weapon_z": 1,
		"weapon_sheet": "walk/Char1_north_west_walk/Walk_body_NW1_weapon.png",
		"weapon_frame_count": DIAGONAL_POSE_FRAME_COUNT,
		"weapon_frames": {
			WeaponType.MUSKET: 4,
			WeaponType.CUTLASS_LEFT: 0,
			WeaponType.CUTLASS_RIGHT: 1,
			WeaponType.PISTOL_LEFT: 2,
			WeaponType.PISTOL_RIGHT: 3,
		},
	},
	"aim-pistol:south": {
		"face_offset": Vector2(0, 6),
		"headwear_offset": Vector2(1, -6),
		"weapon_offset": Vector2.ZERO,
		"clothing_offset": Vector2.ZERO,
		"weapon_z": 45,
		"weapon_sheet": "aim-pistol/S/Char1_aimpistol_weapon_left1.png",
		"weapon_frame_count": AIM_PISTOL_WEAPON_FRAME_COUNT,
		"unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.CUTLASS_LEFT],
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 1,
			WeaponType.CUTLASS_RIGHT: 0,
			WeaponType.PISTOL_LEFT: 1,
			WeaponType.PISTOL_RIGHT: 2,
		},
	},
	"aim-pistol:north": {
		"face_offset": Vector2(0, -13),
		"headwear_offset": Vector2(1, -6),
		"weapon_offset": Vector2(0, -12),
		"clothing_offset": Vector2(0, 6),
		"weapon_z": 10,
		"weapon_sheet": "aim-pistol/N/Char1_back_aimpistol_weapon.png",
		"weapon_frame_count": 3,
		"unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.CUTLASS_LEFT],
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 1,
			WeaponType.CUTLASS_RIGHT: 1,
			WeaponType.PISTOL_LEFT: 0,
			WeaponType.PISTOL_RIGHT: 2,
		},
	},
	"aim-pistol:south_west": {
		"face_offset": Vector2(0, 6),
		"headwear_offset": Vector2(1, -6),
		"weapon_offset": Vector2.ZERO,
		"clothing_offset": Vector2.ZERO,
		"weapon_z": 45,
		"weapon_sheet": "aim-pistol/SW/Aim_pistol_body_SW1_weapon.png",
		"weapon_frame_count": AIM_PISTOL_WEAPON_FRAME_COUNT,
		"unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.CUTLASS_LEFT],
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 1,
			WeaponType.CUTLASS_RIGHT: 2,
			WeaponType.PISTOL_LEFT: 0,
			WeaponType.PISTOL_RIGHT: 1,
		},
	},
	"aim-pistol:north_west": {
		"face_offset": Vector2(0, 6),
		"headwear_offset": Vector2(1, -6),
		"weapon_offset": Vector2.ZERO,
		"clothing_offset": Vector2(0, 6),
		"weapon_z": 1,
		"weapon_sheet": "aim-pistol/NW/Aim_pistol_body_NW1_weapon.png",
		"weapon_frame_count": AIM_PISTOL_WEAPON_FRAME_COUNT,
		"unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.CUTLASS_LEFT],
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 1,
			WeaponType.CUTLASS_RIGHT: 0,
			WeaponType.PISTOL_LEFT: 1,
			WeaponType.PISTOL_RIGHT: 2,
		},
	},
	"longarm:south": {
		"face_offset": Vector2(0, 4),
		"headwear_offset": Vector2(1, -6),
		"weapon_offset": Vector2.ZERO,
		"clothing_offset": Vector2.ZERO,
		"weapon_z": 45,
		"weapon_sheet": "longarm/S/Char1_longarm_weapon1.png",
		"weapon_frame_count": LONGARM_WEAPON_FRAME_COUNT,
		"unsupported_weapon_types": [WeaponType.CUTLASS_LEFT, WeaponType.CUTLASS_RIGHT, WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT],
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 0,
			WeaponType.CUTLASS_RIGHT: 0,
			WeaponType.PISTOL_LEFT: 0,
			WeaponType.PISTOL_RIGHT: 0,
		},
	},
	"longarm:north": {
		"face_offset": Vector2(0, -13),
		"headwear_offset": Vector2(1, -6),
		"weapon_offset": Vector2(0, -12),
		"clothing_offset": Vector2(0, 6),
		"weapon_z": 10,
		"weapon_sheet": "longarm/N/Char1_back_longarm_weapon.png",
		"weapon_frame_count": LONGARM_WEAPON_FRAME_COUNT,
		"unsupported_weapon_types": [WeaponType.CUTLASS_LEFT, WeaponType.CUTLASS_RIGHT, WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT],
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 0,
			WeaponType.CUTLASS_RIGHT: 0,
			WeaponType.PISTOL_LEFT: 0,
			WeaponType.PISTOL_RIGHT: 0,
		},
	},
	"longarm:south_west": {
		"face_offset": Vector2(0, 6),
		"headwear_offset": Vector2(1, -6),
		"weapon_offset": Vector2.ZERO,
		"clothing_offset": Vector2.ZERO,
		"weapon_z": 45,
		"weapon_sheet": "longarm/SW/Aim_longarm_body_SW1_weapon.png",
		"weapon_frame_count": LONGARM_WEAPON_FRAME_COUNT,
		"unsupported_weapon_types": [WeaponType.CUTLASS_LEFT, WeaponType.CUTLASS_RIGHT, WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT],
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 0,
			WeaponType.CUTLASS_RIGHT: 0,
			WeaponType.PISTOL_LEFT: 0,
			WeaponType.PISTOL_RIGHT: 0,
		},
	},
	"longarm:north_west": {
		"face_offset": Vector2(0, 6),
		"headwear_offset": Vector2(1, -6),
		"weapon_offset": Vector2.ZERO,
		"clothing_offset": Vector2(0, 6),
		"weapon_z": 1,
		"weapon_sheet": "longarm/NW/Aim_longarm_body_NW1_weapon.png",
		"weapon_frame_count": LONGARM_WEAPON_FRAME_COUNT,
		"unsupported_weapon_types": [WeaponType.CUTLASS_LEFT, WeaponType.CUTLASS_RIGHT, WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT],
		"weapon_frames": {
			WeaponType.MUSKET: 0,
			WeaponType.CUTLASS_LEFT: 0,
			WeaponType.CUTLASS_RIGHT: 0,
			WeaponType.PISTOL_LEFT: 0,
			WeaponType.PISTOL_RIGHT: 0,
		},
	},
	"aim-2-pistols:south": {
		"face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2.ZERO, "clothing_offset": Vector2.ZERO, "weapon_z": 45,
		"weapon_sheet": "aim-2-pistols/S/Char1_aim2pistols_weapon1.png", "weapon_frame_count": AIM_2_PISTOLS_WEAPON_FRAME_COUNT,
		"unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.CUTLASS_LEFT, WeaponType.CUTLASS_RIGHT],
		"weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 0, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 },
	},
	"aim-2-pistols:north": {
		"face_offset": Vector2(0, -13), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2(0, -12), "clothing_offset": Vector2(0, 6), "weapon_z": 10,
		"weapon_sheet": "aim-2-pistols/N/Char1_back_aim2pistols_weapon.png", "weapon_frame_count": AIM_2_PISTOLS_WEAPON_FRAME_COUNT,
		"unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.CUTLASS_LEFT, WeaponType.CUTLASS_RIGHT],
		"weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 0, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 },
	},
	"aim-2-pistols:south_west": {
		"face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2.ZERO, "clothing_offset": Vector2.ZERO, "weapon_z": 45,
		"weapon_sheet": "aim-2-pistols/SW/Aim_2pistols_body_SW1_weapon.png", "weapon_frame_count": AIM_2_PISTOLS_WEAPON_FRAME_COUNT,
		"unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.CUTLASS_LEFT, WeaponType.CUTLASS_RIGHT],
		"weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 0, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 },
	},
	"aim-2-pistols:north_west": {
		"face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2.ZERO, "clothing_offset": Vector2(0, 6), "weapon_z": 1,
		"weapon_sheet": "aim-2-pistols/NW/Aim_2pistols_body_NW1_weapon.png", "weapon_frame_count": AIM_2_PISTOLS_WEAPON_FRAME_COUNT,
		"unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.CUTLASS_LEFT, WeaponType.CUTLASS_RIGHT],
		"weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 0, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 },
	},
	"flinch:south": { "face_offset": Vector2(0, 5), "headwear_offset": Vector2(0, 2), "helmet_offset": Vector2(0, 1), "weapon_offset": Vector2(0, 7), "clothing_offset": Vector2.ZERO, "weapon_z": 45, "weapon_sheet": "flinch/S/Char1_flinch_weapon1.png", "weapon_frame_count": FLINCH_WEAPON_FRAME_COUNT, "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 4, WeaponType.CUTLASS_RIGHT: 2, WeaponType.PISTOL_LEFT: 3, WeaponType.PISTOL_RIGHT: 1 } },
	"flinch:north": { "face_offset": Vector2(0, -13), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2(0, -12), "clothing_offset": Vector2(0, 6), "weapon_z": 10, "weapon_sheet": "flinch/N/Char1_back_flinch_weapon.png", "weapon_frame_count": FLINCH_WEAPON_FRAME_COUNT, "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 3, WeaponType.CUTLASS_RIGHT: 2, WeaponType.PISTOL_LEFT: 4, WeaponType.PISTOL_RIGHT: 1 } },
	"flinch:south_west": { "face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2.ZERO, "clothing_offset": Vector2.ZERO, "weapon_z": 45, "weapon_sheet": "flinch/SW/Flinch_body_SW1_weapon.png", "weapon_frame_count": FLINCH_WEAPON_FRAME_COUNT, "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 3, WeaponType.CUTLASS_RIGHT: 4, WeaponType.PISTOL_LEFT: 1, WeaponType.PISTOL_RIGHT: 2 } },
	"flinch:north_west": { "face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2(0, 1), "clothing_offset": Vector2(0, 6), "weapon_z": 1, "weapon_sheet": "flinch/NW/Flinch_body_NW1_weapon.png", "weapon_frame_count": 3, "unsupported_weapon_types": [WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT], "weapon_frames": { WeaponType.MUSKET: 2, WeaponType.CUTLASS_LEFT: 1, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 } },
	"swing-1h:south": { "face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2(0, 6), "clothing_offset": Vector2.ZERO, "weapon_z": 45, "weapon_sheet": "swing-1h/S/Char1_swing1h_weapon1.png", "weapon_frame_count": SWING_1H_WEAPON_FRAME_COUNT, "unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.PISTOL_RIGHT], "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 1, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 2, WeaponType.PISTOL_RIGHT: 0 } },
	"swing-1h:north": { "face_offset": Vector2(0, -13), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2(1, -12), "clothing_offset": Vector2(0, 6), "weapon_z": 10, "weapon_sheet": "swing-1h/N/Char1_back_swing1h_weapon.png", "weapon_frame_count": SWING_1H_WEAPON_FRAME_COUNT, "unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.PISTOL_RIGHT], "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 1, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 2, WeaponType.PISTOL_RIGHT: 0 } },
	"swing-1h:south_west": { "face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2.ZERO, "clothing_offset": Vector2.ZERO, "weapon_z": 45, "weapon_sheet": "swing-1h/SW/Swing_1h_body_SW1_weapon.png", "weapon_frame_count": SWING_1H_WEAPON_FRAME_COUNT, "unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.PISTOL_RIGHT], "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 2, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 1, WeaponType.PISTOL_RIGHT: 0 } },
	"swing-1h:north_west": { "face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2(-12, 1), "clothing_offset": Vector2(0, 6), "weapon_z": 1, "weapon_sheet": "swing-1h/NW/Swing_body_NW1_weapon.png", "weapon_frame_count": SWING_1H_NORTH_WEST_WEAPON_FRAME_COUNT, "unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT], "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 0, WeaponType.CUTLASS_RIGHT: 1, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 } },
	"swing-1h:north_east": { "face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2(12, 1), "clothing_offset": Vector2(0, 6), "weapon_z": 1, "weapon_sheet": "swing-1h/NW/Swing_body_NW1_weapon.png", "weapon_frame_count": SWING_1H_NORTH_WEST_WEAPON_FRAME_COUNT, "unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT], "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 1, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 } },
	"thrust-1h:south": { "face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2(0, 6), "clothing_offset": Vector2.ZERO, "weapon_z": 45, "weapon_sheet": "thrust-1h/S/Char1_thrust_weapon1.png", "weapon_frame_count": THRUST_1H_WEAPON_FRAME_COUNT, "unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT], "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 0, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 } },
	"thrust-1h:north": { "face_offset": Vector2(0, -13), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2(0, -12), "clothing_offset": Vector2(0, 6), "weapon_z": 10, "weapon_sheet": "thrust-1h/N/Char1_back_thrust_weapon.png", "weapon_frame_count": THRUST_1H_WEAPON_FRAME_COUNT, "unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT], "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 0, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 } },
	"thrust-1h:south_west": { "face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2(-42, 0), "clothing_offset": Vector2.ZERO, "weapon_z": 45, "weapon_sheet": "thrust-1h/SW/Thrust_1h_body_SW1_weapon.png", "weapon_frame_count": THRUST_1H_WEAPON_FRAME_COUNT, "unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT], "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 0, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 } },
	"thrust-1h:south_east": { "face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2(42, 0), "clothing_offset": Vector2.ZERO, "weapon_z": 45, "weapon_sheet": "thrust-1h/SW/Thrust_1h_body_SW1_weapon.png", "weapon_frame_count": THRUST_1H_WEAPON_FRAME_COUNT, "unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT], "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 0, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 } },
	"thrust-1h:north_west": { "face_offset": Vector2(0, 6), "headwear_offset": Vector2(1, -6), "weapon_offset": Vector2.ZERO, "clothing_offset": Vector2(0, 6), "weapon_z": 1, "weapon_sheet": "thrust-1h/NW/Thrust_body_NW1_weapon.png", "weapon_frame_count": THRUST_1H_WEAPON_FRAME_COUNT, "unsupported_weapon_types": [WeaponType.MUSKET, WeaponType.PISTOL_LEFT, WeaponType.PISTOL_RIGHT], "weapon_frames": { WeaponType.MUSKET: 0, WeaponType.CUTLASS_LEFT: 0, WeaponType.CUTLASS_RIGHT: 0, WeaponType.PISTOL_LEFT: 0, WeaponType.PISTOL_RIGHT: 0 } },
}

@export var pose: Pose = Pose.IDLE:
	set(value):
		pose = value
		refresh()

@export var direction: Direction = Direction.SOUTH:
	set(value):
		direction = value
		refresh()

@export var spawn: Spawn = Spawn.BOT:
	set(value):
		spawn = value
		refresh()

@export var sprite_scale: float = 0.9:
	set(value):
		sprite_scale = max(0.01, value)
		refresh()

@export var sprite_offsets_by_spawn: Dictionary = {
	Spawn.TOP: DEFAULT_TOP_SPRITE_OFFSET,
	Spawn.RIGHT: Vector2(28, -12),
	Spawn.BOT: DEFAULT_SPRITE_OFFSET,
	Spawn.LEFT: Vector2(-26, -8),
}:
	set(value):
		sprite_offsets_by_spawn = value
		refresh()

@export var show_formation_reference: bool = true:
	set(value):
		show_formation_reference = value
		_update_formation_reference()

@export var formation_reference_offset: Vector2 = Vector2.ZERO:
	set(value):
		formation_reference_offset = value
		_update_formation_reference()

@export var formation_reference_scale: float = 0.3:
	set(value):
		formation_reference_scale = max(0.01, value)
		_update_formation_reference()

@export var skin_color: SkinColor = SkinColor.TONE_1:
	set(value):
		skin_color = value
		refresh()

@export var hair_color: HairColor = HairColor.BLACK:
	set(value):
		hair_color = value
		refresh()

@export var hair_style: HairStyle = HairStyle.STYLE_1:
	set(value):
		hair_style = value
		refresh()

@export var eyebrow_color: HairColor = HairColor.BLACK:
	set(value):
		eyebrow_color = value
		refresh()

@export var beard_color: FacialHairColor = FacialHairColor.BLACK:
	set(value):
		beard_color = value
		refresh()

@export var beard_style: BeardStyle = BeardStyle.STYLE_1:
	set(value):
		beard_style = value
		refresh()

@export var mustache_color: FacialHairColor = FacialHairColor.BLACK:
	set(value):
		mustache_color = value
		refresh()

@export var mustache_style: MustacheStyle = MustacheStyle.STYLE_1:
	set(value):
		mustache_style = value
		refresh()

@export var sideburns_color: FacialHairColor = FacialHairColor.BLACK:
	set(value):
		sideburns_color = value
		refresh()

@export var sideburns_style: SideburnsStyle = SideburnsStyle.STYLE_1:
	set(value):
		sideburns_style = value
		refresh()

@export var eye_bandage_color: EyeBandageColor = EyeBandageColor.BLACK:
	set(value):
		eye_bandage_color = value
		refresh()

@export var eye_color: EyeColor = EyeColor.COLOR_1:
	set(value):
		eye_color = value
		refresh()

@export var bandana_color: HeadwearColor = HeadwearColor.COLOR_1:
	set(value):
		bandana_color = value
		refresh()

@export var tricorn_color: HeadwearColor = HeadwearColor.COLOR_1:
	set(value):
		tricorn_color = value
		refresh()

@export var head_bandage_color: HeadwearColor = HeadwearColor.COLOR_1:
	set(value):
		head_bandage_color = value
		refresh()

@export var helmet_variant: HelmetVariant = HelmetVariant.VARIANT_1:
	set(value):
		helmet_variant = value
		refresh()

@export var armor_variant: ArmorVariant = ArmorVariant.HAUBERK:
	set(value):
		armor_variant = value
		refresh()

@export var uniform_color: UniformColor = UniformColor.GRAY:
	set(value):
		uniform_color = value
		refresh()

@export var shirt_color: ShirtColor = ShirtColor.WHITE:
	set(value):
		shirt_color = value
		refresh()

@export var pants_color: PantsColor = PantsColor.GRAY:
	set(value):
		pants_color = value
		refresh()

@export var boots_color: BootsColor = BootsColor.YELLOW:
	set(value):
		boots_color = value
		refresh()

@export var headwear: Headwear = Headwear.NONE:
	set(value):
		headwear = value
		refresh()

@export var weapon_type: WeaponType = WeaponType.MUSKET:
	set(value):
		weapon_type = value
		refresh()

@export var weapon_type_secondary: WeaponType = WeaponType.NONE:
	set(value):
		weapon_type_secondary = value
		refresh()

@export var show_body: bool = true:
	set(value):
		show_body = value
		refresh()

@export var show_boots: bool = true:
	set(value):
		show_boots = value
		refresh()

@export var show_pants: bool = true:
	set(value):
		show_pants = value
		refresh()

@export var show_shirts: bool = true:
	set(value):
		show_shirts = value
		refresh()

@export var show_hair: bool = true:
	set(value):
		show_hair = value
		refresh()

@export var show_beard: bool = false:
	set(value):
		show_beard = value
		refresh()

@export var show_mustache: bool = false:
	set(value):
		show_mustache = value
		refresh()

@export var show_sideburns: bool = false:
	set(value):
		show_sideburns = value
		refresh()

@export var show_armor: bool = false:
	set(value):
		show_armor = value
		refresh()

@export var show_eye_bandage: bool = false:
	set(value):
		show_eye_bandage = value
		refresh()

@export var show_eyes: bool = true:
	set(value):
		show_eyes = value
		refresh()

@export var show_eyebrows: bool = true:
	set(value):
		show_eyebrows = value
		refresh()

@export var show_headwear: bool = true:
	set(value):
		show_headwear = value
		refresh()

@export var show_head_bandage: bool = false:
	set(value):
		show_head_bandage = value
		refresh()

@export var show_weapon: bool = true:
	set(value):
		show_weapon = value
		refresh()

@export var pose_direction_render_config: Dictionary = {}

var _sprites_by_layer: Dictionary = {}
var _base_positions_by_layer: Dictionary = {}
var _base_scales_by_layer: Dictionary = {}
var _formation_reference: Sprite2D = null

func _ready() -> void:
	if pose_direction_render_config.is_empty():
		pose_direction_render_config = DEFAULT_POSE_DIRECTION_RENDER_CONFIG.duplicate(true)
	_bind_layer_nodes()
	_bind_formation_reference()
	_update_formation_reference()
	refresh()

func refresh() -> void:
	if not is_inside_tree():
		return

	var render_direction: Direction = _get_render_direction()
	var should_flip: bool = _should_flip_direction(render_direction)
	var layers: Array = _get_layer_specs(pose, render_direction)

	_hide_all_layers()

	for layer_spec in layers:
		var layer_name: String = str(layer_spec["name"])
		var texture_path: String = str(layer_spec["path"])
		var hframes: int = int(layer_spec["hframes"])
		var frame_index: int = int(layer_spec["frame"])
		var sprite: Sprite2D = _get_layer_sprite(layer_name)
		if sprite == null:
			continue

		var texture: Texture2D = _load_texture(texture_path)
		if texture == null:
			continue

		sprite.texture = texture
		sprite.hframes = hframes
		sprite.frame = min(frame_index, sprite.hframes - 1)
		sprite.flip_h = should_flip
		sprite.position = _get_layer_position(layer_name)
		sprite.scale = _get_layer_scale(layer_name)
		_apply_layer_z_index(sprite, layer_name, render_direction)
		sprite.visible = true

func get_pose_label() -> String:
	return _get_pose_name(pose)

func get_direction_label() -> String:
	return _get_direction_name(direction)

func get_current_face_offset() -> Vector2:
	return _get_current_pose_direction_vector("face_offset")

func set_current_face_offset(offset: Vector2) -> void:
	_set_current_pose_direction_value("face_offset", offset)

func get_current_headwear_offset() -> Vector2:
	return _get_current_pose_direction_vector("headwear_offset")

func set_current_headwear_offset(offset: Vector2) -> void:
	_set_current_pose_direction_value("headwear_offset", offset)

func get_current_helmet_offset() -> Vector2:
	return _get_current_pose_direction_vector("helmet_offset")

func set_current_helmet_offset(offset: Vector2) -> void:
	_set_current_pose_direction_value("helmet_offset", offset)

func get_current_weapon_offset() -> Vector2:
	return _get_current_pose_direction_vector("weapon_offset")

func set_current_weapon_offset(offset: Vector2) -> void:
	_set_current_pose_direction_value("weapon_offset", offset)

func get_current_clothing_offset() -> Vector2:
	return _get_current_pose_direction_vector("clothing_offset")

func set_current_clothing_offset(offset: Vector2) -> void:
	_set_current_pose_direction_value("clothing_offset", offset)

func get_current_sprite_offset() -> Vector2:
	var value: Variant = sprite_offsets_by_spawn.get(spawn, DEFAULT_SPRITE_OFFSET)
	if value is Vector2:
		return value

	return DEFAULT_SPRITE_OFFSET

func set_current_sprite_offset(offset: Vector2) -> void:
	var offsets_by_spawn: Dictionary = sprite_offsets_by_spawn.duplicate()
	offsets_by_spawn[spawn] = offset
	sprite_offsets_by_spawn = offsets_by_spawn

func get_sprite_scale() -> float:
	return sprite_scale

func set_sprite_scale(value: float) -> void:
	sprite_scale = value

func get_show_formation_reference() -> bool:
	return show_formation_reference

func set_show_formation_reference(value: bool) -> void:
	show_formation_reference = value

func get_formation_reference_offset() -> Vector2:
	return formation_reference_offset

func set_formation_reference_offset(offset: Vector2) -> void:
	formation_reference_offset = offset

func get_formation_reference_scale() -> float:
	return formation_reference_scale

func set_formation_reference_scale(value: float) -> void:
	formation_reference_scale = value

func get_current_weapon_sheet_path() -> String:
	return str(_get_current_pose_direction_config().get("weapon_sheet", ""))

func get_current_weapon_frame_for_type(selected_weapon_type: int) -> int:
	return _get_weapon_frame(selected_weapon_type)

func get_current_weapon_frame_count() -> int:
	return int(_get_current_pose_direction_config().get("weapon_frame_count", BASE_POSE_FRAME_COUNT))

func set_current_weapon_frame_count(frame_count: int) -> void:
	_set_current_pose_direction_value("weapon_frame_count", max(1, frame_count))

func is_current_weapon_type_supported(selected_weapon_type: int) -> bool:
	return not _get_current_unsupported_weapon_types().has(selected_weapon_type)

func set_current_weapon_frame_for_type(selected_weapon_type: int, frame_index: int) -> void:
	var config: Dictionary = _get_current_pose_direction_config()
	var frame_by_type: Dictionary = (config.get("weapon_frames", {}) as Dictionary).duplicate()
	frame_by_type[selected_weapon_type] = frame_index
	config["weapon_frames"] = frame_by_type
	refresh()

func get_current_weapon_z_index() -> int:
	return int(_get_current_pose_direction_config().get("weapon_z", 45))

func set_current_weapon_z_index(z_index: int) -> void:
	_set_current_pose_direction_value("weapon_z", z_index)

func _get_current_pose_direction_vector(property_name: String) -> Vector2:
	var value: Variant = _get_current_pose_direction_config().get(property_name, Vector2.ZERO)
	if value is Vector2:
		return value

	return Vector2.ZERO

func _set_current_pose_direction_value(property_name: String, value: Variant) -> void:
	var config: Dictionary = _get_current_pose_direction_config()
	config[property_name] = value
	refresh()

func _get_current_pose_direction_config() -> Dictionary:
	var selected_key: String = _get_pose_direction_key(pose, direction)
	if pose_direction_render_config.has(selected_key):
		return _get_pose_direction_config(pose, direction)

	return _get_pose_direction_config(pose, _get_render_direction())

func _get_pose_direction_config(selected_pose: Pose, selected_direction: Direction) -> Dictionary:
	if pose_direction_render_config.is_empty():
		pose_direction_render_config = DEFAULT_POSE_DIRECTION_RENDER_CONFIG.duplicate(true)

	var key: String = _get_pose_direction_key(selected_pose, selected_direction)
	if not pose_direction_render_config.has(key):
		pose_direction_render_config[key] = {
			"face_offset": Vector2.ZERO,
			"headwear_offset": Vector2.ZERO,
			"helmet_offset": Vector2.ZERO,
			"weapon_offset": Vector2.ZERO,
			"clothing_offset": Vector2.ZERO,
			"weapon_z": 45,
			"weapon_sheet": "",
			"weapon_frame_count": BASE_POSE_FRAME_COUNT,
			"unsupported_weapon_types": [],
			"weapon_frames": {},
		}

	return pose_direction_render_config[key] as Dictionary

func _bind_layer_nodes() -> void:
	_sprites_by_layer.clear()
	_base_positions_by_layer.clear()
	_base_scales_by_layer.clear()
	for layer_name in LAYER_NODE_PATH.keys():
		var node_path: String = str(LAYER_NODE_PATH[layer_name])
		var node: Node = get_node_or_null(node_path)
		if node == null:
			push_error("Character sprite layer node is missing: %s" % str(node_path))
			continue

		if not node is Sprite2D:
			push_error("Character sprite layer node is not Sprite2D: %s" % str(node_path))
			continue

		var sprite: Sprite2D = node as Sprite2D
		_sprites_by_layer[layer_name] = sprite
		_base_positions_by_layer[layer_name] = sprite.position
		_base_scales_by_layer[layer_name] = sprite.scale

func _bind_formation_reference() -> void:
	var node: Node = get_node_or_null("FormationReference")
	if node == null:
		_formation_reference = null
		return

	if not node is Sprite2D:
		push_error("Character formation reference node is not Sprite2D")
		_formation_reference = null
		return

	_formation_reference = node as Sprite2D

func _update_formation_reference() -> void:
	if _formation_reference == null:
		return

	_formation_reference.visible = show_formation_reference
	_formation_reference.position = formation_reference_offset
	_formation_reference.scale = Vector2.ONE * formation_reference_scale

func _get_layer_sprite(layer_name: String) -> Sprite2D:
	if _sprites_by_layer.has(layer_name):
		return _sprites_by_layer[layer_name] as Sprite2D

	push_error("Character sprite layer is not bound: %s" % layer_name)
	return null

func _hide_all_layers() -> void:
	for layer in _sprites_by_layer.values():
		var sprite: Sprite2D = layer as Sprite2D
		sprite.visible = false

func _get_layer_position(layer_name: String) -> Vector2:
	var base_position_value: Variant = _base_positions_by_layer.get(layer_name, Vector2.ZERO)
	var base_position: Vector2 = Vector2.ZERO
	if base_position_value is Vector2:
		base_position = base_position_value

	var sprite_offset: Vector2 = get_current_sprite_offset()

	if layer_name == "weapon" or layer_name == "weapon_secondary":
		return base_position + sprite_offset + _get_weapon_layer_offset()

	if CLOTHING_LAYER_NAMES.has(layer_name):
		return base_position + sprite_offset + get_current_clothing_offset()

	if HEADWEAR_LAYER_NAMES.has(layer_name):
		var headwear_position: Vector2 = base_position + sprite_offset + get_current_face_offset() + get_current_headwear_offset()
		if layer_name == "headwear" and headwear == Headwear.HELMET:
			return headwear_position + get_current_helmet_offset()

		return headwear_position

	if not FACE_LAYER_NAMES.has(layer_name):
		return base_position + sprite_offset

	return base_position + sprite_offset + get_current_face_offset()

func _get_weapon_layer_offset() -> Vector2:
	return get_current_weapon_offset()

func _get_layer_scale(layer_name: String) -> Vector2:
	var base_scale_value: Variant = _base_scales_by_layer.get(layer_name, Vector2.ONE)
	var base_scale: Vector2 = Vector2.ONE
	if base_scale_value is Vector2:
		base_scale = base_scale_value

	return base_scale * sprite_scale

func _apply_layer_z_index(sprite: Sprite2D, layer_name: String, render_direction: Direction) -> void:
	if layer_name != "weapon" and layer_name != "weapon_secondary":
		return

	sprite.z_index = int(_get_current_pose_direction_config().get("weapon_z", 45))

func _get_pose_direction_key(selected_pose: Pose, selected_direction: Direction) -> String:
	return "%s:%s" % [_get_pose_name(selected_pose), _get_direction_name(selected_direction)]

func _load_texture(texture_path: String) -> Texture2D:
	if not ResourceLoader.exists(texture_path):
		return null

	var resource: Resource = load(texture_path)
	if resource == null:
		return null

	if not resource is Texture2D:
		push_error("Character sprite resource is not a Texture2D: %s" % texture_path)
		return null

	return resource as Texture2D

func _get_render_direction() -> Direction:
	return int(DIRECTION_MIRROR_FALLBACK.get(direction, direction))

func _should_flip_direction(render_direction: Direction) -> bool:
	return render_direction != direction

func _get_layer_specs(selected_pose: Pose, selected_direction: Direction) -> Array:
	match selected_pose:
		Pose.IDLE:
			return _get_idle_layer_specs(selected_direction)
		Pose.WALK:
			return _get_walk_layer_specs(selected_direction)
		Pose.AIM_PISTOL:
			return _get_aim_pistol_layer_specs(selected_direction)
		Pose.LONGARM:
			return _get_longarm_layer_specs(selected_direction)
		Pose.AIM_2_PISTOLS:
			return _get_aim_2_pistols_layer_specs(selected_direction)
		Pose.FLINCH:
			return _get_flinch_layer_specs(selected_direction)
		Pose.SWING_1H:
			return _get_swing_1h_layer_specs(selected_direction)
		Pose.THRUST_1H:
			return _get_thrust_1h_layer_specs(selected_direction)
		_:
			return []

func _get_idle_layer_specs(selected_direction: Direction) -> Array:
	match selected_direction:
		Direction.SOUTH:
			return _get_south_idle_layer_specs()
		Direction.NORTH:
			return _get_north_idle_layer_specs()
		Direction.SOUTH_WEST:
			return _get_body_weapon_layer_specs("idle/Char1_south_west_idle", "Idle_body_SW1", DIAGONAL_POSE_FRAME_COUNT)
		Direction.NORTH_WEST:
			return _get_body_weapon_layer_specs("idle/Char1_north_west_idle", "Idle_body_NW1", DIAGONAL_POSE_FRAME_COUNT)
		_:
			return []

func _get_walk_layer_specs(selected_direction: Direction) -> Array:
	match selected_direction:
		Direction.SOUTH:
			return _get_south_walk_layer_specs()
		Direction.NORTH:
			return _get_north_walk_layer_specs()
		Direction.SOUTH_WEST:
			return _get_body_weapon_layer_specs("walk/Char1_south_west_walk", "Walk_body_SW1", DIAGONAL_POSE_FRAME_COUNT)
		Direction.NORTH_WEST:
			return _get_body_weapon_layer_specs("walk/Char1_north_west_walk", "Walk_body_NW1", DIAGONAL_POSE_FRAME_COUNT)
		_:
			return []

func _get_aim_pistol_layer_specs(selected_direction: Direction) -> Array:
	match selected_direction:
		Direction.SOUTH:
			return _get_south_aim_pistol_layer_specs()
		Direction.NORTH:
			return _get_north_aim_pistol_layer_specs()
		Direction.SOUTH_WEST:
			return _get_body_weapon_layer_specs("aim-pistol/SW", "Aim_pistol_body_SW1", DIAGONAL_POSE_FRAME_COUNT)
		Direction.SOUTH_EAST:
			return _get_body_weapon_layer_specs("aim-pistol/SW", "Aim_pistol_body_SW1", DIAGONAL_POSE_FRAME_COUNT)
		Direction.NORTH_WEST:
			return _get_body_weapon_layer_specs("aim-pistol/NW", "Aim_pistol_body_NW1", DIAGONAL_POSE_FRAME_COUNT)
		_:
			return []

func _get_longarm_layer_specs(selected_direction: Direction) -> Array:
	match selected_direction:
		Direction.SOUTH:
			return _get_south_longarm_layer_specs()
		Direction.NORTH:
			return _get_north_longarm_layer_specs()
		Direction.SOUTH_WEST:
			return _get_body_weapon_layer_specs("longarm/SW", "Aim_longarm_body_SW1", DIAGONAL_POSE_FRAME_COUNT)
		Direction.SOUTH_EAST:
			return _get_body_weapon_layer_specs("longarm/SW", "Aim_longarm_body_SW1", DIAGONAL_POSE_FRAME_COUNT)
		Direction.NORTH_WEST:
			return _get_body_weapon_layer_specs("longarm/NW", "Aim_longarm_body_NW1", DIAGONAL_POSE_FRAME_COUNT)
		_:
			return []

func _get_aim_2_pistols_layer_specs(selected_direction: Direction) -> Array:
	match selected_direction:
		Direction.SOUTH:
			return _get_action_south_layer_specs(
				"aim-2-pistols/S", "Aim_2pistols_Body1.png", "Char1_aim2pistols_boots1.png", "Char1_aim2pistols_pants1.png", "Char1_aim2pistols_Shirts1.png",
				"Char1_aim2pistols_beard_%s.png", "Char1_aim2pistols_mustache_%s.png", "Char1_aim2pistols_sideburns_%s.png", "Char1_aim2pistols_eyes1.png", "Char1_aim2pistols_eyebrows1.png",
				"Char1_aim2pistols_hair_%s.png", "Char1_aim2pistols_weapon1.png", AIM_2_PISTOLS_WEAPON_FRAME_COUNT
			)
		Direction.NORTH:
			return _get_action_north_layer_specs("aim-2-pistols/N", "Aim_2pistols_Body_back1.png", "Char1_back_aim2pistols_boots.png", "Char1_back_aim2pistols_pants.png", "Char1_back_aim2pistols_shirts.png", "Char1_back_aim2pistols_hair_%s.png", "Char1_back_aim2pistols_weapon.png", AIM_2_PISTOLS_WEAPON_FRAME_COUNT)
		Direction.SOUTH_WEST:
			return _get_body_weapon_layer_specs("aim-2-pistols/SW", "Aim_2pistols_body_SW1", DIAGONAL_POSE_FRAME_COUNT)
		Direction.NORTH_WEST:
			return _get_body_weapon_layer_specs("aim-2-pistols/NW", "Aim_2pistols_body_NW1", DIAGONAL_POSE_FRAME_COUNT)
		_:
			return []

func _get_flinch_layer_specs(selected_direction: Direction) -> Array:
	match selected_direction:
		Direction.SOUTH:
			return _get_action_south_layer_specs(
				"flinch/S", "Flinch_Body1.png", "Char1_Flinch_boots1.png", "Char1_Flinch_pants1.png", "Char1_Flinch_Shirts1.png",
				"Char1_flinch_beard_%s.png", "Char1_flinch_mustache_%s.png", "Char1_flinch_sideburns_%s.png", "Char1_flinch_eyes1.png", "Char1_flinch_eyebrows1.png",
				"Char1_flinch_hair_%s.png", "Char1_flinch_weapon1.png", FLINCH_WEAPON_FRAME_COUNT
			)
		Direction.NORTH:
			return _get_action_north_layer_specs("flinch/N", "Flinch_Body_back1.png", "Char1_back_flinch_boots.png", "Char1_back_flinch_pants.png", "Char1_back_flinch_shirts.png", "Char1_back_flinch_hair_%s.png", "Char1_back_flinch_weapon.png", FLINCH_WEAPON_FRAME_COUNT)
		Direction.SOUTH_WEST:
			return _get_body_weapon_layer_specs("flinch/SW", "Flinch_body_SW1", DIAGONAL_POSE_FRAME_COUNT)
		Direction.NORTH_WEST:
			return _get_body_weapon_layer_specs("flinch/NW", "Flinch_body_NW1", DIAGONAL_POSE_FRAME_COUNT)
		_:
			return []

func _get_swing_1h_layer_specs(selected_direction: Direction) -> Array:
	match selected_direction:
		Direction.SOUTH:
			return _get_action_south_layer_specs(
				"swing-1h/S", "Swing_1h_Body1.png", "Char1_swing_boots1.png", "Char1_Swing_pants1.png", "Char1_swing_Shirts1.png",
				"Char1_swing1h_beard_%s.png", "Char1_swing1h_mustache_%s.png", "Char1_swing1h_sideburns_%s.png", "Char1_Swing1h_eyes1.png", "Char1_swing1h_eyebrows1.png",
				"Char1_swing1h_hair_%s.png", "Char1_swing1h_weapon1.png", SWING_1H_WEAPON_FRAME_COUNT, true
			)
		Direction.NORTH:
			return _get_action_north_layer_specs("swing-1h/N", "Swing_1h_Body_back1.png", "Char1_back_swing1h_boots.png", "Char1_back_swing1h_pants.png", "Char1_back_swing1h_shirts.png", "Char1_back_swing1h_hair_%s.png", "Char1_back_swing1h_weapon.png", SWING_1H_WEAPON_FRAME_COUNT)
		Direction.SOUTH_WEST:
			return _get_body_weapon_layer_specs("swing-1h/SW", "Swing_1h_body_SW1", DIAGONAL_POSE_FRAME_COUNT)
		Direction.NORTH_WEST:
			return _get_body_weapon_layer_specs("swing-1h/NW", "Swing_body_NW1", DIAGONAL_POSE_FRAME_COUNT)
		_:
			return []

func _get_thrust_1h_layer_specs(selected_direction: Direction) -> Array:
	match selected_direction:
		Direction.SOUTH:
			return _get_action_south_layer_specs(
				"thrust-1h/S", "Thrust_1h_Body1.png", "Char1_Thrust_boots1.png", "Char1_Thrust_pants1.png", "Char1_Thrust_Shirts1.png",
				"Char1_thrust_beard_%s.png", "Char1_thrust_mustache_%s.png", "Char1_thrust_sideburns_%s.png", "Char1_thrust_eyes1.png", "Char1_thrust_eyebrows1.png",
				"Char1_thrust_hair_%s.png", "Char1_thrust_weapon1.png", THRUST_1H_WEAPON_FRAME_COUNT
			)
		Direction.NORTH:
			return _get_action_north_layer_specs("thrust-1h/N", "Thrust_1h_Body_back1.png", "Char1_back_thrust_boots.png", "Char1_back_thrust_pants.png", "Char1_back_thrust_shirts.png", "Char1_back_thrust_hair_%s.png", "Char1_back_thrust_weapon.png", THRUST_1H_WEAPON_FRAME_COUNT)
		Direction.SOUTH_WEST:
			return _get_body_weapon_layer_specs("thrust-1h/SW", "Thrust_1h_body_SW1", DIAGONAL_POSE_FRAME_COUNT)
		Direction.NORTH_WEST:
			return _get_body_weapon_layer_specs("thrust-1h/NW", "Thrust_body_NW1", DIAGONAL_POSE_FRAME_COUNT)
		_:
			return []

func _get_south_aim_pistol_layer_specs() -> Array:
	var base_path: String = "aim-pistol/S"
	var specs: Array = []

	if show_body:
		specs.append(_pose_layer_spec("body", "%s/Aim_pistol_Body1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_boots:
		specs.append(_pose_layer_spec("boots", "%s/Char1_aimpistol_boots1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_pants:
		specs.append(_pose_layer_spec("pants", "%s/Char1_aimpistol_pants1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_shirts:
		specs.append(_pose_layer_spec("shirts", "%s/Char1_aimpistol_Shirts1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_beard:
		specs.append(_layer_spec("beard", "%s/Char1_aimpistol_beard_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[beard_color]], BEARD_STYLE_COUNT, int(beard_style)))

	if show_mustache:
		specs.append(_layer_spec("mustache", "%s/Char1_aimpistol_mustache_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[mustache_color]], MUSTACHE_STYLE_COUNT, int(mustache_style)))

	if show_sideburns:
		specs.append(_layer_spec("sideburns", "%s/Char1_aimpistol_sideburns_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[sideburns_color]], SIDEBURNS_STYLE_COUNT, int(sideburns_style)))

	if show_eyes:
		specs.append(_layer_spec("eyes", "%s/Char1_aimpistol_eyes1.png" % base_path, FACE_STYLE_COUNT, int(eye_color)))

	if show_eyebrows:
		specs.append(_layer_spec("eyebrows", "%s/Char1_aimpistol_eyebrows1.png" % base_path, FACE_STYLE_COUNT, int(eyebrow_color)))

	if _should_render_hair():
		specs.append(_layer_spec("hair", "%s/Char1_aimpistol_hair_%s.png" % [base_path, HAIR_COLOR_SUFFIX[hair_color]], HAIR_STYLE_COUNT, int(hair_style)))

	if show_headwear:
		var headwear_spec: Dictionary = _get_south_headwear_spec(base_path)
		if not headwear_spec.is_empty():
			specs.append(headwear_spec)

	if show_head_bandage:
		var head_bandage_spec: Dictionary = _get_south_head_bandage_spec(base_path)
		if not head_bandage_spec.is_empty():
			specs.append(head_bandage_spec)

	if show_weapon:
		specs.append_array(_weapon_pose_layer_specs("%s/Char1_aimpistol_weapon_left1.png" % base_path, AIM_PISTOL_WEAPON_FRAME_COUNT))

	return specs

func _get_south_longarm_layer_specs() -> Array:
	var base_path: String = "longarm/S"
	var specs: Array = []

	if show_body:
		specs.append(_pose_layer_spec("body", "%s/Aim_long_arm_Body1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_boots:
		specs.append(_pose_layer_spec("boots", "%s/Char1_longarm_boots1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_pants:
		specs.append(_pose_layer_spec("pants", "%s/Char1_longarm_pants1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_shirts:
		specs.append(_pose_layer_spec("shirts", "%s/Char1_longarm_Shirts1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_beard:
		specs.append(_layer_spec("beard", "%s/Char1_longarm_beard_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[beard_color]], BEARD_STYLE_COUNT, int(beard_style)))

	if show_mustache:
		specs.append(_layer_spec("mustache", "%s/Char1_longarm_mustache_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[mustache_color]], MUSTACHE_STYLE_COUNT, int(mustache_style)))

	if show_sideburns:
		specs.append(_layer_spec("sideburns", "%s/Char1_longarm_sideburns_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[sideburns_color]], SIDEBURNS_STYLE_COUNT, int(sideburns_style)))

	if show_eyes:
		specs.append(_layer_spec("eyes", "%s/Char1_longarm_eyes1.png" % base_path, FACE_STYLE_COUNT, int(eye_color)))

	if show_eyebrows:
		specs.append(_layer_spec("eyebrows", "%s/Char1_longarm_eyebrows1.png" % base_path, FACE_STYLE_COUNT, int(eyebrow_color)))

	if _should_render_hair():
		specs.append(_layer_spec("hair", "%s/Char1_longarm_hair_%s.png" % [base_path, HAIR_COLOR_SUFFIX[hair_color]], HAIR_STYLE_COUNT, int(hair_style)))

	if show_headwear:
		var headwear_spec: Dictionary = _get_south_headwear_spec(base_path)
		if not headwear_spec.is_empty():
			specs.append(headwear_spec)

	if show_head_bandage:
		var head_bandage_spec: Dictionary = _get_south_head_bandage_spec(base_path)
		if not head_bandage_spec.is_empty():
			specs.append(head_bandage_spec)

	if show_weapon:
		specs.append_array(_weapon_pose_layer_specs("%s/Char1_longarm_weapon1.png" % base_path, LONGARM_WEAPON_FRAME_COUNT))

	return specs

func _get_north_longarm_layer_specs() -> Array:
	var base_path: String = "longarm/N"
	var specs: Array = []

	if show_body:
		specs.append(_pose_layer_spec("body", "%s/Aim_long_arm_Body_back1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_boots:
		specs.append(_pose_layer_spec("boots", "%s/Char1_back_longarm_boots.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_pants:
		specs.append(_pose_layer_spec("pants", "%s/Char1_back_longarm_pants.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_shirts:
		specs.append(_pose_layer_spec("shirts", "%s/Char1_back_longarm_shirts.png" % base_path, BASE_POSE_FRAME_COUNT))

	if _should_render_hair():
		specs.append(_layer_spec("hair", "%s/Char1_back_longarm_hair_%s.png" % [base_path, HAIR_COLOR_SUFFIX[hair_color]], HAIR_STYLE_COUNT, int(hair_style)))

	if show_weapon:
		specs.append_array(_weapon_pose_layer_specs("%s/Char1_back_longarm_weapon.png" % base_path, LONGARM_WEAPON_FRAME_COUNT))

	return specs

func _get_north_aim_pistol_layer_specs() -> Array:
	var base_path: String = "aim-pistol/N"
	var specs: Array = []

	if show_body:
		specs.append(_pose_layer_spec("body", "%s/Aim_pistol_Body_back1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_boots:
		specs.append(_pose_layer_spec("boots", "%s/Char1_back_aimpistol_boots.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_pants:
		specs.append(_pose_layer_spec("pants", "%s/Char1_back_aimpistol_pants.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_shirts:
		specs.append(_pose_layer_spec("shirts", "%s/Char1_back_aimpistol_shirts.png" % base_path, BASE_POSE_FRAME_COUNT))

	if _should_render_hair():
		specs.append(_layer_spec("hair", "%s/Char1_back_aimpistol_hair_%s.png" % [base_path, HAIR_COLOR_SUFFIX[hair_color]], HAIR_STYLE_COUNT, int(hair_style)))

	if show_weapon:
		specs.append_array(_weapon_pose_layer_specs("%s/Char1_back_aimpistol_weapon.png" % base_path, AIM_PISTOL_NORTH_WEAPON_FRAME_COUNT))

	return specs

func _get_south_idle_layer_specs() -> Array:
	var base_path: String = "idle/Char1_south_idle"
	var specs: Array = []

	if show_body:
		specs.append(_pose_layer_spec("body", "%s/Char1_body.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_boots:
		specs.append(_pose_layer_spec("boots", "%s/Char1_boots1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_pants:
		specs.append(_pose_layer_spec("pants", "%s/Char1_pants1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_shirts:
		specs.append(_pose_layer_spec("shirts", "%s/Char1_Shirts1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_armor:
		specs.append(_get_south_armor_spec(base_path))

	if show_beard:
		specs.append(_layer_spec("beard", "%s/Char1_beard_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[beard_color]], BEARD_STYLE_COUNT, int(beard_style)))

	if show_mustache:
		specs.append(_layer_spec("mustache", "%s/Char1_mustache_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[mustache_color]], MUSTACHE_STYLE_COUNT, int(mustache_style)))

	if show_sideburns:
		specs.append(_layer_spec("sideburns", "%s/Char1_sideburns_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[sideburns_color]], SIDEBURNS_STYLE_COUNT, int(sideburns_style)))

	if show_eyes:
		specs.append(_layer_spec("eyes", "%s/Char1_eyes1.png" % base_path, FACE_STYLE_COUNT, int(eye_color)))

	if show_eyebrows:
		specs.append(_layer_spec("eyebrows", "%s/Char1_eyebrows1.png" % base_path, FACE_STYLE_COUNT, int(eyebrow_color)))

	if show_eye_bandage:
		specs.append(_layer_spec("eye_bandage", "%s/Char1_eye_bandage.png" % base_path, FACE_STYLE_COUNT, int(eye_bandage_color)))

	if _should_render_hair():
		specs.append(_layer_spec("hair", "%s/Char1_hair_%s.png" % [base_path, HAIR_COLOR_SUFFIX[hair_color]], HAIR_STYLE_COUNT, int(hair_style)))

	if show_headwear:
		var headwear_spec: Dictionary = _get_south_headwear_spec(base_path)
		if not headwear_spec.is_empty():
			specs.append(headwear_spec)

	if show_head_bandage:
		var head_bandage_spec: Dictionary = _get_south_head_bandage_spec(base_path)
		if not head_bandage_spec.is_empty():
			specs.append(head_bandage_spec)

	if show_weapon:
		specs.append_array(_weapon_pose_layer_specs("%s/Char1_weapon1.png" % base_path, BASE_POSE_FRAME_COUNT))

	return specs

func _get_north_idle_layer_specs() -> Array:
	var base_path: String = "idle/Char1_north_idle"
	var specs: Array = []

	if show_body:
		specs.append(_pose_layer_spec("body", "%s/Char1_body_back.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_boots:
		specs.append(_pose_layer_spec("boots", "%s/Char1_back_stand_boots.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_pants:
		specs.append(_pose_layer_spec("pants", "%s/Char1_back_stand_pants.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_shirts:
		specs.append(_pose_layer_spec("shirts", "%s/Char1_back_stand_shirts.png" % base_path, BASE_POSE_FRAME_COUNT))

	if _should_render_hair():
		specs.append(_layer_spec("hair", "%s/Char1_back_stand_hair_%s.png" % [base_path, HAIR_COLOR_SUFFIX[hair_color]], HAIR_STYLE_COUNT, int(hair_style)))

	if show_weapon:
		specs.append_array(_weapon_pose_layer_specs("%s/Char1_back_stand_weapon.png" % base_path, BASE_POSE_FRAME_COUNT))

	return specs

func _get_south_walk_layer_specs() -> Array:
	var base_path: String = "walk/Char1_Walk"
	var specs: Array = []

	if show_body:
		specs.append(_pose_layer_spec("body", "%s/Walk_Body1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_boots:
		specs.append(_pose_layer_spec("boots", "%s/Char1_Walk_boots1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_pants:
		specs.append(_pose_layer_spec("pants", "%s/Char1_Walk_pants1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_shirts:
		specs.append(_pose_layer_spec("shirts", "%s/Char1_Walk_Shirts1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_beard:
		specs.append(_layer_spec("beard", "%s/Char1_walk_beard_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[beard_color]], BEARD_STYLE_COUNT, int(beard_style)))

	if show_mustache:
		specs.append(_layer_spec("mustache", "%s/Char1_walk_mustache_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[mustache_color]], MUSTACHE_STYLE_COUNT, int(mustache_style)))

	if show_sideburns:
		specs.append(_layer_spec("sideburns", "%s/Char1_walk_sideburns_%s.png" % [base_path, FACIAL_HAIR_COLOR_SUFFIX[sideburns_color]], SIDEBURNS_STYLE_COUNT, int(sideburns_style)))

	if show_eyes:
		specs.append(_layer_spec("eyes", "%s/Char1_walk_eyes1.png" % base_path, FACE_STYLE_COUNT, int(eye_color)))

	if show_eyebrows:
		specs.append(_layer_spec("eyebrows", "%s/Char1_walk_eyebrows1.png" % base_path, FACE_STYLE_COUNT, int(eyebrow_color)))

	if _should_render_hair():
		specs.append(_layer_spec("hair", "%s/Char1_walk_hair_%s.png" % [base_path, HAIR_COLOR_SUFFIX[hair_color]], HAIR_STYLE_COUNT, int(hair_style)))

	if show_headwear:
		var headwear_spec: Dictionary = _get_south_headwear_spec(base_path)
		if not headwear_spec.is_empty():
			specs.append(headwear_spec)

	if show_head_bandage:
		var head_bandage_spec: Dictionary = _get_south_head_bandage_spec(base_path)
		if not head_bandage_spec.is_empty():
			specs.append(head_bandage_spec)

	if show_weapon:
		specs.append_array(_weapon_pose_layer_specs("%s/Char1_walk_weapon1.png" % base_path, DIAGONAL_POSE_FRAME_COUNT))

	return specs

func _get_north_walk_layer_specs() -> Array:
	var base_path: String = "walk/Char1_walk_back"
	var specs: Array = []

	if show_body:
		specs.append(_pose_layer_spec("body", "%s/Walk_Body_back1.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_boots:
		specs.append(_pose_layer_spec("boots", "%s/Char1_back_walk_boots.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_pants:
		specs.append(_pose_layer_spec("pants", "%s/Char1_back_walk_pants.png" % base_path, BASE_POSE_FRAME_COUNT))

	if show_shirts:
		specs.append(_pose_layer_spec("shirts", "%s/Char1_back_walk_shirts.png" % base_path, BASE_POSE_FRAME_COUNT))

	if _should_render_hair():
		specs.append(_layer_spec("hair", "%s/Char1_back_walk_hair_%s.png" % [base_path, HAIR_COLOR_SUFFIX[hair_color]], HAIR_STYLE_COUNT, int(hair_style)))

	if show_weapon:
		specs.append_array(_weapon_pose_layer_specs("%s/Char1_back_walk_weapon.png" % base_path, WALK_NORTH_WEAPON_FRAME_COUNT))

	return specs

func _get_action_south_layer_specs(
	base_path: String,
	body_file: String,
	boots_file: String,
	pants_file: String,
	shirts_file: String,
	beard_pattern: String,
	mustache_pattern: String,
	sideburns_pattern: String,
	eyes_file: String,
	eyebrows_file: String,
	hair_pattern: String,
	weapon_file: String,
	weapon_hframes: int,
	use_swing_beard_brown_suffix: bool = false
) -> Array:
	var specs: Array = []

	if show_body:
		specs.append(_pose_layer_spec("body", "%s/%s" % [base_path, body_file], BASE_POSE_FRAME_COUNT))

	if show_boots:
		specs.append(_pose_layer_spec("boots", "%s/%s" % [base_path, boots_file], BASE_POSE_FRAME_COUNT))

	if show_pants:
		specs.append(_pose_layer_spec("pants", "%s/%s" % [base_path, pants_file], BASE_POSE_FRAME_COUNT))

	if show_shirts:
		specs.append(_pose_layer_spec("shirts", "%s/%s" % [base_path, shirts_file], BASE_POSE_FRAME_COUNT))

	if show_beard:
		var beard_suffix: String = _get_facial_hair_file_suffix(beard_color, use_swing_beard_brown_suffix)
		specs.append(_layer_spec("beard", "%s/%s" % [base_path, beard_pattern % beard_suffix], BEARD_STYLE_COUNT, int(beard_style)))

	if show_mustache:
		specs.append(_layer_spec("mustache", "%s/%s" % [base_path, mustache_pattern % FACIAL_HAIR_COLOR_SUFFIX[mustache_color]], MUSTACHE_STYLE_COUNT, int(mustache_style)))

	if show_sideburns:
		specs.append(_layer_spec("sideburns", "%s/%s" % [base_path, sideburns_pattern % FACIAL_HAIR_COLOR_SUFFIX[sideburns_color]], SIDEBURNS_STYLE_COUNT, int(sideburns_style)))

	if show_eyes:
		specs.append(_layer_spec("eyes", "%s/%s" % [base_path, eyes_file], FACE_STYLE_COUNT, int(eye_color)))

	if show_eyebrows:
		specs.append(_layer_spec("eyebrows", "%s/%s" % [base_path, eyebrows_file], FACE_STYLE_COUNT, int(eyebrow_color)))

	if _should_render_hair():
		specs.append(_layer_spec("hair", "%s/%s" % [base_path, hair_pattern % HAIR_COLOR_SUFFIX[hair_color]], HAIR_STYLE_COUNT, int(hair_style)))

	if show_headwear:
		var headwear_spec: Dictionary = _get_south_headwear_spec(base_path)
		if not headwear_spec.is_empty():
			specs.append(headwear_spec)

	if show_head_bandage:
		var head_bandage_spec: Dictionary = _get_south_head_bandage_spec(base_path)
		if not head_bandage_spec.is_empty():
			specs.append(head_bandage_spec)

	if show_weapon:
		specs.append_array(_weapon_pose_layer_specs("%s/%s" % [base_path, weapon_file], weapon_hframes))

	return specs

func _get_action_north_layer_specs(
	base_path: String,
	body_file: String,
	boots_file: String,
	pants_file: String,
	shirts_file: String,
	hair_pattern: String,
	weapon_file: String,
	weapon_hframes: int
) -> Array:
	var specs: Array = []

	if show_body:
		specs.append(_pose_layer_spec("body", "%s/%s" % [base_path, body_file], BASE_POSE_FRAME_COUNT))

	if show_boots:
		specs.append(_pose_layer_spec("boots", "%s/%s" % [base_path, boots_file], BASE_POSE_FRAME_COUNT))

	if show_pants:
		specs.append(_pose_layer_spec("pants", "%s/%s" % [base_path, pants_file], BASE_POSE_FRAME_COUNT))

	if show_shirts:
		specs.append(_pose_layer_spec("shirts", "%s/%s" % [base_path, shirts_file], BASE_POSE_FRAME_COUNT))

	if _should_render_hair():
		specs.append(_layer_spec("hair", "%s/%s" % [base_path, hair_pattern % HAIR_COLOR_SUFFIX[hair_color]], HAIR_STYLE_COUNT, int(hair_style)))

	if show_weapon:
		specs.append_array(_weapon_pose_layer_specs("%s/%s" % [base_path, weapon_file], weapon_hframes))

	return specs

func _get_facial_hair_file_suffix(selected_color: FacialHairColor, use_swing_beard_brown_suffix: bool) -> String:
	if use_swing_beard_brown_suffix and selected_color == FacialHairColor.BROWN:
		return "brnw"

	return str(FACIAL_HAIR_COLOR_SUFFIX[selected_color])

func _get_body_weapon_layer_specs(folder: String, body_name: String, hframes: int) -> Array:
	var specs: Array = []

	if show_body:
		specs.append(_pose_layer_spec("body", "%s/%s.png" % [folder, body_name], hframes))

	if show_weapon:
		specs.append_array(_weapon_pose_layer_specs("%s/%s_weapon.png" % [folder, body_name], hframes))

	return specs

func _weapon_pose_layer_specs(relative_path: String, hframes: int) -> Array:
	var specs: Array = []
	var weapon_hframes: int = int(_get_current_pose_direction_config().get("weapon_frame_count", hframes))
	if weapon_type != WeaponType.NONE and is_current_weapon_type_supported(weapon_type):
		specs.append(_weapon_pose_layer_spec("weapon", relative_path, weapon_hframes, weapon_type))

	if weapon_type_secondary != WeaponType.NONE and is_current_weapon_type_supported(weapon_type_secondary):
		specs.append(_weapon_pose_layer_spec("weapon_secondary", relative_path, weapon_hframes, weapon_type_secondary))

	return specs

func _weapon_pose_layer_spec(layer_name: String, relative_path: String, hframes: int, selected_weapon_type: int) -> Dictionary:
	var frame_index: int = _get_weapon_frame(selected_weapon_type)
	return _layer_spec(layer_name, relative_path, hframes, frame_index)

func _get_weapon_frame(selected_weapon_type: int) -> int:
	var frame_by_type: Dictionary = _get_current_weapon_frame_map()
	return int(frame_by_type.get(selected_weapon_type, int(selected_weapon_type)))

func _get_current_weapon_frame_map() -> Dictionary:
	return (_get_current_pose_direction_config().get("weapon_frames", {}) as Dictionary).duplicate()

func _get_current_unsupported_weapon_types() -> Array:
	return _get_current_pose_direction_config().get("unsupported_weapon_types", []) as Array

func _get_south_headwear_spec(base_path: String) -> Dictionary:
	match headwear:
		Headwear.BANDANA:
			return _layer_spec("headwear", "%s/Char1_bandana.png" % base_path, HEADWEAR_STYLE_COUNT, int(bandana_color))
		Headwear.TRICORN:
			return _layer_spec("headwear", "%s/Char1_tricorn.png" % base_path, HEADWEAR_STYLE_COUNT, int(tricorn_color))
		Headwear.HELMET:
			return _layer_spec("headwear", "%s/Char1_helmet1.png" % base_path, HELMET_STYLE_COUNT, int(helmet_variant))
		_:
			return {}

func _get_south_head_bandage_spec(base_path: String) -> Dictionary:
	return _layer_spec("head_bandage", "%s/Char1_head_bandage.png" % base_path, HEADWEAR_STYLE_COUNT, int(head_bandage_color))

func _get_south_armor_spec(base_path: String) -> Dictionary:
	var frame_index: int = 0
	if armor_variant == ArmorVariant.UNIFORM:
		frame_index = int(uniform_color) + 1

	return _layer_spec("armor", "%s/Char1_armor1.png" % base_path, ARMOR_STYLE_COUNT, frame_index)

func _should_render_hair() -> bool:
	if not show_hair:
		return false

	return not show_headwear or (headwear != Headwear.BANDANA and headwear != Headwear.HELMET)

func _pose_layer_spec(layer_name: String, relative_path: String, hframes: int) -> Dictionary:
	var frame_index: int = DEFAULT_STYLE_INDEX
	if layer_name == "body":
		frame_index = int(skin_color)
	elif layer_name == "boots":
		frame_index = int(boots_color)
	elif layer_name == "pants":
		frame_index = int(pants_color)
	elif layer_name == "shirts":
		frame_index = int(shirt_color)

	return _layer_spec(layer_name, relative_path, hframes, frame_index)

func _style_layer_spec(layer_name: String, relative_path: String, hframes: int) -> Dictionary:
	return _layer_spec(layer_name, relative_path, hframes, DEFAULT_STYLE_INDEX)

func _layer_spec(layer_name: String, relative_path: String, hframes: int, frame_index: int) -> Dictionary:
	return {
		"name": layer_name,
		"path": "%s/%s" % [ASSET_ROOT, relative_path],
		"hframes": hframes,
		"frame": frame_index,
	}

func _get_pose_name(selected_pose: Pose) -> String:
	match selected_pose:
		Pose.IDLE:
			return "idle"
		Pose.WALK:
			return "walk"
		Pose.AIM_PISTOL:
			return "aim-pistol"
		Pose.LONGARM:
			return "longarm"
		Pose.AIM_2_PISTOLS:
			return "aim-2-pistols"
		Pose.FLINCH:
			return "flinch"
		Pose.SWING_1H:
			return "swing-1h"
		Pose.THRUST_1H:
			return "thrust-1h"
		_:
			return "unknown"

func _get_direction_name(selected_direction: Direction) -> String:
	match selected_direction:
		Direction.SOUTH:
			return "south"
		Direction.NORTH:
			return "north"
		Direction.SOUTH_WEST:
			return "south_west"
		Direction.NORTH_WEST:
			return "north_west"
		Direction.SOUTH_EAST:
			return "south_east"
		Direction.NORTH_EAST:
			return "north_east"
		_:
			return "unknown"
