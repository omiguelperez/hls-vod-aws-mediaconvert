const AWS = require("aws-sdk");
const url = require("url");
const util = require('util');
const https = require("https");
var fs = require("fs");
var configJson = (JSON.parse(fs.readFileSync("./config.json", "utf8")));
var mediaconvert = new AWS.MediaConvert({ apiVersion: '2017-08-29' });

let INITIALISED = false;

exports.handler =  async (event, context) => {

  // console.log("config :%j",configJson);
  console.log("REQUEST RECEIVED:\n" + JSON.stringify(event));

  //read the presets prefix name passed from CloudFormation template
  let presetsPrefix = event.ResourceProperties.PresetsPrefix;
  let responseData = {};
  responseData.hls = [];

  if(!INITIALISED){
    await setMediaConvertEndpoint(mediaconvert);
    INITIALISED = true;
  }

  // For Delete requests, immediately send a SUCCESS response.
  if (event.RequestType == "Delete") {
    await deletePresets(event.ResourceProperties.PresetsPrefix);
    await sendResponse(event, context, "SUCCESS");
    return;
  }

  //create the HLS Presets used for transcoding
  await createHLSPreset(presetsPrefix,responseData);
  //prepare the response
  await prepareResponseData(responseData);
  //send the preset details back to Caller
  await sendResponse(event, context, "SUCCESS", responseData);
  context.done();
};

//set the AWS Account specific mediaconvert endpoint
async function setMediaConvertEndpoint(mediaconvert){

    // Create empty request parameters
    var params = {
      MaxResults: 0,
    };

    let endpoint = await mediaconvert.describeEndpoints(params).promise();
    mediaconvert.endpoint = endpoint.Endpoints[0].Url;
}

//send back the HLS presets created
async function prepareResponseData(responseData){
  responseData.hls = "hls:"+responseData.hls.join(",");
}

//creates the HLS presets used for VOD transcoding.
//Example preset name pattern Custom-Ott_Hls_Ts_Avc_Aac_16x9_widthxheight_fps_bitrate
//following profiles are created
//Package Type |  Resolution (width x height) |	Bitrate (Mbps)
// HLS	       |       480 x 270	            |   0.4
// HLS	       |       640 x 360	            |   0.8
// HLS	       |       960 x 540	            |   3.5
// HLS	       |       1280 x 720	            |   5.0
// HLS	       |       1920 x 1080	          |   8.5
//you can add additional bitrates by modifying 'hls_presets' node in the config.json
async function createHLSPreset(presetsPrefix,responseData) {
  console.log("In createHLSPreset");

  //create the presets
  for(let preset of configJson.hls_presets) {
    let presetParams = prepareHLSPreset(configJson.hls_default_preset, presetsPrefix, preset);
    let response = await mediaconvert.createPreset(presetParams).promise();
    responseData.hls.push(response.Preset.Name);
  }
}

//helper function to populate the HLS parameters in the MediaConvert Job
function prepareHLSPreset(presetParams, presetsPrefix, preset) {
  let fps = Math.ceil(preset.framerateNumerator / 1001 );
  let name = util.format("Ott_Hls_Ts_Avc_Aac_16x9_%dx%d_%dfps_%dkbps",preset.width,preset.height,fps, preset.videoBitrate/1000);
  console.log("creating HLS Preset :%s",name);
  presetParams.Name = presetsPrefix+name;
  presetParams.Description = presetsPrefix+name;
  presetParams.Settings.VideoDescription.Width = preset.width;
  presetParams.Settings.VideoDescription.Height = preset.height;
  presetParams.Settings.VideoDescription.CodecSettings.H264Settings.Bitrate = preset.videoBitrate;
  presetParams.Settings.VideoDescription.CodecSettings.H264Settings.AdaptiveQuantization = preset.adaptiveQuantization;
  presetParams.Settings.VideoDescription.CodecSettings.H264Settings.CodecLevel = preset.codecLevel;
  presetParams.Settings.VideoDescription.CodecSettings.H264Settings.CodecProfile = preset.videoCodecProfile;
  presetParams.Settings.VideoDescription.CodecSettings.H264Settings.FramerateNumerator = preset.framerateNumerator;
  presetParams.Settings.VideoDescription.CodecSettings.H264Settings.HrdBufferSize = preset.videoBitrate * 2;
  presetParams.Settings.VideoDescription.CodecSettings.H264Settings.GopSize  = preset.gopSize;
  presetParams.Settings.AudioDescriptions[0].CodecSettings.AacSettings.Bitrate = preset.audioBitrate
  presetParams.Settings.AudioDescriptions[0].CodecSettings.AacSettings.CodecProfile = preset.audioProfile;
  return presetParams;
}

//delete the presets created. Called when you delete the stack.
async function deletePresets(presetsPrefix){

  //delete the HLS presets
  for(let preset of configJson.hls_presets) {
    let fps = Math.ceil(preset.framerateNumerator / 1001 );
    let name = util.format("Ott_Hls_Ts_Avc_Aac_16x9_%dx%d_%dfps_%dkbps",preset.width,preset.height,fps, preset.videoBitrate/1000);
    console.log("deleting preset :%s",presetsPrefix+name)
    await mediaconvert.deletePreset({"Name": presetsPrefix+name}).promise();
  }
}

// Send response to the pre-signed S3 URL
async function sendResponse(event, context, responseStatus, responseData) {

  let responseBody = JSON.stringify({
    Status: responseStatus,
    Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
    PhysicalResourceId: context.logStreamName,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: responseData
  });

  console.log("RESPONSE BODY:\n", responseBody);

  let parsedUrl = url.parse(event.ResponseURL);
  let options = {
    hostname: parsedUrl.hostname,
    port: 443,
    path: parsedUrl.path,
    method: "PUT",
    headers: {
      "content-type": "",
      "content-length": responseBody.length
    }
  };

  return new Promise(resolve => {

  let request = https.request(options, function(response) {
    console.log("STATUS: " + response.statusCode);
    console.log("HEADERS: " + JSON.stringify(response.headers));
    resolve('SENDING RESPONSE');
    // Tell AWS Lambda that the function execution is done
    context.done();
  });

  request.on("error", function(error) {
    console.log("sendResponse Error:" + error);
    // Tell AWS Lambda that the function execution is done
    context.done();
  });

  console.log("SENDING RESPONSE...\n");
  // write data to request body
  request.write(responseBody);
  request.end();
  });
}
