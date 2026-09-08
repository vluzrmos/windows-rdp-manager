Add-Type -AssemblyName System.Drawing

$sourcePath = "public\icon-v2.png"
$destIco = "build\icon.ico"
$destPng512 = "build\icon.png"
$destPng256 = "public\icon.png"
$destTrayPng = "public\tray-icon.png"

Write-Host "Carregando imagem original de $sourcePath..."
$srcImage = [System.Drawing.Image]::FromFile($sourcePath)

function Resize-Bitmap($img, [int]$width, [int]$height) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($img, 0, 0, $width, $height)
    $g.Dispose()
    return $bmp
}

# Salvar build/icon.png (512x512)
$bmp512 = Resize-Bitmap $srcImage 512 512
$bmp512.Save($destPng512, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Dispose()
Write-Host "Salvo $destPng512"

# Salvar public/icon.png (256x256)
$bmp256 = Resize-Bitmap $srcImage 256 256
$bmp256.Save($destPng256, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp256.Dispose()
Write-Host "Salvo $destPng256"

# Salvar public/tray-icon.png (32x32)
$bmpTray = Resize-Bitmap $srcImage 32 32
$bmpTray.Save($destTrayPng, [System.Drawing.Imaging.ImageFormat]::Png)
$bmpTray.Dispose()
Write-Host "Salvo $destTrayPng"

# Gerar build/icon.ico com 256, 128, 64, 48, 32, 16
$sizes = @(256, 128, 64, 48, 32, 16)
$pngStreams = @()

foreach ($sz in $sizes) {
    $bmp = Resize-Bitmap $srcImage $sz $sz
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $pngStreams += ,@($sz, $ms.ToArray())
    $ms.Dispose()
}

$srcImage.Dispose()

$icoStream = [System.IO.File]::OpenWrite($destIco)
$writer = New-Object System.IO.BinaryWriter($icoStream)

# Header: reserved(0), type(1), count
$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]$pngStreams.Count)

$offset = 6 + (16 * $pngStreams.Count)

# Diretorio
foreach ($item in $pngStreams) {
    $sz = $item[0]
    $bytes = $item[1]
    
    $wByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $hByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }

    $writer.Write($wByte)          # Width
    $writer.Write($hByte)          # Height
    $writer.Write([byte]0)          # Colors
    $writer.Write([byte]0)          # Reserved
    $writer.Write([uint16]1)        # Planes
    $writer.Write([uint16]32)       # Bits
    $writer.Write([uint32]$bytes.Length) # Image size
    $writer.Write([uint32]$offset)       # Image offset

    $offset += $bytes.Length
}

# Dados das imagens
foreach ($item in $pngStreams) {
    $bytes = $item[1]
    $writer.Write($bytes)
}

$writer.Flush()
$writer.Close()
$icoStream.Dispose()

Write-Host "Sucesso! Criado $destIco com $($pngStreams.Count) resoluções."
