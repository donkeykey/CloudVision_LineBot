<?php
$headers = getallheaders();
$url = "https://trialbot-api.line.me/v1/events";
$headers = array(
    "Content-Type: application/json",
    "X-Line-ChannelID: {$headers["X-Line-ChannelID"]}",
    "X-Line-ChannelSecret: {$headers["X-Line-ChannelSecret"]}",
    "X-Line-Trusted-User-With-ACL: {$headers["X-Line-Trusted-User-With-ACL"]}"
);

$post = file_get_contents("php://input");
error_log($post);

$curl = curl_init($url);
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
curl_setopt($curl, CURLOPT_POSTFIELDS, $post);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
$output = curl_exec($curl);
