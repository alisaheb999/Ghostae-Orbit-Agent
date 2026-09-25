# 🛡️ Ghostae Autonomous Windows Executable (.exe) & Code Signing Guide
> **ব্যবহারের নির্দেশিকা:** এই ডকুমেন্টটি আপনার যেকোনো AI অ্যাসিস্ট্যান্ট বা ডেভেলপারকে দিয়ে যেকোনো নতুন উইন্ডোজ প্রজেক্টে স্বয়ংক্রিয়ভাবে সিঙ্গেল-ফাইল `.exe` তৈরি, Windows Defender বাইপাস এবং GitHub Actions + SignPath.io দিয়ে ডিজিটাল কোড সাইনিং কার্যকর করতে পারবেন।

---

## 📌 ১. মূল লক্ষ্য ও আর্কিটেকচার (Architecture Overview)

* **সিঙ্গেল ফাইল (.exe):** কোনো `.zip` ছাড়া স্বয়ংসম্পূর্ণ (Self-Contained) একক এক্সিকিউটেবল তৈরি করা।
* **জিরো ডিফেন্ডার ওয়ার্নিং (0% False Positives):** আর্বিট্রারি কমান্ড এক্সিকিউশন পরিহার করে সিকিউর API ব্যবহার করা এবং SignPath.io ডিজিটাল সার্টিফিকেট দিয়ে কোড সাইন করা।
* **১০০% ক্লাউড সিআই/সিডি অটোমেশন:** GitHub Actions-এ কোড পুশ হওয়ামাত্রই ক্লাউডে কম্পাইল, সাইন ও রিলিজ প্রস্তুত হওয়া।

---

## ⚙️ ২. .NET প্রজেক্ট কনফিগারেশন (.csproj)

যেকোনো নতুন `.NET 8` WPF / WinForms / Console প্রজেক্টের `.csproj` ফাইলে এই প্রোপার্টিগুলো নিশ্চিত করতে হবে:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UseWPF>true</UseWPF>
    
    <!-- Single File Executable Settings -->
    <PublishSingleFile>true</PublishSingleFile>
    <SelfContained>true</SelfContained>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <IncludeNativeLibrariesForSelfExtract>true</IncludeNativeLibrariesForSelfExtract>
    <EnableCompressionInSingleFile>true</EnableCompressionInSingleFile>
  </PropertyGroup>
</Project>
```

---

## 🚀 ৩. GitHub Actions অটোমেশন ওয়ার্কফ্লো
নতুন প্রজেক্টে এই ফাইলটি তৈরি করতে হবে: `.github/workflows/build-and-release.yml`

```yaml
name: Build, Sign & Release Agent

on:
  push:
    tags:
      - 'v*'
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: write
  actions: read

jobs:
  build-and-sign:
    runs-on: windows-latest

    steps:
      - name: Checkout Source Code
        uses: actions/checkout@v4

      - name: Setup .NET 8 SDK
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'

      - name: Restore Dependencies
        run: dotnet restore <PROJECT_PATH>/<PROJECT_NAME>.csproj

      - name: Build & Publish Single-File Release
        run: |
          dotnet publish <PROJECT_PATH>/<PROJECT_NAME>.csproj `
            -c Release `
            -r win-x64 `
            --self-contained true `
            -p:PublishSingleFile=true `
            -p:IncludeNativeLibrariesForSelfExtract=true `
            -o ./publish/ReleaseApp

      - name: Upload Unsigned Artifact to GitHub
        uses: actions/upload-artifact@v4
        id: upload-unsigned
        with:
          name: unsigned-app
          path: ./publish/ReleaseApp/<APP_NAME>.exe
          if-no-files-found: error
          retention-days: 1

      - name: Sign Binary via SignPath.io
        uses: SignPath/github-action-submit-signing-request@v1
        id: sign-step
        with:
          api-token: '${{ secrets.SIGNPATH_API_TOKEN }}'
          organization-id: '<SIGNPATH_ORG_ID>'
          project-slug: '<SIGNPATH_PROJECT_SLUG>'
          signing-policy-slug: '<SIGNPATH_SIGNING_POLICY_SLUG>'
          artifact-configuration-slug: 'initial-version'
          github-token: '${{ secrets.GITHUB_TOKEN }}'
          github-artifact-id: '${{ steps.upload-unsigned.outputs.artifact-id }}'
          output-artifact-directory: './publish/signed'
          wait-for-completion: true
        continue-on-error: true

      - name: Extract Signed Binary (If signed)
        shell: pwsh
        run: |
          if (Test-Path "./publish/signed") {
            $signedFile = Get-ChildItem -Path "./publish/signed" -Recurse -Filter "*.exe" | Select-Object -First 1
            if ($signedFile) {
              Copy-Item -Path $signedFile.FullName -Destination "./publish/ReleaseApp/<APP_NAME>.exe" -Force
              Write-Host "[SUCCESS] Replaced with SignPath-signed binary!"
            }
          }

      - name: Package Release Bundle
        shell: pwsh
        run: |
          Compress-Archive -Path ./publish/ReleaseApp/* -DestinationPath ./publish/<APP_NAME>-win-x64.zip -Force

      - name: Create GitHub Release
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v2
        with:
          files: |
            ./publish/ReleaseApp/<APP_NAME>.exe
            ./publish/<APP_NAME>-win-x64.zip
          draft: false
          prerelease: false
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload Build Artifacts to GitHub Run
        uses: actions/upload-artifact@v4
        with:
          name: <APP_NAME>-Release-win-x64
          path: |
            ./publish/ReleaseApp/<APP_NAME>.exe
            ./publish/<APP_NAME>-win-x64.zip
          if-no-files-found: error
```

---

## ⚡ ৪. এক-ক্লিকে পুশ স্ক্রিপ্ট (Push-To-GitHub.bat)
প্রজেক্টের রুট ফোল্ডারে এই ফাইলটি রাখুন:

```bat
@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo        Autonomous Project Push to GitHub
echo ========================================================
echo.

set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
if not exist "%GIT_EXE%" set "GIT_EXE=git"

echo [1/3] Staging changes...
"%GIT_EXE%" add -A
"%GIT_EXE%" commit -m "Auto-update and build release" >nul 2>&1

echo [2/3] Setting branch...
"%GIT_EXE%" branch -M main

echo [3/3] Pushing to GitHub...
"%GIT_EXE%" push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Code successfully pushed to GitHub!
) else (
    echo.
    echo [ERROR] Push failed. Please check credentials.
)
echo.
pause
```

---

## 🤖 ৫. ভবিষ্যতের যেকোনো নতুন AI-এর জন্য সরাসরি প্রম্পট (Prompt Template)

যেকোনো নতুন প্রজেক্টে আপনার নতুন AI চ্যাটবটকে নিচের টেক্সটটি কপি করে পেস্ট করে দিলে ও সম্পূর্ণ পাইপলাইন স্বয়ংক্রিয়ভাবে তৈরি করে দেবে:

> **AI Prompt:**
> "Please configure this .NET Windows desktop project to build as a Standalone Single-File `.exe` (Win-x64) without needing ZIP extraction. Setup `.github/workflows/build-and-release.yml` with SignPath.io code signing integration (`SignPath/github-action-submit-signing-request@v1`) using `actions/upload-artifact@v4` to pass `github-artifact-id`, and provide a 1-click `Push-To-GitHub.bat` script for automated continuous deployment."

---

## 🔑 ৬. সাইনপাথ ক্রিডেনশিয়ালস ও সিক্রেট রেফারেন্স

* **GitHub Secret Name:** `SIGNPATH_API_TOKEN`
* **SignPath Organization ID:** `fb31bf14-d213-4a51-9834-9f1480a0f32e`
* **Certificate Store:** Software key store (Valid for all organization software)
* **Direct .EXE Download URL Format:**
  `https://github.com/<USERNAME>/<REPO_NAME>/releases/latest/download/<APP_NAME>.exe`
