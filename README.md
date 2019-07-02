# hls-vod-aws-mediaconvert
A cloud formations template for HLS video transcoding with MediaConvert, S3, Lambda and CloudFront

Zip index.js into transcoding-function.zip
Zip custom-presets-function into custom-presets-function.zip

Create a bucket named ott-vod with public access.
Upload template.yaml and the two zip files in your S3 bucket following this folder structure:

ott-vod/template/latest/template.yaml
ott-vod/lambda/latest/transcoding-function.zip
ott-vod/lambda/latest/custom-presets-function.zip
