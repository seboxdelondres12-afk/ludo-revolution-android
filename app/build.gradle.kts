plugins { id("com.android.application") }

android {
    namespace = "com.sebox.ludorevolution"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.sebox.ludorevolution"
        minSdk = 23
        targetSdk = 35
        versionCode = 2
        versionName = "1.0.1"
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}