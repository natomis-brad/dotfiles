"use strict";
/*---------------------------------------------------------------------------------------------
*  Licensed to the .NET Foundation under one or more agreements.
*  The .NET Foundation licenses this file to you under the MIT license.
*--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsInfoContent = void 0;
/**
 * Comprehensive information for the AI agent about the .NET Install Tool extension.
 * This explains settings, architecture, installation types, and useful tricks.
 *
 * Extracted into its own file to keep LanguageModelTools.ts focused on tool logic.
 */
exports.settingsInfoContent = `
# .NET Install Tool - Guide

## Overview
The .NET Install Tool is a VS Code extension that manages .NET installations. It serves two distinct purposes:
1. **For VS Code Extensions**: Automatically installs .NET runtimes that other extensions (C#, C# DevKit, Unity, Bicep, etc.) need to run their internal components
2. **For Users**: Provides commands to find and install .NET SDKs system-wide for development

---

## Installation Types

### LOCAL (Extension-Managed) Runtime Installs
- Small, isolated .NET runtime installs stored in VS Code's extension data folder
- NOT on the system PATH, NOT visible via \`dotnet --list-runtimes\`
- Used solely by VS Code extensions to run their internal components
- Auto-managed; users rarely need to interact with these
- The extension's uninstall list ONLY shows these local installs for runtimes

### GLOBAL/Admin SDK Installs (system-wide)
- System-wide .NET SDK installs (includes runtimes)
- Typical Locations: Windows: \`%ProgramFiles%\\dotnet\` (admin required) | macOS: \`/usr/local/share/dotnet\` (.pkg) | Linux: \`/usr/lib/dotnet\` or \`/usr/share/dotnet\` (package manager; officially supported: Ubuntu + RHEL; community distros may work; WSL is not supported)

- Requires administrator/sudo privileges; users must accept elevation prompts
- IS on the system PATH after installation
- Visible via \`dotnet --list-sdks\` and \`dotnet --list-runtimes\`
- Use "Install .NET SDK System-Wide" command for this

---

## existingDotnetPath Setting (Commonly Misunderstood)

### What It Does
Controls which .NET runtime VS Code **extensions** use to run their internal components.

### What It Does NOT Do
- Does NOT change what .NET the user's code runs on
- Does NOT affect \`dotnet build\` or \`dotnet run\` commands
- Does NOT change a project's target framework

### When Users Need This
- Extensions fail to start with "could not find .NET runtime" errors
- Corporate/restricted environments where the extension cannot auto-download .NET
- Air-gapped machines without internet or PowerShell script execution restrictions
- User wants extensions to use a specific pre-installed .NET version

**IMPORTANT:** If a user wants to pin which SDK their PROJECT uses (for \`dotnet build\`, \`dotnet run\`, etc.), existingDotnetPath is the WRONG setting. They should use \`global.json\` instead — see the "I want to use a local/repo-specific SDK" scenario below.

Setting names and formats:
- \`dotnetAcquisitionExtension.existingDotnetPath\` — per-extension:
\`\`\`json
[{ "extensionId": "ms-dotnettools.csharp", "path": "C:\\\\Program Files\\\\dotnet\\\\dotnet.exe" }]
\`\`\`
- \`dotnetAcquisitionExtension.sharedExistingDotnetPath\` — all extensions:
\`\`\`json
"C:\\\\Program Files\\\\dotnet\\\\dotnet.exe"
\`\`\`

---

## How to See What's Installed

**Extension-Managed Local Installs:** Run the "Uninstall .NET" command — the dropdown shows all extension-managed installs.

**System-Wide Global Installs:** Run \`dotnet --list-sdks\` and \`dotnet --list-runtimes\` in terminal, or use the listInstalledVersions tool.

**listInstalledVersions Tool:** Calls \`dotnet.availableInstalls\` to scan SDKs/runtimes for a given dotnet executable. If no path provided, it uses PATH (typically global install). Returns version, architecture, and directory for each install.

---

## Uninstall Notes

- The uninstall list only shows extension-managed installs, not system-wide ones
- **Trick:** To uninstall a global SDK not in the list, first install the SAME version via the extension (this registers it), then it appears in the uninstall list
- Global SDK uninstall requires the same admin/elevated privileges as installing

---

## Version Selection

Check \`global.json\` first — if present, install \`sdk.version\` (respecting rollForward). Otherwise, latest LTS.

SDK and runtime share major.minor but differ in patch:

| SDK     | Includes Runtime |
|---------|-----------------|
| 8.0.100 | 8.0.0           |
| 8.0.204 | 8.0.4           |

Installing an SDK always includes the corresponding runtime.

---

## global.json paths (.NET 10+)

For repo-local SDK resolution, use the \`paths\` property in global.json:
\`\`\`json
{
  "sdk": {
    "version": "10.0.100",
    "paths": [".dotnet", "$host$"]
  }
}
\`\`\`
- First matching SDK wins
- Only works with SDK commands (\`dotnet run\`, \`dotnet build\`), NOT with native apphost
- The host \`dotnet\` must be .NET 10+
- Ref: https://learn.microsoft.com/dotnet/core/tools/global-json#paths

---

## Common Scenarios

- **"I want to develop .NET applications"** - Install an SDK globally via "Install .NET SDK System-Wide." This provides the \`dotnet\` CLI for build, run, test, and publish.
- **"I want a local/repo-specific SDK (not global)"** - Use the \`paths\` property in global.json (.NET 10+ required) — see section above. DO NOT use existingDotnetPath.
- **"C# extension won't start / can't find .NET"** → Check \`dotnet --info\` in terminal. If missing, install SDK globally. If a RUNTIME is installed but not detected, set existingDotnetPath or sharedExistingDotnetPath.
- **"Extension installed .NET but I can't use it in terminal"** - Extension-managed runtimes are LOCAL and not on PATH. For terminal/CLI usage, install globally.
- **"I want to use a different .NET version for my project"** - NOT existingDotnetPath. Create \`global.json\` in the project root or install the desired SDK globally.
- **"Which dotnet does the C# extension use?"** - Use the findDotNetPath tool. It searches in order: existingDotnetPath setting - PATH - DOTNET_ROOT - extension-managed local installs.

---

## Additional Settings

- **installTimeoutValue**: Seconds to wait for downloads (default: 600). Increase for slow connections.
- **proxyUrl**: HTTP proxy URL for corporate firewalls.

---

## .NET Hives Architecture
.NET supports multiple installation "hives" (locations). Extension-managed local installs do not conflict with global system installs.
- The \`dotnet\` executable typically only sees installs in its own folder
- \`dotnet.findPath\` shows which hive extensions like C# DevKit will use
- \`dotnet.availableInstalls\` lists installs in a specific hive when given an executable path
`;
//# sourceMappingURL=SettingsInfoContent.js.map
// SIG // Begin signature block
// SIG // MIIpZgYJKoZIhvcNAQcCoIIpVzCCKVMCAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // 7nMqSGwZslPefCM2xYqey8hN3lZdgIReehAuWjGchRag
// SIG // gg3WMIIGvTCCBKWgAwIBAgITMwAAABxIn4HfobC3dwAA
// SIG // AAAAHDANBgkqhkiG9w0BAQwFADCBiDELMAkGA1UEBhMC
// SIG // VVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcT
// SIG // B1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jw
// SIG // b3JhdGlvbjEyMDAGA1UEAxMpTWljcm9zb2Z0IFJvb3Qg
// SIG // Q2VydGlmaWNhdGUgQXV0aG9yaXR5IDIwMTAwHhcNMjQw
// SIG // ODA4MjEzNjIzWhcNMzUwNjIzMjIwNDAxWjBfMQswCQYD
// SIG // VQQGEwJVUzEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMTAwLgYDVQQDEydNaWNyb3NvZnQgV2luZG93
// SIG // cyBDb2RlIFNpZ25pbmcgUENBIDIwMjQwggIiMA0GCSqG
// SIG // SIb3DQEBAQUAA4ICDwAwggIKAoICAQCafWt9J8F2Ki6u
// SIG // 49U0/8wrbe78VPggo/uwZIn0vwdoFyhlOzlfUl0SRj9c
// SIG // hbOaeo6bGIuHGMxeegFdABJphI1fME9pbz1OQYTd8Fd9
// SIG // B6mDyGBI+T91l39JFw/X741H9RgLVxK4ifMOwCzWlRJv
// SIG // UbOHjwNGbGB2gm1OZAVCUA17++oWnznEIHRQgNyN82LX
// SIG // 819rzsMfO7gzmgrsijkWYofXN803/kywuUGC8oVTAZw1
// SIG // xBwzq72sPdg0siKqXYEVqbn86gxctXoFY5KF2YW/vaWf
// SIG // YXlMzV014TqF83sYemMwC+H5QVpvgXNYUMhEnpxLwSc5
// SIG // 1ftubt4e+444DFGOOPll0OLvanXQ3v1OUngGikb74m5o
// SIG // uM+0EaS72bJWtAj4jlBs9NA6ObH5AtBMJbEs3zN/vAPa
// SIG // 7MhVToFg1T87ffDiT9hKGhDqvBhPRgqDdou/+AthQsH3
// SIG // 9QUgkyVmTtVnK9jLXiROlMRlfooQPJzedWDyg9nWBqHs
// SIG // K170cwv9R6FHkr5WX9Jn/RhxLb75GyVUUaOjwX9Jnebf
// SIG // O1W9ZjP3yKdXsqcmsZl5IKXAcLspbDqtpElTiecAT6Gh
// SIG // LLCZHjHCpxLrrvvlCnQx5UtA7bGIzdEJzrnL03UrHb4c
// SIG // yjkoyRd11aq/X9gveOS10+a8SiB1CBAwXDWFOgSgwx+q
// SIG // 36SjjgkopQIDAQABo4IBRjCCAUIwDgYDVR0PAQH/BAQD
// SIG // AgGGMBAGCSsGAQQBgjcVAQQDAgEAMB0GA1UdDgQWBBQe
// SIG // gt8O14yz1wI0gw7aq61lua+47DAZBgkrBgEEAYI3FAIE
// SIG // DB4KAFMAdQBiAEMAQTAPBgNVHRMBAf8EBTADAQH/MB8G
// SIG // A1UdIwQYMBaAFNX2VsuP6KJcYmjRPZSQW9fOmhjEMFYG
// SIG // A1UdHwRPME0wS6BJoEeGRWh0dHA6Ly9jcmwubWljcm9z
// SIG // b2Z0LmNvbS9wa2kvY3JsL3Byb2R1Y3RzL01pY1Jvb0Nl
// SIG // ckF1dF8yMDEwLTA2LTIzLmNybDBaBggrBgEFBQcBAQRO
// SIG // MEwwSgYIKwYBBQUHMAKGPmh0dHA6Ly93d3cubWljcm9z
// SIG // b2Z0LmNvbS9wa2kvY2VydHMvTWljUm9vQ2VyQXV0XzIw
// SIG // MTAtMDYtMjMuY3J0MA0GCSqGSIb3DQEBDAUAA4ICAQBD
// SIG // X/jfP7vplIw7XPW7aAOdkQXNF1Q0gTEATKsbueoVxwcL
// SIG // nLVFrNVwagwzCBQh7vXOmP1BfkzfBCII57owKSmJhz+H
// SIG // +BDNwEUppc66ReaMzicdAQORVL9Y5qXX/9mW6qbwsZcb
// SIG // /xtUeCo60ppqjx87OooMN2+0U24+wcSEvHziJMGFkIQd
// SIG // ny45YPtx0qwxjxSIaSCVlWpjCEe2u9jhqJ43X+Oa7KcK
// SIG // iB7sp2VOGr8va7gf0YYW8JvnzG/ATHnCGk5pKIcfxGWe
// SIG // RjVnDeqE2FtxtgTNwd2M51pJfbeLIT+tHzLnvtpLHRxl
// SIG // khPBFU3UphlHY9I61HOOpRlRSSEhd/zMXMZ5TXj9Socq
// SIG // /mc0+BLbPyO5rn6Wi5y2pczEdsyLoRjgFlrMHrG47Rc5
// SIG // FVBYA0dklvdNyNFypWzxAOqvHqRxifa6MYfOZ7BCnATV
// SIG // MOEnKevCgqkqRQWiosldbJHfpfFOdFjXjzG/Qc89DnwE
// SIG // mpfL+bEBvg1tNZDfiPkSlCGzOSOdMCY4h8pkBTQ7G6Gx
// SIG // cfSPeZghBD1O31Gd1U/xzlFW5Jl+5bSAv3kALuRjvH7v
// SIG // nHhEzMm726MVDOHWDQvj86KFMX5gtA7ikcAdtW1/fmnL
// SIG // iAZMSJuBHdztfcNVS6AO1DTlLie8+jUNlv/qu3J3zj5d
// SIG // kFS+KpYAm5VE9r5kKZZVdzCCBxEwggT5oAMCAQICEzMA
// SIG // AAEj1Y8CQwYD7i4AAAAAASMwDQYJKoZIhvcNAQEMBQAw
// SIG // XzELMAkGA1UEBhMCVVMxHjAcBgNVBAoTFU1pY3Jvc29m
// SIG // dCBDb3Jwb3JhdGlvbjEwMC4GA1UEAxMnTWljcm9zb2Z0
// SIG // IFdpbmRvd3MgQ29kZSBTaWduaW5nIFBDQSAyMDI0MB4X
// SIG // DTI2MDMwNTE5NTgyNloXDTI3MDMwMzE5NTgyNlowdDEL
// SIG // MAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24x
// SIG // EDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jv
// SIG // c29mdCBDb3Jwb3JhdGlvbjEeMBwGA1UEAxMVTWljcm9z
// SIG // b2Z0IENvcnBvcmF0aW9uMIICIjANBgkqhkiG9w0BAQEF
// SIG // AAOCAg8AMIICCgKCAgEA0aHw4cqjafYpVNgzOgrXKtRf
// SIG // d9bEgMnzBJkd3BP36auAteUkGKDUX8kNWF5nI7X1o2gA
// SIG // eA7Kq/qaNEOiF0hERd9f5XgrYkbT60vP9U/RQPQHjlE2
// SIG // hWMqh0c9TODFXk8LvPWR6PcUduklUJjh2xVi4p2c5QVf
// SIG // VlCcX89EzTHVsAF88Z2PZ5Z/BZ92NAZwl1PFd8I3gggM
// SIG // aKjNL9oDxtuXjZ+uuYL+2bd84d70GIQ5G+PIVyT4uA7w
// SIG // q6QVcAndCL9koLeKn7Z+Uk8qoXbuVlqr2vqZPkmu9Q2/
// SIG // TgMumy+uNGxps5VHpNSwD/exMvHsZdHPWs5ixEAfe6uC
// SIG // Ub4QknnowTPemvGOnHK634YP4WSRDpGtXiAycQrinWWl
// SIG // gnnNL/le6CN0UrSbtQRHBfXeBUGg0mlgwGw8al1JtXx1
// SIG // CfV6pMtcn7aU3yhcN/4KrMl1eODxOxFR8MEwgBhOWfrJ
// SIG // F0beBxB7iIXDhsSBWx95wJeSrxcaKUbNsxMb4dloXlvD
// SIG // 7u/bK922mppUANr+JPRaiZeJNUX8DuXtP/Qisg2enHJP
// SIG // 5VfMxzOzybTbUFB3NRaMme/BkpV+lBYicQ1s1Mz2yBzH
// SIG // FeD0gVfPzu27OYf28a9weD8YyKVlM7WYc1wYVPb4VI0I
// SIG // Dl+WS1e25kifiK8bWjfucNjbHsLfTfpn1FBcigL9/LkC
// SIG // AwEAAaOCAa8wggGrMA4GA1UdDwEB/wQEAwIHgDAfBgNV
// SIG // HSUEGDAWBgorBgEEAYI3PQYBBggrBgEFBQcDAzAMBgNV
// SIG // HRMBAf8EAjAAMB0GA1UdDgQWBBTZY+x9pGbaYjJs+ecI
// SIG // oKI1pFmWUjBFBgNVHREEPjA8pDowODEeMBwGA1UECxMV
// SIG // TWljcm9zb2Z0IENvcnBvcmF0aW9uMRYwFAYDVQQFEw0y
// SIG // MzA4NjUrNTA2OTU2MB8GA1UdIwQYMBaAFB6C3w7XjLPX
// SIG // AjSDDtqrrWW5r7jsMGoGA1UdHwRjMGEwX6BdoFuGWWh0
// SIG // dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvY3Js
// SIG // L01pY3Jvc29mdCUyMFdpbmRvd3MlMjBDb2RlJTIwU2ln
// SIG // bmluZyUyMFBDQSUyMDIwMjQuY3JsMHcGCCsGAQUFBwEB
// SIG // BGswaTBnBggrBgEFBQcwAoZbaHR0cDovL3d3dy5taWNy
// SIG // b3NvZnQuY29tL3BraW9wcy9jZXJ0cy9NaWNyb3NvZnQl
// SIG // MjBXaW5kb3dzJTIwQ29kZSUyMFNpZ25pbmclMjBQQ0El
// SIG // MjAyMDI0LmNydDANBgkqhkiG9w0BAQwFAAOCAgEALuml
// SIG // Wq89UW+f/XgA/aBzsEEuIw5J2wWJw8C3IDMv4ffeZJ7j
// SIG // y+v+StF0lCAlK41N/2y+elA9bVcF7EXoaxzJEZIDjEJP
// SIG // u3h/l76enMsk8cICDO8cuWEn91ZiQ9xiPO5ZBlKjxRTq
// SIG // hlo82XN3v1EFO1WzeBJYeMyXijnaJFzbhN2uVNZQK9YZ
// SIG // w+lqXyBztp8xlB1UlwyzJLVijDvPaTIC4egVx3cdXALY
// SIG // froJfOrHVwvlcQkCdvGtibzauUUHBARLqkiEnt/2EVmE
// SIG // U0i6oZ/Hmr+JSuJ/t35wMtm5s++me1Cfdl+SoE2hw/q/
// SIG // HL15rLBR91Gzo+hLRPnOEjzWhXSFFhicmQYS204YZYdU
// SIG // JW04NF+OxoSPPamf5cbmHhA2Gzxmg68vyqTKFEMVPpeP
// SIG // YkOs3ZFkjxnMweGQ1UUq5A6s9iu9LSLxWs/GHzIc08uY
// SIG // YTDRr6JwnILmhU4FLMa/jq7xglmnTlf6WdwXEWnyrwQ1
// SIG // /p3stxxXFAciN1T8yFO7GqFG3Lo6k1QOhnjUsm6PACPu
// SIG // 9faJgTm8n9pa4mW/Wtv6FXuUoioR/wQ0FZ/teENulMa1
// SIG // AP/M1TpcyUuXiUGIZBzPYf2NjZ5q9sS7RTdL1v2mne4t
// SIG // dOHVUWkyzAc2yiJQgTq7gYzPO360HNjXH2+SpnuLvaOh
// SIG // kFWX95FcvqfLr/GIJ0ExghroMIIa5AIBATB2MF8xCzAJ
// SIG // BgNVBAYTAlVTMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29y
// SIG // cG9yYXRpb24xMDAuBgNVBAMTJ01pY3Jvc29mdCBXaW5k
// SIG // b3dzIENvZGUgU2lnbmluZyBQQ0EgMjAyNAITMwAAASPV
// SIG // jwJDBgPuLgAAAAABIzANBglghkgBZQMEAgEFAKCBrjAZ
// SIG // BgkqhkiG9w0BCQMxDAYKKwYBBAGCNwIBBDAcBgorBgEE
// SIG // AYI3AgELMQ4wDAYKKwYBBAGCNwIBFTAvBgkqhkiG9w0B
// SIG // CQQxIgQgeCPjuxYbrqhR0TDXv6N2yj7/VOcZppQSSc8j
// SIG // cIVxwVgwQgYKKwYBBAGCNwIBDDE0MDKgFIASAE0AaQBj
// SIG // AHIAbwBzAG8AZgB0oRqAGGh0dHA6Ly93d3cubWljcm9z
// SIG // b2Z0LmNvbTANBgkqhkiG9w0BAQEFAASCAgA14wV6BJYf
// SIG // pk6GUTbicFiUorT1hUHKfAdBoOLOapn5cSXFF6DWOxE9
// SIG // J4zEuL+osxSd3uyJPAMhdCH018CiddNqDgsmkg1YYU5W
// SIG // VTkgbFFrOg/R6+70yrNsMz/fc0FMJlMKayELO8r+1Kvb
// SIG // QSKZdvnMzZULFKe6LtbLTGAc4fo/czoCzXsow4/EVv/z
// SIG // a6iT7R021k2TUtJed5sF8vA8yOB+4zfmBuntxFXiEBIe
// SIG // dh70N4R0ZeS9iYDEmQRm83+X9+4b1htSD/XLJpKMOfZT
// SIG // 7iadGVk0ZdFqvqxdReUz2RKYzLFpInV0Tep1JtvPLO5M
// SIG // XVivcSG1D7YzU6pRIh+vtP4Uv4/gdm5irW/b1ncspLTj
// SIG // UEjVLoYqvDe4IgQ4gPm4QctjjNAYRRTb/Ph/Gy1tSfDQ
// SIG // Po9hKIqbpM/BHFJLFP31FQmooa0ZcKtkes7xuX4su+5A
// SIG // N8Ht18kftVUdF28W4cL48H99DFtIrgGMmMVoBAEyN5uI
// SIG // vEzTjGVsFBcNOX46HXKdJ/6cz/mZh84jOUSlbMx51NPE
// SIG // MaogitdsIjELIEB5eIjHJJOMDlQsnycNDX5MP6eXybNx
// SIG // ge5vLyDpahxrCDdPz2uOb3/4Wqc6D4kJszmA3VLTY8Pu
// SIG // qwGuSBkleOosCrsq8CL3cV19+iQicLNs8XkC/ZcBMdP/
// SIG // TF2erRYiHx2qwaGCF5IwgheOBgorBgEEAYI3AwMBMYIX
// SIG // fjCCF3oGCSqGSIb3DQEHAqCCF2swghdnAgEDMQ8wDQYJ
// SIG // YIZIAWUDBAIBBQAwggFQBgsqhkiG9w0BCRABBKCCAT8E
// SIG // ggE7MIIBNwIBAQYKKwYBBAGEWQoDATAxMA0GCWCGSAFl
// SIG // AwQCAQUABCBQD5OJu3qkng+1GMhQH8vRPU6BqqfIHrGo
// SIG // hzhmbMVRWAIGah9Man2PGBEyMDI2MDYxMDAwMDUyMC44
// SIG // WjAEgAIB9KCB0aSBzjCByzELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjElMCMGA1UECxMcTWljcm9zb2Z0IEFtZXJpY2EgT3Bl
// SIG // cmF0aW9uczEnMCUGA1UECxMeblNoaWVsZCBUU1MgRVNO
// SIG // OkE5MzUtMDNFMC1EOTQ3MSUwIwYDVQQDExxNaWNyb3Nv
// SIG // ZnQgVGltZS1TdGFtcCBTZXJ2aWNloIIR6jCCByAwggUI
// SIG // oAMCAQICEzMAAAIn1cCDw7EuVy0AAQAAAicwDQYJKoZI
// SIG // hvcNAQELBQAwfDELMAkGA1UEBhMCVVMxEzARBgNVBAgT
// SIG // Cldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAc
// SIG // BgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQG
// SIG // A1UEAxMdTWljcm9zb2Z0IFRpbWUtU3RhbXAgUENBIDIw
// SIG // MTAwHhcNMjYwMjE5MTk0MDA0WhcNMjcwNTE3MTk0MDA0
// SIG // WjCByzELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hp
// SIG // bmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoT
// SIG // FU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjElMCMGA1UECxMc
// SIG // TWljcm9zb2Z0IEFtZXJpY2EgT3BlcmF0aW9uczEnMCUG
// SIG // A1UECxMeblNoaWVsZCBUU1MgRVNOOkE5MzUtMDNFMC1E
// SIG // OTQ3MSUwIwYDVQQDExxNaWNyb3NvZnQgVGltZS1TdGFt
// SIG // cCBTZXJ2aWNlMIICIjANBgkqhkiG9w0BAQEFAAOCAg8A
// SIG // MIICCgKCAgEA4sVstXwzki+Ko9wNaWncvnpSAy8Jxd1L
// SIG // i8ySDlsBh3BIK8ccLZ8r4lCA5pscpU1JdbvtqwT6ds0+
// SIG // AcMEIbxmiaRMarzy5QxZW35kn5SiPOnhaqH4me4/DU0T
// SIG // uJe8BoPTY5vprjWrk3BVtqnXyIyhPedDpK5vTJzDhmMv
// SIG // n4mzWHcUz0T6tU+DC2St7N73TMjBDpXXDkJEiqcQ+v9R
// SIG // pOoDpgrtioCPH9Hser2MZyg5fVtDi0hGv+svNqCG7Jvt
// SIG // UAYnzkOO8VikxtQpr7Rq/OS8wO+fzAHFJkcOf6H/6hE9
// SIG // FBVdVrpTHCayOgwEgLDQjQfuli66LbgWQI/lTJam5+UT
// SIG // GekOCGOycGgIiF4e1Y8a58FDmGRvFhBoX6wPfHYvuyxJ
// SIG // /QKr7xDshvlEHI1YQgmzBl4oCV0gKXsnlrqQrA9I4EDD
// SIG // QsXweQSwQ1sYHWN3SQRD4MX5IEw0CwYILVb9neQmMRyo
// SIG // CCLQeGyOXkm+Y5CBtlqLZxXrU9JXoKcPxKM8H9/WqOrR
// SIG // DWNtXlViM0cPxrJr8I2EBer1a8Tg9KRlbH6hhfLN1T3m
// SIG // O4SNk8RxTKjQNCAf2tjS2OyU8WACgD/9dRCWbe8W6gyz
// SIG // IA9WA3RhMxqUIo5t5wDwi9gnmz/45rvdGmydluNucoJR
// SIG // h0yP5wga8EqX0QoMM63xXpSWgijOvt+WhX8CAwEAAaOC
// SIG // AUkwggFFMB0GA1UdDgQWBBTS1ufDeDBkhurne41qoE/d
// SIG // qK30XjAfBgNVHSMEGDAWgBSfpxVdAF5iXYP05dJlpxtT
// SIG // NRnpcjBfBgNVHR8EWDBWMFSgUqBQhk5odHRwOi8vd3d3
// SIG // Lm1pY3Jvc29mdC5jb20vcGtpb3BzL2NybC9NaWNyb3Nv
// SIG // ZnQlMjBUaW1lLVN0YW1wJTIwUENBJTIwMjAxMCgxKS5j
// SIG // cmwwbAYIKwYBBQUHAQEEYDBeMFwGCCsGAQUFBzAChlBo
// SIG // dHRwOi8vd3d3Lm1pY3Jvc29mdC5jb20vcGtpb3BzL2Nl
// SIG // cnRzL01pY3Jvc29mdCUyMFRpbWUtU3RhbXAlMjBQQ0El
// SIG // MjAyMDEwKDEpLmNydDAMBgNVHRMBAf8EAjAAMBYGA1Ud
// SIG // JQEB/wQMMAoGCCsGAQUFBwMIMA4GA1UdDwEB/wQEAwIH
// SIG // gDANBgkqhkiG9w0BAQsFAAOCAgEAKp3LneD0gtbXm9h+
// SIG // p0bsu7A4iitdxVyYq1QeE38I3aNjG/kC+I+8Gf5OBvT9
// SIG // AgDR2Raw0HCtFRQ08rK2LvGdAIWteGnA2T7MiKD7wBkU
// SIG // YWhxLn+zXJEY5H2v8paNSsiCPI2y/TfbCQKgTy/FeBTQ
// SIG // Y5Y7/tRhwzsNdu62c+WUkz6AD29kgNL+cg4HKVDH8YJT
// SIG // 8qenJzz6EKU7Q/ThsfA8Jtj/qNUz8QSMuiNE/UWrrpaI
// SIG // FQrysH5X3i03CgL50htawo3q0l5lNQzVzrAA/27K0o4G
// SIG // 1+ZgGw+100TBf72sAFhEhXJ/wY44s8XlmW9NGmEpZCQN
// SIG // q1bRZTDOPNWlVl3QG1zz+Uc1Ilk5YMh3/xu5QsR2FhiG
// SIG // bgdd092iOmPJhIJ/6LuNGohSaPK9PotD+RnTZ3lrcYkd
// SIG // AjClH5KPubP+93MHtVn6fASl2tu9HInFUGrBX+bEVe6R
// SIG // Zvle3zUV8Aru2p0zpoGu+szu/9rfszpYm76YU/kOmXfg
// SIG // dqmLEp+MQWmPmMx6Z8nC1uXLycoT8QQnG9aEWH4UcwgA
// SIG // 29rrSNhLRgo3Nj9oouC8keEDG/5/HDsHi/SKlUyis81Z
// SIG // Ps2ScVd766eC8rkF8NDt9JWugXB3TQAAAfVAvN87NxvX
// SIG // fgJSH2SzPe7TFDSlo2waSIqxcei0wxV1bWUHe4asy2Ac
// SIG // o24x9LowggdxMIIFWaADAgECAhMzAAAAFcXna54Cm0mZ
// SIG // AAAAAAAVMA0GCSqGSIb3DQEBCwUAMIGIMQswCQYDVQQG
// SIG // EwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UE
// SIG // BxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENv
// SIG // cnBvcmF0aW9uMTIwMAYDVQQDEylNaWNyb3NvZnQgUm9v
// SIG // dCBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkgMjAxMDAeFw0y
// SIG // MTA5MzAxODIyMjVaFw0zMDA5MzAxODMyMjVaMHwxCzAJ
// SIG // BgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAw
// SIG // DgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3Nv
// SIG // ZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jvc29m
// SIG // dCBUaW1lLVN0YW1wIFBDQSAyMDEwMIICIjANBgkqhkiG
// SIG // 9w0BAQEFAAOCAg8AMIICCgKCAgEA5OGmTOe0ciELeaLL
// SIG // 1yR5vQ7VgtP97pwHB9KpbE51yMo1V/YBf2xK4OK9uT4X
// SIG // YDP/XE/HZveVU3Fa4n5KWv64NmeFRiMMtY0Tz3cywBAY
// SIG // 6GB9alKDRLemjkZrBxTzxXb1hlDcwUTIcVxRMTegCjhu
// SIG // je3XD9gmU3w5YQJ6xKr9cmmvHaus9ja+NSZk2pg7uhp7
// SIG // M62AW36MEBydUv626GIl3GoPz130/o5Tz9bshVZN7928
// SIG // jaTjkY+yOSxRnOlwaQ3KNi1wjjHINSi947SHJMPgyY9+
// SIG // tVSP3PoFVZhtaDuaRr3tpK56KTesy+uDRedGbsoy1cCG
// SIG // MFxPLOJiss254o2I5JasAUq7vnGpF1tnYN74kpEeHT39
// SIG // IM9zfUGaRnXNxF803RKJ1v2lIH1+/NmeRd+2ci/bfV+A
// SIG // utuqfjbsNkz2K26oElHovwUDo9Fzpk03dJQcNIIP8BDy
// SIG // t0cY7afomXw/TNuvXsLz1dhzPUNOwTM5TI4CvEJoLhDq
// SIG // hFFG4tG9ahhaYQFzymeiXtcodgLiMxhy16cg8ML6EgrX
// SIG // Y28MyTZki1ugpoMhXV8wdJGUlNi5UPkLiWHzNgY1GIRH
// SIG // 29wb0f2y1BzFa/ZcUlFdEtsluq9QBXpsxREdcu+N+VLE
// SIG // hReTwDwV2xo3xwgVGD94q0W29R6HXtqPnhZyacaue7e3
// SIG // PmriLq0CAwEAAaOCAd0wggHZMBIGCSsGAQQBgjcVAQQF
// SIG // AgMBAAEwIwYJKwYBBAGCNxUCBBYEFCqnUv5kxJq+gpE8
// SIG // RjUpzxD/LwTuMB0GA1UdDgQWBBSfpxVdAF5iXYP05dJl
// SIG // pxtTNRnpcjBcBgNVHSAEVTBTMFEGDCsGAQQBgjdMg30B
// SIG // ATBBMD8GCCsGAQUFBwIBFjNodHRwOi8vd3d3Lm1pY3Jv
// SIG // c29mdC5jb20vcGtpb3BzL0RvY3MvUmVwb3NpdG9yeS5o
// SIG // dG0wEwYDVR0lBAwwCgYIKwYBBQUHAwgwGQYJKwYBBAGC
// SIG // NxQCBAweCgBTAHUAYgBDAEEwCwYDVR0PBAQDAgGGMA8G
// SIG // A1UdEwEB/wQFMAMBAf8wHwYDVR0jBBgwFoAU1fZWy4/o
// SIG // olxiaNE9lJBb186aGMQwVgYDVR0fBE8wTTBLoEmgR4ZF
// SIG // aHR0cDovL2NybC5taWNyb3NvZnQuY29tL3BraS9jcmwv
// SIG // cHJvZHVjdHMvTWljUm9vQ2VyQXV0XzIwMTAtMDYtMjMu
// SIG // Y3JsMFoGCCsGAQUFBwEBBE4wTDBKBggrBgEFBQcwAoY+
// SIG // aHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3BraS9jZXJ0
// SIG // cy9NaWNSb29DZXJBdXRfMjAxMC0wNi0yMy5jcnQwDQYJ
// SIG // KoZIhvcNAQELBQADggIBAJ1VffwqreEsH2cBMSRb4Z5y
// SIG // S/ypb+pcFLY+TkdkeLEGk5c9MTO1OdfCcTY/2mRsfNB1
// SIG // OW27DzHkwo/7bNGhlBgi7ulmZzpTTd2YurYeeNg2Lpyp
// SIG // glYAA7AFvonoaeC6Ce5732pvvinLbtg/SHUB2RjebYIM
// SIG // 9W0jVOR4U3UkV7ndn/OOPcbzaN9l9qRWqveVtihVJ9Ak
// SIG // vUCgvxm2EhIRXT0n4ECWOKz3+SmJw7wXsFSFQrP8DJ6L
// SIG // GYnn8AtqgcKBGUIZUnWKNsIdw2FzLixre24/LAl4FOmR
// SIG // sqlb30mjdAy87JGA0j3mSj5mO0+7hvoyGtmW9I/2kQH2
// SIG // zsZ0/fZMcm8Qq3UwxTSwethQ/gpY3UA8x1RtnWN0SCyx
// SIG // TkctwRQEcb9k+SS+c23Kjgm9swFXSVRk2XPXfx5bRAGO
// SIG // WhmRaw2fpCjcZxkoJLo4S5pu+yFUa2pFEUep8beuyOiJ
// SIG // Xk+d0tBMdrVXVAmxaQFEfnyhYWxz/gq77EFmPWn9y8FB
// SIG // SX5+k77L+DvktxW/tM4+pTFRhLy/AsGConsXHRWJjXD+
// SIG // 57XQKBqJC4822rpM+Zv/Cuk0+CQ1ZyvgDbjmjJnW4SLq
// SIG // 8CdCPSWU5nR0W2rRnj7tfqAxM328y+l7vzhwRNGQ8cir
// SIG // Ooo6CGJ/2XBjU02N7oJtpQUQwXEGahC0HVUzWLOhcGby
// SIG // oYIDTTCCAjUCAQEwgfmhgdGkgc4wgcsxCzAJBgNVBAYT
// SIG // AlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQH
// SIG // EwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29y
// SIG // cG9yYXRpb24xJTAjBgNVBAsTHE1pY3Jvc29mdCBBbWVy
// SIG // aWNhIE9wZXJhdGlvbnMxJzAlBgNVBAsTHm5TaGllbGQg
// SIG // VFNTIEVTTjpBOTM1LTAzRTAtRDk0NzElMCMGA1UEAxMc
// SIG // TWljcm9zb2Z0IFRpbWUtU3RhbXAgU2VydmljZaIjCgEB
// SIG // MAcGBSsOAwIaAxUAIx86rYT8DtBg3JAzAOseeJSIjCqg
// SIG // gYMwgYCkfjB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMK
// SIG // V2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwG
// SIG // A1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYD
// SIG // VQQDEx1NaWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAx
// SIG // MDANBgkqhkiG9w0BAQsFAAIFAO3TBHIwIhgPMjAyNjA2
// SIG // MDkyMTMwMjZaGA8yMDI2MDYxMDIxMzAyNlowdDA6Bgor
// SIG // BgEEAYRZCgQBMSwwKjAKAgUA7dMEcgIBADAHAgEAAgIM
// SIG // 6DAHAgEAAgIS+TAKAgUA7dRV8gIBADA2BgorBgEEAYRZ
// SIG // CgQCMSgwJjAMBgorBgEEAYRZCgMCoAowCAIBAAIDB6Eg
// SIG // oQowCAIBAAIDAYagMA0GCSqGSIb3DQEBCwUAA4IBAQAs
// SIG // hox9NOyQV62CLGACQBIznVmHT9pFUf58abB5SgxjwzPM
// SIG // z9zZJBCnnAJwSf6XDFagmxIXZ4PkQf24s9VJZGJ7mzkH
// SIG // Bv/vhtXKDyOForD4mFe7JlOGSVHpe9BVYAA1CkZ+mEp6
// SIG // QH8FoGLrD1wT/0aWb/Q5PuiM9lWCVFrcuyrYK8r8UNsn
// SIG // 95sLWP81/ASruF6ZhznDuIgwJB5baIomEiK0Ab9GYeji
// SIG // Q6wpuEAMJ+3Kvxd4H3psCRiYRSXw/G3RX8nESs6tJMkF
// SIG // 3PhZXQrIVA29+hGNKaCe7yXhIgSBQ6arTJHVsx4tH2PK
// SIG // 2Ez3uC92QQqahEiVgZFlan98mLc9f08IMYIEDTCCBAkC
// SIG // AQEwgZMwfDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldh
// SIG // c2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNV
// SIG // BAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UE
// SIG // AxMdTWljcm9zb2Z0IFRpbWUtU3RhbXAgUENBIDIwMTAC
// SIG // EzMAAAIn1cCDw7EuVy0AAQAAAicwDQYJYIZIAWUDBAIB
// SIG // BQCgggFKMBoGCSqGSIb3DQEJAzENBgsqhkiG9w0BCRAB
// SIG // BDAvBgkqhkiG9w0BCQQxIgQgC7jS9b7k8TVJ6U45hNGJ
// SIG // XB97BAxeV3rafOht4R8MuvAwgfoGCyqGSIb3DQEJEAIv
// SIG // MYHqMIHnMIHkMIG9BCDl5wEaNaFSHDiySg6pRNGnav42
// SIG // fU13ZZ11kXFxk4QRcjCBmDCBgKR+MHwxCzAJBgNVBAYT
// SIG // AlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQH
// SIG // EwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29y
// SIG // cG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1l
// SIG // LVN0YW1wIFBDQSAyMDEwAhMzAAACJ9XAg8OxLlctAAEA
// SIG // AAInMCIEINC278M1dshe1nQn0ZLJXG0Zdq7UHIxiOH3v
// SIG // epd37noEMA0GCSqGSIb3DQEBCwUABIICANlk1Qpw4KO8
// SIG // DJPKNSHybU6hmwpXXtaMg6gVatvb/UOklH7YhNWAof+x
// SIG // vJ4NAWrdKYo6hUzw50HIxyAr5IJfjDg/N504fR7Oa7ee
// SIG // IjpuYUTRn+mUvunfRE5MdKwwXnpm5Y1RksCN0dYCJzwh
// SIG // BXZUy57igpFj9qbiA//VBYA3BoBBXJKuBy4yaElTYmSI
// SIG // NRa2Te2Lxry0CC0mJ6aCa3je2gwM9mZVL3tPoLI3A+8o
// SIG // KWLoyJnH57zAIb7YpePSNcj9TKdx53p3NJC4XBrjfdPh
// SIG // EgWCLmmDfO5pY5O+TBVsjPM2PDf1gWqpq8lf0Zd5br3K
// SIG // DvHlOqjD112gagodPjpDgoWK71ZQpPXMgWz3Bi7xfgSU
// SIG // U/Rv5z8ysplRBKDVE2CpubceBSs4hPYByUM6nb7cMBXq
// SIG // SXyyGMf5qkMhJ1kFw4l2imaL/WS++1lPexqi1uhHnPCz
// SIG // mamWySVTpA1f9I2WKs3fgQ9tu+0aitZkxitoyeVrdaZ5
// SIG // ME7sepl0FWc1xacL46FWRpGDVIIRvfspczDmtOefZL4+
// SIG // tK82G+qV+/Rr08geN22ZBqmnR4nf4sfoSjxziTN55X4Q
// SIG // 8m5tOwlHbm6xakV/oj7tu9EsbahjjusYuM2w2VTSSalC
// SIG // 80+R2kV+wBY8JFAdEL0/LaPquUsUYKxrn2SisDkgu1aX
// SIG // LIGunt0TjG7b
// SIG // End signature block
