Add-Type -AssemblyName System.Drawing

$width = 440
$height = 270
$bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Fundo escuro #0f172a
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
$g.FillRectangle($bgBrush, 0, 0, $width, $height)

# Borda sutil #334155
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(51, 65, 85), 1)
$g.DrawRectangle($pen, 0, 0, $width - 1, $height - 1)

# Ícone
$iconPath = Join-Path $PSScriptRoot '..\public\icon.png'
if (Test-Path $iconPath) {
    $srcImg = [System.Drawing.Image]::FromFile($iconPath)
    $iconSize = 72
    $iconX = [int](($width - $iconSize) / 2)
    $iconY = 32
    $g.DrawImage($srcImg, $iconX, $iconY, $iconSize, $iconSize)
    $srcImg.Dispose()
}

# Título
$titleFont = New-Object System.Drawing.Font('Segoe UI', 15, [System.Drawing.FontStyle]::Bold)
$titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(248, 250, 252))
$titleFormat = New-Object System.Drawing.StringFormat
$titleFormat.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString('Windows RDP Manager', $titleFont, $titleBrush, [float]($width / 2), 122.0, $titleFormat)

# Subtítulo
$subFont = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Regular)
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(148, 163, 184))
$g.DrawString('Gerenciador de Conexões Remotas', $subFont, $subBrush, [float]($width / 2), 158.0, $titleFormat)

# Status de instalação
$statusFont = New-Object System.Drawing.Font('Segoe UI', 8, [System.Drawing.FontStyle]::Regular)
$statusBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(99, 102, 241))
$g.DrawString('Configurando componentes...', $statusFont, $statusBrush, [float]($width / 2), 218.0, $titleFormat)

# Salvar como BMP 24bpp
$dest = Join-Path $PSScriptRoot '..\build\splash.bmp'
$bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Bmp)

$g.Dispose()
$bmp.Dispose()
Write-Output "Splash BMP created at: $dest"
