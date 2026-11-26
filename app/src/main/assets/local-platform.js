// Local compatibility layer. No Astrocade branding, account, or platform APIs.
const assetMap={
  "bg_royal_geometric": {
    "url": "https://d2oir5eh8rty2e.cloudfront.net/assets/images/afa2a5ba229748538fe09a7f78ebe20b.webp",
    "type": "image",
    "prompt": null,
    "description": null,
    "subtype": null,
    "aspect_ratio": null,
    "compression_suggestion": "original",
    "duration_secs": null,
    "loop": null,
    "opus_url": null,
    "animation": null
  },
  "star_gold": {
    "url": "https://d2oir5eh8rty2e.cloudfront.net/assets/images/a4113fe96f784bf99a9483cfe399d8b0.webp",
    "type": "image",
    "prompt": null,
    "description": null,
    "subtype": null,
    "aspect_ratio": null,
    "compression_suggestion": "original",
    "duration_secs": null,
    "loop": null,
    "opus_url": null,
    "animation": null
  },
  "music_gameplay": {
    "url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/2f1fd5fad0c54fc79433a6588c76c850.mp3",
    "type": "audio",
    "prompt": null,
    "description": null,
    "subtype": null,
    "aspect_ratio": null,
    "compression_suggestion": "original",
    "duration_secs": 30.0,
    "loop": true,
    "opus_url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/2f1fd5fad0c54fc79433a6588c76c850.ogg",
    "animation": null
  },
  "music_victory": {
    "url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/371dfeb923da41009a33f48432b2667f.mp3",
    "type": "audio",
    "prompt": null,
    "description": null,
    "subtype": null,
    "aspect_ratio": null,
    "compression_suggestion": "original",
    "duration_secs": 12.0,
    "loop": false,
    "opus_url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/371dfeb923da41009a33f48432b2667f.ogg",
    "animation": null
  },
  "sfx_dice_roll": {
    "url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/99fc075fbcd74819baf766d0e49273e2.mp3",
    "type": "audio",
    "prompt": null,
    "description": null,
    "subtype": null,
    "aspect_ratio": null,
    "compression_suggestion": "original",
    "duration_secs": 2.0,
    "loop": false,
    "opus_url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/99fc075fbcd74819baf766d0e49273e2.ogg",
    "animation": null
  },
  "sfx_capture": {
    "url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/7229c970e45349b491832744be0e5320.mp3",
    "type": "audio",
    "prompt": null,
    "description": null,
    "subtype": null,
    "aspect_ratio": null,
    "compression_suggestion": "original",
    "duration_secs": 2.0,
    "loop": false,
    "opus_url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/7229c970e45349b491832744be0e5320.ogg",
    "animation": null
  },
  "sfx_capture_laugh": {
    "url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/a6980153386240cca366209265555d75.mp3",
    "type": "audio",
    "prompt": null,
    "description": null,
    "subtype": null,
    "aspect_ratio": null,
    "compression_suggestion": "original",
    "duration_secs": 2.0,
    "loop": false,
    "opus_url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/a6980153386240cca366209265555d75.ogg",
    "animation": null
  },
  "sfx_finish": {
    "url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/2b7b1d31a908497abc8b08d08ce72c56.mp3",
    "type": "audio",
    "prompt": null,
    "description": null,
    "subtype": null,
    "aspect_ratio": null,
    "compression_suggestion": "original",
    "duration_secs": 2.5,
    "loop": false,
    "opus_url": "https://d2oir5eh8rty2e.cloudfront.net/assets/sounds/uploaded/2b7b1d31a908497abc8b08d08ce72c56.ogg",
    "animation": null
  }
};
window.lib={getAsset(id){return assetMap[id]||null;},showGameParameters(){},async getUserGameState(){return null;},async saveUserGameState(){return true;}};
