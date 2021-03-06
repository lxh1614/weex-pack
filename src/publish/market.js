const Url = require('url');
const Http = require('http');
const chalk = require('chalk');
const crypto = require('crypto');
const Fs=require('fs');
const Path=require('path');
const os=require('os');
var _mapper={};
const TMP_DIR=os.tmpDir();
const CACHE_FILE_NAME='registry_map.json';
try {
  _mapper = JSON.parse(Fs.readFileSync(Path.join(TMP_DIR,CACHE_FILE_NAME )));
}catch(e){

}
exports.domain = 'http://market.dotwe.org';
exports.publish = function (name, namespace, ali, version) {
  return new Promise(function (resolve, reject) {
    var md5 = crypto.createHash('md5');
    md5.update(`name=${name}_fullname=${namespace + '-' + name}_p=${!!ali}`);
    let sign = md5.digest('hex');
    let url = exports.domain + '/json/sync/sync.json?name=' + name + '&namespace=' + namespace + '&fullname=' + namespace + '-' + name + '&p=' + !!ali + '&sign=' +'123';
    post(url).then(function (res) {
      if (res.success) {
        console.log();
        console.log(chalk.yellow('plugin [' + name + '@' + version + '] publish success! sync to market maybe need a few minutes.'));
        console.log(chalk.yellow(`you can visit ${exports.domain} see your plugin. if not exist you can retry ${chalk.blue('weexpack plugin publish')}`))
        console.log();
        resolve()
      }
      else if(res.data.code == 10004) {
        console.log(chalk.red(`Market sync rejected! Namespace unmatched!`));
      }
    }).catch(function () {
      console.log(chalk.red(`Market sync failed! Please retry ${chalk.blue('weexpack plugin publish')}`));
      reject();
    })
  })

};

exports.apply = function (name, p) {
  return new Promise((resolve, reject)=> {
    post(exports.domain + '/json/sync/apply.json?name=' + name + '&p=' + !!p).then(function (res) {
      if (res.success) {
        resolve(res.data);
      }
      else {
        throw new Error();
      }

    }).catch(function (e) {
      console.log();
      console.log(chalk.red(`Market apply failed! Please retry ${chalk.blue('weexpack plugin publish')}`));
      console.log();
      reject();
    })
  })
};
global.WeexMarket={};

global.WeexMarket.info=exports.info = function (name) {
  if(_mapper[name]){
    return Promise.resolve(_mapper[name]);
  }
  else {
    return new Promise((resolve, reject)=> {
      post(exports.domain + '/json/sync/info.json?name=' + name).then(function (res) {
        if (res.success) {
          _mapper[name]=res.data;
          try {
            Fs.writeFileSync(Path.join(TMP_DIR, CACHE_FILE_NAME), JSON.stringify(_mapper, null, 4))
          }catch(e){
            console.error('registry map save error');
          }
          resolve(res.data)
        }
        else {
          reject('market error:',JSON.stringify(res));
        }

      }, function (e) {
        reject(e.toString());
      })
    })
  }
}
var post = function (url, data) {
  return new Promise(function (resolve, reject) {
    var urlObj = Url.parse(url);
    if (data) {
      data = new Buffer(JSON.stringify(data));
      var headers = {
        "Content-Type": 'application/json;charset=UTF-8',
        "Content-Length": data.length
      }
    }
    else {
      headers = {
        "Content-Length": 0
      }
    }

    var req = Http.request({
      host: urlObj.hostname,
      method: 'post',
      path: urlObj.path,
      port: urlObj.port || 80,
      headers: headers
    }, function (res) {
      var body = '';
      res.on('data', function (chunk) {
        body += chunk.toString();
      });
      res.on('end', function () {
        if (res.statusCode == 200) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        }
        else {
          reject(res.statusCode);
        }
      });
    });

    req.on('error', function (err) {
      var e = new Error('Connect Error for request for ' + url);
      e.name = 'Http Request Error';
      reject(e);
    });
    if (data != null)req.write(data);
    req.end();
  })
};
