"use strict";

var loader = require('./loader.js');

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

  for (let name in interfaces) {
    let inter = interfaces[name];
    let platform = 'web';
    if (name === 'CSS2Properties') {
      platform = 'css';
    }
    console.log(`http://mdn.io/${platform}/${name}`);
    if (inter.members) {
      for (let i in inter.members) {
        let member = inter.members[i];
        console.log(`http://mdn.io/${platform}/${name}/${member.name}`);
      }
    }
  }
});

