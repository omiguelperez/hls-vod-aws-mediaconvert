// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');

// Determine the MediaConvert endpoint
// Create empty request parameters
// var params = { MaxResults: 0 };
// Create a promise on a MediaConvert object
// var endpointPromise = new AWS.MediaConvert({apiVersion: '2017-08-29'}).describeEndpoints(params).promise();
/*
endpointPromise.then(
  function(data) {
    console.log("Your MediaConvert endpoint is ", data.Endpoints);
  },
  function(err) {
    console.log("Error", err);
  }
);
*/

// Set the region
AWS.config.update({region: process.env.REGION});
var mediaconvert = new AWS.MediaConvert({ apiVersion: '2017-08-29' });
mediaconvert.endpoint = process.env.END_POINT;
const MEDIACONVERT_ROLE = process.env.JOB_ROLE;
// let INPUT_PREFIX = fixForPrefix(process.env.INPUT_PREFIX);
// let OUTPUT_PREFIX = fixForPrefix(process.env.OUTPUT_PREFIX);

function fixForPrefix(foldername){
  if(!foldername.endsWith("/")){
    foldername = foldername+"/";
  }
  return foldername;
}

function getContentPrefix(key) {
  key = key.replace('input/', "");
  key = key.substring(0, key.lastIndexOf(".")) + "/";
  key = key.replace(/[^a-zA-Z0-9]/g, "");
  // console.log("In getContentPrefix with key :%s",key);
  return key;
}

exports.handler = (event, context) => {
  // console.log("Event Object :%j", event);
  // let bucket = event.Records[0].s3.bucket.name;
  let key = event.Records[0].s3.object.key;

  const fileName = getContentPrefix(key);
  // const fileName = key.replace('input/', "").substring(0, key.lastIndexOf(".")) + "/".replace(/[^a-zA-Z0-9]/g, "");
  var params = {
    "Queue": "arn:aws:mediaconvert:eu-central-1:927881849042:queues/Default",
    "JobTemplate": "activitree-transcode",
    "Role": MEDIACONVERT_ROLE,
    "Settings": {
      "Inputs": [{
        "AudioSelectors": {
          "Audio Selector 1": {
            "Offset": 0,
            "DefaultSelection": "NOT_DEFAULT",
            "ProgramSelection": 1,
            "SelectorType": "TRACK",
            "Tracks": [
              1
            ]
          }
        },
        "VideoSelector": {
          "ColorSpace": "FOLLOW"
        },
        "FilterEnable": "AUTO",
        "PsiControl": "USE_PSI",
        "FilterStrength": 0,
        "DeblockFilter": "DISABLED",
        "DenoiseFilter": "DISABLED",
        "TimecodeSource": "EMBEDDED",
        "FileInput": "s3://glimpses-927881849042-eu-central-1/" + key
      }],
      "OutputGroups": [
        {
          "CustomName": "Activitree-Transcode-Output-Group",
          "Name": "Apple HLS",
          "Outputs": [
            {
              "Preset": "Custom-Ott_Hls_Ts_Avc_Aac_16x9_1920x1080_30fps_8500kbps",
              "NameModifier": "/Custom-Ott_Hls_Ts_Avc_Aac_16x9_1920x1080_30fps_8500kbps"
            },
            {
              "Preset": "Custom-Ott_Hls_Ts_Avc_Aac_16x9_1280x720_30fps_5000kbps",
              "NameModifier": "/Custom-Ott_Hls_Ts_Avc_Aac_16x9_1280x720_30fps_5000kbps"
            },
            {
              "Preset": "Custom-Ott_Hls_Ts_Avc_Aac_16x9_640x360_30fps_1200kbps",
              "NameModifier": "/Custom-Ott_Hls_Ts_Avc_Aac_16x9_640x360_30fps_1200kbps"
            }
          ],
          "OutputGroupSettings": {
            "Type": "HLS_GROUP_SETTINGS",
            "HlsGroupSettings": {
              "ManifestDurationFormat": "INTEGER",
              "SegmentLength": 4,
              "TimedMetadataId3Period": 10,
              "CaptionLanguageSetting": "OMIT",
              "Destination": "s3://glimpses-927881849042-eu-central-1/vod/hls/" + fileName,
              "TimedMetadataId3Frame": "PRIV",
              "CodecSpecification": "RFC_4281",
              "OutputSelection": "MANIFESTS_AND_SEGMENTS",
              "ProgramDateTimePeriod": 600,
              "MinSegmentLength": 0,
              "DirectoryStructure": "SINGLE_DIRECTORY",
              "ProgramDateTime": "EXCLUDE",
              "SegmentControl": "SEGMENTED_FILES",
              "ManifestCompression": "GZIP",
              "ClientCache": "ENABLED",
              "StreamInfResolution": "INCLUDE"
            }
          }
        },
        {
          "CustomName": "VOD-Thumbs",
          "Name": "File Group",
          "Outputs": [
            {
              "ContainerSettings": {
                "Container": "RAW"
              },
              "VideoDescription": {
                "Width": 640,
                "ScalingBehavior": "DEFAULT",
                "Height": 360,
                "TimecodeInsertion": "DISABLED",
                "AntiAlias": "ENABLED",
                "Sharpness": 50,
                "CodecSettings": {
                  "Codec": "FRAME_CAPTURE",
                  "FrameCaptureSettings": {
                    "FramerateNumerator": 1,
                    "FramerateDenominator": 1,
                    "MaxCaptures": 1,
                    "Quality": 60
                  }
                },
                "DropFrameTimecode": "ENABLED",
                "ColorMetadata": "INSERT"
              }
            }
          ],
          "OutputGroupSettings": {
            "Type": "FILE_GROUP_SETTINGS",
            "FileGroupSettings": {
              "Destination": "s3://glimpses-927881849042-eu-central-1/vod/hls/" +fileName
            }
          }
        }
      ],
      "TimecodeConfig": {
        "Source": "EMBEDDED"
      }
    }
  };

  // mediaconvert.createJob(params);

  mediaconvert.createJob(params, res => {
    console.log('response on creating job: ', res);
    // callback(null, res.statusCode);
  }).on('error', e => {
    console.log('error on creating job: ', e);
    // callback(Error(e))
  });
  /*
    // Create a promise on a MediaConvert object
    var templateJobPromise = mediaconvert.createJob(params).promise();

    // Handle promise's fulfilled/rejected status
    templateJobPromise.then(
      function(data) {
        console.log("Success! ", data);
      },
      function(err) {
        console.log("Error", err);
      }
    );
    */
};