import { createCanvas } from "https://deno.land/x/canvas/mod.ts";

const module = Deno.dlopen('./test.so', {
  get_pixel: {
    parameters: ['u32', 'u32'],
    result: 'u32',
  },
  get_image: {
    parameters: ['u32', 'u32'],
    result: 'pointer',
  },
})

const width = 1920
const height = 1080
const ptr = module.symbols.get_image(width, height)
const view = new Deno.UnsafePointerView(ptr)
// const arr = new Uint8Array(width * height * 4)


const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");

const image = new ImageData(width, height)

view.copyInto(image.data)
ctx.putImageData(image, 0, 0)

await Deno.writeFile("image.png", canvas.toBuffer());

// console.time('get_pixel call')
// const color = module.symbols.get_pixel(0, 0)
// console.timeEnd('get_pixel call')

// const r = color >> 16 & 0xFF
// const g = color >> 8 & 0xFF
// const b = color >> 0 & 0xFF
// console.log({ r, g, b })