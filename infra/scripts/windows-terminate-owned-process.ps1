$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class CvgWindowsOwnedProcessTerminator
{
    private const uint PROCESS_TERMINATE = 0x0001;
    private const uint PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

    [StructLayout(LayoutKind.Sequential)]
    private struct FILETIME
    {
        public uint LowDateTime;
        public uint HighDateTime;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint desiredAccess, bool inheritHandle, uint processId);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetProcessTimes(
        IntPtr process,
        out FILETIME creationTime,
        out FILETIME exitTime,
        out FILETIME kernelTime,
        out FILETIME userTime);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateProcess(IntPtr process, uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    private static ulong ToUInt64(FILETIME value)
    {
        return ((ulong)value.HighDateTime << 32) | value.LowDateTime;
    }

    public static int Terminate(uint processId, ulong expectedCreationTime)
    {
        var process = OpenProcess(
            PROCESS_TERMINATE | PROCESS_QUERY_LIMITED_INFORMATION,
            false,
            processId);
        if (process == IntPtr.Zero) return 5;

        try
        {
            FILETIME creationTime;
            FILETIME exitTime;
            FILETIME kernelTime;
            FILETIME userTime;
            if (!GetProcessTimes(
                process,
                out creationTime,
                out exitTime,
                out kernelTime,
                out userTime))
            {
                return 5;
            }
            if (ToUInt64(creationTime) != expectedCreationTime) return 5;
            return TerminateProcess(process, 1) ? 0 : 6;
        }
        finally
        {
            CloseHandle(process);
        }
    }
}
'@

try {
    $processId = [uint32]$env:CVG_CRITICAL_TERMINATE_PID
    $creationTime = [uint64]$env:CVG_CRITICAL_TERMINATE_CREATION_TIME
    exit [CvgWindowsOwnedProcessTerminator]::Terminate($processId, $creationTime)
}
catch {
    exit 1
}
