var request = require('request');
var aws = require('aws-sdk');
var async = require('async');
var s3 = new aws.S3({params: {Bucket: 'fukase-no-owari.net'}});
var res;
var line_key = require('./line_key.json');
var google_key = require('./google_key.json');

exports.handler = function(event, context) {
    console.log('Received event:', JSON.stringify(event, null, 2));
    res = event.result[0];

    async.waterfall([
        function recognize(callback) {
            if (res.content.contentType === 2) { //画像が投稿された時
                callback(null, 'image');
            } else if (res.content.text.match(/^時間/)) {
                callback(null, 'time');
            } else if (res.content.text.match(/^フカセ/)) {
                callback(null, 'fukase');
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
                            url: 'https://trialbot-api.line.me/v1/bot/message/' + id + '/content',
                            headers: {
                                "Content-type": "application/json; charset=UTF-8",
                                "X-Line-ChannelID": line_key.channelID,
                                "X-Line-ChannelSecret": line_key.channelSecret,
                                "X-Line-Trusted-User-With-ACL": line_key.mid
                            },
                            encoding: null
                        }
                        request(opts, function(error, response, body) {
                            if (!error && response.statusCode == 200) {
                                var img = body.toString('base64')
                                callback2(null, img);
                            } else {
                                callback2(error);
                            }
                        });
                    },
                    function sendCloudAPI(img, callback2) {
                       console.log('send cloud api');
                        var key = google_key.key;
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
                            url: 'https://vision.googleapis.com/v1/images:annotate?key=' + key,
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(data)
                        }
                        request.post(opts, function (error, response, body) {
                            callback2(null, JSON.stringify(body));
                        });
                    }
                ], function (err, result) {
                    callback(null, result);
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
            } else if (data === 'fukase') {
                console.log('run fukase');
                callback(null, "fukase");
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
                url: 'https://trialbot-api.line.me/v1/events',
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
                    console.log(JSON.stringify(body.statusMessage));
                    callback(error);
                }
            });
        }
    ], function (err, result) {
    });
};
