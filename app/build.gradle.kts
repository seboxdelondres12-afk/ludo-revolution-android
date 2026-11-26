plugins { id("com.android.application") }

android {
    namespace = "com.sebox.ludorevolution"
    compileSdk = 35
    defaultConfig {
        // New independent package so it does not conflict with the removed installation.
        applicationId = "com.sebox.ludorevolution.seboxdelondres"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}