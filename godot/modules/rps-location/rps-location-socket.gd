extends Node
class_name RpsLocationSocket

@export var websocket_url: String = "ws://localhost:3000/ws"

var socket: WebSocketPeer = WebSocketPeer.new()

signal location_loaded(snapshot: Dictionary)


func _ready() -> void:
	set_process(false)


func _process(_delta: float) -> void:
	socket.poll()
	var state: int = socket.get_ready_state()

	if state == WebSocketPeer.STATE_OPEN:
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
