class_name SeaCombatSocket
extends SocketIO

@export var socket_base_url: String = "http://localhost:3000"
@export var socket_path_override: String = "/ws-sea-combat"
@export var connect_on_ready: bool = false

signal encounterLoaded(encounter: EncounterEntity)

const USER_CONNECTED_MESSAGE: String = "user-connected.message"
const LOAD_ENCOUNTER_MESSAGE: String = "load-encounter.message"

var _signals_connected: bool = false
var _pending_encounter_id: String = ""

func sendMessage(event_name: String, payload: Variant = null) -> void:
	if state != State.CONNECTED:
		push_error("Cannot send SeaCombat socket message before the socket is connected: %s" % event_name)
		return

	if payload == null:
		emit(event_name)
		return
	emit(event_name, payload)

func load_encounter(encounter_id: String) -> void:
	if encounter_id.is_empty():
		push_error("Cannot load sea combat encounter: encounter_id is empty")
		return

	_pending_encounter_id = encounter_id
	connect_to_server()
	if state == State.CONNECTED:
		_send_pending_encounter()

func sendInput(_input: String) -> void:
	pass

func processEncounterLoaded(_packet: String) -> void:
	pass

func processNewTurn(_packet: String) -> void:
	pass

func _ready():
	base_url = socket_base_url
	socket_path = socket_path_override
	_connect_signals()
	if connect_on_ready:
		connect_to_server()

func connect_to_server() -> void:
	_connect_signals()
	if state == State.CONNECTED:
		return

	connect_socket()

func _connect_signals() -> void:
	if _signals_connected:
		return

	socket_connected.connect(_on_socket_connected)
	event_received.connect(_on_event_received)
	_signals_connected = true

func _on_socket_connected(_ns: String) -> void:
	sendMessage(
		USER_CONNECTED_MESSAGE,
		{
			"userId": Global.player.player._id,
		},
	)
	_send_pending_encounter()

func _on_event_received(event_name: String, data: Variant, _ns: String) -> void:
	var payload = data
	if payload is Array and payload.size() == 1:
		payload = payload[0]

	if event_name == "load-encounter.response":
		emit_signal("encounterLoaded", EncounterEntity.new().from_dict(payload))

func _send_pending_encounter() -> void:
	if _pending_encounter_id.is_empty():
		return

	var encounter_id: String = _pending_encounter_id
	_pending_encounter_id = ""
	sendMessage(
		LOAD_ENCOUNTER_MESSAGE,
		{
			"userId": Global.player.player._id,
			"encounterId": encounter_id,
		},
	)
