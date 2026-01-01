Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@

$hwnd = [WinAPI]::GetForegroundWindow()
$processId = 0
[WinAPI]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
$proc = Get-Process -Id $processId -ErrorAction SilentlyContinue

if ($proc) {
    $output = @{
        ProcessName = $proc.ProcessName
        WindowTitle = $proc.MainWindowTitle
    }
    $output | ConvertTo-Json -Compress
}
