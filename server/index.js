// server.js
const WebSocket = require('ws')
const http = require('http')

const server = http.createServer()
const wss = new WebSocket.Server({ server })

const rooms = {} // { roomId: [client1, client2] }

wss.on('connection', (ws) => {
    let currentRoom = null

    console.log('New connection')

    ws.on('message', (message) => {
        let data
        try {
            data = JSON.parse(message)
        } catch (err) {
            return
        }

        console.log('Income message:', data)

        if (data.type === 'join') {
            const { roomId } = data
            currentRoom = roomId

            if (!rooms[roomId]) rooms[roomId] = []
            rooms[roomId].push(ws)

            // Отправляем peer-joined только ВТОРОМУ клиенту
            if (rooms[roomId].length === 2) {
                const firstClient = rooms[roomId][0]

                if (firstClient.readyState === WebSocket.OPEN) {
                    console.log('Peer joined', roomId)

                    firstClient.send(JSON.stringify({ type: 'peer-joined' }))
                }
            }
        }

        if (data.type === 'signal' && currentRoom) {
            const clients = rooms[currentRoom] || []
            clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'signal', data: data.data }))
                }
            })
        }
    })

    ws.on('close', () => {
        console.log('Connection closed')

        if (currentRoom && rooms[currentRoom]) {
            rooms[currentRoom] = rooms[currentRoom].filter(c => c !== ws)
            if (rooms[currentRoom].length === 0) {
                delete rooms[currentRoom]
            }
        }
    })
})

const PORT = 3001
server.listen(PORT, () => {
    console.log(`WebSocket signaling server running on ws://localhost:${PORT}`)
})
