class_name RpsActorToken
extends Node2D

## ID актора из мира (creatureId)
@export var actor_id: String = ""

## Текстура со спрайт-листом (например, Lizzard 1-6.png)
@export var texture: Texture2D

## Количество кадров по горизонтали (для наших ящериц = 6)
@export var hframes: int = 6

## Текущий фейсинг (0..hframes-1), индекс кадра как у корабля
@export var facing_index: int = 0

@onready var sprite: Sprite2D = $Sprite2D

func _ready() -> void:
	if texture:
		sprite.texture = texture

	sprite.hframes = max(hframes, 1)
	sprite.vframes = 1
	sprite.centered = true
	sprite.frame = clamp(facing_index, 0, sprite.hframes - 1)
