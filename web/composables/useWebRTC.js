export function useWebRTC(sendSignal, onData) {
    let peer = null
    let dataChannel = null
    let remoteDescriptionSet = false
    let pendingCandidates = []
    let alreadyNegotiated = false

    function createConnection(isInitiator) {
        console.log('[WEBRTC] Creating peer connection. Initiator:', isInitiator)

        peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })

        peer.onicecandidate = event => {
            if (event.candidate) {
                console.log('[ICE] Candidate created and sent')
                sendSignal({ candidate: event.candidate })
            }
        }

        peer.onconnectionstatechange = () => {
            console.log('[RTC] Connection state changed:', peer.connectionState)
        }

        if (isInitiator) {
            console.log('[WEBRTC] Creating dataChannel as initiator')
            dataChannel = peer.createDataChannel('photo')
            setupDataChannel()
            negotiate()
        } else {
            peer.ondatachannel = event => {
                console.log('[WEBRTC] ondatachannel fired!')
                dataChannel = event.channel
                setupDataChannel()
            }
        }
    }

    function setupDataChannel() {
        if (!dataChannel) {
            console.warn('[WEBRTC] setupDataChannel called, but no dataChannel found')
            return
        }

        console.log('[WEBRTC] Setting up dataChannel')

        dataChannel.onopen = () => {
            console.log('🟢 Data channel open')
        }

        dataChannel.onmessage = event => {
            console.log('📩 Received message on dataChannel:', event.data)
            onData(event.data)
        }

        dataChannel.onclose = () => {
            console.log('🔴 Data channel closed')
        }

        dataChannel.onerror = (e) => {
            console.error('❗ Data channel error:', e)
        }
    }

    function negotiate() {
        if (alreadyNegotiated) return
        alreadyNegotiated = true
        console.log('[WEBRTC] Negotiating...')
        peer.createOffer().then(offer => {
            console.log('[WEBRTC] Created offer')
            return peer.setLocalDescription(offer)
        }).then(() => {
            console.log('[WEBRTC] Sent offer')
            sendSignal({ sdp: peer.localDescription })
        }).catch(err => {
            console.error('[WEBRTC] Negotiation error:', err)
        })
    }

    async function handleSignal({ sdp, candidate }) {
        if (sdp && !remoteDescriptionSet) {
            console.log('[SIGNAL] Received SDP of type:', sdp.type)

            await peer.setRemoteDescription(new RTCSessionDescription(sdp))
            console.log('[SIGNAL] Set remote description')
            remoteDescriptionSet = true

            if (sdp.type === 'offer') {
                const answer = await peer.createAnswer()
                await peer.setLocalDescription(answer)
                console.log('[SIGNAL] Created and sent answer')
                sendSignal({ sdp: peer.localDescription })
            }

            for (const cand of pendingCandidates) {
                await peer.addIceCandidate(new RTCIceCandidate(cand))
                console.log('[SIGNAL] Added queued ICE candidate')
            }
            pendingCandidates = []
        }

        if (candidate) {
            if (remoteDescriptionSet) {
                console.log('[SIGNAL] Adding ICE candidate now')
                await peer.addIceCandidate(new RTCIceCandidate(candidate))
            } else {
                console.log('[SIGNAL] Queued ICE candidate')
                pendingCandidates.push(candidate)
            }
        }
    }

    function send(data) {
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(data)
        } else {
            console.warn('❌ Cannot send, dataChannel not open. State:', dataChannel?.readyState)
        }
    }

    return {
        createConnection,
        handleSignal,
        send,
        negotiate
    }
}
