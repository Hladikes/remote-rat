#include <windows.h>
#include <stdint.h>
#include <vector>

extern "C" {
  uint32_t get_pixel(uint32_t x, uint32_t y) {
    HDC dng = GetDC(NULL); 
    COLORREF c = GetPixel(dng, x, y); 
    uint32_t r = ((GetRValue(c) & 0xFF) << 16) | ((GetGValue(c) & 0xFF) << 8) | GetBValue(c) & 0xFF;
    ReleaseDC(NULL, dng);
    return r;
  };

  uint8_t* get_image(uint32_t width, uint32_t height) {
    HDC hScreenDC = GetDC(nullptr);
    HDC hMemoryDC = CreateCompatibleDC(hScreenDC);
    HBITMAP hBitmap = CreateCompatibleBitmap(hScreenDC, width, height);
    HBITMAP hOldBitmap = static_cast<HBITMAP>(SelectObject(hMemoryDC, hBitmap));
    BitBlt(hMemoryDC, 0, 0, width, height, hScreenDC, 0, 0, SRCCOPY);

    // GetDIBits setup
    BITMAPINFO bmpInfo = {0};
    bmpInfo.bmiHeader.biSize = sizeof(BITMAPINFOHEADER);
    bmpInfo.bmiHeader.biWidth = width;
    bmpInfo.bmiHeader.biHeight = -height; // negative height for top-down DIB
    bmpInfo.bmiHeader.biPlanes = 1;
    bmpInfo.bmiHeader.biBitCount = 32; // 32 bits per pixel (RGB)
    bmpInfo.bmiHeader.biCompression = BI_RGB;

    // Calculate the buffer size and allocate memory
    int bufferSize = width * height * 4; // 4 bytes per pixel (32 bits)
    uint8_t* buffer = new uint8_t[bufferSize];

    // GetDIBits retrieves the color data from the bitmap
    GetDIBits(hMemoryDC, hBitmap, 0, height, buffer, &bmpInfo, DIB_RGB_COLORS);

    // Now 'buffer' contains the RGB values of the captured screen

    // Cleanup
    // delete[] buffer;
    hBitmap = static_cast<HBITMAP>(SelectObject(hMemoryDC, hOldBitmap));
    DeleteDC(hMemoryDC);
    DeleteDC(hScreenDC);

    return buffer;
  };
};
