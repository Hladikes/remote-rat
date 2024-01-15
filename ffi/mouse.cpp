#include <Windows.h>
#include <stdint.h>

extern "C" {
  void mouseMove(bool relative, int32_t x, int32_t y) {
    if (relative) {
      mouse_event(MOUSEEVENTF_MOVE, x, y, 0, 0);
    } else {
      SetCursorPos(x, y);
    }
  };
  
  void mouseClick(bool down) {
    mouse_event(down ? MOUSEEVENTF_LEFTDOWN : MOUSEEVENTF_LEFTUP, 0, 0, 0, 0);
  };

  void mouseScroll(int32_t dx, int32_t dy) {
    mouse_event(MOUSEEVENTF_WHEEL, 0, 0, dy * 2, 0);
  };

  void screenshot() {
    
  };

  uint32_t getScreenWidth() {
    return GetSystemMetrics(SM_CXSCREEN);
  };
  
  uint32_t getScreenHeight() {
    return GetSystemMetrics(SM_CYSCREEN);
  };
};
