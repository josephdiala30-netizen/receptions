# Migrate all Executive IT data to joseph_diala account
$backupPath = "D:\New folder\htdocs\Scheduler\scheduler-backup-2026-06-04.json"
$outputPath = "D:\New folder\htdocs\Scheduler\scheduler-backup-joseph-only.json"

$json = Get-Content $backupPath -Raw -Encoding UTF8 | ConvertFrom-Json

# Target user
$target = "joseph_diala"

# IT data types to merge
$itTypes = @(
  "it_services", "it_maintenance", "it_inventory", "it_task",
  "it_planner", "it_accomplishments", "it_tickets", "it_systems", "it_assets"
)

# Non-IT data types to keep for joseph_diala only
$otherTypes = @("tasks", "plans", "milestones", "dailylog", "trips")

# Get all usernames from users array
$usernames = $json.users | ForEach-Object { $_.username }

Write-Output "Users found: $($usernames -join ', ')"
Write-Output "Migrating all IT data to $target..."

# Merge IT data from all users into joseph_diala
foreach ($type in $itTypes) {
  $merged = @()
  foreach ($u in $usernames) {
    $key = "${type}_${u}"
    if ($json.$key -and $json.$key.Count -gt 0) {
      Write-Output "  Adding $($json.$key.Count) records from $key"
      $merged += $json.$key
    }
  }
  # Deduplicate by ID
  $seen = @{}
  $deduped = $merged | Where-Object {
    if ($_.id -and $seen.ContainsKey($_.id)) { $false }
    else { if ($_.id) { $seen[$_.id] = $true }; $true }
  }
  $targetKey = "${type}_${target}"
  $json.$targetKey = $deduped
  Write-Output "  → $targetKey now has $($deduped.Count) records"
}

# Also merge dailylog data from IT users into joseph_diala
$itUsers = $usernames | Where-Object { $_ -ne $target -and $_ -match "it_" }
foreach ($type in $otherTypes) {
  $merged = @()
  # Include target's own data first
  $targetKey = "${type}_${target}"
  if ($json.$targetKey) { $merged += $json.$targetKey }
  # Add data from IT users
  foreach ($u in $itUsers) {
    $key = "${type}_${u}"
    if ($json.$key -and $json.$key.Count -gt 0) {
      Write-Output "  Adding $($json.$key.Count) records from $key"
      $merged += $json.$key
    }
  }
  $seen = @{}
  $deduped = $merged | Where-Object {
    if ($_.id -and $seen.ContainsKey($_.id)) { $false }
    else { if ($_.id) { $seen[$_.id] = $true }; $true }
  }
  $json.$targetKey = $deduped
  Write-Output "  → $targetKey now has $($deduped.Count) records"
}

# Update users array - keep only joseph_diala and admin users for portal access
$keepUsers = @($target, "superadmin", "admin", "executive", "task_admin")
$json.users = $json.users | Where-Object { $_.username -in $keepUsers -or $_.username -eq $target }

# Ensure joseph_diala profile is correct
$jdProfile = $json.users | Where-Object { $_.username -eq $target }
if ($jdProfile) {
  $jdProfile.email = "joseph@kalyx.com"
  $jdProfile.role = "executive_it"
}

# Remove other users' IT data keys
$keysToRemove = $json.PSObject.Properties | Where-Object {
  $_.Name -match "^it_" -and $_.Name -notmatch "_${target}$"
} | ForEach-Object { $_.Name }

foreach ($key in $keysToRemove) {
  $json.PSObject.Properties.Remove($key)
}

# Also remove other users' non-IT data
$keysToRemove2 = $json.PSObject.Properties | Where-Object {
  ($_.Name -match "^(tasks|plans|milestones|dailylog|trips)_") -and $_.Name -notmatch "_${target}$"
} | ForEach-Object { $_.Name }

foreach ($key in $keysToRemove2) {
  $json.PSObject.Properties.Remove($key)
}

# Update exportedAt
$json.exportedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")

# Save
$json | ConvertTo-Json -Depth 10 | Set-Content $outputPath -Encoding UTF8
Write-Output ""
Write-Output "Done! Saved to: $outputPath"
