@echo off
:: xFinance Excel Add-in Sideloading Script

:: Section 1: Setup variables
set MANIFEST_NAME=manifest.xml
set CATALOG_PATH=%USERPROFILE%\.xfinance-addin
set REG_KEY="HKEY_CURRENT_USER\Software\Microsoft\Office\16.0\WEF\Developer"

:: Section 2: Check if manifest.xml exists
echo.
echo xFinance Excel Add-in-g suulgaj baina...
echo ----------------------------------------

if not exist "%MANIFEST_NAME%" (
    echo ERROR: manifest.xml file not found.
    echo.
    echo Please make sure this script is in the same directory as the manifest.xml file.
    pause
    exit /b
)

:: Section 3: Create catalog folder
echo.
echo 1/3 - Itgemjlegdsen add-in-ii havtas uusgej baina...
if not exist "%CATALOG_PATH%" (
    mkdir "%CATALOG_PATH%"
    echo    Havtas amjilttai uuslee: %CATALOG_PATH%
) else (
    echo    Havtas baisan tul algaala.
)

:: Section 4: Add the catalog path to the registry
echo.
echo 2/3 - Havtasiig Excel-d itgemjlelgdej baina (Registry edit)...
reg add %REG_KEY% /v %CATALOG_PATH% /t REG_SZ /d "[1]" /f > nul
echo    Registry-d amjilttai burtgelee.


:: Section 5: Copy the manifest file
echo.
echo 3/3 - manifest.xml file-g itgemjlegdsen havstas ruu huulj baina...
copy /Y "%MANIFEST_NAME%" "%CATALOG_PATH%\%MANIFEST_NAME%" > nul
echo    Manifest file amjilttai huulagdlaa.

:: Section 6: Finish
echo.
echo ----------------------------------------
echo SULGAJ DUUSLAA!
echo.
echo Odoo Excel programmaa haagaad dahin neene uu. 
echo Shineer neehdee Home tab-n baruun zovlogt 'xFinance' tovch haragdana.
echo.
pause
