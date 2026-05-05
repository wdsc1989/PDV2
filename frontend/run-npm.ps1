# Usa o npm do Node.js quando ele nao esta no PATH.
# Uso: .\run-npm.ps1 build   ou   .\run-npm.ps1 dev
$npm = "C:\Program Files\nodejs\npm.cmd"
if (-not (Test-Path $npm)) {
    $npm = "C:\Program Files (x86)\nodejs\npm.cmd"
}
if (Test-Path $npm) {
    & $npm @args
} else {
    Write-Error "Node.js nao encontrado. Instale em https://nodejs.org ou adicione nodejs ao PATH."
    exit 1
}
