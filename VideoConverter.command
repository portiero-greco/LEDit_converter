#!/bin/bash
cd "$(dirname "$0")"
PYTHON=/opt/homebrew/bin/python3.12

echo "Starting Video Converter..."
echo "Python: $($PYTHON --version)"
echo "Tk: $($PYTHON -c 'import tkinter; print(tkinter.TkVersion)')"

$PYTHON app.py
