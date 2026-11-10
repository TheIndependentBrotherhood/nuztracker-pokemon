"""Loads the `pm_setup` module straight from ProjectPMSetup.exe (PyInstaller bundle).

Nothing from Project PM is copied or redistributed: the module is read from the user's own
installation at runtime. The bundle targets CPython 3.11, so this must run under Python 3.11.
"""

import marshal
import struct
import sys
import types
import zlib
from pathlib import Path

COOKIE_MAGIC = b"MEI\014\013\012\013\016"
COOKIE_FORMAT = "!8sIIII64s"
TOC_ENTRY_FORMAT = "!IIIIBc"
MODULE_NAME = "pm_setup"


def load_pm_setup(exe_path: Path) -> types.ModuleType:
    if sys.version_info[:2] != (3, 11):
        raise RuntimeError("Project PM Setup is built with Python 3.11: run this tool with `py -3.11`.")
    data = exe_path.read_bytes()
    cookie = data.rfind(COOKIE_MAGIC)
    if cookie < 0:
        raise RuntimeError(f"{exe_path} is not a PyInstaller bundle.")
    _, package_length, toc_offset, toc_length, python_version, _ = struct.unpack_from(COOKIE_FORMAT, data, cookie)
    if python_version != 311:
        raise RuntimeError(f"Unsupported Project PM Setup build (Python {python_version}).")
    archive = cookie + struct.calcsize(COOKIE_FORMAT) - package_length
    cursor = archive + toc_offset
    end = cursor + toc_length
    header_size = struct.calcsize(TOC_ENTRY_FORMAT)
    while cursor < end:
        entry_size, position, compressed_size, _, compressed, kind = struct.unpack_from(TOC_ENTRY_FORMAT, data, cursor)
        name = data[cursor + header_size : cursor + entry_size].rstrip(b"\0").decode("utf-8")
        cursor += entry_size
        if kind != b"s" or name != MODULE_NAME:
            continue
        payload = data[archive + position : archive + position + compressed_size]
        code = marshal.loads(zlib.decompress(payload) if compressed else payload)
        module = types.ModuleType(MODULE_NAME)
        module.__file__ = str(exe_path)
        sys.modules[MODULE_NAME] = module
        exec(code, module.__dict__)
        return module
    raise RuntimeError(f"{MODULE_NAME} was not found in {exe_path}.")
