/**@jsx jsx */
/**@jsxFrag jsxFrag */
import { jsx, jsxFrag, Kompakt, Props } from "https://gist.githubusercontent.com/Hladikes/a4fdfaf889061b5877e7c0fd6817a51a/raw/fbca4cd1621ff4115098d5aca0f48e87bc1cef50/kompakt.ts";
import { Context, Hono } from "https://deno.land/x/hono@v3.12.11/mod.ts";
import MouseLib from './mouse.ts'

const app = new Hono()
const k = new Kompakt({
  honoInstance: app,
})

const rtcData = {
  src: {
    candidates: [] as RTCIceCandidate[],
    offer: null as RTCSessionDescriptionInit | null,
  },
  dst: {
    candidates: [] as RTCIceCandidate[],
    answer: null as RTCSessionDescriptionInit | null,
  },
  reset() {
    this.src.candidates = []
    this.src.offer = null
    this.dst.candidates = []
    this.dst.answer = null
  },
};

const bridge = k.createBridge({
  codes: {
    MOUSE_CLICK: 1,
    MOUSE_MOVE_RELATIVE: 2,
    MOUSE_MOVE_ABSOLUTE: 3,
    MOUSE_SCROLL: 4,
  },
  rtc: {
    src: {
      addCandidate: (ctx: Context, c: RTCIceCandidate) => rtcData.src.candidates.push(c),
      getCandidates: (ctx: Context) => rtcData.src.candidates,
      setOffer: (ctx: Context, o: typeof rtcData.src.offer) => rtcData.src.offer = o,
      getOffer: (ctx: Context) => rtcData.src.offer,
    },
    dst: {
      addCandidate: (ctx: Context, c: RTCIceCandidate) => rtcData.dst.candidates.push(c),
      getCandidates: (ctx: Context) => rtcData.dst.candidates,
      setAnswer: (ctx: Context, a: typeof rtcData.dst.answer) => rtcData.dst.answer = a,
      getAnswer: (ctx: Context) => rtcData.dst.answer,
    },
    reset: (ctx: Context) => rtcData.reset(),
  },
})

app.get('/ws', (c) => {
  const { response, socket } = Deno.upgradeWebSocket(c.req.raw)

  socket.addEventListener('message', (ev: MessageEvent) => {
    const buffer = new Int32Array(ev.data)

    switch (buffer[0]) {
      case bridge.server.codes.MOUSE_CLICK: {
        MouseLib.symbols.mouse_click(buffer[2] === 1)
        break
      }
    
      case bridge.server.codes.MOUSE_MOVE_RELATIVE: {
        const k = 1
        MouseLib.symbols.mouse_move(true, buffer[1] * k | 0, buffer[2] * k | 0)
        break
      }
    
      case bridge.server.codes.MOUSE_MOVE_ABSOLUTE: {
        MouseLib.symbols.mouse_move(false, buffer[1], buffer[2])
        break
      }

      case bridge.server.codes.MOUSE_SCROLL: {
        MouseLib.symbols.mouse_scroll(buffer[1], buffer[2])
        break
      }
    }
  })

  return response
})

const TailwindReset = await k.preload(
  "style",
  "https://esm.sh/@unocss/reset@0.56.5/tailwind.css",
);

const BaseLayout = (props: Props) => (
  <main>
    <k.head>
      <TailwindReset />
    </k.head>
    {props.children}
  </main>
)

app.get('/', (c) => {
  return c.html(k.html(
    <BaseLayout>
      <div class="h-screen flex items-center justify-center space-x-10">
        <a href="/host" class="flex items-center justify-center w-96 h-48 text-6xl font-medium border-2 border-black/20 rounded-xl uppercase hover:border-indigo-400 hover:bg-indigo-400/20 hover:text-white">🖥️</a>
        <a href="/client" class="flex items-center justify-center w-96 h-48 text-6xl font-medium border-2 border-black/20 rounded-xl uppercase hover:border-indigo-400 hover:bg-indigo-400/20 hover:text-white">✏️</a>
      </div>
    </BaseLayout>
  ))
})

app.get('/host', (c) => {
  return c.html(k.html(
    <BaseLayout>
      <k.head>
        <style>{'[v-cloak] { opacity: 0; }'}</style>
      </k.head>

      <div v-cloak v-scope class="h-screen flex items-center justify-center transition-opacity">
        <button 
          v-on:click="startStreaming()"
          v-if="!streaming" 
          class="py-3 px-8 font-medium border-2 border-black/20 rounded-md text-black/60 hover:border-indigo-400 hover:bg-indigo-400/20 hover:text-indigo-700">Start streaming</button>
        <button 
          v-on:click="establish()"
          v-if="streaming && !connected" 
          class="py-3 px-8 font-medium border-2 border-black/20 rounded-md text-black/60 hover:border-indigo-400 hover:bg-indigo-400/20 hover:text-indigo-700">Establish connection</button>
        <p v-if="streaming && connected" class="font-mono text-4xl">🔴 We are live </p>
      </div>

      {bridge(async (imports) => {
        const { createApp } = await import("https://unpkg.com/petite-vue@0.4.1/dist/petite-vue.es.js?module")

        let src: RTCPeerConnection | null = null
        
        createApp({
          streaming: false,
          connected: false,
          async startStreaming() {
            if (src) {
              src.close()
            }

            await imports.rtc.reset()
            src = new RTCPeerConnection()

            const stream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                displaySurface: "window",
              },
              audio: false,
            }).catch(() => null);
  
            if (!stream) {
              return;
            }
  
            src.addTrack(stream.getVideoTracks().at(0) as MediaStreamTrack, stream);
            src.addEventListener("icecandidate", (e) => {
              if (e.candidate) {
                imports.rtc.src.addCandidate(e.candidate);
              }
            });
  
            const srcOffer = await src.createOffer({
              offerToReceiveVideo: true,
            });
  
            await Promise.all([
              imports.rtc.src.setOffer(srcOffer),
              src.setLocalDescription(srcOffer),
            ])

            this.streaming = true
          },
          async establish() {
            const dstAnswer = await imports.rtc.dst.getAnswer()
          
            if (dstAnswer) {
              await src?.setRemoteDescription(dstAnswer)
            }
  
            const dstCandidates = await imports.rtc.dst.getCandidates()
  
            if (dstCandidates) {
              dstCandidates.forEach((c) => src?.addIceCandidate(c))
            }
  
            await imports.rtc.reset()

            this.connected = true
          },
        }).mount()
      })}
    </BaseLayout>
  ))
})

app.get('/client', (c) => c.html(k.html(
  <main>
    <k.head>
      <TailwindReset />
    </k.head>

    <div id="app" class="fixed inset-0 touch-none pointer-events-none h-screen flex flex-row p-6 space-x-4 select-none">
      <div class="flex flex-col justify-end gap-4">
        <div 
          v-on:touchmove="handleControllerTouch($event)"
          v-on:touchstart="handleControllerTouch($event)"
          v-on:touchend="handleControllerTouch($event)"
          v-on:click="handleControllerClick()"
          class="w-24 h-24 flex items-center justify-center rounded-md border border-stone-300 touch-none pointer-events-auto"></div>

        <button 
          v-on:click="establish()"
          class="w-24 h-24 flex items-center justify-center rounded-md border border-indigo-400 text-indigo-400 bg-indigo-400/10 touch-none pointer-events-auto text-4xl">C</button>

        <button 
          v-bind:class="{
            'bg-black text-white border-black': !relative,
            'bg-transparent text-black border-stone-300': relative,
          }"
          v-on:touchstart="relative = !relative"
          class="w-24 h-24 flex items-center justify-center rounded-md border touch-none pointer-events-auto">
          <span class="text-4xl">[[ relative ? "R" : "A" ]]</span>
        </button>

        <button 
          v-bind:class="{
            'bg-black border-black': pressing,
            'bg-transparent border-stone-300 ': !pressing,
          }"
          v-on:touchstart="pressing = !pressing"
          class="w-24 h-24 rounded-md border touch-none pointer-events-auto"></button>
      </div>
      <div class="flex-1 flex flex-col space-y-3 overflow-hidden">
        <div 
          v-on:touchmove="handleCanvasTouch($event)"
          v-on:touchstart="handleCanvasTouch($event)"
          v-on:touchend="handleCanvasTouch($event)"
          v-on:click="handleCanvasClick()"
          class="flex-1 rounded-md border border-stone-300 touch-none pointer-events-auto overflow-hidden">
          <div style="width: 1920px !important; height: 1080px !important;">
            <video 
              autoplay 
              ref="video"
              class="touch-none pointer-events-none"
              v-bind:style="`transform: translate(${-offsetX}px, ${-offsetY}px)`">
            </video>
          </div>
        </div>
      </div>
    </div>

    {bridge(async (imports) => {
      const { createApp, ref, watch, nextTick } = await import("https://unpkg.com/vue@3.4.21/dist/vue.esm-browser.prod.js")
      const socket = new WebSocket(`ws://${location.host}/ws`)
      const buffer = new Int32Array(3)

      function send(...args: number[]) {
        buffer.set(args)
        socket.send(buffer)
      }

      createApp({
        setup() {
          const offsetX = ref(0)
          const offsetY = ref(0)

          let controllerPrevX = 0
          let controllerPrevY = 0
          let controllerPrevClientX = 0
          let controllerPrevClientY = 0

          function handleControllerTouch(ev: TouchEvent) {
            const br = (ev?.target as HTMLElement)?.getBoundingClientRect()
            const { clientX, clientY } = ev.touches[0] ?? { clientX: controllerPrevClientX, clientY: controllerPrevClientY }
            const [x, y] = [clientX - br.left, clientY - br.top]

            if (ev.type === 'touchmove') {
              offsetX.value += x - controllerPrevX
              offsetY.value += y - controllerPrevY 
              console.log(x, y)
            }

            controllerPrevX = x
            controllerPrevY = y
            controllerPrevClientX = clientX
            controllerPrevClientY = clientY
          }
          
          function handleControllerClick(ev: TouchEvent) {
            offsetX.value = 0
            offsetY.value = 0
          }

          const pressing = ref(false)
          const relative = ref(true)
          const video = ref(null)

          watch(pressing, () => {
            send(imports.codes.MOUSE_CLICK, 0, pressing.value ? 1 : 0)
          })

          let prevX = 0
          let prevY = 0
          let prevClientX = 0
          let prevClientY = 0

          function handleCanvasTouch(ev: TouchEvent) {
            const br = (ev?.target as HTMLElement)?.getBoundingClientRect()
            const { clientX, clientY } = ev.touches[0] ?? { clientX: prevClientX, clientY: prevClientY }
            const [x, y] = [clientX - br.left, clientY - br.top]

            if (ev.type === 'touchstart' && !relative.value) {
              if (ev.touches.length === 1) {
                send(imports.codes.MOUSE_MOVE_ABSOLUTE, x + Number(offsetX.value), y + Number(offsetY.value))
                pressing.value = true
              }
            }
            
            if (ev.type === 'touchmove') {
              if (ev.touches.length === 1) {
                if (relative.value) {
                  send(imports.codes.MOUSE_MOVE_RELATIVE, x - prevX, y - prevY)
                } else {
                  send(imports.codes.MOUSE_MOVE_ABSOLUTE, x + Number(offsetX.value), y + Number(offsetY.value))
                }
              } else {
                send(imports.codes.MOUSE_SCROLL, x - prevX, y - prevY)
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

          function handleCanvasClick() {
            pressing.value = true
            nextTick(() => pressing.value = false)
          }

          async function establish() {
            const dst = new RTCPeerConnection();

            dst.addEventListener("icecandidate", (e) => {
              if (e.candidate) {
                imports.rtc.dst.addCandidate(e.candidate);
              }
            });

            dst.addEventListener("track", (ev) => {
              video.value.srcObject = ev.streams[0];
            });

            const srcOffer = await imports.rtc.src.getOffer()
            
            if (srcOffer) {
              await dst.setRemoteDescription(srcOffer)
            } 
            
            const dstAnswer = await dst.createAnswer()
            await imports.rtc.dst.setAnswer(dstAnswer)
            await dst.setLocalDescription(dstAnswer)
            await imports.rtc.src.getCandidates().then((srcCandidates) => {
              srcCandidates.forEach((c) => dst.addIceCandidate(c))
            })
          }

          return { offsetX, offsetY, handleControllerTouch, handleControllerClick, video, pressing, relative, handleCanvasTouch, handleCanvasClick, establish } 
        },
        delimiters: ['[[', ']]'],
      }).mount('#app')
    })}
  </main>
)))

Deno.serve({
  hostname: '0.0.0.0',
  port: 6969,
}, app.fetch)