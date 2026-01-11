try {
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WinAPI {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@ -ErrorAction SilentlyContinue

    $hwnd = [WinAPI]::GetForegroundWindow()
    $processId = 0
    [WinAPI]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null

    if ($processId -gt 0) {
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        if ($proc) {
            $processName = if ($proc.ProcessName) { $proc.ProcessName } else { "Unknown" }
            $windowTitle = if ($proc.MainWindowTitle) { $proc.MainWindowTitle } else { "" }
            
            $output = @{
                ProcessName = $processName
                WindowTitle = $windowTitle
            }
            $output | ConvertTo-Json -Compress
        } else {
            # Fallback output if process can't be retrieved
            @{ ProcessName = "Unknown"; WindowTitle = "" } | ConvertTo-Json -Compress
        }
    } else {
        # Fallback if no process ID
        @{ ProcessName = "Unknown"; WindowTitle = "" } | ConvertTo-Json -Compress
    }
} catch {
    # Error fallback - always return valid JSON
    @{ ProcessName = "Unknown"; WindowTitle = "" } | ConvertTo-Json -Compress
}
