# Keyboard injection helper for shiny-hunt.ts.
# Reads one command per line on stdin and answers on stdout:
#   init <pid>   -> "ok" or "error <reason>"
#   down <vk> / up <vk>
#   fg           -> "1" when the target window has focus, else "0"
#   release      -> releases every held key
#   alert <text> -> plays a sound and shows a Windows notification, then "done"
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public static class KeySender {
  [StructLayout(LayoutKind.Sequential)]
  struct MOUSEINPUT { public int dx; public int dy; public uint data; public uint flags; public uint time; public IntPtr extra; }
  [StructLayout(LayoutKind.Sequential)]
  struct KEYBDINPUT { public ushort vk; public ushort scan; public uint flags; public uint time; public IntPtr extra; }
  [StructLayout(LayoutKind.Explicit)]
  struct InputUnion { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)]
  struct INPUT { public uint type; public InputUnion u; }

  [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint n, INPUT[] inputs, int size);
  [DllImport("user32.dll")] static extern uint MapVirtualKey(uint code, uint mapType);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
  [DllImport("kernel32.dll")] static extern IntPtr GetCurrentProcess();
  [DllImport("advapi32.dll")] static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
  [DllImport("advapi32.dll")] static extern bool GetTokenInformation(IntPtr token, int cls, out int value, int length, out int returned);

  static readonly HashSet<ushort> held = new HashSet<ushort>();
  public static int TargetPid;

  public static bool Send(ushort vk, bool up) {
    var input = new INPUT { type = 1 };
    input.u.ki.vk = vk;
    input.u.ki.scan = (ushort)MapVirtualKey(vk, 0);
    input.u.ki.flags = up ? 2u : 0u;
    var sent = SendInput(1, new[] { input }, Marshal.SizeOf(typeof(INPUT))) == 1;
    if (up) held.Remove(vk); else held.Add(vk);
    return sent;
  }

  public static void ReleaseAll() {
    foreach (var vk in new List<ushort>(held)) Send(vk, true);
  }

  public static bool HasFocus() {
    uint pid;
    GetWindowThreadProcessId(GetForegroundWindow(), out pid);
    return pid == TargetPid;
  }

  // Returns 1 when elevated, 0 when not, -1 when the token cannot be read.
  static int Elevation(IntPtr process) {
    IntPtr token;
    if (!OpenProcessToken(process, 8, out token)) return -1;
    int value, returned;
    var ok = GetTokenInformation(token, 20, out value, 4, out returned);
    CloseHandle(token);
    return ok ? (value != 0 ? 1 : 0) : -1;
  }

  // Windows silently drops input sent to a more elevated process (UIPI).
  public static bool TargetMoreElevated(int pid) {
    var process = OpenProcess(0x1000, false, pid);
    if (process == IntPtr.Zero) return false;
    var target = Elevation(process);
    CloseHandle(process);
    return target == 1 && Elevation(GetCurrentProcess()) != 1;
  }
}
'@

function Show-Alert([string]$text) {
  try {
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
    $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent(
      [Windows.UI.Notifications.ToastTemplateType]::ToastText02)
    $lines = $xml.GetElementsByTagName('text')
    $lines.Item(0).AppendChild($xml.CreateTextNode('Shiny hunt')) > $null
    $lines.Item(1).AppendChild($xml.CreateTextNode($text)) > $null
    $appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show(
      [Windows.UI.Notifications.ToastNotification]::new($xml))
  } catch {}
  $wav = Join-Path $env:WINDIR 'Media\Alarm01.wav'
  if (Test-Path $wav) {
    $player = New-Object System.Media.SoundPlayer $wav
    1..2 | ForEach-Object { $player.PlaySync() }
  } else {
    1..3 | ForEach-Object { [System.Media.SystemSounds]::Exclamation.Play(); Start-Sleep -Milliseconds 700 }
  }
}

try {
  while ($null -ne ($line = [Console]::In.ReadLine())) {
    $parts = $line.Split(' ', 2)
    switch ($parts[0]) {
      'init' {
        $targetPid = [int]$parts[1]
        [KeySender]::TargetPid = $targetPid
        if ([KeySender]::TargetMoreElevated($targetPid)) { [Console]::Out.WriteLine('error elevated') }
        else { [Console]::Out.WriteLine('ok') }
      }
      'down' { [KeySender]::Send([uint16]$parts[1], $false) > $null }
      'up' { [KeySender]::Send([uint16]$parts[1], $true) > $null }
      'fg' { [Console]::Out.WriteLine($(if ([KeySender]::HasFocus()) { '1' } else { '0' })) }
      'release' { [KeySender]::ReleaseAll() }
      'alert' { Show-Alert $parts[1]; [Console]::Out.WriteLine('done') }
    }
    [Console]::Out.Flush()
  }
} finally {
  [KeySender]::ReleaseAll()
}
