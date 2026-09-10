$ErrorActionPreference = 'SilentlyContinue'

try {
    $repoRoot = 'D:\Kodlama\oda-proje-yonetim-sistemi-repo'
    $stdin = [Console]::In.ReadToEnd()
    $hookInput = $stdin | ConvertFrom-Json

    $filePath = $hookInput.tool_input.file_path
    if (-not $filePath) { $filePath = $hookInput.tool_response.filePath }

    $filePaths = @()
    if ($hookInput.tool_input.edits) {
        # MultiEdit-style single-file target still uses tool_input.file_path above;
        # this branch is a safety net if a future tool reports multiple paths.
        $filePaths += $filePath
    } elseif ($filePath) {
        $filePaths += $filePath
    }

    if ($filePaths.Count -gt 0) {
        Push-Location $repoRoot

        $added = @()
        foreach ($f in $filePaths) {
            if ($f -and (Test-Path -LiteralPath $f)) {
                git add -- "$f" *> $null
                $added += (Split-Path -Leaf $f)
            }
        }

        $staged = git diff --cached --name-only
        if ($staged) {
            $summary = ($added | Select-Object -Unique) -join ', '
            if (-not $summary) { $summary = 'files' }
            $msg = "auto: update $summary"
            git commit -m "$msg" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>" --quiet *> $null
        }

        Pop-Location
    }
} catch {
    # Never block or fail the tool call on auto-commit errors.
}

exit 0
