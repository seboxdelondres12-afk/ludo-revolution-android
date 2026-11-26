package com.sebox.ludorevolution;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.graphics.Color;
public class MainActivity extends Activity {
 private WebView webView;
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  getWindow().setStatusBarColor(Color.rgb(20,24,38));getWindow().setNavigationBarColor(Color.rgb(20,24,38));
  webView=new WebView(this);setContentView(webView);
  WebSettings s=webView.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setDatabaseEnabled(true);s.setLoadsImagesAutomatically(true);s.setMediaPlaybackRequiresUserGesture(false);
  webView.setWebViewClient(new WebViewClient());webView.setWebChromeClient(new WebChromeClient());
  if(state==null)webView.loadUrl("file:///android_asset/index.html");else webView.restoreState(state);
 }
 @Override protected void onSaveInstanceState(Bundle out){super.onSaveInstanceState(out);if(webView!=null)webView.saveState(out);}
 @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){if(webView!=null){webView.destroy();webView=null;}super.onDestroy();}
}