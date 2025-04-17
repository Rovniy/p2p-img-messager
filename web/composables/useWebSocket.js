// client/composables/useWebSocket.js
import { ref } from 'vue'

export function useWebSocket(roomId, onMessage) {
    const socket = ref(null)
    const isConnected = ref(false)

    function connect() {
        socket.value = new WebSocket('wss://p2p-msg-api.xploit.ltd')

        socket.value.addEventListener('open', () => {
            socket.value.send(JSON.stringify({ type: 'join', roomId }))
            isConnected.value = true
        })

        socket.value.addEventListener('message', (event) => {
            const data = JSON.parse(event.data)
            onMessage(data)
        })

        socket.value.addEventListener('close', () => {
            isConnected.value = false
        })
    }

    function send(data) {
        if (socket.value && socket.value.readyState === WebSocket.OPEN) {
            socket.value.send(JSON.stringify(data))
        }
    }

    return { connect, send, isConnected }
}
