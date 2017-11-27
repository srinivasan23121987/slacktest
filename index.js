var express = require('express'),
    app = express(),
    bodyParser = require('body-parser');
var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var xlsxj = require("xlsx-to-json");
var events = require("events");
var fs = require('fs');
var event = new events.EventEmitter();
var storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, './uploads');
    },
    filename: function (req, file, callback) {
        callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
var upload = multer({ storage: storage }).single('userPhoto');
let readfile = fs.readFileSync(__dirname + "/config.json", "utf8");
let parsereadf = JSON.parse(readfile);
//process.env["SLACK_BOT_TOKEN"] = parsereadf.bottoken;
var bot_token = process.env.SLACK_BOT_TOKEN || '';
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
var rtm = new RtmClient(bot_token);
var data;
let channel;
let response = '';
rtm.start();
function executeGetBot(botid, ims) {
    for (const c of ims) {
        console.log(c.user);
        if (c.user === botid) return c.id;
    }
}
// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, (rtmStartData) => {
    //console.log(rtmStartData);
    for (const c of rtmStartData.users) {
        console.log(c.name);
        if (c.name === parsereadf.botuser) { channel = executeGetBot(c.id, rtmStartData.ims); }
    }
    console.log(channel);
    channel = channel;
    //   console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});
rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
    rtm.sendMessage("Hi", channel);
});
rtm.on(RTM_EVENTS.MESSAGE, function (message) {
    // console.log(message.channel===channel);
    if (message.channel === channel) {
        event.emit("done", message);
    }
});
rtm.on(RTM_EVENTS.REACTION_ADDED, function handleRtmReactionAdded(reaction) {
    console.log('Reaction added:', reaction);
});
app.post('/deletefile', function (req, res) {
    fs.exists(path.join(__dirname + "/uploads/output.json"), function (exists) {
        if (exists) {
            fs.unlink(path.join(__dirname + "/uploads/output.json"), function () {
                res.end("File deleted!!!");
            })
        }
        else {
            res.end("File not Found!!!");
        }
    })

});
app.post('/uploaddata', function (req, res) {
    fs.readFile(__dirname + "/uploads/output.json", "utf8", function (err, data) {
        if (err) {
            res.end("No File!!!");
        }
        else {
            res.end(JSON.stringify(data));
        }

    })
});
app.post('/updateconfig', function (req, res) {
    let bottoken = req.body.bottoken;
    let botuser = req.body.botuser;
    let config = JSON.stringify({ 'bottoken': bottoken, 'botuser': botuser });
    fs.writeFile(path.join(__dirname + "/config.json"), config, function (err, data) {
        res.end("config file Updated");
    })
});
app.post('/configdata', function (req, res) {
    fs.readFile(path.join(__dirname + "/config.json"), "utf8", function (err, data) {
        if (err) {
            res.end("No File");
        } else {
            res.end(data);
        }
    });
});
app.get('/config', function (req, res) {
    res.sendFile(__dirname + "/config.html");

});
app.get('/', function (req, res) {
    res.render(__dirname + "/index.pug", {});
});
var async = function (cb, utterance, channel, res) {
    rtm.sendMessage(utterance, channel);
    event.on("done", function (message) {
        return res.end(JSON.stringify(message));
    });
}
app.post('/api', function (req, res) {
    // you need to wait for the client to fully connect before you can send messages
    async(function (message) {

    }, req.body.utterance, channel, res);
    console.log('srini');

});

app.post('/api/photo', function (req, res) {
    upload(req, res, function (err) {
        if (err) {
            console.log(err);
            return res.end("Error uploading file.");
        }
        if (req.file) {
            var model = null;
            xlsxj({
                input: __dirname + "/uploads/" + req.file.filename,
                output: __dirname + "/uploads/" + "output.json"
            }, function (err, result) {
                if (err) {
                    console.error(err);
                } else {
                    fs.unlink(path.join(__dirname + "/uploads/" + req.file.filename), function () {
                        res.end("FileUploaded!!!");
                    })
                }
            });
        }
        else {
            res.end("Please Select the file to upload.");
        }
    });
});

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
}
app.listen(process.env.PORT || 7000);