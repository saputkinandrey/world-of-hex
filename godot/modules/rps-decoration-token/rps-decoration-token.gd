class_name RpsDecorationToken
extends Node2D

## ID структуры / декора из мира (structureId)
@export var decoration_id: String = ""

## Текстура одного кадра (например, Puddle 1-1.png)
@export var texture: Texture2D

@onready var sprite: Sprite2D = $Sprite2D

func _ready() -> void:
	if texture:
		sprite.texture = texture
	sprite.centered = true
