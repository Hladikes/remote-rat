export default Deno.dlopen("./ffi/mouse.so", {
  mouseMove: {
    parameters: ["bool", "i32", "i32"],
    result: "void",
  },
  mouseClick: {
    parameters: ["bool"],
    result: "void",
  },
  mouseScroll: {
    parameters: ["i32", "i32"],
    result: "void",
  },
  getScreenWidth: {
    parameters: [],
    result: "u32",
  },
  getScreenHeight: {
    parameters: [],
    result: "u32",
  },
  screenshot: {
    parameters: ["pointer", "u32", "u32"],
    result: "void",
    nonblocking: true,
  },
});
