class_name MovableTrait
extends Node

@export var state: MovableState

@onready var IdleState: MovableState = $IdleState
@onready var MovingState: MovableState = $MovingState

@onready var parent: ShipObject = get_parent()
@onready var movableData: MovableData = parent.movableData
@onready var tileMapLayer: TileMapLayer = parent.tileMapLayer
@onready var _position_label: Label = parent.get_node_or_null("Labels/Position") as Label

var timePassed: float = 0
var _tween: Tween

func move(movement: Variant, total_duration: float = -1.0) -> void:
    if is_moving():
        return

    var offsets: Array[Vector2i] = []
    if movement is Vector2i:
        offsets.append(movement)
    elif movement is Array:
        for offset in movement:
            if offset is Vector2i:
                offsets.append(offset)

    if offsets.is_empty() or tileMapLayer == null:
        return

    var target_positions: Array[Vector2i] = []
    var position_cursor: Vector2i = movableData.currentPosition
    for offset in offsets:
        position_cursor += offset
        target_positions.append(position_cursor)

    _start_move(target_positions, total_duration)

func is_moving() -> bool:
    return _tween != null and _tween.is_running()

func _start_move(target_positions: Array[Vector2i], total_duration: float) -> void:
    if target_positions.is_empty():
        return

    if total_duration <= 0.0:
        total_duration = float(movableData.timePeriod) / 1000.0

    var world_targets: Array[Vector2] = []
    for pos in target_positions:
        world_targets.append(tileMapLayer.map_to_local(pos))

    movableData.desiredPosition = target_positions[target_positions.size() - 1]

    state = $MovingState
    state.reset(total_duration)

    if _tween:
        _tween.kill()

    _tween = create_tween()
    _tween.set_trans(Tween.TRANS_SINE)
    _tween.set_ease(Tween.EASE_IN_OUT)

    var step_count: int = world_targets.size()
    var duration_per_step: float = total_duration / float(step_count)

    for i in range(step_count):
        _tween.tween_property(parent, "position", world_targets[i], duration_per_step)
        _tween.tween_callback(Callable(self, "_on_step_reached").bind(target_positions[i]))

    _tween.tween_callback(Callable(self, "_on_movement_finished"))

func updateVelocity(speed:int):
    pass
    #self.velocityX = self.tilemap.tile_set.tile_size.x * speed
    #self.velocityY = self.tilemap.tile_set.tile_size.y * speed


func _ready() -> void:
    print(self.parent.name, ' tileMapLayer', tileMapLayer)
    if tileMapLayer && tileMapLayer.tile_set:
        #movableData.currentPosition = tileMapLayer.local_to_map(parent.position)
        parent.position = tileMapLayer.map_to_local(movableData.currentPosition)
    _update_position_label()
    pass


# Called every frame. 'delta' is the elapsed time since the previous frame.
func _process(delta: float) -> void:
    #if tileMapLayer && tileMapLayer.tile_set:
        #parent.position = tileMapLayer.map_to_local(movableData.currentPosition)
    pass

func _on_step_reached(tile_position: Vector2i) -> void:
    movableData.currentPosition = tile_position
    _update_position_label()

func _on_movement_finished() -> void:
    movableData.desiredPosition = movableData.currentPosition
    state = $IdleState
    $IdleState.reset()
    if _tween:
        _tween.kill()
        _tween = null

func _update_position_label() -> void:
    if _position_label:
        _position_label.text = JSON.stringify(movableData.currentPosition)
