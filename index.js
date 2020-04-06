var express = require('express'),
  formidable = require('formidable'),
  fs = require('fs'),
  path = require('path');
  
var app = express();
var cors = require("cors");
app.use(cors());

app.set('view engine', 'ejs');

const readline = require('readline');
const { google } = require('googleapis');
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];///-----
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index.ejs');
});

// Upload route.
app.post('/upload', function (req, res) {
  var form = new formidable.IncomingForm();
  form.multiples = true; //enable mutiple for formidable
  form.uploadDir = "uploads/";
  var n = [];
  var file_name, file_ext;
  form.parse(req, function (err, fields, files) {

    // if upload one file
    if (!Array.isArray(files.file)) {
      // `file` is the name of the <input> field of type `file`
      // console.log(files.file);
      oldpath = files.file.path;
      newpath =  form.uploadDir + files.file.name;
      file_name=files.file.name;
      file_ext=files.file.type;
      fs.rename(oldpath, newpath, function (err) {
      if (err) throw err;
      // res.write('one file is upload !');
      // res.end();
      });
    }
    //end if
    else {
      for (let value of files.File) {
        // `file` is the name of the <input> field of type `file`
        console.log(files);
        
        oldpath = value.path;
        newpath = form.uploadDir + value.name;
        n.push(new Object({
          'file_name': value.name,
          'file_type': value.type
        }));

        fs.rename(oldpath, newpath, function (err) {
          if (err) throw err;

          res.end('multiple upload success');
        });
      } //end for
    }//end else
    ///-------------------------------------------------------------------------
    ///
    // Load client secrets from a local file.
    fs.readFile('credentials.json', (err, content) => {
      if (err) return console.log('Error loading client secret file:', err);
      // Authorize a client with credentials, then call the Google Drive API.
      authorize(JSON.parse(content), uploadFile);//------
    });

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
    function authorize(credentials, callback) {
      const { client_secret, client_id, redirect_uris } = credentials.installed;
      const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

      // Check if we have previously stored a token.
      fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
      });
    }

    /**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
     * @param {getEventsCallback} callback The callback for the authorized client.
     */
    function getAccessToken(oAuth2Client, callback) {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });
      console.log('Authorize this app by visiting this url:', authUrl);
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
          if (err) return console.error('Error retrieving access token', err);
          oAuth2Client.setCredentials(token);
          // Store the token to disk for later program executions
          fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
            if (err) return console.error(err);
            console.log('Token stored to', TOKEN_PATH);
          });
          callback(oAuth2Client);
        });
      });
    }
    /////
    // Target forlder for the Uploaded file.
    const targetFolderId = "1uepr7L04YD6nIZPSWrWC565uMqZfSmXl";

    function uploadFile(auth) {
      const drive = google.drive({ version: 'v3', auth });
      //upload one file
      if (n.length == 0) {
        var fileMetadata = {
          'name': file_name,
          parents: [targetFolderId]
        };
        var media = {
          mimeType: file_ext,
          body: files.file.body
        };
        drive.files.create({

          resource: fileMetadata,
          media: media,
          fields: 'id'
        }, function (err, file) {
          if (err) {
            // Handle error
            console.error(err);
          } else {
            console.log(`uploaded: ${file.data.id}`);
            res.send({url: `https://drive.google.com/uc?export=host&id=${file.data.id}`});
          }
        });
      }
      else {
        for (let i of n) {
          var fileMetadata = {
            'name': i.file_name,
            parents: [targetFolderId]
          };
          var media = {
            mimeType: i.file_type,
            body: fs.createReadStream(path.join(__dirname, 'uploads/', i.file_name))
          };
          drive.files.create({

            resource: fileMetadata,
            media: media,
            fields: 'id'
          }, function (err, file) {
            if (err) {
              // Handle error
              console.error(err);
            } else {
              res.send({url: `https://drive.google.com/uc?export=host&id=${file.data.id}`});
              console.log(`uploaded: ${file.data.id}`);
            }
          });
        }      //end for
      } //end else



    }
  })








});


app.listen(3003);
console.log('server is running port 3003');
