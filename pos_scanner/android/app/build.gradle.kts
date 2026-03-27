plugins {
    id("com.android.application")
    id("kotlin-android")
    // Flutter Gradle Plugin should be after Android & Kotlin plugins
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.pos_scanner"
    compileSdk = 36 

    ndkVersion = flutter.ndkVersion

    defaultConfig {
        applicationId = "com.example.pos_scanner"
        minSdk = flutter.minSdkVersion         
        targetSdk = 36
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    buildTypes {
        release {
            // Keep debug signing so you can build without a release keystore
            signingConfig = signingConfigs.getByName("debug")
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }
}

flutter {
    source = "../.."
}
