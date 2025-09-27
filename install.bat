@echo off
:: Change directory to the script's location
cd /d %~dp0

:: xFinance Excel Add-in Sideloading Script

:: Section 1: Setup variables
set MANIFEST_NAME=manifest.xml
:: This is the real path for creating the folder and copying the file
set LOCAL_CATALOG_PATH=%USERPROFILE%\\.xfinance-addin
:: This is the network-style path that Excel's Trust Center accepts
set NETWORK_CATALOG_PATH=\\localhost\c$\\Users\\%USERNAME%\\.xfinance-addin
set REG_KEY="HKEY_CURRENT_USER\\Software\\Microsoft\\Office\\16.0\\WEF\\Developer"

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
if not exist "%LOCAL_CATALOG_PATH%" (
    mkdir "%LOCAL_CATALOG_PATH%"
    echo    Havtas amjilttai uuslee: %LOCAL_CATALOG_PATH%
) else (
    echo    Havtas baisan tul algaala.
)

:: Section 4: Add the catalog path to the registry
echo.
echo 2/3 - Havtasiig Excel-d itgemjlelgdej baina (Registry edit)...
:: We use the network-style path for the registry, as this is what Excel's Trust Center requires.
reg add %REG_KEY% /v "%NETWORK_CATALOG_PATH%" /t REG_SZ /d "" /f > nul
echo    Registry-d amjilttai burtgelee.


:: Section 5: Copy the manifest file
echo.
echo 3/3 - manifest.xml file-g itgemjlegdsen havstas ruu huulj baina...
copy /Y "%MANIFEST_NAME%" "%LOCAL_CATALOG_PATH%\\%MANIFEST_NAME%" > nul
echo    Manifest file amjilttai huulagdlaa.

:: Section 6: Finish with detailed instructions
echo.
echo ----------------------------------------
echo SULGALT AMJILTTAI BOLJ, REGISTRY-D BÜRTGEGDLEE!
echo.
echo Odoo Excel deer nemelt heregsliig idevhjuuleh shaardlagatai:
echo.
echo 1. Excel programmaa (hervee neelttei bol) BÜREN HAAGAAD, SHINEER neene uu.
echo 2. Shineer neesen Excel-iin 'Insert' tab deer darna uu.
echo 3. Daraa ni 'Get Add-ins' tovchiig olj darna uu.
echo 4. Neehdeh tsonhnii deeshes 'MY ADD-INS' gesen tab-g songono uu.
echo 5. Dotor ni 'SHARED FOLDER' gesen heseg haragdana.
echo 6. 'xFinance' add-in-g songood, 'Add' tovchiig darj suulgana uu.
echo.
echo Ingehed Home tab deer 'xFinance' tovch haragdana.
echo.
pause
