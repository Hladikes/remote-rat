@echo off
g++ -shared -o test.so -fPIC -mwindows -lgdi32 test.cpp