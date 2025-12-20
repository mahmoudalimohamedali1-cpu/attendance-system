package com.example.attendance_app

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.provider.Settings
import java.io.BufferedReader
import java.io.File
import java.io.InputStreamReader

/**
 * SecurityHelper - كشف أمني متقدم للتطبيق
 * مستوحى من MockLocationDetector library
 * يكشف: Developer Options, Mock Location Apps, Root, Emulator, Xposed, VPN
 */
object SecurityHelper {

    // قائمة تطبيقات Mock Location المعروفة (موسّعة)
    private val MOCK_LOCATION_APPS = listOf(
        // Fake GPS apps
        "com.lexa.fakegps",
        "com.incorporateapps.fakegps",
        "com.incorporateapps.fakegps.fre",
        "com.fakegps.mock",
        "com.blogspot.newapphorizons.fakegps",
        "com.gsmartstudio.fakegps",
        "com.gsmartstudio.fakegps.pro",
        "com.lkr.fakelocation",
        "com.location.faker",
        "com.evezzon.locationmock",
        "com.mock.gps",
        "com.fakegps.route",
        "ru.gavrikov.mocklocations",
        "com.fakegps.joystick",
        "com.theappninjas.fakegps",
        "org.hola.gpslocation",
        "com.rosteam.gpsemulator",
        "com.divi.fakeGPS",
        "com.pe.fakegps",
        "com.usefullapps.fakegpslocationpro",
        "com.ltp.pro.fakelocation",
        "com.just4fun.fakegps",
        "com.fakegps.fly",
        // More fake GPS apps
        "com.fakegps.gpschange",
        "com.bhanu.fakegps",
        "com.rooted.fakegps",
        "com.fake.gps.location",
        "com.fake.location.gps.changer",
        "fake.gps.location",
        "com.mockloc.fakelocation",
        "com.mock.location",
        "ru.lexa.fakegps",
        "com.fake.gps.go.location.changer",
        "com.marlon.floating.fake.location",
        "com.playposse.locationmock",
        "com.denivers.fakegpslocation",
        "com.android.mock.location",
        // GPS Joystick apps
        "com.theappninjas.gpsjoystick",
        "com.isa.gpsjoystick",
        // Location Spoofer apps
        "com.lexa.fakegps.pro",
        "com.llv.location.spoofer",
        "fr.dvilleneuve.lockito",
        // VPN/Proxy apps that might spoof location
        "com.expressvpn.vpn",
        "com.nordvpn.android",
        "com.tunnelbear.android",
        "com.anchorfree.vpn",
        "org.torproject.android"
    )

    // ملفات وأدلة root المعروفة (موسّعة)
    private val ROOT_FILES = listOf(
        "/system/app/Superuser.apk",
        "/sbin/su",
        "/system/bin/su",
        "/system/xbin/su",
        "/data/local/xbin/su",
        "/data/local/bin/su",
        "/system/sd/xbin/su",
        "/system/bin/failsafe/su",
        "/data/local/su",
        "/su/bin/su",
        "/system/app/SuperSU.apk",
        "/system/app/SuperSU",
        "/system/app/Magisk.apk",
        "/sbin/magisk",
        "/system/xbin/magisk",
        // Additional root indicators
        "/system/etc/init.d",
        "/system/xbin/busybox",
        "/data/adb/magisk",
        "/cache/magisk.log",
        "/data/magisk.img",
        "/system/xbin/daemonsu",
        "/system/bin/.ext/.su",
        "/system/usr/we-need-root/su-backup",
        "/system/app/KingUser.apk",
        "/data/data/com.kingroot.kinguser",
        "/data/data/com.noshufou.android.su",
        "/data/data/com.topjohnwu.magisk"
    )

    // تطبيقات Xposed Framework
    private val XPOSED_APPS = listOf(
        "de.robv.android.xposed.installer",
        "com.saurik.substrate",
        "de.robv.android.xposed",
        "io.va.exposed",
        "org.meowcat.edxposed.manager",
        "org.lsposed.manager"
    )

    // تطبيقات Root Management
    private val ROOT_MANAGEMENT_APPS = listOf(
        "com.noshufou.android.su",
        "com.noshufou.android.su.elite",
        "eu.chainfire.supersu",
        "com.koushikdutta.superuser",
        "com.thirdparty.superuser",
        "com.yellowes.su",
        "com.topjohnwu.magisk",
        "com.kingroot.kinguser",
        "com.kingo.root",
        "com.smedialink.oneclickroot",
        "com.zhiqupk.root.global",
        "com.alephzain.framaroot"
    )

    /**
     * فحص شامل للأمان - يرجع Map بنتائج كل الفحوصات
     */
    fun performSecurityCheck(context: Context): Map<String, Any> {
        val result = mutableMapOf<String, Any>()
        
        // 1. Developer Options
        result["developerOptionsEnabled"] = isDeveloperOptionsEnabled(context)
        
        // 2. Mock Location setting (Android 5 and below)
        result["mockLocationEnabled"] = isAllowMockLocationsOn(context)
        
        // 3. تطبيقات Mock Location مثبتة (شامل)
        val mockApps = getInstalledMockLocationApps(context)
        result["mockAppsInstalled"] = mockApps.isNotEmpty()
        result["mockAppsList"] = mockApps
        result["mockAppsCount"] = mockApps.size
        
        // 4. عدد التطبيقات التي لديها صلاحية ALLOW_MOCK_LOCATION
        val appsWithMockPermission = getAppsWithMockLocationPermission(context)
        result["appsWithMockPermission"] = appsWithMockPermission.size
        result["appsWithMockPermissionList"] = appsWithMockPermission
        
        // 5. Root detection (متعدد الطرق)
        result["isRooted"] = isDeviceRooted()
        result["rootMethod"] = getRootMethod()
        
        // 6. Xposed Framework detection
        result["xposedInstalled"] = isXposedInstalled(context)
        
        // 7. Root Management Apps
        result["rootAppsInstalled"] = hasRootManagementApps(context)
        
        // 8. Emulator detection
        result["isEmulator"] = isEmulator()
        result["emulatorIndicators"] = getEmulatorIndicators()
        
        // 9. USB Debugging
        result["usbDebuggingEnabled"] = isUsbDebuggingEnabled(context)
        
        // 10. Risk score
        result["riskScore"] = calculateRiskScore(result)
        
        // 11. Overall security status
        result["isSecure"] = isSecure(result)
        
        // 12. Security summary
        result["securitySummary"] = getSecuritySummary(result)
        
        return result
    }

    /**
     * التحقق من تفعيل Developer Options
     */
    fun isDeveloperOptionsEnabled(context: Context): Boolean {
        return try {
            Settings.Secure.getInt(
                context.contentResolver,
                Settings.Global.DEVELOPMENT_SETTINGS_ENABLED,
                0
            ) != 0
        } catch (e: Exception) {
            false
        }
    }

    /**
     * التحقق من تفعيل Mock Location (Android 5 and below)
     * من مكتبة MockLocationDetector
     */
    fun isAllowMockLocationsOn(context: Context): Boolean {
        return try {
            if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.LOLLIPOP) {
                @Suppress("DEPRECATION")
                Settings.Secure.getString(
                    context.contentResolver,
                    Settings.Secure.ALLOW_MOCK_LOCATION
                ) == "1"
            } else {
                false // Android 6+ doesn't have this setting
            }
        } catch (e: Exception) {
            false
        }
    }

    /**
     * فحص إذا كان Location من Mock Provider
     * من مكتبة MockLocationDetector
     */
    fun isLocationFromMockProvider(context: Context, location: Location?): Boolean {
        if (location == null) return false
        
        return if (Build.VERSION.SDK_INT >= 18) {
            location.isFromMockProvider
        } else {
            isAllowMockLocationsOn(context)
        }
    }

    /**
     * البحث عن تطبيقات Mock Location المثبتة (من القائمة)
     */
    fun getInstalledMockLocationApps(context: Context): List<String> {
        val installedMockApps = mutableListOf<String>()
        val pm = context.packageManager
        
        // فحص قائمة التطبيقات المعروفة
        for (packageName in MOCK_LOCATION_APPS) {
            try {
                pm.getPackageInfo(packageName, PackageManager.GET_META_DATA)
                installedMockApps.add(packageName)
            } catch (e: PackageManager.NameNotFoundException) {
                // التطبيق غير مثبت
            }
        }
        
        return installedMockApps
    }

    /**
     * فحص التطبيقات التي لديها صلاحية ACCESS_MOCK_LOCATION
     * من مكتبة MockLocationDetector: checkForAllowMockLocationsApps
     */
    fun getAppsWithMockLocationPermission(context: Context): List<String> {
        val appsWithPermission = mutableListOf<String>()
        val pm = context.packageManager
        
        try {
            val installedApps = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            for (app in installedApps) {
                try {
                    val packageInfo = pm.getPackageInfo(
                        app.packageName,
                        PackageManager.GET_PERMISSIONS
                    )
                    
                    val permissions = packageInfo.requestedPermissions
                    if (permissions != null) {
                        for (permission in permissions) {
                            if (permission == "android.permission.ACCESS_MOCK_LOCATION"
                                && app.packageName != context.packageName) {
                                appsWithPermission.add(app.packageName)
                                break
                            }
                        }
                    }
                } catch (e: Exception) {
                    // تجاهل
                }
            }
        } catch (e: Exception) {
            // تجاهل الأخطاء
        }
        
        return appsWithPermission
    }

    /**
     * التحقق من Root (متعدد الطرق)
     */
    fun isDeviceRooted(): Boolean {
        return checkRootFiles() || checkBuildTags() || checkSuBinary() || checkRootCloakers()
    }

    private var detectedRootMethod: String = ""

    private fun getRootMethod(): String = detectedRootMethod

    private fun checkRootFiles(): Boolean {
        for (path in ROOT_FILES) {
            if (File(path).exists()) {
                detectedRootMethod = "ROOT_FILE: $path"
                return true
            }
        }
        return false
    }

    private fun checkBuildTags(): Boolean {
        val buildTags = Build.TAGS
        if (buildTags != null && buildTags.contains("test-keys")) {
            detectedRootMethod = "BUILD_TAGS: test-keys"
            return true
        }
        return false
    }

    private fun checkSuBinary(): Boolean {
        val paths = arrayOf(
            "/system/bin/",
            "/system/xbin/",
            "/sbin/",
            "/data/local/xbin/",
            "/data/local/bin/",
            "/system/sd/xbin/",
            "/su/bin/"
        )
        
        for (path in paths) {
            if (File(path + "su").exists()) {
                detectedRootMethod = "SU_BINARY: ${path}su"
                return true
            }
        }
        
        // Try executing su command
        try {
            val process = Runtime.getRuntime().exec(arrayOf("/system/xbin/which", "su"))
            val reader = BufferedReader(InputStreamReader(process.inputStream))
            val result = reader.readLine()
            if (result != null && result.isNotEmpty()) {
                detectedRootMethod = "SU_COMMAND: which su = $result"
                return true
            }
        } catch (e: Exception) {
            // لا يوجد su
        }
        
        return false
    }

    private fun checkRootCloakers(): Boolean {
        // Check for root cloaking apps like Root Cloak
        val cloakers = listOf(
            "com.devadvance.rootcloak",
            "com.devadvance.rootcloakplus",
            "de.robv.android.xposed.installer",
            "com.saurik.substrate",
            "com.zachspong.temprootremovejb",
            "com.amphoras.hidemyroot",
            "com.amphoras.hidemyrootadfree",
            "com.formyhm.hiderootPremium",
            "com.formyhm.hideroot"
        )
        
        for (pkg in cloakers) {
            if (File("/data/data/$pkg").exists()) {
                detectedRootMethod = "ROOT_CLOAKER: $pkg"
                return true
            }
        }
        return false
    }

    /**
     * فحص Xposed Framework
     */
    fun isXposedInstalled(context: Context): Boolean {
        val pm = context.packageManager
        
        // Check known Xposed packages
        for (packageName in XPOSED_APPS) {
            try {
                pm.getPackageInfo(packageName, PackageManager.GET_META_DATA)
                return true
            } catch (e: PackageManager.NameNotFoundException) {
                // Not installed
            }
        }
        
        // Check for Xposed in stack trace
        try {
            val stackTrace = Thread.currentThread().stackTrace
            for (element in stackTrace) {
                if (element.className.contains("xposed") ||
                    element.className.contains("EdXposed") ||
                    element.className.contains("LSPosed")) {
                    return true
                }
            }
        } catch (e: Exception) {
            // Ignore
        }
        
        return false
    }

    /**
     * فحص تطبيقات Root Management
     */
    fun hasRootManagementApps(context: Context): Boolean {
        val pm = context.packageManager
        
        for (packageName in ROOT_MANAGEMENT_APPS) {
            try {
                pm.getPackageInfo(packageName, PackageManager.GET_META_DATA)
                return true
            } catch (e: PackageManager.NameNotFoundException) {
                // Not installed
            }
        }
        return false
    }

    /**
     * التحقق من Emulator
     */
    fun isEmulator(): Boolean {
        return getEmulatorIndicators().isNotEmpty()
    }

    fun getEmulatorIndicators(): List<String> {
        val indicators = mutableListOf<String>()
        
        if (Build.FINGERPRINT.startsWith("generic")) indicators.add("FINGERPRINT:generic")
        if (Build.FINGERPRINT.startsWith("unknown")) indicators.add("FINGERPRINT:unknown")
        if (Build.MODEL.contains("google_sdk")) indicators.add("MODEL:google_sdk")
        if (Build.MODEL.contains("Emulator")) indicators.add("MODEL:Emulator")
        if (Build.MODEL.contains("Android SDK built for x86")) indicators.add("MODEL:SDK_x86")
        if (Build.MANUFACTURER.contains("Genymotion")) indicators.add("MANUFACTURER:Genymotion")
        if (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic")) {
            indicators.add("BRAND_DEVICE:generic")
        }
        if ("google_sdk" == Build.PRODUCT) indicators.add("PRODUCT:google_sdk")
        if (Build.HARDWARE.contains("goldfish")) indicators.add("HARDWARE:goldfish")
        if (Build.HARDWARE.contains("ranchu")) indicators.add("HARDWARE:ranchu")
        if (Build.PRODUCT.contains("sdk")) indicators.add("PRODUCT:sdk")
        if (Build.PRODUCT.contains("emulator")) indicators.add("PRODUCT:emulator")
        if (Build.PRODUCT.contains("simulator")) indicators.add("PRODUCT:simulator")
        if (Build.BOARD == "unknown") indicators.add("BOARD:unknown")
        if (Build.DEVICE == "generic") indicators.add("DEVICE:generic")
        
        // Check for QEMU
        try {
            val cpuInfo = File("/proc/cpuinfo").readText()
            if (cpuInfo.contains("QEMU") || cpuInfo.contains("Goldfish")) {
                indicators.add("CPU:QEMU")
            }
        } catch (e: Exception) {
            // Ignore
        }
        
        return indicators
    }

    /**
     * التحقق من USB Debugging
     */
    fun isUsbDebuggingEnabled(context: Context): Boolean {
        return try {
            Settings.Global.getInt(
                context.contentResolver,
                Settings.Global.ADB_ENABLED,
                0
            ) != 0
        } catch (e: Exception) {
            false
        }
    }

    /**
     * حساب Risk Score (محسّن)
     */
    private fun calculateRiskScore(checks: Map<String, Any>): Int {
        var score = 0
        
        if (checks["developerOptionsEnabled"] == true) score += 10
        if (checks["mockLocationEnabled"] == true) score += 25
        if (checks["mockAppsInstalled"] == true) score += 40
        if (checks["isRooted"] == true) score += 50
        if (checks["xposedInstalled"] == true) score += 45
        if (checks["rootAppsInstalled"] == true) score += 35
        if (checks["isEmulator"] == true) score += 40
        if (checks["usbDebuggingEnabled"] == true) score += 5
        
        // Additional scoring based on number of mock apps
        val mockAppsCount = (checks["appsWithMockPermission"] as? Int) ?: 0
        score += (mockAppsCount * 10).coerceAtMost(30)
        
        return score.coerceAtMost(100)
    }

    /**
     * هل الجهاز آمن للحضور؟
     */
    private fun isSecure(checks: Map<String, Any>): Boolean {
        // رفض إذا كان هناك تطبيق mock أو root أو xposed
        if (checks["mockAppsInstalled"] == true) return false
        if (checks["isRooted"] == true) return false
        if (checks["xposedInstalled"] == true) return false
        if (checks["isEmulator"] == true) return false
        if ((checks["appsWithMockPermission"] as? Int ?: 0) > 0) return false
        
        return true
    }

    /**
     * ملخص الأمان للتسجيل
     */
    private fun getSecuritySummary(checks: Map<String, Any>): String {
        val issues = mutableListOf<String>()
        
        if (checks["mockAppsInstalled"] == true) {
            issues.add("Mock apps: ${(checks["mockAppsList"] as? List<*>)?.firstOrNull()}")
        }
        if (checks["isRooted"] == true) {
            issues.add("Rooted: ${checks["rootMethod"]}")
        }
        if (checks["xposedInstalled"] == true) {
            issues.add("Xposed installed")
        }
        if (checks["isEmulator"] == true) {
            issues.add("Emulator: ${(checks["emulatorIndicators"] as? List<*>)?.firstOrNull()}")
        }
        if ((checks["appsWithMockPermission"] as? Int ?: 0) > 0) {
            issues.add("Apps with mock permission: ${checks["appsWithMockPermission"]}")
        }
        
        return if (issues.isEmpty()) "SECURE" else issues.joinToString("; ")
    }
}
