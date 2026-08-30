$ErrorActionPreference = 'Stop'

$identityFile = $env:CVG_CRITICAL_SUPERVISOR_IDENTITY_FILE
if ([string]::IsNullOrWhiteSpace($identityFile)) {
    throw 'owned-process supervisor received no identity file'
}
$currentProcess = [System.Diagnostics.Process]::GetCurrentProcess()
$identityText = "{0}@{1}" -f $currentProcess.Id, $currentProcess.StartTime.ToFileTimeUtc()
$identityBytes = [System.Text.Encoding]::UTF8.GetBytes($identityText)
$identityStream = [System.IO.File]::Open(
    $identityFile,
    [System.IO.FileMode]::CreateNew,
    [System.IO.FileAccess]::Write,
    [System.IO.FileShare]::Read
)
try {
    $identityStream.Write($identityBytes, 0, $identityBytes.Length)
} finally {
    $identityStream.Dispose()
    $currentProcess.Dispose()
}

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public static class CvgWindowsOwnedProcessSupervisor
{
    private const uint CREATE_SUSPENDED = 0x00000004;
    private const uint CREATE_UNICODE_ENVIRONMENT = 0x00000400;
    private const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
    private const uint STARTF_USESTDHANDLES = 0x00000100;
    private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;
    private const int ERROR_INSUFFICIENT_BUFFER = 122;
    private const int JobObjectExtendedLimitInformation = 9;
    private static readonly IntPtr PROC_THREAD_ATTRIBUTE_JOB_LIST = new IntPtr(0x0002000D);
    private const uint INFINITE = 0xFFFFFFFF;
    private const uint WAIT_OBJECT_0 = 0x00000000;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFO
    {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct PROCESS_INFORMATION
    {
        public IntPtr hProcess;
        public IntPtr hThread;
        public uint processId;
        public uint threadId;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct STARTUPINFOEX
    {
        public STARTUPINFO StartupInfo;
        public IntPtr lpAttributeList;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr jobAttributes, string name);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(
        IntPtr job,
        int jobObjectInfoClass,
        ref JOBOBJECT_EXTENDED_LIMIT_INFORMATION jobObjectInfo,
        uint jobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint ResumeThread(IntPtr thread);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForSingleObject(IntPtr handle, uint milliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateJobObject(IntPtr job, uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool TerminateProcess(IntPtr process, uint exitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr handle);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr GetStdHandle(int standardHandle);

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CreateProcess(
        string applicationName,
        StringBuilder commandLine,
        IntPtr processAttributes,
        IntPtr threadAttributes,
        bool inheritHandles,
        uint creationFlags,
        string environment,
        string currentDirectory,
        ref STARTUPINFOEX startupInfo,
        out PROCESS_INFORMATION processInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool InitializeProcThreadAttributeList(
        IntPtr attributeList,
        uint attributeCount,
        uint flags,
        ref IntPtr size);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool UpdateProcThreadAttribute(
        IntPtr attributeList,
        uint flags,
        IntPtr attribute,
        IntPtr value,
        IntPtr size,
        IntPtr previousValue,
        IntPtr returnSize);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern void DeleteProcThreadAttributeList(IntPtr attributeList);

    private static Exception LastWin32Error(string operation)
    {
        return new InvalidOperationException(operation + " failed with Win32 error " + Marshal.GetLastWin32Error());
    }

    public static int Run(
        string applicationName,
        string commandLine,
        string currentDirectory,
        string environment)
    {
        var job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw LastWin32Error("CreateJobObject");

        var limits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        if (!SetInformationJobObject(
            job,
            JobObjectExtendedLimitInformation,
            ref limits,
            (uint)Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION))))
        {
            CloseHandle(job);
            throw LastWin32Error("SetInformationJobObject");
        }

        var processInformation = new PROCESS_INFORMATION();
        var targetCreated = false;
        var attributeList = IntPtr.Zero;
        var attributeListStorage = IntPtr.Zero;
        var attributeListInitialized = false;
        try
        {
            var attributeListSize = IntPtr.Zero;
            InitializeProcThreadAttributeList(
                IntPtr.Zero,
                1,
                0,
                ref attributeListSize);
            if (Marshal.GetLastWin32Error() != ERROR_INSUFFICIENT_BUFFER)
                throw LastWin32Error("InitializeProcThreadAttributeList(size)");

            attributeList = Marshal.AllocHGlobal(attributeListSize);
            if (!InitializeProcThreadAttributeList(
                attributeList,
                1,
                0,
                ref attributeListSize))
            {
                throw LastWin32Error("InitializeProcThreadAttributeList");
            }
            attributeListInitialized = true;

            attributeListStorage = Marshal.AllocHGlobal(IntPtr.Size);
            Marshal.WriteIntPtr(attributeListStorage, job);
            if (!UpdateProcThreadAttribute(
                attributeList,
                0,
                PROC_THREAD_ATTRIBUTE_JOB_LIST,
                attributeListStorage,
                (IntPtr)IntPtr.Size,
                IntPtr.Zero,
                IntPtr.Zero))
            {
                throw LastWin32Error("UpdateProcThreadAttribute(JOB_LIST)");
            }

            var startupInfo = new STARTUPINFOEX();
            startupInfo.StartupInfo.cb = Marshal.SizeOf(typeof(STARTUPINFOEX));
            startupInfo.StartupInfo.dwFlags = (int)STARTF_USESTDHANDLES;
            startupInfo.StartupInfo.hStdInput = GetStdHandle(-10);
            startupInfo.StartupInfo.hStdOutput = GetStdHandle(-11);
            startupInfo.StartupInfo.hStdError = GetStdHandle(-12);
            startupInfo.lpAttributeList = attributeList;

            var mutableCommandLine = new StringBuilder(commandLine);
            if (!CreateProcess(
                applicationName,
                mutableCommandLine,
                IntPtr.Zero,
                IntPtr.Zero,
                true,
                CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | EXTENDED_STARTUPINFO_PRESENT,
                environment,
                currentDirectory,
                ref startupInfo,
                out processInformation))
            {
                throw LastWin32Error("CreateProcess");
            }
            targetCreated = true;

            if (ResumeThread(processInformation.hThread) == 0xFFFFFFFF)
                throw LastWin32Error("ResumeThread");

            if (WaitForSingleObject(processInformation.hProcess, INFINITE) != WAIT_OBJECT_0)
                throw LastWin32Error("WaitForSingleObject");
            uint exitCode;
            if (!GetExitCodeProcess(processInformation.hProcess, out exitCode))
                throw LastWin32Error("GetExitCodeProcess");
            if (!TerminateJobObject(job, exitCode))
                throw LastWin32Error("TerminateJobObject");
            return unchecked((int)exitCode);
        }
        catch
        {
            if (targetCreated && processInformation.hProcess != IntPtr.Zero)
                TerminateProcess(processInformation.hProcess, 1);
            throw;
        }
        finally
        {
            if (attributeListInitialized) DeleteProcThreadAttributeList(attributeList);
            if (attributeListStorage != IntPtr.Zero) Marshal.FreeHGlobal(attributeListStorage);
            if (attributeList != IntPtr.Zero) Marshal.FreeHGlobal(attributeList);
            if (processInformation.hThread != IntPtr.Zero) CloseHandle(processInformation.hThread);
            if (processInformation.hProcess != IntPtr.Zero) CloseHandle(processInformation.hProcess);
            CloseHandle(job);
        }
    }
}
'@

function ConvertTo-NativeCommandLineArgument {
    param([AllowEmptyString()][string]$Value)

    if ($Value.Length -gt 0 -and $Value -notmatch '[\s"]') {
        return $Value
    }

    $builder = New-Object System.Text.StringBuilder
    [void]$builder.Append('"')
    $backslashes = 0
    foreach ($character in $Value.ToCharArray()) {
        if ($character -eq '\') {
            $backslashes++
            continue
        }
        if ($character -eq '"') {
            for ($index = 0; $index -lt ($backslashes * 2 + 1); $index++) {
                [void]$builder.Append('\')
            }
            [void]$builder.Append('"')
            $backslashes = 0
            continue
        }
        for ($index = 0; $index -lt $backslashes; $index++) {
            [void]$builder.Append('\')
        }
        [void]$builder.Append($character)
        $backslashes = 0
    }
    for ($index = 0; $index -lt ($backslashes * 2); $index++) {
        [void]$builder.Append('\')
    }
    [void]$builder.Append('"')
    return $builder.ToString()
}

try {
    $targetCommand = [string]$env:CVG_CRITICAL_SUPERVISOR_TARGET_COMMAND
    $targetArguments = @($env:CVG_CRITICAL_SUPERVISOR_TARGET_ARGS_JSON | ConvertFrom-Json)
    $targetWorkingDirectory = [string]$env:CVG_CRITICAL_SUPERVISOR_TARGET_CWD
    $targetEnvironmentKeys = @($env:CVG_CRITICAL_SUPERVISOR_TARGET_KEYS_JSON | ConvertFrom-Json)

    if ([string]::IsNullOrWhiteSpace($targetCommand) -or [string]::IsNullOrWhiteSpace($targetWorkingDirectory)) {
        throw 'owned-process supervisor received an incomplete target descriptor'
    }

    $resolvedCommand = Get-Command -Name $targetCommand -ErrorAction Stop | Select-Object -First 1
    $applicationName = if ($resolvedCommand.Source) { [string]$resolvedCommand.Source } else { [string]$resolvedCommand.Path }
    if ([string]::IsNullOrWhiteSpace($applicationName)) {
        throw 'owned-process supervisor could not resolve the target executable'
    }

    $commandLineParts = @($applicationName) + @($targetArguments)
    $commandLine = ($commandLineParts | ForEach-Object { ConvertTo-NativeCommandLineArgument ([string]$_) }) -join ' '
    $environmentEntries = @(
        foreach ($key in $targetEnvironmentKeys) {
            if ($null -ne $key -and (Test-Path "Env:$key")) {
                "{0}={1}" -f $key, (Get-Item "Env:$key").Value
            }
        }
    ) | Sort-Object
    $environmentBlock = ($environmentEntries -join [char]0) + [char]0 + [char]0

    $exitCode = [CvgWindowsOwnedProcessSupervisor]::Run(
        $applicationName,
        $commandLine,
        $targetWorkingDirectory,
        $environmentBlock
    )
    exit $exitCode
}
catch {
    [Console]::Error.WriteLine('owned-process supervisor failed')
    exit 1
}
