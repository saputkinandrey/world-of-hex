export enum WSMessage {
    USER_CONNECTED = 'user-connected.message',
    LOAD_ENCOUNTER = 'load-encounter.message',
    SEND_INPUT = 'send-input.message',
    QUEUE_SPAWN_INTENT = 'queue-spawn-intent.message',
}

export enum WSResponse {
    USER_CONNECTED = 'user-connected.response',
    LOAD_ENCOUNTER = 'load-encounter.response',
    SEND_INPUT = 'send-input.response',
    QUEUE_SPAWN_INTENT = 'queue-spawn-intent.response',
    TURN_ADVANCED = 'turn-advanced.response',
}
