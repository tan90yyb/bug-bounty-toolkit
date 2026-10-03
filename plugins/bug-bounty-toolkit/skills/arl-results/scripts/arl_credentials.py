"""Store one ARL login per HTTPS origin in Windows Credential Manager."""

import ctypes
import sys
from ctypes import wintypes
from urllib.parse import urlsplit


CRED_TYPE_GENERIC = 1
CRED_PERSIST_LOCAL_MACHINE = 2
ERROR_NOT_FOUND = 1168


class FILETIME(ctypes.Structure):
    _fields_ = [("low", wintypes.DWORD), ("high", wintypes.DWORD)]


class CREDENTIAL(ctypes.Structure):
    _fields_ = [
        ("Flags", wintypes.DWORD),
        ("Type", wintypes.DWORD),
        ("TargetName", wintypes.LPWSTR),
        ("Comment", wintypes.LPWSTR),
        ("LastWritten", FILETIME),
        ("CredentialBlobSize", wintypes.DWORD),
        ("CredentialBlob", ctypes.POINTER(ctypes.c_ubyte)),
        ("Persist", wintypes.DWORD),
        ("AttributeCount", wintypes.DWORD),
        ("Attributes", ctypes.c_void_p),
        ("TargetAlias", wintypes.LPWSTR),
        ("UserName", wintypes.LPWSTR),
    ]


def _target(origin):
    parsed = urlsplit(origin)
    return f"Codex:BugBountyToolkit:ARL:{parsed.hostname}:{parsed.port or 443}"


def _api():
    if sys.platform != "win32":
        raise ValueError("remembered login requires Windows Credential Manager")
    api = ctypes.WinDLL("Advapi32", use_last_error=True)
    api.CredWriteW.argtypes = (ctypes.POINTER(CREDENTIAL), wintypes.DWORD)
    api.CredWriteW.restype = wintypes.BOOL
    api.CredReadW.argtypes = (
        wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
        ctypes.POINTER(ctypes.POINTER(CREDENTIAL)),
    )
    api.CredReadW.restype = wintypes.BOOL
    api.CredDeleteW.argtypes = (wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD)
    api.CredDeleteW.restype = wintypes.BOOL
    api.CredFree.argtypes = (ctypes.c_void_p,)
    api.CredFree.restype = None
    return api


def _error(action):
    raise ValueError(f"Windows Credential Manager {action} failed (error {ctypes.get_last_error()})")


def read(origin):
    api = _api()
    pointer = ctypes.POINTER(CREDENTIAL)()
    if not api.CredReadW(_target(origin), CRED_TYPE_GENERIC, 0, ctypes.byref(pointer)):
        if ctypes.get_last_error() == ERROR_NOT_FOUND:
            return None
        _error("read")
    try:
        entry = pointer.contents
        raw = ctypes.string_at(entry.CredentialBlob, entry.CredentialBlobSize)
        return entry.UserName, raw.decode("utf-8")
    finally:
        api.CredFree(pointer)


def write(origin, username, password):
    api = _api()
    raw = password.encode("utf-8")
    if not raw or len(raw) > 2560:
        raise ValueError("password is empty or too long for Windows Credential Manager")
    blob = (ctypes.c_ubyte * len(raw)).from_buffer_copy(raw)
    entry = CREDENTIAL()
    entry.Type = CRED_TYPE_GENERIC
    entry.TargetName = _target(origin)
    entry.CredentialBlobSize = len(raw)
    entry.CredentialBlob = ctypes.cast(blob, ctypes.POINTER(ctypes.c_ubyte))
    entry.Persist = CRED_PERSIST_LOCAL_MACHINE
    entry.UserName = username
    if not api.CredWriteW(ctypes.byref(entry), 0):
        _error("write")


def delete(origin):
    api = _api()
    if api.CredDeleteW(_target(origin), CRED_TYPE_GENERIC, 0):
        return True
    if ctypes.get_last_error() == ERROR_NOT_FOUND:
        return False
    _error("delete")
