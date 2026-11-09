# Writes a "What's Changed" list of the commits since the previous GitHub release.
param(
    [Parameter(Mandatory)][string]$Repository,
    [Parameter(Mandatory)][string]$Sha,
    [Parameter(Mandatory)][string]$Tag,
    [Parameter(Mandatory)][string]$Output,
    [string]$PreviousTag
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.Encoding]::UTF8

if (-not $PreviousTag) {
    $PreviousTag = gh release list --repo $Repository --limit 1 --exclude-drafts --json tagName --jq ".[0].tagName"
}
$commits = if ($PreviousTag) {
    (gh api "repos/$Repository/compare/$PreviousTag...$Sha" | ConvertFrom-Json).commits
} else {
    $history = gh api "repos/$Repository/commits?sha=$Sha&per_page=100" | ConvertFrom-Json
    [array]::Reverse($history)
    $history
}

function Get-Mention([string]$Name, [string]$Email, [string]$Login) {
    if ($Login) { return "@$Login" }
    if ($Email -match '^(?:\d+\+)?([^@]+)@users\.noreply\.github\.com$') { return "@$($Matches[1])" }
    return $Name
}

$lines = foreach ($commit in $commits) {
    if ($commit.parents.Count -gt 1) { continue }
    $message = $commit.commit.message
    $subject = ($message -split "`r?`n")[0].Trim()
    $author = Get-Mention $commit.commit.author.name $commit.commit.author.email $commit.author.login
    $coAuthors = [regex]::Matches($message, '(?m)^Co-authored-by:\s*(.+?)\s*<([^>]+)>') |
        ForEach-Object { Get-Mention $_.Groups[1].Value $_.Groups[2].Value $null } |
        Where-Object { $_ -ne $author } |
        Select-Object -Unique
    $by = if ($coAuthors) { "$author with $($coAuthors -join ', ')" } else { $author }
    "* $subject by $by in $($commit.html_url)"
}

$changelog = if ($PreviousTag) {
    "https://github.com/$Repository/compare/$PreviousTag...$Tag"
} else {
    "https://github.com/$Repository/commits/$Tag"
}
$body = @("## What's Changed") + ($(if ($lines) { $lines } else { "* No new commits." })) + @("", "**Full Changelog**: $changelog")
Set-Content -Path $Output -Value ($body -join "`n") -Encoding utf8NoBOM