var loader = require('./loader.js');
var request = require('request');
var jsdom = require('jsdom');
var jsonfile = require('jsonfile');
var paramCase = require('param-case');

var walk = require('walk');
var files = [];

var st = {};

// Walker options
var walker  = walk.walk('./webidl/webidl', { followLinks: false });

walker.on('file', function(root, stat, next) {
  st = loader.file(root + '/' + stat.name, st);
  next();
});

walker.on('end', function() {
  "use strict";
 
  var interfaces = st.interfaces;
  var keys = [];

  for (let name in interfaces) {
    let inter = interfaces[name];
    let platform = 'API';
    if (name === 'CSS2Properties') {
      platform = 'CSS';
    }
    keys.push([`${name}`, `${platform}/${name}`]);
    if (inter.members) {
      for (let i in inter.members) {
        let member = inter.members[i];
        if (name === 'CSS2Properties') {
          keys.push([`${name}/${member.name}`, `${platform}/${paramCase(member.name)}`]);
        } else {
          keys.push([`${name}/${member.name}`, `${platform}/${name}/${member.name}`]);
        }
      }
    }
  }

  // var def = jsonfile.readFileSync('webidl.json');
  var def = {};
  var walk = function (i) {
    if (i === keys.length) {
      output();
      return;
    }
    let key = keys[i][0];
    if (def[key]) {
      walk(i+1);
      return;
    }
    var name = keys[i][1];
    var url = `http://developer.mozilla.org/en-US/docs/Web/${name}`;
    var timeout = setTimeout(function () {
        console.log(i, key, 'timeout');
      walk(i+1);
    }, 30 * 1000);

    request({
      method: 'GET',
      uri: url
    }, function (error, response, body) {
      clearTimeout(timeout);
      if (!error && response.statusCode === 200) {
        var doc = null;
        jsdom.env({
          url: url,
          scripts: ["http://othree.net/jquery.js"],
          done: function (errors, window) {
            var $ = window.$;
            var nodes = $('p');
            nodes.each(function () {
              var text = $.trim($(this).text());
              if (text !== '' 
               && text !== 'This article is in need of a technical review.'
               && text !== 'This article is in need of an editorial review.'
               && text !== '« SVG Attribute reference home'
               && text !== 'This API is available on Firefox or Firefox OS for installed or higher privileged applications.'
               && text !== 'This API is available on Firefox OS for privileged or certified applications only.'
               && text !== 'This API is available on Firefox OS for internal applications only.'
               && !/^Draft/.test(text) 
               && !/^Not native/.test(text) 
               && !/^Non-standard/.test(text) 
               && !/^This is an experimental technology/.test(text)
               && !/^This is a new technology/.test(text)) {
                doc = text;
                console.log(i, key, doc);
                def[key] = {
                  "!url": url,
                  "!doc": doc
                }
                return false;
              }
            });
            if (!doc) {
              console.log(i, key, 'nodoc');
            }
            setTimeout(function () {
              walk(i+1);
            }, 1500);
          }
        });
        // request({
          // method: 'GET',
          // uri: response.headers['location']
        // }, function (error, response, body) {
          // let p = cheerio.load(body)('p');
          // console.log(p);
        // });
      } else {
        console.log(i, key, 'notfound');
        setTimeout(function () {
          walk(i+1);
        }, 1500);
      }
    });
  };

  var output = function () {
    console.log(JSON.stringify(def, null, 2));
  };

  walk(0);
});

