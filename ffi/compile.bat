@echo off
g++ -shared -o mouse.so -fPIC -mwindows -lgdi32 mouse.cpp