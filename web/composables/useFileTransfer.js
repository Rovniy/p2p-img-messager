// composables/useFileTransfer.js
import { ref } from 'vue'

export function useFileTransfer(rtc, onReceiveComplete, passwordRef) {
    const sendingProgress = ref(0)
    const receivingProgress = ref(0)

    let receiveBuffer = []
    let receivedBytes = 0
    let expectedSize = 0
    let fileMeta = null
    let password = passwordRef?.value || ''

    function getKeyFromPassword(password) {
        const enc = new TextEncoder()
        return crypto.subtle.digest('SHA-256', enc.encode(password)).then(hash => {
            return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
        })
    }

    function generateIV() {
        return crypto.getRandomValues(new Uint8Array(12))
    }

    async function sendFile(file) {
        const chunkSize = 16 * 1024
        const reader = new FileReader()

        reader.onload = async () => {
            const buffer = new Uint8Array(reader.result)
            const iv = generateIV()
            const key = await getKeyFromPassword(password)
            const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer)
            const encryptedData = new Uint8Array(encrypted)

            rtc.send(JSON.stringify({
                type: 'file-meta',
                name: file.name,
                size: encryptedData.length,
                mime: file.type,
                encrypted: true,
                iv: Array.from(iv)
            }))

            let offset = 0
            function sendNextChunk() {
                const chunk = encryptedData.slice(offset, offset + chunkSize)
                rtc.send(chunk)
                offset += chunkSize
                sendingProgress.value = Math.min(100, Math.floor((offset / encryptedData.length) * 100))
                if (offset < encryptedData.length) {
                    setTimeout(sendNextChunk, 0)
                }
            }

            sendNextChunk()
        }

        reader.readAsArrayBuffer(file)
    }

    async function handleIncoming(data) {
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data)
                if (parsed.type === 'file-meta') {
                    fileMeta = parsed
                    receiveBuffer = []
                    receivedBytes = 0
                    expectedSize = parsed.size
                    receivingProgress.value = 0
                }
            } catch (_) {}
        } else if (fileMeta) {
            receiveBuffer.push(new Uint8Array(data))
            receivedBytes += data.byteLength
            receivingProgress.value = Math.min(100, Math.floor((receivedBytes / expectedSize) * 100))

            if (receivedBytes >= expectedSize) {
                const encryptedBlob = new Blob(receiveBuffer)
                const arrayBuffer = await encryptedBlob.arrayBuffer()

                const iv = new Uint8Array(fileMeta.iv)
                const key = await getKeyFromPassword(password)

                try {
                    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, arrayBuffer)
                    const blob = new Blob([decrypted], { type: fileMeta.mime })
                    const url = URL.createObjectURL(blob)
                    onReceiveComplete(url)
                } catch (err) {
                    console.error('❌ Decryption failed:', err)
                }

                fileMeta = null
                receiveBuffer = []
                receivingProgress.value = 100
            }
        }
    }

    return {
        sendFile,
        handleIncoming,
        sendingProgress,
        receivingProgress
    }
}