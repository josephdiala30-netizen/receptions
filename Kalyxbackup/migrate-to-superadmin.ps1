# Migrate backup data to superadmin account
$backupPath = "D:\New folder\htdocs\Scheduler\scheduler-backup-2026-06-04.json"
$outputPath = "D:\New folder\htdocs\Scheduler\scheduler-backup-migrated.json"

$json = Get-Content $backupPath -Raw -Encoding UTF8 | ConvertFrom-Json

$target = "superadmin"

# IT data types to merge
$itTypes = @(
  "it_services", "it_maintenance", "it_inventory", "it_task",
  "it_planner", "it_accomplishments", "it_tickets", "it_systems", "it_assets"
)

$otherTypes = @("tasks", "plans", "milestones", "dailylog", "trips")

# Get all usernames from users array
$usernames = $json.users | ForEach-Object { $_.username }

Write-Output "Users found: $($usernames -join ', ')"
Write-Output "Migrating all data to $target..."

# Merge IT data from all users into superadmin
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
  $json."${type}_${target}" = $deduped
  Write-Output "  → ${type}_${target} now has $($deduped.Count) records"
}

# Merge other data types into superadmin
foreach ($type in $otherTypes) {
  $merged = @()
  foreach ($u in $usernames) {
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
  $json."${type}_${target}" = $deduped
  Write-Output "  → ${type}_${target} now has $($deduped.Count) records"
}

# Remove other users' data keys
$keysToRemove = $json.PSObject.Properties | Where-Object {
  $key = $_.Name
  if ($key -eq "exportedAt" -or $key -eq "users" -or $key -like "*_${target}") { $false }
  else { $true }
} | ForEach-Object { $_.Name }

foreach ($key in $keysToRemove) {
  $json.PSObject.Properties.Remove($key)
}

# Update users array - keep only superadmin
$json.users = $json.users | Where-Object { $_.username -eq $target }
$json.users[0].email = "superadmin@kalyx.com"
$json.users[0].role = "admin"

# Update exportedAt
$json.exportedAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")

# Save
$json | ConvertTo-Json -Depth 10 | Set-Content $outputPath -Encoding UTF8
Write-Output ""
Write-Output "Done! Saved to: $outputPath"
