export default Deno.dlopen("./ffi/mouse.so", {
  mouse_move: {
    parameters: ["bool", "i32", "i32"],
    result: "void",
  },
  mouse_click: {
    parameters: ["bool"],
    result: "void",
  },
  mouse_scroll: {
    parameters: ["i32", "i32"],
    result: "void",
  },
  get_screen_width: {
    parameters: [],
    result: "u32",
  },
  get_screen_height: {
    parameters: [],
    result: "u32",
  },
  screenshot: {
    parameters: ["pointer", "u32", "u32"],
    result: "void",
    nonblocking: true,
  },
});
