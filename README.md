# hls-vod-aws-mediaconvert
A cloud formations template for HLS video transcoding with MediaConvert, S3, Lambda and CloudFront

Initial hls jobs settings for transcoding:
```
hls:Custom-Ott_Hls_Ts_Avc_Aac_16x9_480x270_15fps_400kbps,Custom-Ott_Hls_Ts_Avc_Aac_16x9_640x360_30fps_800kbps,Custom-Ott_Hls_Ts_Avc_Aac_16x9_960x540_30fps_3500kbps,Custom-Ott_Hls_Ts_Avc_Aac_16x9_1280x720_30fps_5000kbps,Custom-Ott_Hls_Ts_Avc_Aac_16x9_1920x1080_30fps_8500kbps
```

Zip index.js into transcoding-function.zip \
Zip custom-presets-function into custom-presets-function.zip

Create a bucket named ott-vod with public access. \
Upload template.yaml and the two zip files in your S3 bucket following this folder structure:

ott-vod/template/latest/template.yaml \
ott-vod/lambda/latest/transcoding-function.zip \
ott-vod/lambda/latest/custom-presets-function.zip
