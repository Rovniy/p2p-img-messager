<template>
  <div class="reaction-container">
    <i
        v-for="reaction in reactions"
        :key="reaction.id"
        class="reaction"
        :style="{ left: reaction.x + '%' }"
        @animationend="removeReaction(reaction.id)"
    >
      {{ reaction?.emoji }}
    </i>
  </div>
</template>

<script setup>
import {ref, watch} from 'vue'
import { REACTION_MAP } from '../config'

const REPEAT_TIMES = 5

const props = defineProps({
  data: {
    type: Object,
    required: true
  }
})

const reactions = ref([])

watch(
    () => props.data,
    (newVal, oldValue) => {
      console.log('newVal', newVal, oldValue);

      if (newVal && newVal.type === 'reaction') {


        for (let i = 0; i < REPEAT_TIMES; i++) {
          const id = Date.now().toString() + Math.random().toString(36).substring(2) + 'i'
          const x = Math.random() * 80 + 10 // horizontal position between 10% and 90%
          const randomDelay = Math.random() * 1000

          setTimeout(() => {
            reactions.value.push({
              id,
              emoji: REACTION_MAP[newVal.data] || '',
              x
            })
          }, randomDelay)
        }
      }
    }
)

function removeReaction(id) {
  reactions.value = reactions.value.filter(r => r.id !== id)
}
</script>

<style scoped>
.reaction-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 9999;
}

.reaction {
  position: absolute;
  bottom: 0;
  font-size: 5rem;
  font-style: normal;
  animation: floatUp 5s ease-out forwards;
  pointer-events: none;
}

@keyframes floatUp {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh);
    opacity: 0;
  }
}
</style>
