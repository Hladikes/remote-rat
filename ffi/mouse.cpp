#include <windows.h>
#include <stdint.h>

extern "C" {
  void mouse_move(bool relative, int32_t x, int32_t y) {
    if (relative) {
      mouse_event(MOUSEEVENTF_MOVE, x, y, 0, 0);
    } else {
      SetCursorPos(x, y);
    }
  };
  
  void mouse_click(bool down) {
    mouse_event(down ? MOUSEEVENTF_LEFTDOWN : MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
  };

  void mouse_scroll(int32_t dx, int32_t dy) {
    mouse_event(MOUSEEVENTF_WHEEL, 0, 0, dy * 2, 0);
  };

  uint32_t get_screen_width() {
    return GetSystemMetrics(SM_CXSCREEN);
  };
  
  uint32_t get_screen_height() {
    return GetSystemMetrics(SM_CYSCREEN);
  };
};
