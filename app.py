#!/opt/homebrew/bin/python3.12
"""Video Converter — Python/CustomTkinter"""

import sys
import tkinter as _tk
if _tk.TkVersion < 8.6:
    import subprocess
    subprocess.run([
        "osascript", "-e",
        'display alert "Wrong Python" message "Run the app using VideoConverter.command, not python3 app.py.\\n\\nNeeds Tk 8.6+ but found Tk ' + str(_tk.TkVersion) + '." buttons {"OK"}'
    ])
    sys.exit(1)

import os
import re
import subprocess
import threading
import uuid
from pathlib import Path
from typing import Optional

import customtkinter as ctk
from tkinter import filedialog

# ── DnD: create mixed classes so ctk widgets support drop targets ─────────────

try:
    from tkinterdnd2 import DND_FILES, TkinterDnD, DnDWrapper

    class _CTk(DnDWrapper, ctk.CTk):
        """CTk root with TkinterDnD drag-and-drop support."""
        def __init__(self, *args, **kwargs):
            ctk.CTk.__init__(self, *args, **kwargs)
            self.TkdndVersion = TkinterDnD._require(self)

    class _CTkFrame(DnDWrapper, ctk.CTkFrame):
        """CTkFrame that can act as a drop target."""
        pass

    HAS_DND = True

except ImportError:
    _CTk    = ctk.CTk       # type: ignore[misc]
    _CTkFrame = ctk.CTkFrame  # type: ignore[misc]
    HAS_DND = False
    DND_FILES = None

# ── Supported formats ─────────────────────────────────────────────────────────

INPUT_FORMATS = [
    'mp4', 'mov', 'avi', 'wmv', 'mkv', 'flv', 'webm', 'm4v',
    'mpg', 'mpeg', '3gp', 'ts', 'mts', 'm2ts', 'vob', 'ogv',
    'f4v', 'mxf', 'asf', 'rmvb', 'divx',
]
OUTPUT_FORMATS = ['mp4', 'mov', 'avi', 'wmv', 'mkv', 'flv', 'webm', 'm4v', 'gif']

# ── Colours ───────────────────────────────────────────────────────────────────

BG           = "#080b14"
SURFACE      = "#0e1623"
CARD         = "#131c2e"
BORDER       = "#1e2d47"
ACCENT       = "#3b82f6"
ACCENT_HOVER = "#60a5fa"
GREEN        = "#22c55e"
RED          = "#ef4444"
TEXT         = "#e2e8f0"
MUTED        = "#64748b"

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

# ── FFmpeg discovery ──────────────────────────────────────────────────────────

_SCRIPT_DIR = Path(__file__).parent


def _find_ffmpeg() -> Optional[str]:
    bundled = _SCRIPT_DIR / "node_modules" / "ffmpeg-static" / "ffmpeg"
    if bundled.is_file():
        return str(bundled)
    for p in ("/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/bin/ffmpeg"):
        if os.path.isfile(p):
            return p
    try:
        r = subprocess.run(["which", "ffmpeg"], capture_output=True, text=True)
        if r.returncode == 0:
            return r.stdout.strip()
    except OSError:
        pass
    return None


# ── Data model ────────────────────────────────────────────────────────────────

# Codecs available per output format
MOV_CODECS = ["Standard", "HAP", "HAP Q"]
AVI_CODECS = ["Standard", "Uncompressed"]

class FileItem:
    def __init__(self, path: str):
        self.id        = str(uuid.uuid4())
        self.path      = path
        self.name      = Path(path).name
        self.input_fmt = Path(path).suffix.lstrip(".").lower()
        self.output_fmt = "mp4"
        self.codec     = "Standard"   # only meaningful when output_fmt == "mov"
        self.status    = "waiting"   # waiting | converting | done | error
        self.progress  = 0
        self.error_msg = ""


# ── App ───────────────────────────────────────────────────────────────────────

class App:
    def __init__(self):
        self.ffmpeg     = _find_ffmpeg()
        self.files:     list[FileItem] = []
        self.rows:      dict[str, dict] = {}
        self.converting = False
        self.out_folder = str(Path.home() / "Desktop" / "Converted")

        self.root = _CTk()
        self.root.title("Video Converter")
        self.root.geometry("920x680")
        self.root.minsize(720, 520)

        self._build()

        if not self.ffmpeg:
            self._warn_no_ffmpeg()

    # ── UI ────────────────────────────────────────────────────────────────────

    def _build(self):
        self._build_main()
        self._build_bottombar()

    def _build_main(self):
        self.main = ctk.CTkFrame(self.root, fg_color=BG)
        self.main.pack(fill="both", expand=True, padx=20)
        self._build_dropzone()
        self._build_queue()

    def _build_dropzone(self):
        # Use _CTkFrame so drop_target_register is available when HAS_DND
        self.dz = _CTkFrame(self.main, fg_color=SURFACE,
                             border_color=BORDER, border_width=2,
                             corner_radius=12)
        self.dz.pack(fill="x", pady=(16, 0))

        inner = ctk.CTkFrame(self.dz, fg_color="transparent")
        inner.pack(pady=36)

        self.dz_icon = ctk.CTkLabel(inner, text="⬆",
                                     font=ctk.CTkFont(size=34), text_color=MUTED)
        self.dz_icon.pack()

        self.dz_text = ctk.CTkLabel(inner,
                                     text="Drop videos here or click to browse",
                                     font=ctk.CTkFont(size=15, weight="bold"),
                                     text_color=TEXT)
        self.dz_text.pack(pady=(8, 4))

        fmts = ", ".join(INPUT_FORMATS[:10]) + "…"
        ctk.CTkLabel(inner, text=f"Supports: {fmts}",
                     font=ctk.CTkFont(size=11), text_color=MUTED).pack()

        for w in (self.dz, inner, self.dz_icon, self.dz_text):
            w.bind("<Button-1>", lambda _e: self._browse())
            w.bind("<Enter>",    lambda _e: self._dz_hover(True))
            w.bind("<Leave>",    lambda _e: self._dz_hover(False))

        if HAS_DND:
            self.dz.drop_target_register(DND_FILES)
            self.dz.dnd_bind("<<DropEnter>>", lambda _e: self._dz_hover(True))
            self.dz.dnd_bind("<<DropLeave>>", lambda _e: self._dz_hover(False))
            self.dz.dnd_bind("<<Drop>>",
                              lambda e: [self._dz_hover(False), self._on_drop(e)])

    def _dz_hover(self, active: bool):
        self.dz.configure(border_color=ACCENT if active else BORDER)
        self.dz_icon.configure(text_color=ACCENT if active else MUTED)
        self.dz_text.configure(text_color=TEXT if active else MUTED)

    def _build_queue(self):
        self.queue_frame = ctk.CTkFrame(self.main, fg_color="transparent")

        hdr = ctk.CTkFrame(self.queue_frame, fg_color="transparent")
        hdr.pack(fill="x", pady=(12, 4))

        ctk.CTkLabel(hdr, text="Queue",
                     font=ctk.CTkFont(size=12, weight="bold"),
                     text_color=MUTED).pack(side="left")

        ctk.CTkButton(hdr, text="Clear All", width=72, height=26,
                       font=ctk.CTkFont(size=11),
                       fg_color="transparent", border_color=BORDER, border_width=1,
                       text_color=MUTED, hover_color=CARD,
                       command=self._clear_all).pack(side="right")

        self.scroll = ctk.CTkScrollableFrame(self.queue_frame,
                                              fg_color="transparent",
                                              scrollbar_button_color=BORDER)
        self.scroll.pack(fill="both", expand=True)

    def _add_row(self, item: FileItem):
        row = ctk.CTkFrame(self.scroll, fg_color=CARD, corner_radius=8)
        row.pack(fill="x", pady=3, padx=2)

        top = ctk.CTkFrame(row, fg_color="transparent")
        top.pack(fill="x", padx=12, pady=(8, 2))

        ctk.CTkLabel(top, text="▶", font=ctk.CTkFont(size=11),
                      text_color=ACCENT, width=18).pack(side="left")
        ctk.CTkLabel(top, text=item.name, font=ctk.CTkFont(size=12),
                      text_color=TEXT, anchor="w").pack(side="left", padx=(6, 0))

        bot = ctk.CTkFrame(row, fg_color="transparent")
        bot.pack(fill="x", padx=12, pady=(2, 8))

        fmt_var = ctk.StringVar(value=item.output_fmt)
        codec_var = ctk.StringVar(value=item.codec)

        def _codec_values_for(fmt: str) -> list[str]:
            if fmt == "mov": return MOV_CODECS
            if fmt == "avi": return AVI_CODECS
            return ["Standard"]

        codec_menu = ctk.CTkOptionMenu(
            bot, values=_codec_values_for(item.output_fmt), variable=codec_var,
            width=108, height=26, font=ctk.CTkFont(size=11),
            fg_color=SURFACE, button_color=BORDER, button_hover_color=ACCENT,
            dropdown_fg_color=SURFACE,
            command=lambda c, i=item.id: self._codec_change(i, c),
        )

        def _on_fmt_change(f, i=item.id, cm=codec_menu, cv=codec_var):
            cv.set("Standard")
            self._codec_change(i, "Standard")
            vals = _codec_values_for(f)
            if len(vals) > 1:
                cm.configure(values=vals)
                cm.pack(side="left", padx=(6, 0))
            else:
                cm.pack_forget()
            self._format_change(i, f)

        ctk.CTkOptionMenu(
            bot, values=OUTPUT_FORMATS, variable=fmt_var,
            width=88, height=26, font=ctk.CTkFont(size=11),
            fg_color=SURFACE, button_color=BORDER, button_hover_color=ACCENT,
            dropdown_fg_color=SURFACE,
            command=_on_fmt_change,
        ).pack(side="left")

        # Codec menu only visible when mov or avi is selected
        if item.output_fmt in ("mov", "avi"):
            codec_menu.pack(side="left", padx=(6, 0))

        pbar = ctk.CTkProgressBar(bot, height=4,
                                   progress_color=ACCENT, fg_color=BORDER)
        pbar.set(0)
        pbar.pack(side="left", fill="x", expand=True, padx=10)

        slbl = ctk.CTkLabel(bot, text="Waiting", font=ctk.CTkFont(size=10),
                             text_color=MUTED, width=68)
        slbl.pack(side="left")

        ctk.CTkButton(bot, text="✕", width=26, height=26,
                       font=ctk.CTkFont(size=11),
                       fg_color="transparent", text_color=MUTED, hover_color=CARD,
                       command=lambda i=item.id: self._remove(i)).pack(side="left")

        self.rows[item.id] = {"row": row, "pbar": pbar, "slbl": slbl,
                               "fmt_var": fmt_var, "codec_var": codec_var}

    def _build_bottombar(self):
        bar = ctk.CTkFrame(self.root, fg_color=SURFACE, corner_radius=0,
                            border_color=BORDER, border_width=1)
        bar.pack(fill="x", side="bottom")

        inner = ctk.CTkFrame(bar, fg_color="transparent")
        inner.pack(fill="x", padx=20, pady=12)
        inner.columnconfigure(1, weight=1)

        # Left — output folder
        lft = ctk.CTkFrame(inner, fg_color="transparent")
        lft.grid(row=0, column=0, sticky="w")

        ctk.CTkLabel(lft, text="Output Folder",
                     font=ctk.CTkFont(size=10), text_color=MUTED).pack(anchor="w")

        frow = ctk.CTkFrame(lft, fg_color="transparent")
        frow.pack(anchor="w")

        self.folder_lbl = ctk.CTkLabel(
            frow, text=self._short(self.out_folder),
            font=ctk.CTkFont(size=12, family="Courier"),
            text_color=TEXT, width=220, anchor="w",
        )
        self.folder_lbl.pack(side="left")

        ctk.CTkButton(frow, text="Change", width=62, height=24,
                       font=ctk.CTkFont(size=11),
                       fg_color="transparent", border_color=ACCENT, border_width=1,
                       text_color=ACCENT, hover_color=CARD,
                       command=self._pick_folder).pack(side="left", padx=(8, 0))

        # Centre — stats + open folder
        ctr = ctk.CTkFrame(inner, fg_color="transparent")
        ctr.grid(row=0, column=1)

        self.stats_lbl = ctk.CTkLabel(ctr, text="",
                                       font=ctk.CTkFont(size=12), text_color=MUTED)
        self.stats_lbl.pack(side="left", padx=(0, 12))

        self.open_btn = ctk.CTkButton(
            ctr, text="Open Folder", width=100, height=28,
            font=ctk.CTkFont(size=11),
            fg_color="transparent", text_color=ACCENT, hover_color=CARD,
            state="disabled", command=self._open_folder,
        )
        self.open_btn.pack(side="left")

        # Right — Convert All
        self.cvt_btn = ctk.CTkButton(
            inner, text="⚡  Convert All", width=148, height=42,
            font=ctk.CTkFont(size=13, weight="bold"),
            fg_color=ACCENT, hover_color=ACCENT_HOVER,
            text_color="white", state="disabled",
            command=self._start,
        )
        self.cvt_btn.grid(row=0, column=2, sticky="e")

    # ── File management ───────────────────────────────────────────────────────

    def _browse(self):
        paths = filedialog.askopenfilenames(
            title="Select Video Files",
            filetypes=[
                ("Video Files", " ".join(f"*.{f}" for f in INPUT_FORMATS)),
                ("All Files", "*.*"),
            ],
        )
        if paths:
            self._add_files(list(paths))

    def _on_drop(self, event):
        paths = re.findall(r"\{([^}]+)\}|(\S+)", event.data)
        self._add_files([a or b for a, b in paths])

    def _add_files(self, paths: list[str]):
        existing = {f.path for f in self.files}
        for p in paths:
            if p in existing:
                continue
            ext = Path(p).suffix.lstrip(".").lower()
            if ext not in INPUT_FORMATS:
                continue
            item = FileItem(p)
            self.files.append(item)
            self._add_row(item)
            existing.add(p)
        self._refresh()

    def _remove(self, fid: str):
        self.files = [f for f in self.files if f.id != fid]
        if fid in self.rows:
            self.rows[fid]["row"].destroy()
            del self.rows[fid]
        self._refresh()

    def _clear_all(self):
        for d in self.rows.values():
            d["row"].destroy()
        self.rows.clear()
        self.files.clear()
        self._refresh()

    def _format_change(self, fid: str, fmt: str):
        for f in self.files:
            if f.id == fid:
                f.output_fmt = fmt
                if f.status in ("done", "error"):
                    f.status = "waiting"
                    f.progress = 0
                    self._update_row(fid)
                    self._refresh()
                break

    def _codec_change(self, fid: str, codec: str):
        for f in self.files:
            if f.id == fid:
                f.codec = codec
                if f.status in ("done", "error"):
                    f.status = "waiting"
                    f.progress = 0
                    self._update_row(fid)
                    self._refresh()
                break

    # ── Refresh ───────────────────────────────────────────────────────────────

    def _refresh(self):
        if self.files:
            self.queue_frame.pack(fill="both", expand=True,
                                  after=self.dz, pady=(12, 0))
        else:
            self.queue_frame.pack_forget()

        total = len(self.files)
        done  = sum(1 for f in self.files if f.status == "done")
        self.stats_lbl.configure(text=f"{done}/{total} converted" if total else "")

        self.open_btn.configure(state="normal" if done > 0 else "disabled")
        has_waiting = any(f.status == "waiting" for f in self.files)
        self.cvt_btn.configure(
            state="normal" if (has_waiting and not self.converting) else "disabled",
            text="Converting…" if self.converting else "⚡  Convert All",
        )

    def _update_row(self, fid: str):
        f = next((x for x in self.files if x.id == fid), None)
        if not f or fid not in self.rows:
            return
        d = self.rows[fid]
        d["pbar"].set(f.progress / 100)
        done_label = f"Done ✓  {f.input_fmt.upper()}→{f.output_fmt.upper()}"
        if f.codec != "Standard":
            done_label += f" ({f.codec})"
        labels = {
            "waiting":    ("Waiting",        MUTED),
            "converting": (f"{f.progress}%", ACCENT),
            "done":       (done_label,        GREEN),
            "error":      ("Error ✗",        RED),
        }
        text, color = labels.get(f.status, ("", MUTED))
        d["slbl"].configure(text=text, text_color=color)
        self._refresh()

    # ── Conversion ────────────────────────────────────────────────────────────

    def _start(self):
        if self.converting or not self.ffmpeg:
            return
        waiting = [f for f in self.files if f.status == "waiting"]
        if not waiting:
            return
        self.converting = True
        self._refresh()
        threading.Thread(target=self._run, args=(waiting,), daemon=True).start()

    def _run(self, items: list[FileItem]):
        os.makedirs(self.out_folder, exist_ok=True)
        for item in items:
            self._set_status(item, "converting", 0)
            out_name = Path(item.name).stem + "." + item.output_fmt
            out_path = self._unique_path(os.path.join(self.out_folder, out_name))
            try:
                self._ffmpeg(item, out_path)
            except Exception as exc:
                item.error_msg = str(exc)
                self._set_status(item, "error", 0)
        self.converting = False
        self.root.after(0, self._refresh)

    def _ffmpeg(self, item: FileItem, out_path: str):
        duration = self._duration(item.path)

        codec_flags: list[str] = []
        if item.output_fmt == "mov" and item.codec == "HAP":
            codec_flags = ["-vcodec", "hap", "-pix_fmt", "rgba"]
        elif item.output_fmt == "mov" and item.codec == "HAP Q":
            codec_flags = ["-vcodec", "hap", "-format", "hap_q", "-pix_fmt", "rgba"]
        elif item.output_fmt == "avi" and item.codec == "Uncompressed":
            codec_flags = ["-vcodec", "rawvideo", "-acodec", "pcm_s16le"]

        cmd = [self.ffmpeg, "-i", item.path] + codec_flags + ["-y", out_path]
        proc = subprocess.Popen(
            cmd,
            stderr=subprocess.PIPE, stdout=subprocess.DEVNULL,
            text=True, errors="replace",
        )
        time_re = re.compile(r"time=(\d+):(\d+):(\d+\.?\d*)")
        for line in proc.stderr:
            m = time_re.search(line)
            if m and duration:
                h, mi, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
                pct = min(int((h * 3600 + mi * 60 + s) / duration * 99), 99)
                self._set_status(item, "converting", pct)
        proc.wait()
        if proc.returncode != 0:
            raise RuntimeError(f"ffmpeg failed (code {proc.returncode})")
        self._set_status(item, "done", 100)

    def _set_status(self, item: FileItem, status: str, pct: int):
        item.status   = status
        item.progress = pct
        self.root.after(0, lambda: self._update_row(item.id))

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _duration(self, path: str) -> Optional[float]:
        try:
            r = subprocess.run(
                [self.ffmpeg, "-i", path],
                stderr=subprocess.PIPE, stdout=subprocess.DEVNULL,
                text=True, errors="replace",
            )
            m = re.search(r"Duration: (\d+):(\d+):(\d+\.?\d*)", r.stderr)
            if m:
                h, mi, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
                return h * 3600 + mi * 60 + s
        except OSError:
            pass
        return None

    def _unique_path(self, path: str) -> str:
        if not os.path.exists(path):
            return path
        base, ext = os.path.splitext(path)
        i = 1
        while os.path.exists(f"{base}_{i}{ext}"):
            i += 1
        return f"{base}_{i}{ext}"

    def _short(self, path: str) -> str:
        home = str(Path.home())
        return "~" + path[len(home):] if path.startswith(home) else path

    def _pick_folder(self):
        folder = filedialog.askdirectory(title="Select Output Folder",
                                          initialdir=self.out_folder)
        if folder:
            self.out_folder = folder
            self.folder_lbl.configure(text=self._short(folder))

    def _open_folder(self):
        subprocess.run(["open", self.out_folder])

    def _warn_no_ffmpeg(self):
        import tkinter.messagebox as mb
        mb.showwarning("FFmpeg not found",
                       "FFmpeg was not found.\n\n"
                       "Install it with:\n\n  brew install ffmpeg\n\n"
                       "Then restart the app.")

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    App().run()
