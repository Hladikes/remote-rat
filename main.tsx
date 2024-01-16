/**@jsx jsx */
/**@jsxFrag jsxFrag */
import {
  jsx,
  jsxFrag,
  Kompakt
} from "https://gist.githubusercontent.com/Hladikes/a4fdfaf889061b5877e7c0fd6817a51a/raw/e4203d646dfe21199867845b0bab1c52fa97a42c/kompakt.ts";
import { Hono } from "https://deno.land/x/hono@v3.8.1/mod.ts";
import { createCanvas, EmulatedCanvas2DContext } from "https://deno.land/x/canvas@v1.4.1/mod.ts"
import MouseLib from './mouse.ts'

const app = new Hono()
const k = new Kompakt({
  includeReset: 'tailwind',
})

const screenWidth = MouseLib.symbols.getScreenWidth()
const screenHeight = MouseLib.symbols.getScreenHeight()
const screenBuffer = new Uint8ClampedArray(screenWidth * screenHeight * 4)
const scrrenBufferPtr = Deno.UnsafePointer.of(screenBuffer)
const canvas = createCanvas(screenWidth, screenHeight)
const ctx: EmulatedCanvas2DContext = canvas.getContext('2d')

app.get('/screen', async (c) => {
  await MouseLib.symbols.screenshot(scrrenBufferPtr, screenWidth, screenHeight)

  ctx.putImageData({
    data: screenBuffer,
    width: screenWidth,
    height: screenHeight,
  }, 0, 0)

  const buffer = canvas.toBuffer()

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(buffer.length),
    },
  })
})

app.get('/ws', (c) => {
  const { response, socket } = Deno.upgradeWebSocket(c.req.raw)

  socket.addEventListener('message', (ev) => {
    const buffer = new Int32Array(ev.data)

    switch (buffer[0]) {
      case 0xAA: {
        MouseLib.symbols.mouseClick(buffer[2] === 1)
        break
      }
    
      case 0xFF: {
        const k = 2.65
        MouseLib.symbols.mouseMove(true, buffer[1] * k | 0, buffer[2] * k | 0)
        break
      }
    
      case 0xBB: {
        MouseLib.symbols.mouseMove(false, buffer[1], buffer[2])
        break
      }

      case 0xDD: {
        MouseLib.symbols.mouseScroll(buffer[1], buffer[2])
        break;
      }
    }
  })

  return response
})

app.get('/', (_c) => k.html(
  <>
    <div id="app" class="h-screen flex flex-row p-6 space-x-4 select-none">
      <div class="flex flex-col justify-end gap-4">
        <button 
          v-bind:class="{
            'bg-black text-white': !relative,
            'bg-transparent text-black': relative,
          }"
          v-on:touchstart="relative = !relative"
          class="w-24 h-24 flex items-center justify-center rounded-md border border-black touch-none pointer-events-auto">
          <span class="text-4xl">{'{{ relative ? "R" : "A" }}'}</span>
        </button>

        <button 
          v-bind:class="{
            'bg-black': pressing,
            'bg-transparent': !pressing,
          }"
          v-on:touchstart="pressing = !pressing"
          class="w-24 h-24 rounded-md border border-black touch-none pointer-events-auto"></button>
      </div>
      <div 
        v-on:touchmove="handleTouch($event)"
        v-on:touchstart="handleTouch($event)"
        v-on:touchend="handleTouch($event)"
        v-on:click="handleClick()"
        class="flex-1 rounded-md border border-black touch-none pointer-events-auto overflow-hidden">
        <img 
          v-bind:src="`/screen?t=${timestamp}` " 
          alt="Currently displayed screen" 
          class="object-cover object-left-bottom h-full" />
      </div>
    </div>

    {k.script(async () => {
      const { createApp, ref, watch, nextTick } = await import("https://unpkg.com/vue@3.3.4/dist/vue.esm-browser.js")
      const socket = new WebSocket(`ws://${location.host}/ws`)

      createApp({
        setup() {
          const timestamp = ref(Date.now())

          setInterval(() => {
            timestamp.value = Date.now()
          }, 1_000)

          const pressing = ref(false)
          const relative = ref(true)
          const buffer = new Int32Array(3)

          watch(pressing, () => {
            buffer.set([0xAA, 0, pressing.value ? 1 : 0])
            socket.send(buffer)
          })

          let prevX = 0
          let prevY = 0
          let prevClientX = 0
          let prevClientY = 0

          function handleTouch(ev: TouchEvent) {
            const br = (ev?.target as HTMLElement)?.getBoundingClientRect()
            const { clientX, clientY } = ev.touches[0] ?? {clientX: prevClientX, clientY: prevClientY}
            const [x, y] = [clientX - br.left, clientY - br.top]

            if (ev.type === 'touchstart' && !relative.value) {
              if (ev.touches.length === 1) {
                buffer.set([0xBB, x, y])
                socket.send(buffer)
                pressing.value = true
              }
            }
            
            if (ev.type === 'touchmove') {
              if (ev.touches.length === 1) {
                buffer.set(relative.value ? [0xFF, x - prevX, y - prevY] : [0xBB, x, y])
                socket.send(buffer)
              } else {
                buffer.set([0xDD, x - prevX, y - prevY])
                socket.send(buffer)
              }
            }

            if (ev.type === 'touchend') {
              if (!relative.value) {
                pressing.value = false
              }
            }

            prevX = x
            prevY = y
            prevClientX = clientX
            prevClientY = clientY
          }

          function handleClick() {
            pressing.value = true
            nextTick(() => pressing.value = false)
          }

          return { timestamp, pressing, relative, handleTouch, handleClick } 
        },
      }).mount('#app')
    })}
  </>
))

Deno.serve({
  hostname: '0.0.0.0',
  port: 6969,
}, app.fetch)