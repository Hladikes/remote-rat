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

  void screenshot(uint8_t* buffer, uint32_t width, uint32_t height) {
    HDC hScreenDC = GetDC(nullptr);
    HDC hMemoryDC = CreateCompatibleDC(hScreenDC);
    HBITMAP hBitmap = CreateCompatibleBitmap(hScreenDC, width, height);
    HBITMAP hOldBitmap = static_cast<HBITMAP>(SelectObject(hMemoryDC, hBitmap));

    BitBlt(hMemoryDC, 0, 0, width, height, hScreenDC, 0, 0, SRCCOPY);

    static BITMAPINFO bmpInfo = {0};
    bmpInfo.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    bmpInfo.bmiHeader.biWidth = width;
    bmpInfo.bmiHeader.biHeight = -height;
    bmpInfo.bmiHeader.biPlanes = 1;
    bmpInfo.bmiHeader.biBitCount = 32;
    bmpInfo.bmiHeader.biCompression = BI_RGB;

    uint32_t bufferSize = width * height * 4;

    GetDIBits(hMemoryDC, hBitmap, 0, height, buffer, &bmpInfo, DIB_RGB_COLORS);

    for (uint32_t i = 0; i < bufferSize; i += 4) {
      uint8_t b = buffer[i];
      uint8_t r = buffer[i + 2]; 

      buffer[i] = r;
      buffer[i + 2] = b;
    }

    SelectObject(hMemoryDC, hOldBitmap);
    DeleteObject(hBitmap);

    DeleteDC(hMemoryDC);
    ReleaseDC(nullptr, hScreenDC);
  };
};
