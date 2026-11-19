# Hakoniwa: one Windows toast (title + one line). Called by the mod with -Title and -Body as separate arguments; nothing is evaluated.
# Usage: powershell -NoProfile -File notify.ps1 -Title "Claude needs your answer" -Body "approve Bash: npm test"
param(
  [Parameter(Mandatory = $true)][string]$Title,
  [string]$Body = ""
)
$ErrorActionPreference = "Stop"
try {
  [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
  $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
  $texts = $xml.GetElementsByTagName("text")
  $texts.Item(0).AppendChild($xml.CreateTextNode($Title)) | Out-Null
  $texts.Item(1).AppendChild($xml.CreateTextNode($Body)) | Out-Null
  # A toast needs an app the Start menu knows: Windows PowerShell's own id is there on every Windows 10 / 11.
  $app = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe"
  $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
  [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show($toast)
  exit 0
} catch {
  exit 1
}
