Write-Host "Iniciando despliegue..." -ForegroundColor Green

Write-Host "Haciendo build del frontend..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build completado exitosamente" -ForegroundColor Green
    
    Write-Host "Copiando archivos al servidor..." -ForegroundColor Yellow
    scp -i "C:\Users\USUARIO\Downloads\PcLenovo.pem" -r dist ubuntu@13.59.106.174:/home/ubuntu/cliente4/
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Archivos copiados exitosamente" -ForegroundColor Green
        
        Write-Host "Recargando Nginx..." -ForegroundColor Yellow
        ssh -i "C:\Users\USUARIO\Downloads\PcLenovo.pem" ubuntu@13.59.106.174 "sudo systemctl reload nginx"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Nginx recargado exitosamente" -ForegroundColor Green
            Write-Host "Despliegue completado!" -ForegroundColor Green
            Write-Host "Tu aplicacion esta disponible en: http://api.grupoproser.com.co" -ForegroundColor Cyan
        } else {
            Write-Host "Error al recargar Nginx" -ForegroundColor Red
        }
    } else {
        Write-Host "Error al copiar archivos al servidor" -ForegroundColor Red
    }
} else {
    Write-Host "Error en el build del frontend" -ForegroundColor Red
} 