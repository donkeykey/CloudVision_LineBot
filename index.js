var request = require('request');
var async = require('async');
var res;
var line_key = require('./line_key.json');
var google_key = require('./google_key.json');
var base = require('./base.json');

exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    res = event.result[0];

    async.waterfall([
        function recognize(callback) {
            if (res.content.contentType === 2) {
                callback(null, 'image');
            } else if (res.content.text.match(/^時間/)) {
                callback(null, 'time');
            } else {
                callback(null, 'other');
            }
        },
        function run(data, callback) {
            if (data === 'image') {
                console.log('run image');
                async.waterfall([
                    function getImage(callback2) {
                        console.log('get image');
                        var id = res.content.id;

                        var opts = {
                            url: 'http://' + base.host + '/callback_proxy.php?id=' + id,
                            headers: {
                                "X-Line-ChannelID": line_key.channelID,
                                "X-Line-ChannelSecret": line_key.channelSecret,
                                "X-Line-Trusted-User-With-ACL": line_key.mid
                            },
                            encoding: null
                        }
                        request(opts, function(error, response, body) {
                            console.log('error: ' + JSON.stringify(error));
                            console.log('response : ' + JSON.stringify(response));
                            if (!error) {
                                var img = body.toString('base64')
                                callback2(null, img);
                            } else {
                                console.log('LINEえらーだよ');
                                callback2(error);
                            }
                        });
                    },
                    function sendCloudAPI(img, callback2) {
                        console.log('send cloud api');
                        var data = {
                            "requests":[
                                {
                                    "image":{"content": img},
                                    "features":[
                                        {"type": "FACE_DETECTION", "maxResults": 5},
                                        {"type": "LABEL_DETECTION", "maxResults": 5},
                                        {"type": "TEXT_DETECTION", "maxResults": 5},
                                        {"type": "LANDMARK_DETECTION", "maxResults": 5},
                                        {"type": "LOGO_DETECTION", "maxResults": 5},
                                        {"type": "SAFE_SEARCH_DETECTION", "maxResults": 5}
                                    ]
                                }
                            ]
                        };
                        var opts = {
                            url: 'https://vision.googleapis.com/v1/images:annotate?key=' + google_key.key,
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(data)
                        }
                        var text = '';
                        request.post(opts, function (error, response, body) {
                            console.log(body);
                            body = JSON.parse(body);
                            if (body.responses[0].error === undefined) {
                                var labelAnnotations = body.responses[0].labelAnnotations;
                                var faceAnnotations = body.responses[0].faceAnnotations;
                                var textAnnotations = body.responses[0].textAnnotations;
                                var landmarkAnnotations = body.responses[0].landmarkAnnotations;
                                var logoAnnotations = body.responses[0].logoAnnotations;
                                var safeSearchAnnotation = body.responses[0].safeSearchAnnotation;
                                if (labelAnnotations !== undefined) {
                                    for (var i = 0; i < labelAnnotations.length; i++) {
                                        text += '"' + labelAnnotations[i].description + '"' + "とか\n";
                                    }
                                    text += "まぁその辺りじゃないかな\n\n";
                                }
                                if (faceAnnotations !== undefined) {
                                    text += "人間が" + faceAnnotations.length + "人いるみたいだね\n\n";
                                }
                                if (textAnnotations !== undefined) {
                                    text += "「" + textAnnotations[0].description.replace(/\n/g, ' ') + "」とかって書いてあるなぁ\n\n";
                                }
                                if (landmarkAnnotations !== undefined) {
                                    text += "あ！これ場所は" + landmarkAnnotations[0].description + "だよね！\n\n";
                                }
                                if (logoAnnotations !== undefined) {
                                    text += "ってかこれ「" + logoAnnotations[0].description + "」じゃね？www\n\n";
                                }
                                if (safeSearchAnnotation !== undefined && (safeSearchAnnotation.adult === 'LIKELY' || safeSearchAnnotation.adult === 'VERY_LIKELY')) {
                                    text += "あ、いや、、、てかこれ…ちょっとエッチ///\n\n";
                                }
                                text = text.replace(/\n+$/g,'');
                                callback2(null, text);
                            } else {
                                callback2(null, "ごめん、エラーだわ");
                            }
                        });
                    }
                ], function (err, result) {
                    callback(err, result);
                });
            } else if (data === 'time') {
                console.log('run time');
                var date = new Date();
                var year = date.getFullYear();
                var month = date.getMonth()+1;
                var week = date.getDay();
                var day = date.getDate();
                var hour = date.getHours();
                var minute = date.getMinutes();
                var second = date.getSeconds();
                var text = year+"年"+month+"月"+day+"日"+hour+"時"+minute+"分"+second+"秒";
                callback(null, text);
            } else {
                console.log('run else');
                var text = 'いや、ちょっとなに言ってるか分かんないっすｗ';
                callback(null, text);
            }
        },
        function postToLine(text, callback) {
            console.log('run post : ' + text)
            var data = {
                to: [res.content.from.toString()],
                toChannel: 1383378250,
                eventType: "138311608800106203",
                content: {
                    "contentType":1,
                    "toType":1,
                    "text":text
                }
            };
            var opts = {
                url: 'http://' + base.host + '/proxy.php',
                //url: 'https://trialbot-api.line.me/v1/events',
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                    "X-Line-ChannelID": line_key.channelID,
                    "X-Line-ChannelSecret": line_key.channelSecret,
                    "X-Line-Trusted-User-With-ACL": line_key.mid
                },
                body: JSON.stringify(data)
            }
            request.post(opts, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    callback(null);
                } else {
                    console.log(JSON.stringify(body));
                    callback(error);
                }
            });
        }
    ], function (err, result) {
    });
};
