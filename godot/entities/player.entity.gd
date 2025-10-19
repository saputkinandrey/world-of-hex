class_name PlayerEntity
extends Resource

@export var _id: String
@export var name: String

func from_dict(data: Dictionary) -> PlayerEntity:
	_id = data.get("_id", "")
	name = data.get("name", "")
	return self
