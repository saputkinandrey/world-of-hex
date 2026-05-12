extends Node
class_name RpsLocationSocket

@export var websocket_url: String = "ws://localhost:3000/ws"

var socket: WebSocketPeer = WebSocketPeer.new()

signal location_loaded(snapshot: Dictionary)


func _ready() -> void:
	set_process(false)

func connect_to_location(id: String) -> void:
	if id.is_empty():
		push_error("Cannot connect to RPS location: location_id is empty")
		return

	location_id = id
	var state: int = socket.get_ready_state()
	if state == WebSocketPeer.STATE_OPEN:
		_send_load_location_message(id)
		return

	if state == WebSocketPeer.STATE_CONNECTING:
		return

	var error: Error = socket.connect_to_url(websocket_url)
	if error != OK:
		push_error("Cannot connect to RPS location socket, error code = %d" % error)
		return

	set_process(true)


func _process(_delta: float) -> void:
	socket.poll()
	var state: int = socket.get_ready_state()

	if state == WebSocketPeer.STATE_OPEN:
		if not location_id.is_empty():
			_send_load_location_message(location_id)

		while socket.get_available_packet_count() > 0:
			var packet: PackedByteArray = socket.get_packet()
			var text: String = packet.get_string_from_utf8()

			# ВАЖНО: явный тип, без :=
			var parsed: Variant = JSON.parse_string(text)
			if typeof(parsed) != TYPE_DICTIONARY:
				continue

			var data: Dictionary = parsed
			var response: String = str(data.get("response", ""))

			if response == "load-location.response":
				var payload_var: Variant = data.get("payload", {})
				if typeof(payload_var) == TYPE_DICTIONARY:
					var payload: Dictionary = payload_var
					location_loaded.emit(payload)

	elif state == WebSocketPeer.STATE_CLOSED:
		var code: int = socket.get_close_code()
		push_warning("RpsLocationSocket closed: %d" % code)
		set_process(false)

var location_id: String = ""

func _send_load_location_message(id: String) -> void:
	location_id = ""
	var message: Dictionary = {
		"message": "load-location.message",
		"payload": {
			"locationId": id,
		},
	}
	socket.send_text(JSON.stringify(message))
