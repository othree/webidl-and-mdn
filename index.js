var loader = require('./loader.js');
var request = require('request');
var jsdom = require('jsdom');

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
    let platform = 'web';
    if (name === 'CSS2Properties') {
      platform = 'css';
    }
    keys.push([`${name}`, `${platform}/${name}`]);
    if (inter.members) {
      for (let i in inter.members) {
        let member = inter.members[i];
        if (name === 'CSS2Properties') {
          keys.push([`${name}/${member.name}`, `${platform}/${member.name}`]);
        } else {
          keys.push([`${name}/${member.name}`, `${name}/${member.name}`]);
        }
      }
    }
  }

  var def = {};

  var walk = function (i) {
    if (i === keys.length) {
      output();
    }
    let key = keys[i][0];
    let name = keys[i][1];
    let url = `http://mdn.io/${name}`;
    request.get(url, {followRedirect: false}).on('response', function (response) {
      if (!/google/.test(response.headers['location'])) {
        var url = response.headers['location'];
        var doc = null;
        jsdom.env({
          url: url,
          scripts: ["http://code.jquery.com/jquery.js"],
          done: function (errors, window) {
            var $ = window.$;
            var nodes = $('p');
            nodes.each(function () {
              var text = $.trim($(this).text());
              if (text !== '') {
                doc = text;
                console.log(i, key);
                def[key] = {
                  "!url": url,
                  "!doc": doc
                }
                return false;
              }
            });
            walk(i+1);
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
        walk(i+1);
      }
    });
  };

  var output = function () {
    console.log(JSON.stringify(def, null, 2));
  };

  walk(0);
});

