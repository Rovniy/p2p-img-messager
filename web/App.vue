<template>
  <v-app>
    <v-main class="d-flex align-center justify-center" style="min-height: 100vh">
      <v-container v-if="!connected" class="d-flex align-center justify-center pa-4" style="height: 100vh">
        <v-card class="pa-4 text-center w-100" elevation="8">
          <h2 class="mb-4">Andrei ❤️ Maria</h2>
          <v-text-field
              v-model="password"
              label="Enter shared password"
              type="password"
          />
          <v-btn :disabled="connecting" color="primary" block @click="connect">
            {{ connecting ? 'Waiting for soulmate...' : 'Connect to soulmate' }}
          </v-btn>
        </v-card>
      </v-container>

      <v-container v-else class="d-flex flex-column align-center justify-center pa-4 text-center">
        <span class="mb-2 text-white">🔒 Secure connection established</span>

        <v-btn
            class="mb-2 text-truncate"
            color="primary"
            @click="triggerFileSelect"
            style="max-width: 90vw; overflow: hidden; white-space: nowrap; text-overflow: ellipsis"
        >
          <span v-if="sendingProgress > 0 && sendingProgress < 100">📷 Sending...</span>
          <span v-else>📤 Choose a file to send</span>
        </v-btn>

        <input
            type="file"
            ref="fileInputRef"
            accept="image/*"
            class="d-none"
            @change="onFileSelected"
        />

        <v-progress-linear
            v-if="sendingProgress > 0 && sendingProgress < 100"
            :model-value="sendingProgress"
            height="6"
            color="blue"
            class="mb-2"
            style="width: 100%"
        />
        <div v-if="sendingProgress === 100" class="text-white mt-2">
          ✅ Photo sent successfully
        </div>

        <v-progress-linear
            v-if="receivingProgress > 0 && receivingProgress < 100"
            :model-value="receivingProgress"
            height="6"
            color="green"
            class="mb-2"
            style="width: 100%"
        />
        <template v-if="receivedPhotos.length > 0">
          <v-img
              v-for="(item, index) in receivedPhotos"
              :key="index"
              :src="item"
              class="mt-4"
              width="100%"
              cover
              @load="receivingProgress = 0"
          />
        </template>


        <v-row class="align-center justify-center pa-4 text-center mb-4 reaction_btns">
          <v-btn
              variant="text"
              v-for="item in Object.keys(REACTION_MAP)"
              @click="() => sendReaction(item)"
              class="ma-2">
            {{ REACTION_MAP[item] }}
          </v-btn>
        </v-row>

        <Reaction :data="reactionData" />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, watch } from 'vue'
import Reaction from './components/reaction.vue'
import { useWebSocket } from './composables/useWebSocket'
import { useWebRTC } from './composables/useWebRTC'
import { useFileTransfer } from './composables/useFileTransfer'
import { REACTION_MAP } from './config'

const password = ref('')
const selectedFile = ref(null)
const receivedPhotos = ref([])
const connected = ref(false)
const connecting = ref(false)
const fileInputRef = ref(null)

let ws
let rtc
let hasCreatedConnection = false

let sendingProgress = ref(0)
let receivingProgress = ref(0)
let reactionData = ref(null)

let sendFile, handleIncoming

async function connect() {
  if (!password.value) return
  connecting.value = true

  const hashed = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password.value))
  const roomId = Array.from(new Uint8Array(hashed)).map(b => b.toString(16).padStart(2, '0')).join('')

  rtc = useWebRTC((data) => ws.send({ type: 'signal', data }), handleRTCData)
  ws = useWebSocket(roomId, handleMessage)
  ws.connect()

  const transfer = useFileTransfer(rtc, (url) => {
    receivedPhotos.value.push(url)
  }, password)
  sendFile = transfer.sendFile
  handleIncoming = transfer.handleIncoming
  watch(transfer.sendingProgress, (val) => (sendingProgress.value = val))
  watch(transfer.receivingProgress, (val) => (receivingProgress.value = val))
}

function handleMessage(data) {
  console.log('[Signal]', data)

  if (data.type === 'peer-joined' && !hasCreatedConnection) {
    hasCreatedConnection = true
    connected.value = true
    connecting.value = false
    rtc.createConnection(true)
    rtc.negotiate()
  }

  if (data.type === 'signal') {
    if (!hasCreatedConnection) {
      hasCreatedConnection = true
      connected.value = true
      connecting.value = false
      rtc.createConnection(false)
    }
    rtc.handleSignal(data.data)
  }
}

async function handleRTCData(data) {
  const msg = await handleIncoming(data)
  if (!msg?.type) return

  if (msg.type === 'reaction') {
    if (!msg?.data) return

    reactionData.value = msg
  }
}

function handleFile() {
  if (!selectedFile.value) return

  sendingProgress.value = 0
  sendFile(selectedFile.value)
}

function triggerFileSelect() {
  fileInputRef.value?.click()
}

function onFileSelected(event) {
  const file = event.target?.files?.[0]

  if (file) {
    selectedFile.value = file
    handleFile()
  }
}
function sendReaction(reactionData) {
  const message = JSON.stringify({
    type: 'reaction',
    data: reactionData
  })

  rtc.send(message)
}
</script>

<style>
body {
  margin: 0;
  background-color: #f5f5f5;
  font-family: 'Roboto', sans-serif;
}

.v-application {
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab) !important;
  background-size: 400% 400%;
}

.reaction_btns {
  .v-btn {
    font-size: 24px;
  }
}
</style>
