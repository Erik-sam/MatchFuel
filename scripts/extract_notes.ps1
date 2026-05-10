# =============================================
# extract_notes.ps1
# Pulls speaker notes out of PROJECT_PRESENTATION.pptx,
# writes them to SPEAKER_NOTES.md, then clears the notes
# from every slide and re-saves the .pptx.
# =============================================

$ErrorActionPreference = "Stop"

$pptxPath = "C:\magdeburg\uni\Software Project\docs\PROJECT_PRESENTATION.pptx"
$mdPath   = "C:\magdeburg\uni\Software Project\docs\SPEAKER_NOTES.md"

$ppSaveAsOpenXMLPresentation = 24
$msoTrue  = -1

Write-Host "Opening PowerPoint..."
$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = $msoTrue
$pres = $ppt.Presentations.Open($pptxPath, $false, $false, $false)

Write-Host "Slide count: $($pres.Slides.Count)"

# ---------- pass 1: extract title + notes ----------
function Get-SlideTitle($slide) {
  # Look for the textbox with the largest font size in the upper part of the slide
  $bestTitle = $null
  $bestSize  = 0
  foreach ($shape in $slide.Shapes) {
    if ($shape.HasTextFrame -ne $msoTrue) { continue }
    if (-not $shape.TextFrame.HasText)    { continue }
    $tr = $shape.TextFrame.TextRange
    $text = $tr.Text
    if (-not $text -or $text.Trim().Length -eq 0) { continue }
    if ($shape.Top -gt 200) { continue }   # skip footer/page number
    try { $sz = [double]$tr.Font.Size } catch { $sz = 0 }
    if ($sz -gt $bestSize) {
      $bestSize  = $sz
      $bestTitle = $text.Trim()
    }
  }
  return $bestTitle
}

function Get-SlideNotes($slide) {
  try {
    $np = $slide.NotesPage
    if (-not $np) { return "" }
    foreach ($shp in $np.Shapes) {
      if ($shp.HasTextFrame -ne $msoTrue) { continue }
      if (-not $shp.TextFrame.HasText)    { continue }
      $t = $shp.TextFrame.TextRange.Text
      if ($t -and $t.Trim().Length -gt 20) { return $t.Trim() }
    }
  } catch {}
  return ""
}

$slideData = @()
$idx = 1
foreach ($slide in $pres.Slides) {
  $title = Get-SlideTitle $slide
  $notes = Get-SlideNotes $slide
  $slideData += [pscustomobject]@{
    Index = $idx
    Title = if ($title) { $title } else { "(untitled)" }
    Notes = $notes
  }
  Write-Host ("  slide {0,2}: title=`"{1}`" notes={2} chars" -f $idx, $title, $notes.Length)
  $idx++
}

# ---------- pass 2: clear notes from every slide ----------
Write-Host "Clearing notes from all slides..."
foreach ($slide in $pres.Slides) {
  try {
    $np = $slide.NotesPage
    foreach ($shp in $np.Shapes) {
      if ($shp.HasTextFrame -ne $msoTrue) { continue }
      if (-not $shp.TextFrame.HasText)    { continue }
      $t = $shp.TextFrame.TextRange.Text
      if ($t -and $t.Trim().Length -gt 20) {
        $shp.TextFrame.TextRange.Text = ""
      }
    }
  } catch {
    Write-Host "  warn: could not clear notes for slide"
  }
}

# ---------- save .pptx ----------
Write-Host "Saving .pptx..."
$pres.Save()
$pres.Close()
$ppt.Quit()

[System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) | Out-Null
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt)  | Out-Null
[GC]::Collect()
[GC]::WaitForPendingFinalizers()

# ---------- write markdown ----------
Write-Host "Writing SPEAKER_NOTES.md..."

$md = @()
$md += "# MatchFuel - Speaker Notes"
$md += ""
$md += "*Companion script for ``PROJECT_PRESENTATION.pptx`` (20 slides). Each section corresponds to one slide; read it while the slide is on screen.*"
$md += ""
$md += "---"
$md += ""

foreach ($s in $slideData) {
  $title = $s.Title
  $notes = $s.Notes
  if (-not $notes) { $notes = "(no speaker notes)" }
  $md += "## Slide $($s.Index): $title"
  $md += ""
  $md += $notes
  $md += ""
  $md += "---"
  $md += ""
}

$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($mdPath, ($md -join "`r`n"), $utf8Bom)

Write-Host "Done."
Write-Host "  pptx: $pptxPath  (notes cleared, file saved)"
Write-Host "  md:   $mdPath"
