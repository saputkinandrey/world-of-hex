class_name SeaCombatSocket
extends SocketIO

@export var socket_base_url: String = "http://localhost:3000"
@export var socket_path_override: String = "/ws-sea-combat"

signal encounterLoaded(encounter: EncounterEntity)

func sendMessage(event_name: String, payload: Variant = null) -> void:
    if payload == null:
        emit(event_name)
        return
    emit(event_name, payload)

func sendInput(_input: String) -> void:
    pass

func processEncounterLoaded(_packet: String) -> void:
    pass

func processNewTurn(_packet: String) -> void:
    pass

func _ready():
    base_url = socket_base_url
    socket_path = socket_path_override
    socket_connected.connect(_on_socket_connected)
    event_received.connect(_on_event_received)
    connect_socket()

func _on_socket_connected(_ns: String) -> void:
    sendMessage(
        "user-connected.message",
        {
            "userId": Global.player.player._id,
        },
    )

func _on_event_received(event_name: String, data: Variant, _ns: String) -> void:
    var payload = data
    if payload is Array and payload.size() == 1:
        payload = payload[0]

    if event_name == "load-encounter.response":
        emit_signal("encounterLoaded", EncounterEntity.new().from_dict(payload))
