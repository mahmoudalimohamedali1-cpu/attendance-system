package com.example.attendance_app

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.attendance/security"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "checkSecurity" -> {
                    try {
                        val securityResult = SecurityHelper.performSecurityCheck(this)
                        result.success(securityResult)
                    } catch (e: Exception) {
                        result.error("SECURITY_CHECK_FAILED", e.message, null)
                    }
                }
                "isDeveloperOptionsEnabled" -> {
                    result.success(SecurityHelper.isDeveloperOptionsEnabled(this))
                }
                "isRooted" -> {
                    result.success(SecurityHelper.isDeviceRooted())
                }
                "isEmulator" -> {
                    result.success(SecurityHelper.isEmulator())
                }
                "getMockApps" -> {
                    result.success(SecurityHelper.getInstalledMockLocationApps(this))
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }
}
