param(
  [string]$InputCsvPath = ".\entries\deviantart-wixmp-alt-map.csv",
  [string]$EntriesDir = ".\entries",
  [string]$OutputDir = ".\output",
  [int]$TimeoutSec = 45
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

New-Item -ItemType Directory -Force -Path $EntriesDir | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

if (-not (Test-Path -LiteralPath $InputCsvPath)) {
  throw "Input CSV not found: $InputCsvPath"
}

$downloadLogPath = Join-Path $EntriesDir "deviantart-download-log.csv"
$failedPath = Join-Path $EntriesDir "deviantart-failed.csv"
$resolvedPath = Join-Path $EntriesDir "deviantart-resolved-map.csv"

$rows = Import-Csv -LiteralPath $InputCsvPath

# Keep one row per URL to avoid duplicate downloads.
$rowsByUrl = @{}
foreach ($row in $rows) {
  if ([string]::IsNullOrWhiteSpace($row.url)) { continue }
  $url = $row.url.Trim()
  if (-not $rowsByUrl.ContainsKey($url)) {
    $rowsByUrl[$url] = $row
    continue
  }

  # Prefer row with richer alt when duplicates exist.
  $prevAlt = [string]($rowsByUrl[$url].alt)
  $newAlt = [string]($row.alt)
  if ($newAlt.Length -gt $prevAlt.Length) {
    $rowsByUrl[$url] = $row
  }
}

$results = New-Object System.Collections.Generic.List[object]
$failed = New-Object System.Collections.Generic.List[object]
$resolved = New-Object System.Collections.Generic.List[object]
$nameCount = @{}

function Get-SafeName([string]$value) {
  if ([string]::IsNullOrWhiteSpace($value)) { return "" }
  $safe = $value.ToLowerInvariant()
  $safe = [regex]::Replace($safe, " by .*", "")
  $safe = [regex]::Replace($safe, "[^a-z0-9]+", "-")
  $safe = $safe.Trim("-")
  $safe = [regex]::Replace($safe, "-+", "-")
  return $safe
}

$items = $rowsByUrl.GetEnumerator() | Sort-Object Name
$index = 0

foreach ($item in $items) {
  $index++
  $url = $item.Key
  $row = $item.Value

  try {
    $uri = [System.Uri]$url
    $sourceFileName = [System.IO.Path]::GetFileName($uri.AbsolutePath)

    $preferredBaseName = Get-SafeName([string]$row.name)
    if ([string]::IsNullOrWhiteSpace($preferredBaseName)) {
      $preferredBaseName = Get-SafeName([string]$row.alt)
    }
    if ([string]::IsNullOrWhiteSpace($preferredBaseName)) {
      $preferredBaseName = [System.IO.Path]::GetFileNameWithoutExtension($sourceFileName)
    }

    if ($nameCount.ContainsKey($preferredBaseName)) {
      $nameCount[$preferredBaseName]++
      $preferredBaseName = "$preferredBaseName-$($nameCount[$preferredBaseName])"
    } else {
      $nameCount[$preferredBaseName] = 0
    }

    $targetFileName = "$preferredBaseName.gif"
    $targetPath = Join-Path $OutputDir $targetFileName

    if (Test-Path -LiteralPath $targetPath) {
      $results.Add([pscustomobject]@{
          index = $index
          status = "skipped"
          file = $targetFileName
          url = $url
          error = "already_exists"
      }) | Out-Null

      $resolved.Add([pscustomobject]@{
          index = $index
          alt = $row.alt
          name = $row.name
          url = $url
          file = $targetFileName
          status = "skipped"
      }) | Out-Null

      continue
    }

    Invoke-WebRequest -Uri $url -OutFile $targetPath -Headers @{
      "User-Agent" = "Mozilla/5.0"
      "Referer" = "https://www.deviantart.com/"
    } -TimeoutSec $TimeoutSec

    $results.Add([pscustomobject]@{
        index = $index
        status = "ok"
        file = $targetFileName
        url = $url
        error = ""
    }) | Out-Null

    $resolved.Add([pscustomobject]@{
        index = $index
        alt = $row.alt
        name = $row.name
        url = $url
        file = $targetFileName
        status = "ok"
    }) | Out-Null
  }
  catch {
    $message = $_.Exception.Message

    $results.Add([pscustomobject]@{
        index = $index
        status = "failed"
        file = ""
        url = $url
        error = $message
    }) | Out-Null

    $failed.Add([pscustomobject]@{
        index = $index
        url = $url
        error = $message
    }) | Out-Null
  }

  if ($index % 25 -eq 0) {
    Write-Host "progress $index / $($items.Count)"
  }
}

$results | Export-Csv -LiteralPath $downloadLogPath -NoTypeInformation -Encoding utf8
$resolved | Export-Csv -LiteralPath $resolvedPath -NoTypeInformation -Encoding utf8
$failed | Export-Csv -LiteralPath $failedPath -NoTypeInformation -Encoding utf8

$ok = ($results | Where-Object { $_.status -eq "ok" }).Count
$skipped = ($results | Where-Object { $_.status -eq "skipped" }).Count
$ko = ($results | Where-Object { $_.status -eq "failed" }).Count

Write-Host "DONE total=$($items.Count) ok=$ok skipped=$skipped failed=$ko"
Write-Host "INPUT=$InputCsvPath"
Write-Host "OUTPUT_DIR=$OutputDir"
Write-Host "LOG=$downloadLogPath"
Write-Host "RESOLVED_MAP=$resolvedPath"
Write-Host "FAILED=$failedPath"
