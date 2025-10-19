class_name SeaCombatSocket
extends Node

@export var websocket_url: String = "ws://localhost:3000/ws"

var socket: WebSocketPeer = WebSocketPeer.new()

signal encounterLoaded(encounter: EncounterEntity)

func serializeMessage(obj: Object) -> String:
    var excludes: Array[String] = ["RefCounted", "script"]
    var result: Dictionary = {}
    var payload: Dictionary = {}
    var props: Array = obj.get_property_list()
    for p in props:
        if p.name.find(".message.gd") != -1:
            result["message"] = p.name.trim_suffix(".gd")
        elif !excludes.has(p.name):
            payload[p.name] = obj[p.name]

    result["payload"] = payload

    return JSON.stringify(result)

func sendMessage(message: Variant):
    #print("Send message to server: ", serializeMessage(message))
    socket.send_text(serializeMessage(message))
    pass

func sendInput(input: String):
    pass


func processEncounterLoaded(packet: String):
    pass


func processNewTurn(packet: String):
    pass


func _ready():
    # Initiate connection to the given URL.
    var err: Error = socket.connect_to_url(websocket_url)
    print(err)
    if err != OK:
        print("Unable to connect")
        set_process(false)
    else:
        # Wait for the socket to connect.
        await get_tree().create_timer(1).timeout
        # Send data.
        self.sendMessage(
            UserConnectedMessage
                .new()
                .setUserId(Global.player.player._id)
        )
        #socket.send_text("Test packet")


func _process(_delta):
    # Обновление сокета
    socket.poll()

    var state: WebSocketPeer.State = socket.get_ready_state()

    if state == WebSocketPeer.STATE_OPEN:
        while socket.get_available_packet_count():
            var packet: PackedByteArray = socket.get_packet()
            var packetString: String = packet.get_string_from_utf8()
            var packetObj: Dictionary = {
                "response": "ok", # response code
                "payload": {}, # object or array of objects
            } as Dictionary
            packetObj = JSON.parse_string(packetString)

            if packetObj.response == 'error':
                assert(packetObj.response != 'error', packetObj.message)

            if packetObj.response == "load-encounter.response":
                #emit_signal("encounterLoaded", packetObj.payload)
                #emit_signal("encounterLoaded")
                emit_signal("encounterLoaded", EncounterEntity.new().from_dict(packetObj.payload))

            #print("Got data from server: ", packetString)

    elif state == WebSocketPeer.STATE_CLOSING:
        pass

    elif state == WebSocketPeer.STATE_CLOSED:
        var code: int = socket.get_close_code()
        print("WebSocket closed with code: %d. Clean: %s" % [code, code != -1])
        set_process(false)
